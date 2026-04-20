import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { onboarding_id } = await request.json()
    const adminClient = createAdminClient()
    const { data: ob } = await adminClient.from('onboarding_answers').select('*').eq('id', onboarding_id).single()
    if (!ob) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data: order } = await adminClient.from('orders').insert({
      user_id: user.id, onboarding_id, total_amount: 1000000, base_amount: 1000000,
      status: 'paid', midtrans_order_id: 'TEST-' + Date.now(),
    }).select('id').single()
    const { data: brandKit } = await adminClient.from('brand_kits').insert({
      user_id: user.id, order_id: order!.id, is_preview_only: false, business_name: ob.business_name,
    }).select('id').single()
    return NextResponse.json({ ok: true, brand_kit_id: brandKit!.id, order_id: order!.id, onboarding: ob })
  } catch (err) { return NextResponse.json({ error: String(err) }, { status: 500 }) }
}
