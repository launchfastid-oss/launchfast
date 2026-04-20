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
      .from('brand_kits')
      .select('business_name, strategy_data, order_id')
      .eq('id', brand_kit_id).single()
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

    const ctx = `Bisnis: ${biz}. Produk: ${product}. Target: ${target}. Tone: ${tone}. Goal: ${goal}. Tagline: ${oneLiner}`

    if (section === 'content') {
      // Generate 10 posts yang benar-benar spesifik dan siap pakai
      const postPlans = [
        { day: 1, platform: 'Instagram', type: 'Perkenalan', prompt: `Caption Instagram perkenalan untuk: ${ctx}. Kenalkan bisnis ini kepada followers baru. Tone hangat, personal, ceritakan keunikan. Sertakan emoji relevan. Akhiri dengan ajakan follow. 3-4 kalimat.` },
        { day: 3, platform: 'TikTok', type: 'Behind the Scene', prompt: `Caption TikTok untuk konten behind-the-scene dapur/proses memasak: ${ctx}. Hook di kalimat pertama yang bikin penasaran. Tone santai dan autentik. 2-3 kalimat + hook.` },
        { day: 5, platform: 'Instagram', type: 'Edukasi', prompt: `Caption Instagram edukatif tentang keunikan atau fakta menarik dari: ${ctx}. Buat orang belajar sesuatu baru. Format: hook pertanyaan → penjelasan singkat → kesimpulan. 4-5 kalimat.` },
        { day: 7, platform: 'Instagram', type: 'Promo', prompt: `Caption Instagram untuk promosi/diskon spesial: ${ctx}. Urgency yang natural, bukan pushy. Sebutkan benefit utama. CTA yang jelas. 3-4 kalimat.` },
        { day: 10, platform: 'Facebook', type: 'Cerita Inspiratif', prompt: `Caption Facebook cerita inspiratif pemilik bisnis atau pelanggan: ${ctx}. Emosional, relatable untuk ${target}. Buat pembaca merasa terhubung. 5-6 kalimat.` },
        { day: 12, platform: 'Instagram', type: 'Tips', prompt: `Caption Instagram berisi tips berguna yang relevan dengan: ${ctx}. Format listicle pendek (3 tips). Hook menarik, tips konkret, CTA untuk save. 4-5 kalimat.` },
        { day: 14, platform: 'TikTok', type: 'Testimoni', prompt: `Caption TikTok untuk video testimoni pelanggan: ${ctx}. Quote-style dari pelanggan puas, relatable untuk ${target}. Autentik dan tidak berlebihan. 2-3 kalimat.` },
        { day: 17, platform: 'Instagram', type: 'Product Showcase', prompt: `Caption Instagram untuk showcase produk unggulan: ${ctx}. Deskripsi yang menggugah selera/keinginan. Detail yang bikin pembaca ingin beli sekarang. CTA jelas. 4-5 kalimat.` },
        { day: 20, platform: 'Instagram', type: 'Interaktif', prompt: `Caption Instagram untuk konten interaktif (poll/pertanyaan/challenge): ${ctx}. Ajak followers berpartisipasi. Bikin mereka comment. Relevan dengan kehidupan ${target}. 3-4 kalimat + pertanyaan.` },
        { day: 25, platform: 'Facebook', type: 'Nilai & Misi', prompt: `Caption Facebook tentang nilai dan misi bisnis: ${ctx}. Bukan jualan, tapi membangun kepercayaan dan loyalitas. Bicara tentang "kenapa" bisnis ini ada. 5-6 kalimat.` },
      ]

      // Generate hashtags sekali untuk efisiensi
      const hashtagBase = await ask(anthropic,
        `Buat 15 hashtag Instagram yang relevan untuk: ${ctx}. Mix antara populer dan niche. Format: #tag1 #tag2 dst. Tanpa penjelasan.`, 150)

      const posts = []
      for (const plan of postPlans) {
        const caption = await ask(anthropic, plan.prompt, 250)
        // Pilih 5-7 hashtag yang paling relevan dari base
        const hashtags = hashtagBase.split(' ').filter(h => h.startsWith('#')).slice(0, 6)
        posts.push({
          day: plan.day,
          platform: plan.platform,
          type: plan.type,
          caption,
          hashtags,
        })
      }

      const data = { posts }
      await adminClient.from('brand_kits').update({ content_data: data }).eq('id', brand_kit_id)
      return NextResponse.json({ ok: true, section: 'content', count: posts.length })
    }

    if (section === 'legal') {
      const struct = await ask(anthropic, `Rekomendasi bentuk usaha terbaik untuk: ${ctx}. 1 kalimat.`)
      const reason = await ask(anthropic, `Kenapa ${struct} cocok untuk bisnis ini? 1 kalimat.`)
      const tip1 = await ask(anthropic, `Tips keuangan paling penting untuk UMKM baru seperti ini: ${ctx}. 1 kalimat.`)
      const tip2 = await ask(anthropic, `Tips legal paling penting untuk memulai bisnis ini. 1 kalimat.`)
      const tip3 = await ask(anthropic, `Tips pajak paling penting untuk UMKM kuliner Indonesia. 1 kalimat.`)

      const data = {
        business_structure: { recommendation: struct, reason },
        nib: { required: true, steps: ['Buka oss.go.id', 'Daftar akun dengan NIK', 'Isi data usaha', 'Pilih KBLI sesuai bisnis', 'Download NIB digital'], estimate_days: 1, cost: 'Gratis' },
        tax: { npwp_required: true, vat_required: false, pph_rate: '0.5% dari omzet bruto per bulan', notes: 'UMKM omzet di bawah Rp 500 juta per tahun tarif final 0.5%' },
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
