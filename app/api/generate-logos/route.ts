import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

async function tryFal(prompt: string, style: string): Promise<string | null> {
  const key = process.env.FAL_KEY
  if (!key) return null
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000) // 15s timeout per logo
    const res = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_size: { width: 1024, height: 1024 }, style, num_images: 1 }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    if (!res.ok) { console.error('fal error:', res.status); return null }
    const data = await res.json()
    return data.images?.[0]?.url || null
  } catch (e) {
    console.error('fal failed:', String(e).slice(0,50))
    return null
  }
}

async function makeSVG(
  anthropic: Anthropic,
  concept: { style?: string; description?: string },
  colors: Array<{ hex: string }>,
  name: string
): Promise<string> {
  const c1 = colors[0]?.hex || '#1D9E75'
  const c2 = colors[1]?.hex || '#2C5F2E'
  const c3 = colors[2]?.hex || '#F4A261'
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: `Design a professional SVG logo icon for "${name}".
Style: ${concept.style || 'Minimalist'}. Concept: ${concept.description || 'geometric mark'}.
Colors: primary ${c1}, secondary ${c2}, accent ${c3}. Canvas viewBox="0 0 400 400".
Rules: NO text, clean vector paths, centered, use brand colors only.
Return ONLY valid SVG starting <svg and ending </svg>.` }]
  })
  const text = res.content[0].type === 'text' ? res.content[0].text : ''
  const m = text.match(/<svg[\s\S]*<\/svg>/i)
  if (m) return m[0]
  return `<svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg"><rect width="400" height="400" fill="white"/><circle cx="200" cy="200" r="100" fill="${c1}"/><circle cx="200" cy="200" r="65" fill="white"/><circle cx="200" cy="200" r="40" fill="${c3}"/></svg>`
}

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

    const visual = (kit.visual_data || {}) as Record<string, unknown>
    const colors = (visual.colors as Array<{ hex: string; name: string }>) || []
    const rawConcepts = (visual.logo_concepts as Array<{ style?: string; description?: string }>) || []
    // Ensure 3 concepts
    const concepts = [0,1,2].map(i => rawConcepts[i] || [
      { style: 'Wordmark', description: 'Clean wordmark with brand name in bold modern font, simple geometric accent line below' },
      { style: 'Lettermark', description: 'Stylized initials monogram with geometric shape, bold and contemporary' },
      { style: 'Combination Mark', description: 'Simple icon symbol combined with clean typography, professional and memorable' },
    ][i])

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const name = kit.business_name.split(',')[0].trim()
    const c1 = colors[0]?.hex || '#1D9E75'

    // Build prompts from concept descriptions
    const falStyles = ['vector_illustration', 'vector_illustration/line_art', 'vector_illustration']
    const prompts = concepts.map((c, i) =>
      `${c.style} logo icon for "${name}". ${c.description}. Primary color ${c1}. Professional logo, clean vector, white background, no text, no words`
    )

    // Try all 3 fal calls in parallel (faster)
    const [fal0, fal1, fal2] = await Promise.all([
      tryFal(prompts[0], falStyles[0]),
      tryFal(prompts[1], falStyles[1]),
      tryFal(prompts[2], falStyles[2]),
    ])
    const falResults = [fal0, fal1, fal2]

    // For failed fal calls, generate SVG (also parallel)
    const svgPromises = concepts.map((c, i) =>
      falResults[i] ? Promise.resolve('') : makeSVG(anthropic, c, colors, name)
    )
    const svgs = await Promise.all(svgPromises)

    const updatedVisual = {
      ...visual,
      logo_urls: falResults.map(u => u || ''),
      logo_svgs: svgs,
      logo_prompts: prompts,
      logos_generated_at: new Date().toISOString(),
    }
    await adminClient.from('brand_kits').update({ visual_data: updatedVisual }).eq('id', brand_kit_id)

    const count = falResults.filter(Boolean).length + svgs.filter(Boolean).length
    console.log(`Logos done: ${falResults.filter(Boolean).length} fal + ${svgs.filter(Boolean).length} SVG = ${count}`)
    return NextResponse.json({ ok: true, count, used_fal: falResults.map(Boolean) })
  } catch (err) {
    console.error('generate-logos error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
