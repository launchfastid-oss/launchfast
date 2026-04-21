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
      orderId = existing.id
      await adminClient.from('orders').update({ status: 'paid' }).eq('id', orderId)
      console.log('Updated existing order to paid:', orderId)
    } else {
      const { data: newOrder, error } = await adminClient
        .from('orders')
        .insert({ user_id: user.id, onboarding_id, status: 'paid' })
        .select('id')
        .single()
      if (error || !newOrder) {
        return NextResponse.json({ error: 'Gagal buat order: ' + error?.message }, { status: 500 })
      }
      orderId = newOrder.id
      console.log('Created new paid order:', orderId)
    }

    // Cek apakah brand_kit sudah ada untuk order ini
    const { data: existingKit } = await adminClient
      .from('brand_kits')
      .select('id')
      .eq('order_id', orderId)
      .eq('is_preview_only', false)
      .single()

    if (existingKit) {
      // Brand kit sudah ada — langsung redirect
      console.log('Brand kit already exists:', existingKit.id)
      return NextResponse.json({ ok: true, order_id: orderId, brand_kit_id: existingKit.id })
    }

    // Trigger generate-full — ini yang biasanya dipanggil oleh Midtrans webhook
    const baseUrl = new URL(request.url).origin
    console.log('Triggering generate-full for order:', orderId, 'at', baseUrl)

    // Fire and forget — generate-full berjalan async, halaman generating akan poll hasilnya
    fetch(baseUrl + '/api/generate-full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: orderId }),
    }).then(r => r.json()).then(d => {
      console.log('generate-full triggered:', JSON.stringify(d).slice(0, 100))
    }).catch(e => {
      console.error('generate-full error:', e)
    })

    return NextResponse.json({ ok: true, order_id: orderId })
  } catch (err) {
    console.error('bypass-payment error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
