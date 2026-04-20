import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

async function ask(anthropic: Anthropic, prompt: string, max = 300): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: max,
    messages: [{ role: 'user', content: prompt }]
  })
  return res.content[0].type === 'text' ? res.content[0].text.trim() : ''
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id, section } = await request.json()
    const adminClient = createAdminClient()

    const { data: kit } = await adminClient
      .from('brand_kits').select('business_name, strategy_data, order_id').eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: order } = await adminClient
      .from('orders').select('onboarding_id').eq('id', kit.order_id).single()

    let ob: Record<string, string> = {}
    if (order?.onboarding_id) {
      const { data } = await adminClient
        .from('onboarding_answers').select('*').eq('id', order.onboarding_id).single()
      if (data) ob = data
    }

    const strategy = (kit.strategy_data || {}) as Record<string, unknown>
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const biz = ob.business_name || kit.business_name
    const product = ob.product_service || ''
    const target = ob.target_customer || ''
    const tone = ob.tone_of_voice || 'Hangat & Personal'
    const goal = ob.thirty_day_goal || ''
    const oneLiner = (strategy.golden_one_liner as string) || ''
    const ctx = 'Bisnis: ' + biz + '. Produk: ' + product + '. Target: ' + target + '. Tone: ' + tone + '. Goal 30 hari: ' + goal + '. Tagline: ' + oneLiner

    if (section === 'content') {
      const postPlans = [
        { day: 1,  platform: 'Instagram', type: 'Perkenalan',       angle: 'Kenalkan bisnis dengan hangat. Ceritakan kisah mengapa bisnis ini ada. Akhiri dengan ajakan follow.' },
        { day: 3,  platform: 'TikTok',    type: 'Behind the Scene', angle: 'Hook: "Lihat apa yang terjadi sebelum makananmu tersaji..." Ceritakan proses menyiapkan produk dengan detail autentik.' },
        { day: 5,  platform: 'Instagram', type: 'Edukasi',          angle: 'Bagikan fakta atau tips menarik yang relevan dengan produk. Format: hook pertanyaan -> fakta menarik -> takeaway.' },
        { day: 7,  platform: 'Instagram', type: 'Promo',            angle: 'Promosi spesial dengan urgensi natural. Sebutkan benefit utama, bukan cuma diskon. CTA jelas.' },
        { day: 10, platform: 'Facebook',  type: 'Cerita',           angle: 'Cerita nyata pelanggan atau momen berkesan. Emosional, relatable untuk target customer.' },
        { day: 12, platform: 'Instagram', type: 'Tips',             angle: '3 tips berguna yang benar-benar membantu target customer dalam kehidupan sehari-hari. Format listicle.' },
        { day: 14, platform: 'TikTok',    type: 'Testimoni',        angle: 'Quote gaya percakapan dari pelanggan yang puas. Autentik, spesifik, tidak berlebihan.' },
        { day: 17, platform: 'Instagram', type: 'Product Showcase', angle: 'Highlight produk unggulan dengan deskripsi yang menggugah selera. Detail sensori: aroma, rasa, tekstur.' },
        { day: 20, platform: 'Instagram', type: 'Interaktif',       angle: 'Ajukan pertanyaan atau poll yang membuat followers komentar. Relevan dengan kehidupan target customer.' },
        { day: 25, platform: 'Facebook',  type: 'Nilai & Misi',     angle: 'Bicara tentang kenapa bisnis ini ada, bukan apa yang dijual. Bangun kepercayaan jangka panjang.' },
      ]

      // Generate hashtag base sekali
      const hashtagBase = await ask(anthropic,
        'Buat 12 hashtag Instagram untuk bisnis ini: ' + ctx + '. Campuran hashtag populer dan niche. Format: #tag1 #tag2 dst. Tanpa penjelasan.', 120)
      const allTags = hashtagBase.split(/s+/).filter(h => h.startsWith('#'))

      const posts = []
      for (const plan of postPlans) {
        const caption = await ask(anthropic,
          'Buat caption ' + plan.platform + ' untuk bisnis ini: ' + ctx + '
Angle: ' + plan.angle + '
Tone: ' + tone + '. Bahasa Indonesia yang natural dan engaging. Sertakan 1-2 emoji relevan. Langsung ke caption, tanpa penjelasan.', 280)
        const tags = allTags.slice(0, 6).join(' ')
        posts.push({ day: plan.day, platform: plan.platform, type: plan.type, caption, hashtags: tags })
      }

      await adminClient.from('brand_kits').update({ content_data: { posts } }).eq('id', brand_kit_id)
      return NextResponse.json({ ok: true, section: 'content', count: posts.length })
    }

    if (section === 'legal') {
      const struct = await ask(anthropic, 'Rekomendasi bentuk usaha untuk: ' + ctx + '. 1 kalimat singkat.')
      const reason = await ask(anthropic, 'Alasan singkat kenapa cocok untuk bisnis ini. 1 kalimat.')
      const tip1 = await ask(anthropic, 'Tips keuangan terpenting untuk UMKM kuliner baru. 1 kalimat praktis.')
      const tip2 = await ask(anthropic, 'Tips legal terpenting untuk memulai usaha kuliner di Indonesia. 1 kalimat.')
      const tip3 = await ask(anthropic, 'Tips pajak paling penting untuk UMKM kuliner Indonesia. 1 kalimat.')
      const data = {
        business_structure: { recommendation: struct, reason },
        nib: { required: true, steps: ['Buka oss.go.id', 'Daftar akun dengan NIK', 'Isi data usaha lengkap', 'Pilih KBLI yang sesuai', 'Download NIB digital'], estimate_days: 1, cost: 'Gratis' },
        tax: { npwp_required: true, vat_required: false, pph_rate: '0.5% dari omzet bruto per bulan', notes: 'UMKM omzet di bawah Rp 500 juta/tahun kena tarif final 0.5%' },
        permits: ['NIB dari OSS (wajib)', 'Sertifikat Laik Higiene Sanitasi Pangan dari Dinas Kesehatan', 'PIRT jika jual produk kemasan'],
        tips: [tip1, tip2, tip3],
      }
      await adminClient.from('brand_kits').update({ legal_data: data }).eq('id', brand_kit_id)
      return NextResponse.json({ ok: true, section: 'legal' })
    }

    return NextResponse.json({ error: 'Section not supported' }, { status: 400 })
  } catch (err) {
    console.error('fill-section:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
