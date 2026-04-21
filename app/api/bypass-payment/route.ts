import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

// TEST MODE ONLY — hapus saat production launch

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
      // Update status ke paid
      orderId = existing.id
      await adminClient
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId)
      console.log('Updated existing order to paid:', orderId)
    } else {
      // Buat order baru dengan status paid (tanpa field amount)
      const { data: newOrder, error } = await adminClient
        .from('orders')
        .insert({
          user_id: user.id,
          onboarding_id,
          status: 'paid',
        })
        .select('id')
        .single()

      if (error || !newOrder) {
        console.error('Insert order error:', error)
        return NextResponse.json({ error: 'Gagal buat order: ' + error?.message }, { status: 500 })
      }
      orderId = newOrder.id
      console.log('Created new paid order:', orderId)
    }

    return NextResponse.json({ ok: true, order_id: orderId })
  } catch (err) {
    console.error('bypass-payment error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
