import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

// Try fal.ai Recraft V3
async function tryFalRecraft(prompt: string, style: string): Promise<string | null> {
  const key = process.env.FAL_KEY
  if (!key) return null
  try {
    const res = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_size: { width: 1024, height: 1024 }, style, num_images: 1 }),
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('fal error:', res.status, err.slice(0, 100))
      return null
    }
    const data = await res.json()
    return data.images?.[0]?.url || null
  } catch (e) {
    console.error('fal exception:', e)
    return null
  }
}

// Generate high-quality SVG logo using Claude
async function generateSVGLogo(
  anthropic: Anthropic,
  concept: { name: string; description: string; style: string },
  colors: Array<{ hex: string; name: string }>,
  businessName: string,
  index: number
): Promise<string> {
  const primary = colors[0]?.hex || '#1D9E75'
  const secondary = colors[1]?.hex || '#2C5F2E'
  const accent = colors[2]?.hex || '#F4A261'
  const bg = colors[4]?.hex || '#FFFFFF'

  const styleGuides: Record<number, string> = {
    0: `Minimalist geometric logo. Use clean shapes, negative space, maximum 3 colors. 
       Create an icon mark that works at small sizes. Think Nike swoosh simplicity.`,
    1: `Modern wordmark/lettermark. Create a stylized initial letter or abstract mark.
       Bold, confident, contemporary. Think Apple, Airbnb level polish.`,
    2: `Warm illustrative emblem. Badge/seal style with decorative elements.
       Craft-beer label aesthetic but for food. Friendly, artisanal feel.`
  }

  const prompt = `You are a world-class logo designer (Pentagram, Wolff Olins level). 
Create a professional SVG logo for: ${businessName}
Concept: ${concept.name} — ${concept.description}
Style guide: ${styleGuides[index] || styleGuides[0]}
Primary color: ${primary}, Secondary: ${secondary}, Accent: ${accent}
Canvas: 400x400px viewBox="0 0 400 400"

CRITICAL REQUIREMENTS:
1. NO text/words in the logo — pure icon/symbol only
2. Use ONLY these colors: ${primary}, ${secondary}, ${accent}, ${bg}, and pure white #FFFFFF
3. Clean, scalable paths — no raster effects, no blur, no shadows
4. Centered composition with 40px padding from edges
5. Professional negative space usage
6. Every path must be purposeful and contribute to the concept

Return ONLY the complete SVG code, starting with <svg and ending with </svg>.
No explanation, no markdown, no comments outside the SVG.`

  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }]
  })

  const text = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
  const match = text.match(/<svg[\s\S]*<\/svg>/i)
  if (match) return match[0]

  // Ultimate fallback: clean geometric logo
  return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
    <rect width="400" height="400" fill="white"/>
    <circle cx="200" cy="170" r="90" fill="${primary}"/>
    <circle cx="200" cy="170" r="65" fill="white"/>
    <circle cx="200" cy="170" r="45" fill="${accent}"/>
    <rect x="110" y="280" width="180" height="8" rx="4" fill="${secondary}"/>
    <rect x="140" y="300" width="120" height="6" rx="3" fill="${primary}" opacity="0.6"/>
  </svg>`
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id } = await request.json()
    const adminClient = createAdminClient()
    const { data: kit } = await adminClient
      .from('brand_kits').select('business_name, visual_data, strategy_data')
      .eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const visual = (kit.visual_data || {}) as Record<string, unknown>
    const strategy = (kit.strategy_data || {}) as Record<string, unknown>
    const colors = (visual.colors as Array<{ hex: string; name: string }>) || []
    const concepts = (visual.logo_concepts as Array<{ name: string; description: string; style: string }>) || [
      { name: 'Minimalis', description: 'Clean geometric mark', style: 'Minimalist' },
      { name: 'Modern', description: 'Bold contemporary mark', style: 'Modern' },
      { name: 'Hangat', description: 'Warm illustrative emblem', style: 'Illustrative' },
    ]

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const falStyles = ['vector_illustration', 'vector_illustration/line_art', 'vector_illustration/flat_2']

    // Build fal.ai prompts with Claude
    const promptRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: `Create 3 concise logo prompts for "${kit.business_name}" (Indonesian food brand).
Primary color: ${colors[0]?.hex || '#1D9E75'}.
Concepts: 1) minimalist geometric, 2) modern line art, 3) warm flat illustration.
Return ONLY JSON array: ["prompt1","prompt2","prompt3"]
Each prompt: max 40 words, English, end with "professional logo, vector, white background, no text"` }]
    })
    let falPrompts: string[]
    try {
      const raw = promptRes.content[0].type === 'text' ? promptRes.content[0].text : ''
      const m = raw.match(/\[[\s\S]*?\]/)
      falPrompts = JSON.parse(m ? m[0] : '[]')
      if (falPrompts.length < 3) throw new Error('too few')
    } catch {
      const c = colors[0]?.hex || '#1D9E75'
      const b = kit.business_name.split(',')[0]
      falPrompts = [
        `Minimalist geometric logo mark for ${b}, Indonesian food brand, ${c} color, clean shapes, professional logo, vector, white background, no text`,
        `Modern line art logo for ${b}, culinary brand, ${c} color, elegant minimal lines, professional logo, vector, white background, no text`,
        `Warm flat illustration logo for ${b}, Indonesian cuisine, ${c} and warm tones, friendly badge style, professional logo, vector, white background, no text`,
      ]
    }

    const logoUrls: string[] = []
    const logoSvgs: string[] = []
    const usedFal: boolean[] = []

    for (let i = 0; i < 3; i++) {
      // Try fal.ai first
      const falUrl = await tryFalRecraft(falPrompts[i], falStyles[i])
      if (falUrl) {
        logoUrls.push(falUrl)
        logoSvgs.push('')
        usedFal.push(true)
        console.log(`Logo ${i+1}: fal.ai OK`)
      } else {
        // Fallback: Claude SVG
        const svg = await generateSVGLogo(anthropic, concepts[i] || concepts[0], colors, kit.business_name, i)
        logoUrls.push('')
        logoSvgs.push(svg)
        usedFal.push(false)
        console.log(`Logo ${i+1}: Claude SVG fallback`)
      }
    }

    const updatedVisual = {
      ...visual,
      logo_urls: logoUrls,
      logo_svgs: logoSvgs,
      logo_prompts: falPrompts,
      logos_generated_at: new Date().toISOString(),
    }
    await adminClient.from('brand_kits').update({ visual_data: updatedVisual }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, logo_urls: logoUrls, logo_svgs: logoSvgs.map(s => s.slice(0, 50)), used_fal: usedFal })
  } catch (err) {
    console.error('generate-logos:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
