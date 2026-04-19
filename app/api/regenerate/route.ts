import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const MAX_REGEN = 3

export async function POST(request: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async function callAI(prompt: string, maxTokens = 2000) {
    const res = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022', max_tokens: maxTokens,
      system: 'Kembalikan HANYA JSON valid tanpa markdown atau backtick.',
      messages: [{ role: 'user', content: prompt }]
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    return JSON.parse(match ? match[0] : clean)
  }

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id, tab } = await request.json()
    const validTabs = ['strategy', 'visual', 'content', 'whatsapp', 'checklist', 'legal']
    if (!validTabs.includes(tab)) return NextResponse.json({ error: 'Invalid tab' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: kit } = await adminClient.from('brand_kits').select('*, orders(onboarding_id)')
      .eq('id', brand_kit_id).eq('user_id', user.id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const regenCounts = (kit.regen_counts as Record<string, number>) || {}
    if ((regenCounts[tab] || 0) >= MAX_REGEN) {
      return NextResponse.json({ error: `Batas regenerasi ${MAX_REGEN}x sudah tercapai untuk tab ini` }, { status: 400 })
    }

    const orderId = (kit.orders as Record<string, unknown>)?.onboarding_id as string
    const { data: ob } = await adminClient.from('onboarding_answers').select('*').eq('id', orderId).single()
    if (!ob) return NextResponse.json({ error: 'Onboarding not found' }, { status: 404 })

    const bizCtx = `Nama: ${ob.business_name}, Target: ${ob.target_customer}, Produk: ${ob.product_service}, Model: ${ob.business_model}, Tone: ${ob.tone_of_voice}, Harga: ${ob.price_range}`

    const prompts: Record<string, { prompt: string; field: string; tokens: number }> = {
      strategy: { field: 'strategy_data', tokens: 3000, prompt: `${bizCtx}\n\nBuat strategi brand ulang dengan angle berbeda. JSON: { "golden_one_liner": "...", "stp": { "segmentation": "...", "targeting": "...", "positioning": "..." }, "sb7": { "hero": { "headline": "...", "subheadline": "..." }, "cta_direct": "...", "cta_transitional": "..." }, "unique_value_proposition": "...", "brand_story": "..." }` },
      visual: { field: 'visual_data', tokens: 2000, prompt: `${bizCtx}\n\nBuat visual identity ulang. JSON: { "colors": [{"hex":"#XXX","name":"Primary","usage":"...","rationale":"..."},{"hex":"#XXX","name":"Secondary","usage":"...","rationale":"..."},{"hex":"#XXX","name":"Accent","usage":"...","rationale":"..."}], "typography": {"heading":{"font":"...","weight":"700","rationale":"..."},"body":{"font":"...","weight":"400","rationale":"..."}}, "logo_concepts": [{"style":"...","description":"...","tagline":"..."},{"style":"...","description":"...","tagline":"..."},{"style":"...","description":"...","tagline":"..."}] }` },
      content: { field: 'content_data', tokens: 4000, prompt: `${bizCtx}\n\nBuat 30 konten sosmed baru. JSON: { "content_pillars": [{"name":"...","percentage":40,"description":"..."},{"name":"...","percentage":30,"description":"..."},{"name":"...","percentage":20,"description":"..."},{"name":"...","percentage":10,"description":"..."}], "posts": [{"day":1,"pillar":"...","platform":"Instagram","type":"Carousel","caption":"...","hashtags":"..."}] } â buat 30 posts hari 1-30.` },
      whatsapp: { field: 'whatsapp_data', tokens: 3000, prompt: `${bizCtx}\n\nBuat WA scripts baru. JSON: { "greeting_scripts": [{"name":"...","message":"..."},{"name":"...","message":"..."}], "follow_up_scripts": [{"name":"...","message":"..."},{"name":"...","message":"..."},{"name":"...","message":"..."}], "closing_scripts": [{"name":"...","message":"..."},{"name":"...","message":"..."},{"name":"...","message":"..."}], "broadcast_templates": [{"name":"...","message":"..."},{"name":"...","message":"..."},{"name":"...","message":"..."}] }` },
      checklist: { field: 'checklist_data', tokens: 3000, prompt: `${bizCtx}\n\nBuat checklist 30 hari baru. JSON: { "weeks": [{"week":1,"title":"...","tasks":[{"id":"w1t1","task":"...","category":"Brand","priority":"high","estimated_hours":2}]},{"week":2,"title":"...","tasks":[]},{"week":3,"title":"...","tasks":[]},{"week":4,"title":"...","tasks":[]}] } â 8-10 tasks per minggu.` },
      legal: { field: 'legal_data', tokens: 2000, prompt: `${bizCtx}\n\nBuat panduan legal ulang. JSON: { "business_structure_recommendation": {"recommended":"...","reason":"...","estimated_cost":"...","processing_time":"..."}, "required_licenses": [{"name":"...","issuer":"...","url":"...","required":true,"description":"..."}], "tax_obligations": [{"type":"...","threshold":"...","description":"..."}], "trademark_advice": "...", "domain_suggestions": ["..."], "social_media_handles": ["..."], "important_notes": ["..."] }` }
    }

    const cfg = prompts[tab]
    const newData = await callAI(cfg.prompt, cfg.tokens)

    await adminClient.from('brand_kits').update({
      [cfg.field]: newData,
      regen_counts: { ...regenCounts, [tab]: (regenCounts[tab] || 0) + 1 },
      updated_at: new Date().toISOString()
    }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('regenerate error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
