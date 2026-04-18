import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Verify internal call
    const internalKey = request.headers.get('x-internal-key')
    if (internalKey !== process.env.MIDTRANS_SERVER_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { order_id } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const adminClient = createAdminClient()

    // Update order to generating
    await adminClient.from('orders').update({ status: 'generating' }).eq('id', order_id)

    const { data: order } = await adminClient
      .from('orders')
      .select('*, onboarding_answers(*)')
      .eq('id', order_id)
      .single()

    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    // This runs async in the background
    // Full AI generation will be implemented in Week 4
    // For now, create a placeholder brand kit to test the flow
    const onboarding = (order as Record<string, unknown>).onboarding_answers as Record<string, unknown>

    const { data: brandKit } = await adminClient.from('brand_kits').insert({
      order_id: order_id,
      user_id: order.user_id,
      business_name: onboarding?.business_name || 'Brand Kit',
      is_preview_only: false,
      strategy_data: { status: 'generating' },
      regen_counts: { strategy: 0, visual: 0, content: 0, whatsapp: 0, checklist: 0, legal: 0 }
    }).select('id').single()

    if (brandKit) {
      await adminClient.from('orders').update({ status: 'completed' }).eq('id', order_id)
    }

    return NextResponse.json({ ok: true, brand_kit_id: brandKit?.id })
  } catch (err) {
    console.error('generate-full error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
