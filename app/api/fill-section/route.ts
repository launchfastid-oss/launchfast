import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

async function ask(anthropic: Anthropic, q: string): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    messages: [{ role: 'user', content: q }]
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
      .from('brand_kits').select('business_name, strategy_data').eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const biz = kit.business_name
    const strategy = kit.strategy_data as Record<string, unknown> || {}
    const oneLiner = (strategy.golden_one_liner as string) || biz
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    if (section === 'content') {
      // Generate 10 captions satu per satu
      const topics = [
        'perkenalan bisnis yang hangat dan personal',
        'tips memilih makanan yang sehat dan lezat',
        'behind the scene proses memasak',
        'testimoni pelanggan yang puas',
        'promosi menu spesial hari ini',
        'edukasi tentang keunikan masakan',
        'ucapan selamat pagi yang mengundang selera',
        'konten interaktif tanya jawab dengan followers',
        'cerita inspiratif perjuangan membangun bisnis',
        'call to action untuk order sekarang'
      ]
      const platforms = ['Instagram','TikTok','Instagram','Instagram','Facebook','Instagram','Instagram','TikTok','Instagram','Instagram']
      const types = ['Perkenalan','Tips','Behind Scene','Testimoni','Promo','Edukasi','Greeting','Interaktif','Cerita','CTA']
      const days = [1,3,5,7,9,12,14,17,20,25]

      const posts = []
      for (let i = 0; i < 5; i++) { // 5 dulu agar cepat
        const caption = await ask(anthropic,
          'Buat 1 caption ' + platforms[i] + ' untuk bisnis: ' + biz + '. Topik: ' + topics[i] + '. Tone hangat personal. Bahasa Indonesia. Maksimal 3 kalimat. Jangan pakai hashtag di sini.')
        const tags = await ask(anthropic,
          'Beri 3 hashtag Instagram untuk bisnis kuliner Indonesia: ' + biz + '. Format: #tag1 #tag2 #tag3. Tanpa penjelasan.')
        posts.push({
          day: days[i],
          platform: platforms[i],
          type: types[i],
          caption,
          hashtags: tags.split(' ').filter((t: string) => t.startsWith('#'))
        })
      }
      const data = { posts }
      await adminClient.from('brand_kits').update({ content_data: data }).eq('id', brand_kit_id)
      return NextResponse.json({ ok: true, section: 'content', data })
    }

    if (section === 'legal') {
      const struct = await ask(anthropic, 'Rekomendasi struktur bisnis terbaik untuk warung makan kecil di Indonesia: ' + biz + '. Jawab 1 kalimat singkat.')
      const reason = await ask(anthropic, 'Kenapa ' + struct + ' cocok untuk warung makan kecil? 1 kalimat.')
      const tip1 = await ask(anthropic, 'Tips keuangan paling penting untuk warung makan UMKM baru. 1 kalimat singkat.')
      const tip2 = await ask(anthropic, 'Tips legal paling penting untuk warung makan UMKM baru. 1 kalimat singkat.')
      const tip3 = await ask(anthropic, 'Tips pajak paling penting untuk warung makan UMKM baru. 1 kalimat singkat.')

      const data = {
        business_structure: { recommendation: struct, reason },
        nib: {
          required: true,
          steps: ['Buka oss.go.id di browser', 'Klik Daftar dan isi data KTP', 'Isi nama dan alamat usaha', 'Pilih KBLI 56101 untuk restoran/warung makan', 'Download NIB digital yang langsung jadi'],
          estimate_days: 1,
          cost: 'Gratis'
        },
        tax: {
          npwp_required: true,
          vat_required: false,
          pph_rate: '0.5% dari omzet bruto per bulan',
          notes: 'UMKM dengan omzet di bawah Rp 500 juta per tahun mendapat tarif final 0.5%'
        },
        permits: [
          'NIB dari OSS (wajib untuk semua usaha)',
          'Sertifikat Laik Higiene dari Dinas Kesehatan setempat',
          'PIRT jika menjual produk kemasan seperti rendang kaleng atau sambal botol'
        ],
        tips: [tip1, tip2, tip3]
      }
      await adminClient.from('brand_kits').update({ legal_data: data }).eq('id', brand_kit_id)
      return NextResponse.json({ ok: true, section: 'legal', data })
    }

    return NextResponse.json({ error: 'Section not supported' }, { status: 400 })
  } catch (err) {
    console.error('fill-section error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
