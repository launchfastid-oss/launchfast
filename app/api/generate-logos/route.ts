import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

async function generateLogoWithFal(prompt: string, style: string): Promise<string> {
  const falKey = process.env.FAL_KEY
  if (!falKey) throw new Error('FAL_KEY not set')

  const body = {
    prompt,
    image_size: { width: 1024, height: 1024 },
    style: style,
    colors: [],
  }

  const res = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
    method: 'POST',
    headers: {
      'Authorization': 'Key ' + falKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error('fal.ai error: ' + res.status + ' ' + err.slice(0, 200))
  }

  const data = await res.json()
  const imageUrl = data.images?.[0]?.url
  if (!imageUrl) throw new Error('No image URL in fal response')
  return imageUrl
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
      .eq('id', brand_kit_id)
      .single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const visual = kit.visual_data as Record<string, unknown> || {}
    const strategy = kit.strategy_data as Record<string, unknown> || {}
    const colors = (visual?.colors as Array<{hex: string, name: string}>) || []
    const concepts = (visual?.logo_concepts as Array<{name: string, description: string, style: string}>) || []
    const brandPersonality = (strategy?.brand_personality as string[]) || []
    const oneLiner = (strategy?.golden_one_liner as string) || kit.business_name
    const mood = (visual?.visual_mood as string) || 'professional and modern'

    const primaryColor = colors[0]?.hex || '#1D9E75'
    const secondaryColor = colors[1]?.hex || '#2C5F2E'
    const accentColor = colors[2]?.hex || '#F4A261'

    // Map concept styles ke fal.ai Recraft styles
    const falStyles = [
      'vector_illustration',
      'vector_illustration/line_art',
      'vector_illustration/flat_2',
    ]

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Generate detailed prompt untuk tiap logo concept menggunakan Claude
    const promptRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: 'Kamu adalah creative director logo. Buat 3 prompt logo yang sangat detail untuk image generation AI. Return HANYA JSON array dengan 3 string prompt dalam bahasa Inggris.',
      messages: [{
        role: 'user',
        content: `Business: ${kit.business_name}
Tagline: ${oneLiner}
Brand personality: ${brandPersonality.join(', ')}
Visual mood: ${mood}
Primary color: ${primaryColor}
Concept 1: ${concepts[0]?.description || 'minimalist and symbolic logo'}
Concept 2: ${concepts[1]?.description || 'modern geometric logo'}
Concept 3: ${concepts[2]?.description || 'warm illustrative logo'}

Create 3 professional logo design prompts. Each prompt must:
- Be specific about the visual elements, shapes, style
- Include: "professional logo design, vector art, clean background, isolated on white, brand identity"
- Mention the primary color ${primaryColor}
- Be suitable for a Indonesian food/business brand
- Max 60 words each

Return ONLY a JSON array: ["prompt1", "prompt2", "prompt3"]`
      }]
    })

    let prompts: string[]
    try {
      const raw = promptRes.content[0].type === 'text' ? promptRes.content[0].text : '[]'
      const match = raw.match(/\[[\s\S]*\]/)
      prompts = JSON.parse(match ? match[0] : '[]')
    } catch {
      // Fallback prompts jika parse gagal
      prompts = [
        `Professional minimalist logo for "${kit.business_name}", Indonesian food brand. Clean geometric shapes, warm colors ${primaryColor}, vector art style, isolated on white background, modern brand identity design`,
        `Modern logo design for "${kit.business_name}", Indonesian culinary brand. Line art style, ${primaryColor} primary color, elegant typography, professional vector illustration, white background`,
        `Warm illustrative logo for "${kit.business_name}", Indonesian food business. Flat design style, ${primaryColor} and ${accentColor} colors, friendly and approachable, clean vector art, isolated on white`,
      ]
    }

    // Generate 3 logos dengan fal.ai Recraft V3
    const logoUrls: string[] = []
    const errors: string[] = []

    for (let i = 0; i < 3; i++) {
      try {
        const url = await generateLogoWithFal(prompts[i], falStyles[i])
        logoUrls.push(url)
        console.log(`Logo ${i+1} generated: ${url.slice(0, 60)}...`)
      } catch (err) {
        console.error(`Logo ${i+1} failed:`, err)
        errors.push(String(err))
        logoUrls.push('') // placeholder
      }
    }

    // Simpan URLs ke visual_data
    const updatedVisual = {
      ...visual,
      logo_urls: logoUrls,
      logo_prompts: prompts,
      logo_generated_at: new Date().toISOString(),
    }
    await adminClient
      .from('brand_kits')
      .update({ visual_data: updatedVisual })
      .eq('id', brand_kit_id)

    return NextResponse.json({
      ok: true,
      logo_urls: logoUrls,
      errors: errors.length > 0 ? errors : undefined,
    })
  } catch (err) {
    console.error('generate-logos error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
