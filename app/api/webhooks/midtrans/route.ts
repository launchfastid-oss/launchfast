import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order_id, transaction_status, fraud_status, gross_amount, signature_key, status_code } = body

    const serverKey = process.env.MIDTRANS_SERVER_KEY || ''
    const expected = crypto.createHash('sha512')
      .update(`${order_id}${status_code}${gross_amount}${serverKey}`)
      .digest('hex')

    if (signature_key !== expected) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data: order } = await adminClient
      .from('orders').select('id, user_id').eq('midtrans_order_id', order_id).single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const isPaid =
      (transaction_status === 'capture' && fraud_status === 'accept') ||
      transaction_status === 'settlement'

    if (isPaid) {
      await adminClient.from('orders').update({
        status: 'paid',
        midtrans_payment_type: body.payment_type,
        paid_at: new Date().toISOString()
      }).eq('id', order.id)

      // Check PT upsell â send Fonnte WA notification
      const { data: ptUpsell } = await adminClient
        .from('order_upsells').select('id').eq('order_id', order.id).eq('upsell_type', 'pt_registration').single()

      if (ptUpsell) {
        await adminClient.from('pt_fulfillment').insert({
          order_id: order.id, status: 'not_started'
        })
        // Fonnte WhatsApp notification
        const notifyNumber = process.env.WHATSAPP_NOTIFY_NUMBER
        const fonnteToken = process.env.FONNTE_TOKEN
        if (notifyNumber && fonnteToken) {
          const { data: od } = await adminClient
            .from('orders').select('onboarding_answers(business_name), profiles(full_name)').eq('id', order.id).single()
          const bizName = (od as any)?.onboarding_answers?.business_name || 'Unknown'
          const clientName = (od as any)?.profiles?.full_name || 'Unknown'
          await fetch('https://api.fonnte.com/send', {
            method: 'POST',
            headers: { 'Authorization': fonnteToken, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              target: notifyNumber,
              message: `Order baru PT Perorangan - ${clientName} - ${bizName} - Order ID: ${order.id}`
            })
          }).catch(console.error)
        }
      }

      // Trigger full generation async
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
      fetch(`${siteUrl}/api/generate-full`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-key': serverKey },
        body: JSON.stringify({ order_id: order.id })
      }).catch(console.error)

    } else if (['cancel', 'deny', 'expire'].includes(transaction_status)) {
      await adminClient.from('orders').update({ status: 'failed' }).eq('id', order.id)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('midtrans webhook error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
