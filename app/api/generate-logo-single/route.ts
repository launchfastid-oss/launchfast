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

    // Fetch brand kit + order + onboarding sekaligus untuk konteks lengkap
    const { data: kit } = await adminClient
      .from('brand_kits')
      .select('business_name, visual_data, strategy_data, order_id')
      .eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Fetch onboarding data via order
    const { data: order } = await adminClient
      .from('orders').select('onboarding_id').eq('id', kit.order_id).single()
    
    let onboarding: Record<string, string> = {}
    if (order?.onboarding_id) {
      const { data: ob } = await adminClient
        .from('onboarding_answers').select('*').eq('id', order.onboarding_id).single()
      if (ob) onboarding = ob
    }

    const visual = (kit.visual_data || {}) as Record<string, unknown>
    const strategy = (kit.strategy_data || {}) as Record<string, unknown>
    const colors = (visual.colors as Array<{hex:string, name:string}>) || []
    const concepts = (visual.logo_concepts as Array<{name:string, description:string, style:string}>) || []
    const personality = ((strategy.brand_personality as string[]) || []).slice(0, 2).join(' and ')

    const primary = colors[0]?.hex || '#8B4513'
    const secondary = colors[1]?.hex || '#D4A574'
    const accent = colors[2]?.hex || '#2D5016'

    // Data bisnis yang benar dari onboarding
    const bizName = (onboarding.business_name || kit.business_name || '').split(',')[0].trim()
    const product = onboarding.product_service || ''
    const target = onboarding.target_customer || ''
    const tone = onboarding.tone_of_voice || ''
    const businessModel = onboarding.business_model || ''

    // Buat context string yang kaya dan spesifik
    const businessContext = `
Business: ${bizName}
Product: ${product}
Target customer: ${target}
Business model: ${businessModel}
Brand tone: ${tone}
Brand personality: ${personality}
`

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Gunakan Claude untuk generate prompt logo yang benar-benar kontekstual
    // Claude akan tahu apa simbol yang tepat berdasarkan jenis bisnis
    const logoStyleGuides = [
      `WORDMARK LOGO: Brand name prominently displayed with a relevant icon. 
       Icon must reflect the actual product ("${product}"). 
       Layout: icon on top, brand name below, or icon left + name right.`,
      `ICON MARK: Single symbolic icon only (no text), representing the brand essence.
       The symbol must be culturally and contextually accurate for: "${product}".
       Think about what tools, ingredients, or symbols are ACTUALLY used in this business.`,
      `BADGE/EMBLEM: Circular seal with brand name arced at top, central icon, decorative frame.
       The central icon must authentically represent: "${product}".
       Indonesian cultural elements encouraged where appropriate.`
    ]

    const promptRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      system: `You are a professional logo designer with deep knowledge of Indonesian culture and cuisine. 
You create accurate, culturally-appropriate logo prompts for Ideogram V2.
CRITICAL: Always use visually accurate symbols for the actual business type. 
For Indonesian food businesses: use appropriate Indonesian food items (rendang, nasi, piring, sendok-garpu NOT chopsticks), 
Minangkabau architecture (rumah gadang, gonjong roof), Indonesian spices (cabai, kunyit, daun pandan).
NEVER use chopsticks, sushi, or East Asian symbols for Indonesian/Padang food.`,
      messages: [{
        role: 'user',
        content: `Create a professional Ideogram V2 logo prompt for this Indonesian business:
${businessContext}
Logo style: ${logoStyleGuides[index] || logoStyleGuides[0]}
Colors: primary ${primary}, secondary ${secondary}, accent ${accent}

Requirements:
1. Use CULTURALLY ACCURATE visual elements for this specific business
2. Include brand name "${bizName}" as text in the logo (DESIGN style renders text well)
3. White background, professional commercial quality
4. Max 120 words, English

Return ONLY the prompt text, no explanation.`
      }]
    })

    const prompt = promptRes.content[0].type === 'text' 
      ? promptRes.content[0].text.trim() 
      : `Professional logo for "${bizName}" Indonesian restaurant, white background, commercial quality`

    console.log(`Logo ${index+1} prompt: ${prompt.slice(0, 100)}...`)

    // Call Ideogram V2
    const falKey = process.env.FAL_KEY!
    const falRes = await fetch('https://fal.run/fal-ai/ideogram/v2', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        style_type: 'DESIGN',
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

    // Simpan URL + prompt ke database
    const urls = ((visual.logo_urls || ['','','']) as string[]).slice()
    while (urls.length < 3) urls.push('')
    urls[index] = imageUrl

    const prompts = ((visual.logo_prompts || ['','','']) as string[]).slice()
    while (prompts.length < 3) prompts.push('')
    prompts[index] = prompt

    await adminClient.from('brand_kits').update({
      visual_data: {
        ...visual,
        logo_urls: urls,
        logo_prompts: prompts,
        logos_generated_at: new Date().toISOString(),
      }
    }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, index, url: imageUrl, model: 'ideogram-v2', prompt: prompt.slice(0, 100) })
  } catch (err) {
    console.error('generate-logo-single:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
