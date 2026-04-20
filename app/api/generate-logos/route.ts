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

    const { brand_kit_id } = await request.json()
    const adminClient = createAdminClient()

    const { data: kit } = await adminClient
      .from('brand_kits').select('business_name, visual_data').eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const visual = kit.visual_data as Record<string, unknown>
    const colors = (visual?.colors as Array<{hex: string, name: string}>) || []
    const primary = colors[0]?.hex || '#1D9E75'
    const secondary = colors[1]?.hex || '#2C5F2E'
    const accent = colors[2]?.hex || '#F4A261'
    const concepts = (visual?.logo_concepts as Array<{name: string, description: string, style: string}>) || []

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const svgs: string[] = []

    for (let i = 0; i < Math.min(3, concepts.length || 3); i++) {
      const concept = concepts[i] || { name: 'Logo ' + (i+1), description: kit.business_name, style: 'Minimalis' }
      const prompt = 'Buat SVG logo profesional untuk bisnis: ' + kit.business_name + '. Konsep: ' + concept.name + ' - ' + concept.description + '. Style: ' + concept.style + '. Warna utama: ' + primary + ', warna sekunder: ' + secondary + ', aksen: ' + accent + '. Buat SVG 200x200px yang clean, modern, siap cetak. Gunakan shapes geometric yang simpel dan typography yang bagus. Return HANYA kode SVG lengkap mulai dari <svg dan berakhir </svg>, tanpa penjelasan apapun.'

      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: 'Kamu adalah desainer logo profesional. Buat SVG logo yang clean dan professional. Return HANYA kode SVG, tidak ada teks lain.',
        messages: [{ role: 'user', content: prompt }]
      })

      const text = res.content[0].type === 'text' ? res.content[0].text : ''
      const svgMatch = text.match(/<svg[\s\S]*<\/svg>/i)
      svgs.push(svgMatch ? svgMatch[0] : '<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg"><circle cx="100" cy="100" r="80" fill="' + primary + '"/><text x="100" y="110" text-anchor="middle" fill="white" font-size="20" font-family="sans-serif">' + kit.business_name.slice(0,3).toUpperCase() + '</text></svg>')
    }

    // Update visual_data dengan logo SVGs
    const updatedVisual = { ...visual, logo_svgs: svgs }
    await adminClient.from('brand_kits').update({ visual_data: updatedVisual }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, svgs })
  } catch (err) {
    console.error('generate-logos error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
