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
      system: 'Kamu adalah brand strategist expert untuk UMKM Indonesia. Kembalikan HANYA JSON valid tanpa markdown, backtick, atau teks tambahan apapun.',
      messages: [{ role: 'user', content: prompt }]
    })
    const raw = res.content[0].type === 'text' ? res.content[0].text : '{}'
    // Bersihkan output Claude
    let clean = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/gi, '')
      .trim()
    // Ambil JSON object pertama yang valid
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) {
      console.error('No JSON object found in AI response:', raw.slice(0, 200))
      return {}
    }
    try {
      return JSON.parse(match[0])
    } catch (e) {
      // Coba repair: truncate di closing brace terakhir yang valid
      const lastBrace = match[0].lastIndexOf('}')
      try {
        return JSON.parse(match[0].slice(0, lastBrace + 1))
      } catch {
        console.error('JSON parse failed after repair attempt:', String(e).slice(0, 100))
        return {}
      }
    }
  }

  try {
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

    const ctx = `Nama bisnis: ${ob.business_name || ''}
Target customer: ${ob.target_customer || ''}
Produk/jasa: ${ob.product_service || ''}
Model bisnis: ${ob.business_model || ''}
Kompetitor: ${ob.competitors || ''}
Tone of voice: ${ob.tone_of_voice || ''}
Kisaran harga: ${ob.price_range || ''}
Goal 30 hari: ${ob.thirty_day_goal || ''}`

    console.log('Generating brand kit for:', ob.business_name)

    const [strategyData, visualData, contentData, whatsappData, legalData] = await Promise.all([
      callAI(`${ctx}\n\nBuat strategi brand untuk bisnis ini dalam Bahasa Indonesia. Kembalikan JSON dengan struktur tepat ini:\n{"golden_one_liner":"kalimat positioning","stp":{"segmentation":"deskripsi","targeting":"deskripsi","positioning":"deskripsi"},"sb7":{"hero":{"headline":"judul","subheadline":"sub"},"problem":{"external":"masalah","internal":"rasa","philosophical":"kenapa salah"},"guide":{"empathy":"empati","authority":"otoritas"},"plan":["langkah1","langkah2","langkah3"],"cta_direct":"CTA","cta_transitional":"CTA soft","success":"jika berhasil","failure":"jika gagal"},"unique_value_proposition":"UVP","brand_story":"cerita brand"}`, 2000),

      callAI(`${ctx}\n\nBuat visual identity untuk bisnis ini dalam Bahasa Indonesia. Kembalikan JSON dengan struktur tepat ini:\n{"colors":[{"hex":"#8B4513","name":"Coklat Hangat","usage":"Warna utama","rationale":"Alasan"},{"hex":"#D4A574","name":"Krem Gold","usage":"Aksen","rationale":"Alasan"},{"hex":"#2D5016","name":"Hijau Daun","usage":"Highlight","rationale":"Alasan"},{"hex":"#1A1A1A","name":"Hitam","usage":"Teks","rationale":"Alasan"},{"hex":"#F9F5F0","name":"Putih Gading","usage":"Background","rationale":"Alasan"}],"typography":{"heading":{"font":"Poppins","weight":"700","rationale":"Alasan"},"body":{"font":"Open Sans","weight":"400","rationale":"Alasan"}},"logo_concepts":[{"style":"Wordmark","description":"deskripsi","tagline":"tagline"},{"style":"Lettermark","description":"deskripsi","tagline":"tagline"},{"style":"Combination Mark","description":"deskripsi","tagline":"tagline"}],"visual_direction":"arah visual"}`, 1500),

      callAI(`${ctx}\n\nBuat 8 ide konten sosial media untuk bisnis ini. Kembalikan JSON:\n{"content_pillars":[{"name":"Edukasi","percentage":30,"description":"konten edukatif"},{"name":"Promosi","percentage":25,"description":"promosi produk"},{"name":"Hiburan","percentage":25,"description":"konten menghibur"},{"name":"Komunitas","percentage":20,"description":"membangun komunitas"}],"posts":[{"day":1,"platform":"Instagram","type":"Perkenalan","caption":"Halo! Kami adalah bisnis yang...","hashtags":["#bisnis","#umkm"]},{"day":3,"platform":"TikTok","type":"Behind the Scene","caption":"Begini proses kami...","hashtags":["#behindthescene"]},{"day":5,"platform":"Instagram","type":"Edukasi","caption":"Tahukah kamu...","hashtags":["#edukasi"]},{"day":7,"platform":"Instagram","type":"Promo","caption":"Dapatkan penawaran spesial...","hashtags":["#promo"]},{"day":9,"platform":"TikTok","type":"Testimoni","caption":"Pelanggan kami bilang...","hashtags":["#testimoni"]},{"day":12,"platform":"Instagram","type":"Tips","caption":"3 tips untuk...","hashtags":["#tips"]},{"day":17,"platform":"Instagram","type":"Product Showcase","caption":"Perkenalkan produk kami...","hashtags":["#produk"]},{"day":20,"platform":"TikTok","type":"Interaktif","caption":"Kalian lebih suka mana?","hashtags":["#poll"]}]}`, 2000),

      callAI(`${ctx}\n\nBuat script WhatsApp untuk bisnis ini dalam Bahasa Indonesia. Kembalikan JSON:\n{"greeting_scripts":[{"name":"Cold Outreach","message":"pesan pembuka untuk prospek baru"},{"name":"Warm Lead","message":"pesan untuk yang sudah kenal"}],"follow_up_scripts":[{"name":"Follow Up H+1","message":"pesan follow up hari pertama"},{"name":"Follow Up H+3","message":"pesan follow up hari ketiga"},{"name":"Last Follow Up","message":"pesan follow up terakhir"}],"closing_scripts":[{"name":"Closing Harga","message":"respon saat customer tanya harga"},{"name":"Closing Pikir Dulu","message":"respon saat customer bilang pikir dulu"},{"name":"Closing Ada Provider","message":"respon saat ada kompetitor"}],"broadcast_templates":[{"name":"Flash Sale","message":"template broadcast promo"},{"name":"Testimoni Baru","message":"template broadcast testimoni"},{"name":"Info Produk","message":"template broadcast info produk"}]}`, 1500),

      callAI(`${ctx}\n\nBuat panduan legal bisnis dalam Bahasa Indonesia. Kembalikan JSON:\n{"business_structure_recommendation":{"recommended":"CV atau PT Perorangan","reason":"alasan pilihan","estimated_cost":"Rp 2-5 juta","processing_time":"1-2 minggu"},"required_licenses":[{"name":"NIB","issuer":"OSS","url":"oss.go.id","required":true,"description":"Nomor Induk Berusaha wajib untuk semua usaha"},{"name":"NPWP","issuer":"DJP","url":"pajak.go.id","required":true,"description":"Wajib untuk usaha dengan omzet di atas 500 juta per tahun"}],"tax_obligations":[{"type":"PPh Final UMKM 0.5%","threshold":"Omzet di bawah 4.8 miliar/tahun","description":"Tarif pajak khusus UMKM"}],"trademark_advice":"Daftarkan merek di DJKI untuk proteksi","domain_suggestions":["namabisnis.id","namabisnis.com"],"social_media_handles":["@namabisnisid"],"important_notes":["Pastikan NIB sudah aktif sebelum beroperasi","Simpan semua bukti transaksi untuk pelaporan pajak"]}`, 1500),
    ])

    console.log('All parallel AI calls done, inserting brand kit...')

    const { data: brandKit, error: insertError } = await adminClient.from('brand_kits').insert({
      order_id,
      user_id: (order as Record<string, unknown>).user_id as string,
      business_name: ob.business_name || 'Bisnis Kamu',
      is_preview_only: false,
      preview_data: {
        golden_one_liner: (strategyData as Record<string, unknown>).golden_one_liner || '',
        sb7_hero: ((strategyData as Record<string, unknown>).sb7 as Record<string, unknown>)?.hero || {},
        colors: (visualData as Record<string, unknown[]>).colors?.slice(0, 3) || [],
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
      console.error('Insert error:', insertError.message)
      return NextResponse.json({ error: 'Gagal simpan: ' + insertError.message }, { status: 500 })
    }

    await adminClient.from('orders').update({ status: 'completed' }).eq('id', order_id)
    console.log('Brand kit created successfully:', brandKit?.id)

    return NextResponse.json({ ok: true, brand_kit_id: brandKit?.id })
  } catch (err) {
    console.error('generate-full caught:', err)
    return NextResponse.json({ error: 'Internal server error: ' + String(err).slice(0, 200) }, { status: 500 })
  }
}
