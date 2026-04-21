import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export async function POST(request: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  async function callAI(prompt: string, maxTokens = 2000): Promise<Record<string, unknown>> {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: maxTokens,
      system: 'Kamu adalah brand strategist expert untuk UMKM Indonesia. Kembalikan HANYA JSON valid tanpa markdown atau backtick.',
      messages: [{ role: 'user', content: prompt }]
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    const clean = raw.replace(/```json|```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    return JSON.parse(match ? match[0] : clean)
  }

  try {
    // Auth: accept Supabase session atau internal key
    const internalKey = request.headers.get('x-internal-key')
    const validInternalKey = process.env.INTERNAL_KEY || 'launchfast-internal-2025'

    if (internalKey !== validInternalKey) {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { order_id } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const adminClient = createAdminClient()
    await adminClient.from('orders').update({ status: 'generating' }).eq('id', order_id)

    const { data: order } = await adminClient
      .from('orders').select('*, onboarding_answers(*)').eq('id', order_id).single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const ob = (order as Record<string, unknown>).onboarding_answers as Record<string, string>
    if (!ob) return NextResponse.json({ error: 'Onboarding data not found' }, { status: 404 })

    const bizCtx = `Nama bisnis: ${ob.business_name || ''}
Target customer: ${ob.target_customer || ''}
Produk/jasa: ${ob.product_service || ''}
Model bisnis: ${ob.business_model || ''}
Kompetitor: ${ob.competitors || ''}
Tone of voice: ${ob.tone_of_voice || ''}
Kisaran harga: ${ob.price_range || ''}
Goal 30 hari: ${ob.thirty_day_goal || ''}`

    console.log('Starting parallel AI generation for order:', order_id)
    console.log('Business:', ob.business_name)

    // Jalankan semua 5 AI calls PARALEL — dari 75s menjadi ~15s
    const [strategyData, visualData, contentData, whatsappData, legalData] = await Promise.all([

      callAI(`${bizCtx}\n\nBuat strategi brand lengkap dalam Bahasa Indonesia. Return JSON:\n{"golden_one_liner":"...","stp":{"segmentation":"...","targeting":"...","positioning":"..."},"sb7":{"hero":{"headline":"...","subheadline":"..."},"problem":{"external":"...","internal":"...","philosophical":"..."},"guide":{"empathy":"...","authority":"..."},"plan":["...","...","..."],"cta_direct":"...","cta_transitional":"...","success":"...","failure":"..."},"unique_value_proposition":"...","brand_story":"..."}`, 2000),

      callAI(`${bizCtx}\n\nBuat visual identity dalam Bahasa Indonesia. Return JSON:\n{"colors":[{"hex":"#1A1A2E","name":"Primary","usage":"...","rationale":"..."},{"hex":"#16213E","name":"Secondary","usage":"...","rationale":"..."},{"hex":"#0F3460","name":"Accent","usage":"...","rationale":"..."},{"hex":"#E94560","name":"Dark","usage":"...","rationale":"..."},{"hex":"#F5F5F5","name":"Light","usage":"...","rationale":"..."}],"typography":{"heading":{"font":"Poppins","weight":"700","rationale":"..."},"body":{"font":"Open Sans","weight":"400","rationale":"..."}},"logo_concepts":[{"style":"Wordmark","description":"...","tagline":"..."},{"style":"Lettermark","description":"...","tagline":"..."},{"style":"Combination Mark","description":"...","tagline":"..."}],"visual_direction":"..."}`),

      callAI(`${bizCtx}\n\nBuat rencana 10 konten sosial media terbaik dalam Bahasa Indonesia untuk Instagram dan TikTok. Return JSON:\n{"content_pillars":[{"name":"...","percentage":40,"description":"..."},{"name":"...","percentage":30,"description":"..."},{"name":"...","percentage":20,"description":"..."},{"name":"...","percentage":10,"description":"..."}],"posts":[{"day":1,"platform":"Instagram","type":"Perkenalan","caption":"caption lengkap","hashtags":["#tag1","#tag2"]},{"day":3,"platform":"TikTok","type":"Behind the Scene","caption":"...","hashtags":["#tag1"]},{"day":5,"platform":"Instagram","type":"Edukasi","caption":"...","hashtags":["#tag1"]},{"day":7,"platform":"Instagram","type":"Promo","caption":"...","hashtags":["#tag1"]},{"day":9,"platform":"TikTok","type":"Testimoni","caption":"...","hashtags":["#tag1"]},{"day":12,"platform":"Instagram","type":"Tips","caption":"...","hashtags":["#tag1"]},{"day":14,"platform":"TikTok","type":"Behind the Scene","caption":"...","hashtags":["#tag1"]},{"day":17,"platform":"Instagram","type":"Product Showcase","caption":"...","hashtags":["#tag1"]},{"day":20,"platform":"Instagram","type":"Interaktif","caption":"...","hashtags":["#tag1"]},{"day":25,"platform":"TikTok","type":"Nilai & Misi","caption":"...","hashtags":["#tag1"]}]}`, 3000),

      callAI(`${bizCtx}\n\nBuat script WhatsApp dalam Bahasa Indonesia. Return JSON:\n{"greeting_scripts":[{"name":"Cold Outreach","message":"..."},{"name":"Warm Lead","message":"..."}],"follow_up_scripts":[{"name":"Follow Up H+1","message":"..."},{"name":"Follow Up H+3","message":"..."},{"name":"Last Follow Up","message":"..."}],"closing_scripts":[{"name":"Closing Harga","message":"..."},{"name":"Closing Masih Pikir","message":"..."},{"name":"Closing Sudah Ada Provider","message":"..."}],"broadcast_templates":[{"name":"Flash Sale","message":"..."},{"name":"Testimoni","message":"..."},{"name":"Produk Baru","message":"..."}]}`, 2000),

      callAI(`${bizCtx}\n\nBuat panduan legalitas bisnis dalam Bahasa Indonesia. Return JSON:\n{"business_structure_recommendation":{"recommended":"CV","reason":"...","estimated_cost":"Rp 2-5 juta","processing_time":"1-2 minggu"},"required_licenses":[{"name":"NIB","issuer":"OSS","url":"oss.go.id","required":true,"description":"..."},{"name":"NPWP","issuer":"DJP","url":"pajak.go.id","required":true,"description":"..."}],"tax_obligations":[{"type":"PPh 21","threshold":"...","description":"..."}],"trademark_advice":"...","domain_suggestions":["nama.com","nama.id"],"social_media_handles":["@namahandle"],"important_notes":["...","..."]}`, 2000),

    ])

    console.log('All AI calls completed, saving brand kit...')

    const { data: brandKit, error: insertError } = await adminClient.from('brand_kits').insert({
      order_id,
      user_id: (order as Record<string, unknown>).user_id as string,
      business_name: ob.business_name || 'Bisnis Kamu',
      is_preview_only: false,
      preview_data: {
        golden_one_liner: (strategyData as Record<string, unknown>).golden_one_liner,
        sb7_hero: ((strategyData as Record<string, unknown>).sb7 as Record<string, unknown>)?.hero,
        colors: (visualData as Record<string, unknown[]>).colors?.slice(0, 3),
      },
      strategy_data: strategyData,
      visual_data: visualData,
      content_data: contentData,
      whatsapp_data: whatsappData,
      checklist_data: { weeks: [] },
      legal_data: legalData,
      regen_counts: { strategy: 0, visual: 0, content: 0, whatsapp: 0, checklist: 0, legal: 0 },
    }).select('id').single()

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json({ error: 'Gagal simpan brand kit: ' + insertError.message }, { status: 500 })
    }

    await adminClient.from('orders').update({ status: 'completed' }).eq('id', order_id)
    console.log('Brand kit created:', brandKit?.id)

    return NextResponse.json({ ok: true, brand_kit_id: brandKit?.id })

  } catch (err) {
    console.error('generate-full error:', err)
    return NextResponse.json({ error: 'Internal server error: ' + String(err).slice(0, 200) }, { status: 500 })
  }
}
