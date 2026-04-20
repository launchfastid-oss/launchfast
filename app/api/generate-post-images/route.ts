import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

// Strip common Claude prefixes from caption
function cleanCaption(raw: string): string {
  return raw
    .replace(/^#+\s*Caption.*?\n+/i, '')
    .replace(/^\*\*Caption.*?\*\*\n+/i, '')
    .replace(/^Caption[:\s]+/i, '')
    .replace(/^---+\n*/g, '')
    .trim()
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id, post_index } = await request.json()
    const adminClient = createAdminClient()

    const { data: kit } = await adminClient
      .from('brand_kits').select('business_name, visual_data, content_data, strategy_data, order_id')
      .eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const { data: order } = await adminClient.from('orders').select('onboarding_id').eq('id', kit.order_id).single()
    let ob: Record<string, string> = {}
    if (order?.onboarding_id) {
      const { data } = await adminClient.from('onboarding_answers').select('*').eq('id', order.onboarding_id).single()
      if (data) ob = data
    }

    const visual = (kit.visual_data || {}) as Record<string, unknown>
    const strategy = (kit.strategy_data || {}) as Record<string, unknown>
    const content = (kit.content_data || {}) as Record<string, unknown>
    const posts = (content.posts as Array<Record<string, unknown>>) || []
    const post = posts[post_index]
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const colors = (visual.colors as Array<{hex:string,name:string}>) || []
    const primary = colors[0]?.hex || '#8B4513'
    const secondary = colors[1]?.hex || '#D4A574'
    const accent = colors[2]?.hex || '#2D5016'
    const headingFont = ((visual.typography as Record<string,unknown>)?.heading as Record<string,string>)?.font || 'Poppins'
    const bizName = (ob.business_name || kit.business_name || '').split(',')[0].trim()
    const product = ob.product_service || 'Indonesian food'
    const location = 'Bandung, Indonesia'
    const rawCaption = String(post.caption || '')
    const caption = cleanCaption(rawCaption)
    const postType = String(post.type || '')
    const oneLiner = String((strategy.golden_one_liner as string) || bizName)

    const falKey = process.env.FAL_KEY!
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // 1. Generate food photo with Ideogram V2 â 4:5 portrait
    const promptRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: 'Write a food photography prompt for Ideogram V2. Business: ' + bizName + ' in ' + location + '. Product: ' + product + '. Post type: ' + postType + '. Requirements: authentic Indonesian food photo, warm golden lighting, wooden table, real ingredients visible, appetizing, NO text overlay, portrait 4:5. Max 50 words English.'
      }]
    })
    const foodPrompt = promptRes.content[0].type === 'text'
      ? promptRes.content[0].text.trim().replace(/^["']|["']$/g, '')
      : 'Authentic Indonesian nasi padang spread, warm lighting, wooden table, Bandung food photography, appetizing portrait'

    console.log('Food prompt:', foodPrompt.slice(0, 80))

    let foodImageUrl = ''
    try {
      const falRes = await fetch('https://fal.run/fal-ai/ideogram/v2', {
        method: 'POST',
        headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: foodPrompt,
          style_type: 'REALISTIC',
          aspect_ratio: '3:4',
          num_images: 1,
          expand_prompt: false,
        }),
      })
      if (falRes.ok) {
        const falData = await falRes.json()
        foodImageUrl = falData.images?.[0]?.url || ''
        console.log('Food image:', foodImageUrl ? 'OK' : 'empty URL')
      } else {
        const errText = await falRes.text()
        console.error('Ideogram error:', falRes.status, errText.slice(0, 200))
      }
    } catch (e) {
      console.error('Fal fetch error:', e)
    }

    // 2. Quote card data â rendered client-side via Canvas
    const quoteCard = {
      caption_short: caption.slice(0, 130),
      business_name: bizName,
      one_liner: oneLiner.slice(0, 70),
      primary_color: primary,
      secondary_color: secondary,
      accent_color: accent,
      post_type: postType,
      heading_font: headingFont,
    }

    // Save to DB
    const updatedPosts = [...posts]
    updatedPosts[post_index] = {
      ...post,
      food_image_url: foodImageUrl,
      quote_card: quoteCard,
      food_prompt: foodPrompt,
      images_generated_at: new Date().toISOString(),
    }
    await adminClient.from('brand_kits')
      .update({ content_data: { ...content, posts: updatedPosts } })
      .eq('id', brand_kit_id)

    return NextResponse.json({
      ok: true,
      post_index,
      food_image_url: foodImageUrl,
      has_food: !!foodImageUrl,
      quote_card: quoteCard,
    })
  } catch (err) {
    console.error('generate-post-images:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}