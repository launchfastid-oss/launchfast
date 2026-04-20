import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

// Generate satu logo via fal.ai Recraft V3
async function falRecraft(prompt: string, style: string): Promise<string> {
  const key = process.env.FAL_KEY
  if (!key) throw new Error('FAL_KEY not configured')
  const res = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
    method: 'POST',
    headers: { 'Authorization': 'Key ' + key, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt,
      image_size: { width: 1024, height: 1024 },
      style,
      num_images: 1,
    }),
  })
  if (!res.ok) throw new Error('fal error ' + res.status + ': ' + await res.text().then(t => t.slice(0,200)))
  const data = await res.json()
  const url = data.images?.[0]?.url
  if (!url) throw new Error('no image url from fal')
  return url
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id } = await request.json()
    const adminClient = createAdminClient()
    const { data: kit } = await adminClient
      .from('brand_kits')
      .select('business_name, visual_data, strategy_data')
      .eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const visual = (kit.visual_data || {}) as Record<string, unknown>
    const strategy = (kit.strategy_data || {}) as Record<string, unknown>
    const colors = (visual.colors as Array<{hex:string,name:string,usage:string}>) || []
    const concepts = (visual.logo_concepts as Array<{name:string,description:string,style:string}>) || []
    const personality = ((strategy.brand_personality as string[]) || []).join(', ')
    const oneLiner = (strategy.golden_one_liner as string) || kit.business_name
    const mood = (visual.visual_mood as string) || 'professional modern'

    const primary = colors[0]?.hex || '#1D9E75'
    const secondary = colors[1]?.hex || '#2C5F2E'
    const accent = colors[2]?.hex || '#F4A261'

    // Gunakan Claude untuk buat prompt logo yang sangat detail dan profesional
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const promptGenRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      system: 'You are a world-class brand identity designer and AI prompt engineer. Create extremely detailed, professional logo prompts for Recraft V3 image generation.',
      messages: [{
        role: 'user',
        content: `Create 3 distinct professional logo prompts for this brand:
Business: ${kit.business_name}
Industry: Food & Culinary (Indonesian)
Tagline: ${oneLiner}
Brand personality: ${personality}
Primary color: ${primary}, Secondary: ${secondary}, Accent: ${accent}
Visual mood: ${mood}
Concepts: 
1. ${concepts[0]?.name || 'Minimalist'}: ${concepts[0]?.description || 'clean simple logo'}
2. ${concepts[1]?.name || 'Modern'}: ${concepts[1]?.description || 'geometric modern logo'}  
3. ${concepts[2]?.name || 'Warm'}: ${concepts[2]?.description || 'warm illustrative logo'}

Each prompt MUST:
- Be in English
- Start with the core visual element description
- Include color hex codes
- Specify: "professional logo design, vector illustration, white background, isolated, brand identity, no text"
- Be highly specific about shapes, style, composition
- Max 50 words

Return ONLY a JSON array of 3 strings: ["prompt1","prompt2","prompt3"]`
      }]
    })
    
    let prompts: string[]
    try {
      const raw = promptGenRes.content[0].type === 'text' ? promptGenRes.content[0].text : ''
      const match = raw.match(/\[[\s\S]*\]/)
      prompts = JSON.parse(match ? match[0] : '[]')
      if (!Array.isArray(prompts) || prompts.length < 3) throw new Error('invalid')
    } catch {
      // Fallback: buat prompts langsung tanpa AI
      const bizShort = kit.business_name.split(',')[0].trim()
      prompts = [
        `Minimalist logo mark for "${bizShort}" Indonesian food brand: elegant rice bowl silhouette with Minangkabau horn rooftop, color ${primary}, flat vector, white background, professional brand identity, no text, isolated`,
        `Modern geometric logo for "${bizShort}" Indonesian restaurant: abstract fork and steaming bowl forming letter M, colors ${primary} and ${secondary}, clean vector illustration, white background, contemporary minimal style, no text`,
        `Warm artisan logo for "${bizShort}" homestyle Indonesian cuisine: hand-drawn style cooking pot with decorative Minang patterns, warm ${accent} and ${primary} tones, friendly illustration, white background, artisanal brand mark, no text`,
      ]
    }

    // Recraft V3 styles — terbaik untuk logo
    const styles = ['vector_illustration', 'vector_illustration/line_art', 'vector_illustration/flat_2']
    
    const logoUrls: string[] = []
    const errors: string[] = []

    for (let i = 0; i < 3; i++) {
      try {
        const url = await falRecraft(prompts[i], styles[i])
        logoUrls.push(url)
        console.log('logo', i+1, 'ok:', url.slice(0,50))
      } catch (err) {
        console.error('logo', i+1, 'failed:', err)
        errors.push(`Logo ${i+1}: ${String(err)}`)
        logoUrls.push('')
      }
    }

    // Update visual_data
    await adminClient.from('brand_kits').update({
      visual_data: { ...visual, logo_urls: logoUrls, logo_prompts: prompts, logos_generated_at: new Date().toISOString() }
    }).eq('id', brand_kit_id)

    const successCount = logoUrls.filter(u => u).length
    return NextResponse.json({ ok: successCount > 0, logo_urls: logoUrls, prompts, errors: errors.length ? errors : undefined })
  } catch (err) {
    console.error('generate-logos:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
