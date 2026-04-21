import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// TEST MODE ONLY — bypass payment, langsung generate brand kit
// Hapus atau disable route ini saat production launch

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { onboarding_id } = await request.json()
    if (!onboarding_id) return NextResponse.json({ error: 'onboarding_id required' }, { status: 400 })

    const adminClient = createAdminClient()

    // Cek apakah sudah ada order untuk onboarding ini
    const { data: existing } = await adminClient
      .from('orders')
      .select('id, status')
      .eq('onboarding_id', onboarding_id)
      .eq('user_id', user.id)
      .single()

    let orderId: string

    if (existing) {
      // Update order yang ada ke paid
      orderId = existing.id
      await adminClient.from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId)
    } else {
      // Buat order baru langsung dengan status paid
      const { data: newOrder, error } = await adminClient
        .from('orders')
        .insert({
          user_id: user.id,
          onboarding_id,
          status: 'paid',
          amount: 1000000,
        })
        .select('id')
        .single()

      if (error || !newOrder) {
        return NextResponse.json({ error: 'Gagal buat order: ' + error?.message }, { status: 500 })
      }
      orderId = newOrder.id
    }

    // Trigger generate-full via internal call
    const baseUrl = request.headers.get('origin') || 'https://launchfast-git-main-launchfastid-oss-projects.vercel.app'
    const generateRes = await fetch(baseUrl + '/api/generate-full', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-key': process.env.INTERNAL_SECRET || 'bypass-test-mode',
      },
      body: JSON.stringify({ order_id: orderId }),
    })

    const generateData = await generateRes.json()

    return NextResponse.json({
      ok: true,
      order_id: orderId,
      brand_kit_id: generateData.brand_kit_id,
      status: 'generating',
    })
  } catch (err) {
    console.error('bypass-payment error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
