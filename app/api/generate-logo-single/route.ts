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
    const colors = (visual.colors as Array<{hex:string,name:string}>) || []
    const concepts = (visual.logo_concepts as Array<{name:string,description:string,style:string}>) || []
    const primary = colors[0]?.hex || '#1D9E75'
    const secondary = colors[1]?.hex || '#2C5F2E'
    const accent = colors[2]?.hex || '#F4A261'
    const bizName = kit.business_name.split(',')[0].trim()
    const concept = concepts[index] || { name: 'Logo', description: bizName, style: 'Minimalist' }

    // Generate detailed prompt with Claude
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const promptRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{ role: 'user', content: `Write a logo prompt for fal.ai Recraft V3 for: "${bizName}" Indonesian food brand.
Concept: ${concept.name} - ${concept.description}. Style: ${concept.style}.
Primary color: ${primary}. Must end with: "professional logo design, vector illustration, white background, no text, isolated"
Max 45 words. English only. Return just the prompt text.` }]
    })
    const prompt = promptRes.content[0].type === 'text' ? promptRes.content[0].text.trim() : `Minimalist ${concept.style} logo for ${bizName}, ${primary} color, professional logo design, vector illustration, white background, no text, isolated`

    // Call fal.ai Recraft V3
    const falStyles = ['vector_illustration', 'vector_illustration/line_art', 'vector_illustration/flat_2']
    const falKey = process.env.FAL_KEY!
    const falRes = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, image_size: { width: 1024, height: 1024 }, style: falStyles[index] || 'vector_illustration' }),
    })
    if (!falRes.ok) {
      const err = await falRes.text()
      return NextResponse.json({ error: 'fal error ' + falRes.status + ': ' + err.slice(0,200) }, { status: 500 })
    }
    const falData = await falRes.json()
    const imageUrl = falData.images?.[0]?.url
    if (!imageUrl) return NextResponse.json({ error: 'No URL from fal' }, { status: 500 })

    // Update just this logo in visual_data
    const currentUrls = ((visual.logo_urls || ['','','']) as string[])
    currentUrls[index] = imageUrl
    const currentPrompts = ((visual.logo_prompts || ['','','']) as string[])
    currentPrompts[index] = prompt
    await adminClient.from('brand_kits').update({
      visual_data: { ...visual, logo_urls: currentUrls, logo_prompts: currentPrompts }
    }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, index, url: imageUrl, prompt })
  } catch (err) {
    console.error('generate-logo-single:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
