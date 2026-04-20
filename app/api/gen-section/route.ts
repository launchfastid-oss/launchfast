import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id, section, onboarding } = await request.json()
    const adminClient = createAdminClient()
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const ctx = 'Bisnis: ' + onboarding.business_name + '. Produk: ' + onboarding.product_service + '. Customer: ' + onboarding.target_customer + '. Tone: ' + onboarding.tone_of_voice + '. Harga: ' + onboarding.price_range

    const prompts: Record<string, string> = {
      strategy: ctx + '. Buat strategi brand. Return JSON satu objek: {"golden_one_liner":"...","unique_value_proposition":"...","brand_personality":["...","...","..."],"sb7":{"hero":{"headline":"...","subheadline":"..."},"problem":{"external":"...","internal":"..."},"plan":["...","...","..."],"cta_direct":"...","cta_transitional":"...","success":"..."},"stp":{"segmentation":"...","targeting":"...","positioning":"..."}}',
      visual: ctx + '. Buat visual identity. Return JSON: {"colors":[{"hex":"#1a73e8","name":"Biru Kepercayaan","usage":"Warna utama"},{"hex":"#34a853","name":"Hijau Sukses","usage":"Aksen"},{"hex":"#fbbc04","name":"Kuning Energi","usage":"Highlight"},{"hex":"#1a1a2e","name":"Gelap Elegan","usage":"Teks"},{"hex":"#f8f9fa","name":"Putih Bersih","usage":"Background"}],"typography":{"heading":{"font":"Plus Jakarta Sans","reason":"Modern dan profesional"},"body":{"font":"Inter","reason":"Mudah dibaca"}},"logo_concepts":[{"name":"Konsep 1","description":"...","style":"Minimalis"},{"name":"Konsep 2","description":"...","style":"Modern"},{"name":"Konsep 3","description":"...","style":"Bold"}],"visual_mood":"..."}',
      content: ctx + '. Buat 8 konten sosmed. Return JSON: {"posts":[{"day":1,"platform":"Instagram","type":"Perkenalan","caption":"...","hashtags":["#umkm"]},{"day":3,"platform":"TikTok","type":"Tips","caption":"...","hashtags":["#tips"]},{"day":5,"platform":"Instagram","type":"Produk","caption":"...","hashtags":["#produk"]},{"day":7,"platform":"Instagram","type":"Testimoni","caption":"...","hashtags":["#review"]},{"day":10,"platform":"Facebook","type":"Edukasi","caption":"...","hashtags":["#edukasi"]},{"day":14,"platform":"Instagram","type":"Promo","caption":"...","hashtags":["#promo"]},{"day":18,"platform":"TikTok","type":"Behind Scene","caption":"...","hashtags":["#bts"]},{"day":21,"platform":"Instagram","type":"CTA","caption":"...","hashtags":["#cta"]}]}',
      whatsapp: ctx + '. Buat 5 script WhatsApp. Return JSON: {"scripts":[{"type":"sapaan_baru","title":"Sapaan Customer Baru","message":"Halo kak! Saya dari ' + onboarding.business_name + '..."},{"type":"follow_up","title":"Follow Up","message":"Halo kak, kemarin sempat tanya..."},{"type":"closing","title":"Closing Deal","message":"Kak, untuk hari ini kita ada..."},{"type":"broadcast","title":"Broadcast Promo","message":"Halo semuanya! Ada kabar gembira..."},{"type":"keberatan","title":"Handle Keberatan Harga","message":"Kak, saya mengerti concern kakak..."}]}',
      checklist: ctx + '. Buat checklist 4 minggu. Return JSON: {"weeks":[{"week":1,"theme":"Persiapan","tasks":["Setup akun media sosial","Buat konten perkenalan","Foto produk profesional","Setup WhatsApp Business","Buat katalog digital"]},{"week":2,"theme":"Soft Launch","tasks":["Post konten pertama","Hubungi 20 kenalan terdekat","Minta 3 testimoni pertama","Daftar di marketplace","Aktif reply semua komentar"]},{"week":3,"theme":"Akuisisi","tasks":["Jalankan iklan Rp 50rb/hari","Buat konten viral","Kolaborasi dengan 1 UMKM lain","Follow dan engage kompetitor","Buat promo bundle menarik"]},{"week":4,"theme":"Evaluasi","tasks":["Analisis konten terbaik","Survey kepuasan customer","Plan konten bulan depan","Buat program referral","Evaluasi harga dan produk"]}]}',
      legal: ctx + '. Buat panduan legal UMKM Indonesia. Return JSON: {"business_structure":{"recommendation":"PT Perorangan","reason":"Mudah didirikan, biaya murah, cocok untuk UMKM"},"nib":{"required":true,"steps":["Buka oss.go.id","Buat akun dengan NIK","Isi data usaha lengkap","Pilih KBLI yang sesuai","Unduh NIB digital"],"estimate_days":1,"cost":"Gratis"},"tax":{"npwp_required":true,"vat_required":false,"pph_rate":"0.5% dari omzet bruto per bulan","notes":"UMKM dengan omzet di bawah 500 juta setahun bebas PPh"},"permits":["NIB dari OSS (wajib)","PIRT jika produk makanan rumahan","Izin Edar BPOM jika kosmetik"],"tips":["Pisahkan rekening pribadi dan bisnis sejak awal","Catat semua pengeluaran dengan aplikasi sederhana","Simpan semua nota dan bukti transaksi minimal 5 tahun"]}'
    }

    const prompt = prompts[section]
    if (!prompt) return NextResponse.json({ error: 'Invalid section: ' + section }, { status: 400 })

    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      system: 'Kamu brand consultant Indonesia terbaik. Return HANYA JSON valid, tidak ada teks lain.',
      messages: [{ role: 'user', content: prompt }]
    })

    const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
    const clean = text.replace(/```json/g, '').replace(/```/g, '').trim()
    const match = clean.match(/\{[\s\S]*\}/)
    const data = JSON.parse(match ? match[0] : clean)

    const fieldMap: Record<string, string> = {
      strategy: 'strategy_data', visual: 'visual_data', content: 'content_data',
      whatsapp: 'whatsapp_data', checklist: 'checklist_data', legal: 'legal_data'
    }
    await adminClient.from('brand_kits').update({ [fieldMap[section]]: data }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, section, data })
  } catch (err) {
    console.error('gen-section error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
