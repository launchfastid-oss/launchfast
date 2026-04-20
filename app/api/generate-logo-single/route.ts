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

    const { brand_kit_id, index } = await request.json()
    const adminClient = createAdminClient()
    const { data: kit } = await adminClient
      .from('brand_kits').select('business_name, visual_data, strategy_data')
      .eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const visual = (kit.visual_data || {}) as Record<string, unknown>
    const strategy = (kit.strategy_data || {}) as Record<string, unknown>
    const colors = (visual.colors as Array<{hex:string, name:string}>) || []
    const concepts = (visual.logo_concepts as Array<{name:string, description:string, style:string}>) || []
    const oneLiner = (strategy.golden_one_liner as string) || ''
    const personality = ((strategy.brand_personality as string[]) || []).slice(0, 2).join(' and ')

    const primary = colors[0]?.hex || '#8B4513'
    const secondary = colors[1]?.hex || '#D4A574'
    const accent = colors[2]?.hex || '#2D5016'

    const bizName = kit.business_name.split(',')[0].trim()
    const concept = concepts[index] || { name: 'Logo', description: 'food brand symbol', style: 'Modern' }

    // Ideogram V2 prompt structure — sangat spesifik untuk typography + brand
    // style_type DESIGN = best for logos, posters, graphic design dengan teks
    const configs = [
      {
        // Logo 1: Full wordmark dengan nama brand — pakai DESIGN style
        style_type: 'DESIGN',
        prompt: `A professional brand logo for "${bizName}". 
The logo features the brand name "${bizName}" in bold, clean, modern sans-serif typography. 
Above the text is a small icon: ${concept.description}. 
Color palette: ${primary} (primary), ${secondary} (secondary), white background.
Style: contemporary flat design, minimal, commercial quality brand identity.
The text "${bizName}" must be clearly legible and centered.
Clean white background, no shadows, professional logo design.`,
      },
      {
        // Logo 2: Icon mark + nama di bawah — clean dan modern
        style_type: 'DESIGN',
        prompt: `Minimalist logo design for "${bizName}" brand.
Central icon: geometric abstract symbol of ${concept.description}, using color ${primary}.
Below the icon: brand name "${bizName}" in clean modern typography, color ${primary}.
Style: modern minimalist, flat design, scalable logo mark.
White background, no gradients, no shadows, professional brand identity design.`,
      },
      {
        // Logo 3: Badge/emblem artisan — circle dengan nama brand
        style_type: 'DESIGN',
        prompt: `Artisan badge logo for "${bizName}" Indonesian food brand.
Circular emblem design: brand name "${bizName}" curved along the top arc of the circle.
Center: elegant illustration of ${concept.description}.
Bottom arc: tagline or decorative line.
Colors: ${primary}, ${secondary}, ${accent} on white background.
Style: premium artisan food brand, Indonesian cultural aesthetic, badge/seal logo design.`,
      },
    ]

    const config = configs[index] || configs[0]

    // Anthropic untuk enhance prompt lebih lanjut
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const enhanceRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages: [{ role: 'user', content: `Enhance this logo prompt for Ideogram V2 AI. Keep the brand name "${bizName}" exact. Add specific design details. Max 120 words. Return ONLY the enhanced prompt text:

${config.prompt}` }]
    })
    const finalPrompt = enhanceRes.content[0].type === 'text'
      ? enhanceRes.content[0].text.trim()
      : config.prompt

    // Call Ideogram V2 via fal.ai
    const falKey = process.env.FAL_KEY!
    const falRes = await fetch('https://fal.run/fal-ai/ideogram/v2', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: finalPrompt,
        style_type: config.style_type,
        aspect_ratio: '1:1',
        num_images: 1,
        expand_prompt: false,
      }),
    })

    if (!falRes.ok) {
      const errText = await falRes.text()
      return NextResponse.json({ error: 'ideogram error ' + falRes.status + ': ' + errText.slice(0, 300) }, { status: 500 })
    }

    const falData = await falRes.json()
    const imageUrl = falData.images?.[0]?.url
    if (!imageUrl) return NextResponse.json({ error: 'No URL from ideogram' }, { status: 500 })

    // Simpan URL
    const urls = ((visual.logo_urls || ['','','']) as string[]).slice()
    while (urls.length < 3) urls.push('')
    urls[index] = imageUrl

    const prompts = ((visual.logo_prompts || ['','','']) as string[]).slice()
    while (prompts.length < 3) prompts.push('')
    prompts[index] = finalPrompt

    await adminClient.from('brand_kits').update({
      visual_data: { ...visual, logo_urls: urls, logo_prompts: prompts, logos_generated_at: new Date().toISOString() }
    }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, index, url: imageUrl, model: 'ideogram-v2', style: config.style_type })
  } catch (err) {
    console.error('generate-logo-single:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
