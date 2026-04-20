import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

async function safeAI(anthropic: Anthropic, prompt: string, fallback: Record<string, unknown> = {}) {
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: 'Kamu adalah brand consultant Indonesia. Kembalikan HANYA JSON valid, tanpa markdown, tanpa komentar, tanpa backtick.',
      messages: [{ role: 'user', content: prompt }]
    })
    const text = res.content[0].type === 'text' ? res.content[0].text : ''
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    return JSON.parse(clean)
  } catch (e) {
    console.error('safeAI error:', e)
    return fallback
  }
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

    const { data: brandKit } = await adminClient.from('brand_kits').insert({
      user_id: user.id, order_id: order.id, is_preview_only: false,
      business_name: ob.business_name,
    }).select('id').single()
    if (!brandKit) return NextResponse.json({ error: 'Failed to create brand kit' }, { status: 500 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const ctx = 'Bisnis: ' + ob.business_name + '. Produk: ' + ob.product_service + '. Target customer: ' + ob.target_customer + '. Tone: ' + ob.tone_of_voice + '. Kompetitor: ' + ob.competitors + '. Harga: ' + ob.price_range + '. Goal: ' + ob.thirty_day_goal

    // 1. Strategy
    const strategy = await safeAI(anthropic,
      ctx + '\n\nBuat strategi brand lengkap. Return JSON:\n{"golden_one_liner":"tagline singkat dan powerful","unique_value_proposition":"apa yang membuat bisnis ini unik","target_segment":"deskripsi target market spesifik","brand_personality":["kata sifat1","kata sifat2","kata sifat3"],"sb7":{"hero":{"headline":"headline website yang menarik","subheadline":"subheadline yang menjelaskan benefit"},"problem":{"external":"masalah nyata customer","internal":"perasaan frustrasi customer","philosophical":"ketidakadilan yang dirasakan"},"guide":{"empathy":"pernyataan empati brand","authority":"bukti kredibilitas brand"},"plan":["langkah 1","langkah 2","langkah 3"],"cta_direct":"ajakan bertindak langsung","cta_transitional":"ajakan bertindak tidak langsung","success":"gambaran sukses setelah pakai produk","failure":"apa yang terjadi jika tidak bertindak"},"stp":{"segmentation":"segmentasi pasar","targeting":"target yang dipilih","positioning":"posisi brand di pasar"}}',
      { golden_one_liner: ob.business_name, unique_value_proposition: ob.product_service }
    )
    await adminClient.from('brand_kits').update({ strategy_data: strategy }).eq('id', brandKit.id)

    // 2. Visual
    const visual = await safeAI(anthropic,
      ctx + '\n\nBuat visual identity. Return JSON:\n{"colors":[{"hex":"#hex","name":"nama warna","usage":"penggunaan"},{"hex":"#hex","name":"nama warna","usage":"penggunaan"},{"hex":"#hex","name":"nama warna","usage":"penggunaan"},{"hex":"#hex","name":"nama warna","usage":"penggunaan"},{"hex":"#hex","name":"nama warna","usage":"penggunaan"}],"typography":{"heading":{"font":"nama font Google Fonts","reason":"alasan pemilihan"},"body":{"font":"nama font Google Fonts","reason":"alasan pemilihan"}},"logo_concepts":[{"name":"konsep 1","description":"deskripsi logo","style":"gaya desain"},{"name":"konsep 2","description":"deskripsi logo","style":"gaya desain"},{"name":"konsep 3","description":"deskripsi logo","style":"gaya desain"}],"visual_mood":"deskripsi mood visual brand"}',
      { colors: [{ hex: '#1D9E75', name: 'Hijau Brand', usage: 'Warna utama' }], typography: { heading: { font: 'Plus Jakarta Sans', reason: 'Modern' }, body: { font: 'Inter', reason: 'Readable' } } }
    )
    await adminClient.from('brand_kits').update({ visual_data: visual }).eq('id', brandKit.id)

    // 3. Content 30 hari
    const content = await safeAI(anthropic,
      ctx + '\n\nBuat 10 ide konten sosmed yang beragam. Return JSON:\n{"posts":[{"day":1,"platform":"Instagram","type":"Edukasi","caption":"caption lengkap yang engaging","hashtags":["#hashtag1","#hashtag2","#hashtag3"]},{"day":3,"platform":"TikTok","type":"Behind the Scene","caption":"caption untuk video","hashtags":["#hashtag1","#hashtag2"]},{"day":5,"platform":"Instagram","type":"Testimoni","caption":"caption testimoni","hashtags":["#hashtag1"]},{"day":7,"platform":"Facebook","type":"Promo","caption":"caption promo","hashtags":["#hashtag1"]},{"day":10,"platform":"Instagram","type":"Tips","caption":"caption tips","hashtags":["#hashtag1","#hashtag2"]},{"day":12,"platform":"TikTok","type":"Tutorial","caption":"caption tutorial","hashtags":["#hashtag1"]},{"day":14,"platform":"Instagram","type":"Quote","caption":"caption quote motivasi","hashtags":["#hashtag1","#hashtag2"]},{"day":17,"platform":"Instagram","type":"Product Showcase","caption":"caption showcase produk","hashtags":["#hashtag1","#hashtag2","#hashtag3"]},{"day":20,"platform":"Facebook","type":"FAQ","caption":"caption FAQ","hashtags":["#hashtag1"]},{"day":25,"platform":"Instagram","type":"CTA","caption":"caption call to action","hashtags":["#hashtag1","#hashtag2"]}]}',
      { posts: [] }
    )
    await adminClient.from('brand_kits').update({ content_data: content }).eq('id', brandKit.id)

    // 4. WhatsApp Scripts
    const whatsapp = await safeAI(anthropic,
      ctx + '\n\nBuat 5 WhatsApp script siap pakai. Return JSON:\n{"scripts":[{"type":"sapaan_baru","title":"Sapaan Customer Baru","message":"pesan WA lengkap untuk customer baru"},{"type":"follow_up","title":"Follow Up Setelah Tawaran","message":"pesan WA follow up"},{"type":"closing","title":"Closing Deal","message":"pesan WA untuk closing"},{"type":"broadcast_promo","title":"Broadcast Promosi","message":"pesan broadcast promo"},{"type":"handle_keberatan","title":"Handle Keberatan Harga","message":"pesan untuk handle keberatan"}]}',
      { scripts: [] }
    )
    await adminClient.from('brand_kits').update({ whatsapp_data: whatsapp }).eq('id', brandKit.id)

    // 5. Checklist
    const checklist = await safeAI(anthropic,
      ctx + '\n\nBuat checklist launch 4 minggu. Return JSON:\n{"weeks":[{"week":1,"theme":"Persiapan Brand","tasks":["setup akun Instagram bisnis","buat konten perkenalan","design logo sederhana","buat katalog produk","setup WhatsApp Business"]},{"week":2,"theme":"Launch Soft Opening","tasks":["posting konten pertama","hubungi 20 orang terdekat","minta review/testimoni pertama","aktif di grup WhatsApp lokal","setup Google My Business"]},{"week":3,"theme":"Akuisisi Customer","tasks":["jalankan konten edukasi","buat promo perkenalan","iklan Instagram Rp 50rb/hari","follow akun kompetitor dan engage","buat konten viral challenge"]},{"week":4,"theme":"Retensi dan Scale","tasks":["kirim broadcast ke semua customer","minta referral dari customer puas","evaluasi konten mana yang paling engage","plan konten bulan depan","buat loyalty program sederhana"]}]}',
      { weeks: [] }
    )
    await adminClient.from('brand_kits').update({ checklist_data: checklist }).eq('id', brandKit.id)

    // 6. Legal
    const legal = await safeAI(anthropic,
      ctx + '\n\nBuat panduan legal untuk UMKM Indonesia. Return JSON:\n{"business_structure":{"recommendation":"CV atau PT Perorangan","reason":"alasan rekomendasi"},"nib":{"required":true,"steps":["buka oss.go.id","daftar akun OSS","isi data usaha","download NIB"],"estimate_days":1,"cost":"Gratis"},"tax":{"npwp_required":true,"vat_required":false,"pph_rate":"0.5% dari omzet untuk UMKM","notes":"catatan penting pajak"},"permits":["NIB dari OSS","Izin Edar BPOM jika produk makanan/kosmetik"],"tips":["catat semua pengeluaran dari awal","pisahkan rekening pribadi dan bisnis","simpan semua bukti transaksi"]}',
      { business_structure: { recommendation: 'CV', reason: 'Mudah dan murah' }, nib: { required: true, steps: [], estimate_days: 1, cost: 'Gratis' } }
    )
    await adminClient.from('brand_kits').update({ legal_data: legal, updated_at: new Date().toISOString() }).eq('id', brandKit.id)

    await adminClient.from('orders').update({ status: 'completed' }).eq('id', order.id)

    return NextResponse.json({ ok: true, brand_kit_id: brandKit.id, order_id: order.id })
  } catch (err) {
    console.error('test-bypass error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
