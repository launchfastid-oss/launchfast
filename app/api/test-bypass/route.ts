import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { onboarding_id } = await request.json()
    if (!onboarding_id) return NextResponse.json({ error: 'onboarding_id required' }, { status: 400 })

    const adminClient = createAdminClient()

    // Cek onboarding
    const { data: onboarding } = await adminClient
      .from('onboarding_answers').select('*').eq('id', onboarding_id).single()
    if (!onboarding) return NextResponse.json({ error: 'Onboarding not found' }, { status: 404 })

    // Buat order bypass (status paid)
    const { data: order, error: orderErr } = await adminClient
      .from('orders').insert({
        user_id: user.id,
        onboarding_id: onboarding_id,
        total_amount: 1000000,
        status: 'paid',
        payment_type: 'test_bypass',
      }).select().single()

    if (orderErr) return NextResponse.json({ error: 'Order error: ' + orderErr.message }, { status: 500 })

    // Trigger generate full via API
    const baseUrl = request.headers.get('origin') || 'https://launchfast-git-main-launchfastid-oss-projects.vercel.app'
    const genRes = await fetch(baseUrl + '/api/generate-full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Cookie': request.headers.get('cookie') || '' },
      body: JSON.stringify({ order_id: order.id, onboarding_id: onboarding_id })
    })

    const genData = await genRes.json()
    return NextResponse.json({ ok: true, order_id: order.id, brand_kit_id: genData.brand_kit_id, genStatus: genRes.status })
  } catch (err) {
    console.error('test-bypass error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
