import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

async function callAI(anthropic: Anthropic, prompt: string, maxTokens = 2000) {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    system: 'Kembalikan HANYA JSON valid tanpa markdown, tanpa backtick, tanpa penjelasan.',
    messages: [{ role: 'user', content: prompt }]
  })
  const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
  const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  return JSON.parse(match ? match[0] : clean)
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { onboarding_id } = await request.json()
    const adminClient = createAdminClient()

    const { data: ob } = await adminClient.from('onboarding_answers').select('*').eq('id', onboarding_id).single()
    if (!ob) return NextResponse.json({ error: 'Onboarding not found' }, { status: 404 })

    const { data: order } = await adminClient.from('orders').insert({
      user_id: user.id, onboarding_id,
      total_amount: 1000000, base_amount: 1000000,
      status: 'paid', midtrans_order_id: 'TEST-' + Date.now(),
    }).select('id').single()

    if (!order) return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const biz = ob.business_name + ', ' + ob.product_service + ', target: ' + ob.target_customer + ', tone: ' + ob.tone_of_voice + ', harga: ' + ob.price_range

    // Generate brand kit
    const { data: brandKit } = await adminClient.from('brand_kits').insert({
      user_id: user.id, order_id: order.id, is_preview_only: false,
      business_name: ob.business_name,
    }).select('id').single()

    if (!brandKit) return NextResponse.json({ error: 'Failed to create brand kit' }, { status: 500 })

    // 1. Strategy
    const strategy = await callAI(anthropic, 'Buat strategi brand untuk: ' + biz + '. Return JSON: {"golden_one_liner":"...","unique_value_proposition":"...","target_segment":"...","positioning":"...","brand_personality":["..."],"sb7":{"hero":{"headline":"...","subheadline":"..."},"problem":{"external":"...","internal":"...","philosophical":"..."},"guide":{"empathy":"...","authority":"..."},"plan":["...","...","..."],"cta_direct":"...","cta_transitional":"...","success":"...","failure":"..."},"stp":{"segmentation":"...","targeting":"...","positioning":"..."}}')
    await adminClient.from('brand_kits').update({ strategy_data: strategy }).eq('id', brandKit.id)

    // 2. Visual
    const visual = await callAI(anthropic, 'Buat visual identity untuk: ' + biz + '. Return JSON: {"colors":[{"hex":"#...","name":"...","usage":"..."},{"hex":"#...","name":"...","usage":"..."},{"hex":"#...","name":"...","usage":"..."},{"hex":"#...","name":"...","usage":"..."},{"hex":"#...","name":"...","usage":"..."}],"typography":{"heading":{"font":"...","reason":"..."},"body":{"font":"...","reason":"..."}},"logo_concepts":[{"name":"...","description":"...","style":"..."},{"name":"...","description":"...","style":"..."},{"name":"...","description":"...","style":"..."}],"visual_mood":"..."}')
    await adminClient.from('brand_kits').update({ visual_data: visual }).eq('id', brandKit.id)

    // 3. Content
    const content = await callAI(anthropic, 'Buat 15 ide konten sosmed untuk: ' + biz + '. Return JSON: {"posts":[{"day":1,"platform":"Instagram","type":"...","caption":"...","hashtags":["..."]},{"day":2,"platform":"TikTok","type":"...","caption":"...","hashtags":["..."]}]}', 2000)
    await adminClient.from('brand_kits').update({ content_data: content }).eq('id', brandKit.id)

    // 4. WhatsApp
    const whatsapp = await callAI(anthropic, 'Buat 5 WA script untuk: ' + biz + '. Return JSON: {"scripts":[{"type":"sapaan_baru","title":"...","message":"..."},{"type":"follow_up","title":"...","message":"..."},{"type":"closing","title":"...","message":"..."},{"type":"broadcast_promo","title":"...","message":"..."},{"type":"handle_keberatan","title":"...","message":"..."}]}')
    await adminClient.from('brand_kits').update({ whatsapp_data: whatsapp }).eq('id', brandKit.id)

    // 5. Checklist
    const checklist = await callAI(anthropic, 'Buat checklist 4 minggu launch untuk: ' + biz + '. Return JSON: {"weeks":[{"week":1,"theme":"...","tasks":["...","...","...","...","..."]},{"week":2,"theme":"...","tasks":["...","...","...","...","..."]},{"week":3,"theme":"...","tasks":["...","...","...","...","..."]},{"week":4,"theme":"...","tasks":["...","...","...","...","..."]}]}')
    await adminClient.from('brand_kits').update({ checklist_data: checklist }).eq('id', brandKit.id)

    // 6. Legal
    const legal = await callAI(anthropic, 'Buat panduan legal untuk UMKM Indonesia: ' + biz + '. Return JSON: {"business_structure":{"recommendation":"...","reason":"..."},"nib":{"required":true,"steps":["...","...","..."],"estimate_days":3},"tax":{"npwp_required":true,"vat_required":false,"pph_rate":"..."},"permits":["...","..."],"tips":["...","..."]}')
    await adminClient.from('brand_kits').update({ legal_data: legal, updated_at: new Date().toISOString() }).eq('id', brandKit.id)

    // Update order status complete
    await adminClient.from('orders').update({ status: 'completed' }).eq('id', order.id)

    return NextResponse.json({ ok: true, brand_kit_id: brandKit.id, order_id: order.id })
  } catch (err) {
    console.error('test-bypass error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
