import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const internalKey = request.headers.get('x-internal-key')
    if (internalKey !== process.env.MIDTRANS_SERVER_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { order_id } = await request.json()
    if (!order_id) return NextResponse.json({ error: 'order_id required' }, { status: 400 })

    const adminClient = createAdminClient()
    await adminClient.from('orders').update({ status: 'generating' }).eq('id', order_id)

    const { data: order } = await adminClient
      .from('orders').select('*, onboarding_answers(*)').eq('id', order_id).single()
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 })

    const ob = (order as Record<string, unknown>).onboarding_answers as Record<string, string>
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    async function callAI(prompt: string, maxTokens = 2000): Promise<Record<string, unknown>> {
      const res = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: maxTokens,
        system: 'Kamu adalah brand strategist expert untuk UMKM Indonesia. Kembalikan HANYA JSON valid tanpa markdown atau backtick.',
        messages: [{ role: 'user', content: prompt }]
      })
      const raw = res.content[0].type === 'text' ? res.content[0].text : ''
      const clean = raw.replace(/```json|```/g, '').trim()
      const match = clean.match(/\{:[\s\S]*\}/)
      return JSON.parse(match ? match[0] : clean)
    }

    const bizCtx = `Nama bisnis: ${ob.business_name}
Target customer: ${ob.target_customer}
Produk/jasa: ${ob.product_service}
Model bisnis: ${ob.business_model}
Kompetitor: ${ob.competitors}
Tone of voice: ${ob.tone_of_voice}
Kisaran harga: ${ob.price_range}
Goal 30 hari: ${ob.thirty_day_goal}`

    // 1. Strategy
    const strategyData = await callAI(`${bizCtx}

Buat strategi brand lengkap dalam Bahasa Indonesia. Return JSON:
{
  "golden_one_liner": "satu kalimat positioning kuat",
  "stp": {
    "segmentation": "segmentasi pasar detail",
    "targeting": "target utama yang dipilih",
    "positioning": "pernyataan positioning yang jelas"
  },
  "sb7": {
    "hero": { "headline": "...", "subheadline": "..." },
    "problem": { "external": "...", "internal": "...", "philosophical": "..." },
    "guide": { "empathy": "...", "authority": "..." },
    "plan": ["langkah 1", "langkah 2", "langkah 3"],
    "cta_direct": "Tombol CTA langsung",
    "cta_transitional": "Tombol CTA transitional",
    "success": "gambaran sukses setelah pakai produk/jasa",
    "failure": "apa yang hilang jika tidak action"
  },
  "unique_value_proposition": "proposini nilai unik",
  "brand_story": "cerita brand 2-3 paragraf yang menyentuh"
}`, 3000)

    // 2. Visual
    const visualData = await callAI(`${bizCtx}

Buat visual identity dalam Bahasa Indonesia. Return JSON:
{
  "colors": [
    {"hex": "#XXXXXX", "name": "Primary", "usage": "tombol utama, highlight", "rationale": "alasan pemilihan"},
    {"hex": "#XXXXXX", "name": "Secondary", "usage": "background section", "rationale": "alasan"},
    {"hex": "#XXXXXX", "name": "Accent", "usage": "badge, notifikasi", "rationale": "alasan"},
    {"hex": "#XXXXXX", "name": "Dark", "usage": "teks utama", "rationale": "alasan"},
    {"hex": "#XXXXXX", "name": "Light", "usage": "background", "rationale": "alasan"}
  ],
  "typography": {
    "heading": {"font": "nama font Google Fonts", "weight": "700", "rationale": "alasan"},
    "body": {"font": "nama font Google Fonts", "weight": "400", "rationale": "alasan"}
  },
  "logo_concepts": [
    {"style": "Wordmark", "description": "deskripsi konsep logo 1", "tagline": "tagline untuk logo ini"},
    {"style": "Lettermark", "description": "deskripsi konsep logo 2", "tagline": "tagline"},
    {"style": "Combination Mark", "description": "deskripsi konsep logo 3", "tagline": "tagline"}
  ],
  "visual_direction": "arahan visual keseluruhan brand"
}`)

    // 3. Content
    const contentData = await callAI(`${bizCtx}

Buat rencana konten 30 hari untuk sosial media dalam Bahasa Indonesia. Return JSON:
{
  "content_pillars": [
    {"name": "Nama Pilar 1", "percentage": 40, "description": "deskripsi"},
    {"name": "Nama Pilar 2", "percentage": 30, "description": "deskripsi"},
    {"name": "Nama Pilar 3", "percentage": 20, "description": "deskripsi"},
    {"name": "Nama Pilar 4", "percentage": 10, "description": "deskripsi"}
  ],
  "posts": [
    {"day": 1, "pillar": "Nama Pilar", "platform": "Instagram", "type": "Carousel", "caption": "caption post hari 1 yang engaging dengan CTA", "hashtags": "#hashtag1 #hashtag2 #hashtag3"},
    {"day": 2, "pillar": "Nama Pilar", "platform": "Instagram", "type": "Reels", "caption": "caption hari 2", "hashtags": "..."}
  ]
}

Buat 30 posts (hari 1-30), variasikan platform (Instagram, TikTok, Facebook) dan type (Carousel, Reels, Story, Feed Post).`, 4000)

    // 4. WhatsApp
    const whatsappData = await callAI(`${bizCtx}

Buat script WhatsApp dalam Bahasa Indonesia. Return JSON:
{
  "greeting_scripts": [{"name": "Sapaan Pertama - Cold", "message": "pesan wa lengkap"}, {"name": "Sapaan Pertama - Warm", "message": "..."}],
  "follow_up_scripts": [{"name": "Follow Up H+1", "message": "..."}, {"name": "Follow Up H+3", "message": "..."}, {"name": "Follow Up Terakhir", "message": "..."}],
  "closing_scripts": [{"name": "Closing - Harga", "message": "..."}, {"name": "Closing - Perlu Pikir", "message": "..."}, {"name": "Closing - Sudah Ada Provider", "message": "..."}],
  "broadcast_templates": [{"name": "Promo Flash Sale", "message": "..."}, {"name": "Testimoni Customer", "message": "..."}, {"name": "Peluncuran Produk Baru", "message": "..."}]
}`)

    // 5. Checklist
    const checklistData = await callAI(`${bizCtx}

Buat checklist peluncuran bisnis 30 hari dalam Bahasa Indonesia. Return JSON:
{
  "weeks": [
    {"week": 1, "title": "Persiapan Fondasi", "tasks": [{"id": "w1t1", "task": "Deskripsi tugas spesifik", "category": "Brand", "priority": "high", "estimated_hours": 2}]},
    {"week": 2, "title": "...", "tasks": []},
    {"week": 3, "title": "...", "tasks": []},
    {"week": 4, "title": "...", "tasks": []}
  ]
}

Buat 8-10 tasks per minggu. Category: Brand/Digital/Sales/Operations/Legal. Priority: high/medium/low.`, 3000)

    // 6. Legal
    const legalData = await callAI(`${bizCtx}

Buat panduan legalitas bisnis dalam Bahasa Indonesia. Return JSON:
{
  "business_structure_recommendation": {
    "recommended": "PT Perorangan / CV / UD / Perseorangan",
    "reason": "alasan rekomendasi berdasarkan profil bisnis",
    "estimated_cost": "estimasi biaya pendirian",
    "processing_time": "estimasi waktu proses"
  },
  "required_licenses": [{"name": "NIB (Nomor Induk Berusaha)", "issuer": "OSS", "url": "oss.go.id", "required": true, "description": "wajib untuk semua usaha"}],
  "tax_obligations": [{"type": "NPWP Pribadi/Badan", "threshold": "semua WP", "description": "kewajiban pajak dasar"}],
  "trademark_advice": "saran pendaftaran merek dagang",
  "domain_suggestions": ["nama-bisnis.com"],
  "social_media_handles": ["@namabisnis"],
  "important_notes": ["catatan penting 1", "catatan penting 2"]
}`)

    const { data: brandKit } = await adminClient.from('brand_kits').insert({
      order_id: order_id,
      user_id: order.user_id,
      business_name: ob.business_name,
      is_preview_only: false,
      preview_data: {
        golden_one_liner: (strategyData as Record<string, unknown>).golden_one_liner,
        sb7_hero: ((strategyData as Record<string, unknown>).sb7 as Record<string, unknown>)?.hero,
        colors: (visualData as Record<string, unknown>).colors
      },
      strategy_data: strategyData,
      visual_data: visualData,
      content_data: contentData,
      whatsapp_data: whatsappData,
      checklist_data: checklistData,
      legal_data: legalData,
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
