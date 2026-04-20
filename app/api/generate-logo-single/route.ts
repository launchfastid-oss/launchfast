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
    const personality = ((strategy.brand_personality as string[]) || []).slice(0,2).join(', ')
    
    const primary = colors[0]?.hex || '#8B4513'
    const secondary = colors[1]?.hex || '#D4A574'
    const accent = colors[2]?.hex || '#2D5016'
    
    // Ambil nama bisnis yang pendek dan bersih
    const fullName = kit.business_name
    const bizName = fullName.split(',')[0].trim()
    // Buat initial/abbrev untuk logo
    const words = bizName.split(' ').filter((w: string) => w.length > 2)
    const initials = words.slice(0,2).map((w: string) => w[0].toUpperCase()).join('')

    const concept = concepts[index] || { name: 'Minimalis', description: 'clean geometric', style: 'Minimalist' }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Logo styles yang proper untuk brand identity di Recraft V3
    // Gunakan 'logo_raster' untuk logo dengan teks, atau 'vector_illustration/flat_2' untuk icon only
    const logoConfigs = [
      {
        // Logo 1: Icon + Name — classic brand logo
        style: 'logo_raster',
        promptTemplate: (name: string, init: string, p: string, s: string, a: string, personality: string) =>
          `Professional brand logo design for "${name}". Wordmark style: bold clean typography for the brand name "${name}" paired with a small icon mark above or left. Icon: simplified ${concept.description}. Colors: ${p} for primary, ${s} for secondary. White background. Modern, professional, suitable for Indonesian food business. Brand personality: ${personality}. Commercial quality logo.`
      },
      {
        // Logo 2: Icon mark only — modern minimal
        style: 'vector_illustration/flat_2',
        promptTemplate: (name: string, init: string, p: string, s: string, a: string, personality: string) =>
          `Minimalist logo icon mark for brand "${name}". Abstract geometric symbol: ${concept.description}. Uses letter "${init}" integrated into the design. Primary color ${p}, accent ${a}. Flat design, no gradients, white background. Clean professional icon suitable for app icon and business card. Isolated symbol only.`
      },
      {
        // Logo 3: Badge/seal — warm artisan feel  
        style: 'logo_raster',
        promptTemplate: (name: string, init: string, p: string, s: string, a: string, personality: string) =>
          `Artisan badge logo for "${name}" Indonesian food brand. Circular seal/emblem design with brand name "${name}" in arc text, central icon of ${concept.description}, decorative border. Colors: ${p}, ${s}, ${a}. Warm artisanal style like premium food packaging. White background. Authentic Indonesian culinary brand identity.`
      }
    ]

    const config = logoConfigs[index] || logoConfigs[0]
    const prompt = config.promptTemplate(bizName, initials, primary, secondary, accent, personality)

    console.log('Logo', index+1, 'prompt:', prompt.slice(0,100))

    // Call fal.ai Recraft V3
    const falKey = process.env.FAL_KEY!
    const falRes = await fetch('https://fal.run/fal-ai/recraft/v3/text-to-image', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        image_size: { width: 1024, height: 1024 },
        style: config.style,
        num_images: 1,
      }),
    })

    if (!falRes.ok) {
      const err = await falRes.text()
      return NextResponse.json({ error: 'fal error ' + falRes.status + ': ' + err.slice(0, 300) }, { status: 500 })
    }

    const falData = await falRes.json()
    const imageUrl = falData.images?.[0]?.url
    if (!imageUrl) return NextResponse.json({ error: 'No URL from fal' }, { status: 500 })

    // Update logo URL untuk index ini
    const currentUrls = ((visual.logo_urls || ['', '', '']) as string[]).slice()
    while (currentUrls.length < 3) currentUrls.push('')
    currentUrls[index] = imageUrl

    const currentPrompts = ((visual.logo_prompts || ['', '', '']) as string[]).slice()
    while (currentPrompts.length < 3) currentPrompts.push('')
    currentPrompts[index] = prompt

    await adminClient.from('brand_kits').update({
      visual_data: {
        ...visual,
        logo_urls: currentUrls,
        logo_prompts: currentPrompts,
        logos_generated_at: new Date().toISOString(),
      }
    }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, index, url: imageUrl, style: config.style })
  } catch (err) {
    console.error('generate-logo-single:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
