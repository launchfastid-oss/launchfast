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
    const ctx = 'Bisnis: ' + biz + '. Produk: ' + product + '. Target: ' + target + '. Tone: ' + tone + '. Goal: ' + goal + '. Tagline: ' + oneLiner

    if (section === 'content') {
      const plans = [
        { day: 1,  plat: 'Instagram', type: 'Perkenalan',       angle: 'Kenalkan bisnis dengan hangat. Kisah mengapa bisnis ini ada. Ajakan follow.' },
        { day: 3,  plat: 'TikTok',    type: 'Behind the Scene', angle: 'Hook mengejutkan di kalimat pertama. Proses autentik di dapur/produksi.' },
        { day: 5,  plat: 'Instagram', type: 'Edukasi',          angle: 'Fakta menarik tentang produk. Hook pertanyaan - fakta - takeaway.' },
        { day: 7,  plat: 'Instagram', type: 'Promo',            angle: 'Penawaran spesial dengan urgensi natural. Benefit utama + CTA jelas.' },
        { day: 10, plat: 'Facebook',  type: 'Cerita',           angle: 'Cerita pelanggan nyata yang relatable untuk target customer.' },
        { day: 12, plat: 'Instagram', type: 'Tips',             angle: '3 tips berguna sehari-hari untuk target customer. Format listicle.' },
        { day: 14, plat: 'TikTok',    type: 'Testimoni',        angle: 'Quote pelanggan puas. Autentik, spesifik, tidak berlebihan.' },
        { day: 17, plat: 'Instagram', type: 'Product Showcase', angle: 'Highlight produk dengan deskripsi sensori: aroma, rasa, tekstur.' },
        { day: 20, plat: 'Instagram', type: 'Interaktif',       angle: 'Pertanyaan/poll yang membuat followers komentar. Relevan dengan target.' },
        { day: 25, plat: 'Facebook',  type: 'Nilai & Misi',     angle: 'Kenapa bisnis ini ada. Bangun kepercayaan jangka panjang.' },
      ]

      const hashtagBase = await ask(anthropic,
        '12 hashtag Instagram untuk bisnis: ' + ctx + '. Mix populer dan niche. Format: #tag1 #tag2 dst. Tanpa penjelasan.', 120)
      const allTags = hashtagBase.split(/\s+/).filter((h: string) => h.startsWith('#'))

      const posts = []
      for (const plan of plans) {
        const prompt = 'Caption ' + plan.plat + ' untuk bisnis: ' + ctx + '. Angle: ' + plan.angle + '. Tone: ' + tone + '. Bahasa Indonesia natural, 1-2 emoji. Langsung caption saja.'
        const caption = await ask(anthropic, prompt, 280)
        const hashtags = allTags.slice(0, 6).join(' ')
        posts.push({ day: plan.day, platform: plan.plat, type: plan.type, caption, hashtags })
      }

      await adminClient.from('brand_kits').update({ content_data: { posts } }).eq('id', brand_kit_id)
      return NextResponse.json({ ok: true, section: 'content', count: posts.length })
    }

    if (section === 'legal') {
      const struct = await ask(anthropic, 'Rekomendasi bentuk usaha untuk: ' + ctx + '. 1 kalimat.')
      const reason = await ask(anthropic, 'Alasan singkat untuk bisnis ini. 1 kalimat.')
      const tip1 = await ask(anthropic, 'Tips keuangan terpenting UMKM kuliner baru. 1 kalimat praktis.')
      const tip2 = await ask(anthropic, 'Tips legal terpenting usaha kuliner Indonesia. 1 kalimat.')
      const tip3 = await ask(anthropic, 'Tips pajak UMKM kuliner Indonesia. 1 kalimat.')
      const data = {
        business_structure: { recommendation: struct, reason },
        nib: { required: true, steps: ['Buka oss.go.id', 'Daftar akun NIK', 'Isi data usaha', 'Pilih KBLI', 'Download NIB'], estimate_days: 1, cost: 'Gratis' },
        tax: { npwp_required: true, vat_required: false, pph_rate: '0.5% omzet/bulan', notes: 'UMKM omzet <500 juta/tahun tarif final 0.5%' },
        permits: ['NIB dari OSS', 'Sertifikat Higiene Sanitasi Pangan', 'PIRT jika jual produk kemasan'],
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