import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { onboarding_id, upsells = [] } = await request.json()

    const adminClient = createAdminClient()
    const { data: onboarding } = await adminClient
      .from('onboarding_answers').select('*').eq('id', onboarding_id).single()
    if (!onboarding) return NextResponse.json({ error: 'Onboarding not found' }, { status: 404 })

    const upsellPrices: Record<string, number> = {
      custom_domain: 200000, video_reels: 500000, pt_registration: 750000
    }
    const baseAmount = 1000000
    const upsellTotal = (upsells as string[]).reduce((sum, k) => sum + (upsellPrices[k] || 0), 0)
    const totalAmount = baseAmount + upsellTotal

    const orderId = `LE-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

    const { data: order } = await adminClient.from('orders').insert({
      user_id: user.id,
      onboarding_id,
      status: 'pending_payment',
      base_amount: baseAmount,
      total_amount: totalAmount,
      midtrans_order_id: orderId,
    }).select('id').single()

    if (upsells.length > 0 && order) {
      await adminClient.from('order_upsells').insert(
        (upsells as string[]).map(k => ({
          order_id: order.id,
          upsell_type: k,
          amount: upsellPrices[k],
          status: 'pending'
        }))
      )
    }

    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    const isSandbox = process.env.NODE_ENV !== 'production'
    const midtransUrl = isSandbox
      ? 'https://app.sandbox.midtrans.com/snap/v1/transactions'
      : 'https://app.midtrans.com/snap/v1/transactions'

    const midtransRes = await fetch(midtransUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(serverKey + ':').toString('base64')}`
      },
      body: JSON.stringify({
        transaction_details: { order_id: orderId, gross_amount: totalAmount },
        customer_details: { email: user.email },
        item_details: [
          { id: 'brand_kit', price: baseAmount, quantity: 1, name: 'Brand Kit Lengkap' },
          ...(upsells as string[]).map(k => ({
            id: k, price: upsellPrices[k], quantity: 1, name: k
          }))
        ]
      })
    })

    const midtransData = await midtransRes.json()
    return NextResponse.json({ snap_token: midtransData.token, order_id: order?.id })
  } catch (err) {
    console.error('create-payment error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
