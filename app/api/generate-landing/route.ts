import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id } = await request.json()
    const adminClient = createAdminClient()

    const { data: kit } = await adminClient
      .from('brand_kits')
      .select('*')
      .eq('id', brand_kit_id)
      .eq('user_id', user.id)
      .single()

    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const strategy = kit.strategy_data as Record<string, unknown>
    const visual = kit.visual_data as Record<string, unknown>
    const colors = (visual?.colors as Array<{ hex: string; name: string }>) || []
    const primary = colors[0]?.hex || '#1D9E75'
    const dark = colors[3]?.hex || '#1A1A1A'
    const light = colors[4]?.hex || '#F5F5F5'
    const heading = (visual?.typography as Record<string, { font: string }>)?.heading?.font || 'Plus Jakarta Sans'
    const body = (visual?.typography as Record<string, { font: string }>)?.body?.font || 'Inter'
    const sb7 = strategy?.sb7 as Record<string, unknown>
    const hero = sb7?.hero as Record<string, string>
    const ctaDirect = sb7?.cta_direct as string || 'Mulai Sekarang'
    const ctaTransitional = sb7?.cta_transitional as string || 'Pelajari Lebih Lanjut'
    const oneLiner = strategy?.golden_one_liner as string || ''
    const uvp = strategy?.unique_value_proposition as string || ''
    const plan = (sb7?.plan as string[]) || []
    const problem = sb7?.problem as Record<string, string>
    const success = sb7?.success as string || ''

    const res = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 4000,
      system: 'Kamu adalah web developer expert. Buat landing page HTML single-file yang profesional, mobile-responsive, dan siap publish. Kembalikan HANYA kode HTML lengkap tanpa penjelasan.',
      messages: [{
        role: 'user',
        content: `Buat landing page HTML untuk bisnis ini:

Nama bisnis: ${kit.business_name}
Headline: ${hero?.headline || oneLiner}
Subheadline: ${hero?.subheadline || uvp}
CTA Utama: ${ctaDirect}
CTA Sekunder: ${ctaTransitional}
Golden One-Liner: ${oneLiner}
Masalah customer: ${problem?.external || ''}
Langkah-langkah: ${plan.join(', ')}
Hasil yang didapat: ${success}

Warna Primary: ${primary}
Warna Dark: ${dark}
Warna Light: ${light}
Font Heading: ${heading}
Font Body: ${body}

Buat landing page dengan:
1. Section Hero dengan headline, subheadline, dan 2 tombol CTA
2. Section Problem (masalah customer)
3. Section Cara Kerja (3 langkah dari plan)
4. Section Hasil (success statement)
5. Section CTA final
6. Footer sederhana

Gunakan Google Fonts untuk ${heading} dan ${body}.
Gunakan warna brand yang diberikan.
Mobile responsive dengan CSS flexbox/grid.
Smooth scroll, hover effects.
Hanya HTML satu file dengan CSS embedded di <style> tag.
Semua text dalam Bahasa Indonesia.`
      }]
    })

    const html = res.content[0].type === 'text' ? res.content[0].text : ''
    const cleanHtml = html.replace(/^```html\n?/, '').replace(/\n?```$/, '').trim()

    await adminClient.from('brand_kits').update({
      landing_page_html: cleanHtml,
      updated_at: new Date().toISOString()
    }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, html: cleanHtml })
  } catch (err) {
    console.error('generate-landing error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
