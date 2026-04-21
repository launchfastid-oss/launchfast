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
    let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (!match) return {}
    try { return JSON.parse(match[0]) }
    catch {
      const lastBrace = match[0].lastIndexOf('}')
      try { return JSON.parse(match[0].slice(0, lastBrace + 1)) }
      catch { return {} }
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

    // Cek apakah user sudah punya logo
    const hasExistingLogo = ob.has_existing_logo === 'Ya, sudah punya logo'
    const existingLogoUrl = ob.existing_logo_url || ''
    const productImageUrl = ob.product_image_url || ''

    console.log('Has existing logo:', hasExistingLogo, '| Logo URL:', existingLogoUrl.slice(0,50))
    console.log('Product image URL:', productImageUrl.slice(0,50))

    const ctx = `Nama bisnis: ${ob.business_name || ''}
Target customer: ${ob.target_customer || ''}
Produk/jasa & keunggulan: ${ob.product_service || ''}
Model bisnis: ${ob.business_model || ''}
Kompetitor: ${ob.competitors || ''}
Tone of voice: ${ob.tone_of_voice || ''}
Kisaran harga: ${ob.price_range || ''}
Goal 30 hari: ${ob.thirty_day_goal || ''}`

    console.log('Generating brand kit for:', ob.business_name)

    const [strategyData, visualData, contentData, whatsappData, legalData] = await Promise.all([

      // STRATEGY: StoryBrand7 yang proper
      callAI(`${ctx}

Buat strategi brand menggunakan framework StoryBrand7 dalam Bahasa Indonesia.

PENTING untuk Golden One-Liner: gunakan format StoryBrand yang tepat:
"Kami membantu [TARGET CUSTOMER] yang [MASALAH/KEINGINAN] dengan [SOLUSI UNIK], sehingga mereka bisa [HASIL YANG DIINGINKAN]."

Untuk Brand Narrative: tulis SATU PARAGRAF DESKRIPTIF (3-4 kalimat) yang menjawab semua 7 elemen StoryBrand secara mengalir - jangan daftar, jangan bullet points. Paragraf harus menceritakan: siapa hero (customer), masalah eksternal+internal+filosofis yang mereka hadapi, bagaimana bisnis ini jadi guide dengan empati dan otoritas, apa rencana 3 langkah simple, apa CTA yang jelas, gambaran success jika ikut, dan konsekuensi jika tidak.

Kembalikan JSON:
{"golden_one_liner":"Kami membantu [target] yang [masalah] dengan [solusi], sehingga mereka [hasil]","brand_narrative":"Satu paragraf deskriptif 3-4 kalimat yang mengalir menjawab 7 elemen SB7","stp":{"segmentation":"deskripsi segmentasi","targeting":"target utama","positioning":"positioning statement"},"sb7":{"hero":"deskripsi hero/customer","problem_external":"masalah yang terlihat","problem_internal":"perasaan frustrasi dalam","problem_philosophical":"kenapa ini tidak adil","guide_empathy":"kalimat empati brand","guide_authority":"bukti otoritas brand","plan":["langkah 1 simple","langkah 2 simple","langkah 3 simple"],"cta_direct":"CTA utama","cta_transitional":"CTA soft","success":"gambaran hidup customer setelah pakai produk","failure":"konsekuensi jika tidak bertindak"},"unique_value_proposition":"UVP satu kalimat kuat"}`, 2500),

      // VISUAL: 3 logo concepts WAJIB
      callAI(`${ctx}

Buat visual identity dalam Bahasa Indonesia. WAJIB menghasilkan tepat 3 logo concepts.

Kembalikan JSON:
{"colors":[{"hex":"#WARNA1","name":"Nama Warna","usage":"kegunaan","rationale":"alasan"},{"hex":"#WARNA2","name":"Nama Warna","usage":"kegunaan","rationale":"alasan"},{"hex":"#WARNA3","name":"Nama Warna","usage":"kegunaan","rationale":"alasan"},{"hex":"#WARNA4","name":"Nama Warna","usage":"kegunaan","rationale":"alasan"},{"hex":"#WARNA5","name":"Nama Warna","usage":"kegunaan","rationale":"alasan"}],"typography":{"heading":{"font":"Nama Font","weight":"700","rationale":"alasan"},"body":{"font":"Nama Font","weight":"400","rationale":"alasan"}},"logo_concepts":[{"style":"Wordmark","description":"Deskripsi detail tampilan logo wordmark Ã¢ÂÂ huruf, font character, elemen dekoratif, nuansa visual","tagline":"tagline untuk opsi ini"},{"style":"Lettermark","description":"Deskripsi detail tampilan logo lettermark Ã¢ÂÂ inisial yang dipakai, bentuk, treatment huruf, simbol pendamping","tagline":"tagline untuk opsi ini"},{"style":"Combination Mark","description":"Deskripsi detail tampilan logo combination Ã¢ÂÂ ikon yang dipakai, makna simbolis, kombinasi dengan teks","tagline":"tagline untuk opsi ini"}],"visual_direction":"deskripsi arah visual keseluruhan brand"}`, 2000),

      // CONTENT: locked, placeholder saja sampai logo dipilih
      callAI(`${ctx}

Buat content pillars untuk strategi konten sosial media dalam Bahasa Indonesia.
CATATAN: Konten post hanya akan digenerate setelah user memilih logo.

Kembalikan JSON:
{"content_pillars":[{"name":"nama pilar","percentage":30,"description":"deskripsi pilar konten"},{"name":"nama pilar","percentage":25,"description":"deskripsi"},{"name":"nama pilar","percentage":25,"description":"deskripsi"},{"name":"nama pilar","percentage":20,"description":"deskripsi"}],"content_strategy":"deskripsi strategi konten keseluruhan 2-3 kalimat","posting_schedule":{"instagram":"berapa kali per minggu dan waktu terbaik","tiktok":"berapa kali per minggu dan waktu terbaik"},"posts":[],"locked":true,"locked_reason":"Pilih logo terlebih dahulu sebelum konten sosial media dibuat. Konten akan menggunakan logo yang kamu pilih."}`, 1000),

      // WHATSAPP SCRIPTS
      callAI(`${ctx}

Buat script WhatsApp untuk bisnis ini dalam Bahasa Indonesia. Kembalikan JSON:
{"greeting_scripts":[{"name":"Cold Outreach","message":"pesan pembuka untuk prospek baru yang belum kenal"},{"name":"Warm Lead","message":"pesan untuk yang sudah pernah interaksi"}],"follow_up_scripts":[{"name":"Follow Up H+1","message":"pesan follow up hari pertama"},{"name":"Follow Up H+3","message":"pesan follow up hari ketiga"},{"name":"Last Follow Up","message":"pesan follow up terakhir sebelum close"}],"closing_scripts":[{"name":"Handle Harga","message":"respon saat customer tanya harga terlalu mahal"},{"name":"Handle Pikir Dulu","message":"respon saat customer bilang pikir dulu"},{"name":"Handle Ada Kompetitor","message":"respon saat customer bilang sudah ada provider lain"}],"broadcast_templates":[{"name":"Flash Sale","message":"template broadcast promosi diskon"},{"name":"Social Proof","message":"template broadcast testimoni pelanggan"},{"name":"Produk Baru","message":"template broadcast peluncuran produk baru"}]}`, 1500),

      // LEGAL
      callAI(`${ctx}

Buat panduan legal bisnis dalam Bahasa Indonesia. Kembalikan JSON:
{"business_structure_recommendation":{"recommended":"CV atau PT Perorangan","reason":"alasan singkat kenapa cocok untuk bisnis ini","estimated_cost":"estimasi biaya pengurusan","processing_time":"estimasi waktu"},"required_licenses":[{"name":"NIB","issuer":"OSS","url":"oss.go.id","required":true,"description":"wajib untuk semua jenis usaha"},{"name":"NPWP","issuer":"DJP","url":"pajak.go.id","required":true,"description":"kewajiban perpajakan"}],"tax_obligations":[{"type":"PPh Final UMKM 0.5%","threshold":"Omzet di bawah Rp 4.8 miliar/tahun","description":"tarif khusus untuk UMKM"}],"trademark_advice":"saran pendaftaran merek dagang yang relevan","domain_suggestions":["domain1.id","domain2.com"],"social_media_handles":["@handle_suggestion"],"important_notes":["catatan penting 1","catatan penting 2"]}`, 1500),
    ])

    // AUTO-GENERATE CHECKLIST berdasarkan data yang sudah tersedia
    const hasLogo = (visualData as Record<string, unknown[]>).logo_concepts?.length > 0
    const hasColors = (visualData as Record<string, unknown[]>).colors?.length > 0
    const hasStrategy = !!(strategyData as Record<string, unknown>).golden_one_liner
    const hasWA = !!(whatsappData as Record<string, unknown>).greeting_scripts
    const hasLegal = !!(legalData as Record<string, unknown>).business_structure_recommendation

    const checklistData = {
      weeks: [
        {
          week: 1,
          title: "Fondasi Brand",
          tasks: [
            { id: "w1t1", task: "Isi onboarding bisnis (nama, target market, produk)", category: "Brand", priority: "high", estimated_hours: 0.5, completed: true, completed_note: "Selesai saat onboarding" },
            { id: "w1t2", task: "Review dan lock Golden One-Liner", category: "Brand", priority: "high", estimated_hours: 0.5, completed: hasStrategy, completed_note: hasStrategy ? "AI generated Ã¢ÂÂ review dan sesuaikan" : "" },
            { id: "w1t3", task: "Pilih dan lock logo dari 3 opsi AI", category: "Brand", priority: "high", estimated_hours: 1, completed: false, completed_note: "" },
            { id: "w1t4", task: "Konfirmasi palet warna brand", category: "Brand", priority: "high", estimated_hours: 0.5, completed: hasColors, completed_note: hasColors ? "AI generated Ã¢ÂÂ review dan sesuaikan" : "" },
            { id: "w1t5", task: "Review brand narrative dan brand story", category: "Brand", priority: "medium", estimated_hours: 0.5, completed: hasStrategy, completed_note: hasStrategy ? "AI generated" : "" },
            { id: "w1t6", task: "Setup akun Instagram bisnis", category: "Digital", priority: "high", estimated_hours: 1, completed: false, completed_note: "" },
            { id: "w1t7", task: "Setup akun TikTok bisnis", category: "Digital", priority: "high", estimated_hours: 0.5, completed: false, completed_note: "" },
          ]
        },
        {
          week: 2,
          title: "Digital Presence",
          tasks: [
            { id: "w2t1", task: "Upload foto profil dengan logo yang sudah dipilih", category: "Digital", priority: "high", estimated_hours: 0.5, completed: false, completed_note: "" },
            { id: "w2t2", task: "Tulis bio Instagram menggunakan Golden One-Liner", category: "Digital", priority: "high", estimated_hours: 0.5, completed: false, completed_note: "" },
            { id: "w2t3", task: "Generate konten 30 hari setelah logo di-lock", category: "Digital", priority: "high", estimated_hours: 0, completed: false, completed_note: "" },
            { id: "w2t4", task: "Daftarkan domain website (.id atau .com)", category: "Digital", priority: "medium", estimated_hours: 0.5, completed: false, completed_note: "" },
            { id: "w2t5", task: "Setup WhatsApp Business dengan foto logo", category: "Digital", priority: "high", estimated_hours: 1, completed: false, completed_note: "" },
            { id: "w2t6", task: "Simpan script WhatsApp dari brand kit", category: "Sales", priority: "high", estimated_hours: 0.5, completed: hasWA, completed_note: hasWA ? "WA Scripts sudah ready di brand kit" : "" },
            { id: "w2t7", task: "Post konten perkenalan pertama di Instagram", category: "Digital", priority: "high", estimated_hours: 1, completed: false, completed_note: "" },
          ]
        },
        {
          week: 3,
          title: "Sales & Marketing",
          tasks: [
            { id: "w3t1", task: "Posting rutin sesuai jadwal konten harian", category: "Digital", priority: "high", estimated_hours: 1, completed: false, completed_note: "" },
            { id: "w3t2", task: "Mulai cold outreach via WhatsApp (5 prospek/hari)", category: "Sales", priority: "high", estimated_hours: 1, completed: false, completed_note: "" },
            { id: "w3t3", task: "Kumpulkan 3 testimoni pertama dari customer", category: "Sales", priority: "high", estimated_hours: 2, completed: false, completed_note: "" },
            { id: "w3t4", task: "Daftar NIB di OSS (oss.go.id)", category: "Legal", priority: "high", estimated_hours: 2, completed: false, completed_note: "" },
            { id: "w3t5", task: "Buat NPWP bisnis jika belum ada", category: "Legal", priority: "medium", estimated_hours: 2, completed: false, completed_note: "" },
            { id: "w3t6", task: "Setup metode pembayaran (QRIS, transfer bank)", category: "Operations", priority: "high", estimated_hours: 1, completed: false, completed_note: "" },
          ]
        },
        {
          week: 4,
          title: "Scale & Optimasi",
          tasks: [
            { id: "w4t1", task: "Evaluasi konten Ã¢ÂÂ mana yang paling engagement tinggi", category: "Digital", priority: "medium", estimated_hours: 1, completed: false, completed_note: "" },
            { id: "w4t2", task: "Broadcast ke list prospek dengan template dari brand kit", category: "Sales", priority: "high", estimated_hours: 1, completed: false, completed_note: "" },
            { id: "w4t3", task: "Review dan update bio semua platform sosmed", category: "Digital", priority: "low", estimated_hours: 0.5, completed: false, completed_note: "" },
            { id: "w4t4", task: "Hitung ROI marketing bulan pertama", category: "Operations", priority: "medium", estimated_hours: 1, completed: false, completed_note: "" },
            { id: "w4t5", task: "Rencanakan konten bulan ke-2 berdasarkan data", category: "Digital", priority: "medium", estimated_hours: 2, completed: false, completed_note: "" },
            { id: "w4t6", task: "Pertimbangkan pendaftaran merek dagang di DJKI", category: "Legal", priority: "low", estimated_hours: 1, completed: false, completed_note: "" },
          ]
        }
      ],
      auto_checked: {
        brand_kit_generated: true,
        onboarding_completed: true,
        strategy_generated: hasStrategy,
        visual_generated: hasColors,
        logo_generated: hasLogo || hasExistingLogo,
        logo_existing: hasExistingLogo,
        wa_scripts_ready: hasWA,
        legal_guide_ready: hasLegal,
        logo_locked: hasExistingLogo, // auto-lock jika sudah punya logo
        content_generated: false,
        product_photo_uploaded: !!productImageUrl,
      }
    }

    console.log('All AI calls done, inserting brand kit...')

    const { data: brandKit, error: insertError } = await adminClient.from('brand_kits').insert({
      order_id,
      user_id: (order as Record<string, unknown>).user_id as string,
      business_name: ob.business_name || 'Bisnis Kamu',
      is_preview_only: false,
      preview_data: {
        golden_one_liner: (strategyData as Record<string, unknown>).golden_one_liner || '',
        sb7_hero: ((strategyData as Record<string, unknown>).sb7 as Record<string, unknown>)?.hero || '',
        colors: (visualData as Record<string, unknown[]>).colors?.slice(0, 3) || [],
      },
      strategy_data: strategyData,
      visual_data: hasExistingLogo
        ? { ...visualData, existing_logo_url: existingLogoUrl, logo_locked: true, locked_logo_url: existingLogoUrl }
        : visualData,
      content_data: hasExistingLogo
        ? { ...contentData, locked: false, locked_reason: undefined }
        : contentData,
      whatsapp_data: whatsappData,
      checklist_data: checklistData,
      legal_data: legalData,
      regen_counts: { strategy: 0, visual: 0, content: 0, whatsapp: 0, checklist: 0, legal: 0 },
    }).select('id').single()

    if (insertError) {
      console.error('Insert error:', insertError.message)
      return NextResponse.json({ error: 'Gagal simpan: ' + insertError.message }, { status: 500 })
    }

    await adminClient.from('orders').update({ status: 'completed' }).eq('id', order_id)
    console.log('Brand kit created:', brandKit?.id)

    return NextResponse.json({ ok: true, brand_kit_id: brandKit?.id })
  } catch (err) {
    console.error('generate-full caught:', err)
    return NextResponse.json({ error: 'Internal server error: ' + String(err).slice(0, 200) }, { status: 500 })
  }
}
