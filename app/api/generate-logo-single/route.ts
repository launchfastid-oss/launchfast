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
    const colors = (visual.colors as Array<{hex:string,name:string}>) || []
    const concepts = (visual.logo_concepts as Array<{name:string,description:string,style:string}>) || []
    const oneLiner = (strategy.golden_one_liner as string) || ''
    
    const primary = colors[0]?.hex || '#8B4513'
    const secondary = colors[1]?.hex || '#D4A574'
    const accent = colors[2]?.hex || '#2D5016'
    
    // Nama bisnis yang clean
    const bizName = kit.business_name.split(',')[0].trim()
    const shortName = bizName.split(' ').slice(0, 3).join(' ')
    const initial = bizName.split(' ').filter((w:string) => w.length > 2).map((w:string) => w[0]).slice(0,2).join('').toUpperCase()
    const concept = concepts[index] || { name: 'Minimalis', description: 'food brand', style: 'Minimalist' }
    const industry = 'Indonesian food & culinary'

    // 3 pendekatan logo yang berbeda, semua valid style Recraft V3
    const configs = [
      {
        style: 'vector_illustration/flat_2',
        prompt: `Modern flat logo design for brand "${shortName}", ${industry}. 
Logo composition: clean typography with the text "${shortName}" in bold modern font, paired with a small flat icon of ${concept.description} placed above or to the left of the text. 
Color scheme: ${primary} for the icon, dark ${primary} for the text, ${secondary} as background accent.
Style: contemporary flat design, no shadows, no gradients, minimal details.
White background, professional brand logo, commercial quality, centered composition.`
      },
      {
        style: 'vector_illustration',
        prompt: `Professional logo icon for "${shortName}" brand. 
Single symbol: geometric abstraction of ${concept.description} integrated with letter "${initial}". 
Bold clean shapes using only ${primary} and white. Negative space used creatively.
Style: modern minimal logo mark, scalable vector, suitable as app icon or stamp.
Perfect white background, isolated logo mark, no text, brand symbol only.`
      },
      {
        style: 'digital_illustration',
        prompt: `Premium badge logo for "${shortName}" ${industry} brand.
Circular emblem/seal design: brand name "${shortName}" in curved arc text at top, central illustration of ${concept.description}, decorative frame with cultural patterns.
Colors: ${primary}, ${secondary}, ${accent}, and white. Rich detailed illustration style.
Style: artisan food brand aesthetic, premium packaging quality, Indonesian cultural touch.
White background, complete badge logo design, professional commercial quality.`
      }
    ]

    const config = configs[index] || configs[0]

    // Generate with fal.ai Recraft V3
    const falKey = process.env.FAL_KEY!
    const falRes = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: config.prompt,
        image_size: { width: 1024, height: 1024 },
        style: config.style,
        num_images: 1,
      }),
    })

    if (!falRes.ok) {
      const errText = await falRes.text()
      return NextResponse.json({ error: 'fal error ' + falRes.status + ': ' + errText.slice(0, 300) }, { status: 500 })
    }

    const falData = await falRes.json()
    const imageUrl = falData.images?.[0]?.url
    if (!imageUrl) return NextResponse.json({ error: 'No URL from fal.ai' }, { status: 500 })

    // Simpan URL
    const urls = ((visual.logo_urls || ['','','']) as string[]).slice()
    while (urls.length < 3) urls.push('')
    urls[index] = imageUrl

    const prompts = ((visual.logo_prompts || ['','','']) as string[]).slice()
    while (prompts.length < 3) prompts.push('')
    prompts[index] = config.prompt

    await adminClient.from('brand_kits').update({
      visual_data: { ...visual, logo_urls: urls, logo_prompts: prompts, logos_generated_at: new Date().toISOString() }
    }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, index, url: imageUrl, style: config.style })
  } catch (err) {
    console.error('generate-logo-single:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
