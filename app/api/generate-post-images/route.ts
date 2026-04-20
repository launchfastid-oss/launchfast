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
    const posts = [...((content.posts as Array<Record<string, unknown>>) || [])]
    const post = posts[post_index]
    if (!post) return NextResponse.json({ error: 'Post not found at index ' + post_index }, { status: 404 })

    const colors = (visual.colors as Array<{hex:string,name:string}>) || []
    const primary = colors[0]?.hex || '#8B4513'
    const secondary = colors[1]?.hex || '#D4A574'
    const accent = colors[2]?.hex || '#2D5016'
    const bizName = (ob.business_name || String(kit.business_name || '')).split(',')[0].trim()
    const product = ob.product_service || ''
    const caption = String(post.caption || '')
    const postType = String(post.type || '')
    const oneLiner = String((strategy.golden_one_liner as string) || '')
    const headingFont = String(((visual.typography as Record<string,unknown>)?.heading as Record<string,unknown>)?.font || 'Georgia')

    const falKey = process.env.FAL_KEY
    if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // 1. Build food photo prompt — spesifik konteks bisnis
    const promptRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages: [{
        role: 'user',
        content: 'Write a concise Ideogram V2 prompt for an Instagram food photo. Business: ' + bizName + '. Product: ' + product + '. Post type: ' + postType + '. Requirements: authentic Indonesian food photography, warm natural light, wooden surface, props like banana leaf or batik cloth. No text overlay. 4:5 portrait. Max 50 words. English. Return just the prompt.'
      }]
    })
    const foodPrompt = promptRes.content[0].type === 'text'
      ? promptRes.content[0].text.trim()
      : 'Beautiful Indonesian nasi padang food photography, warm lighting, wooden table, banana leaf, portrait format'

    console.log('food prompt:', foodPrompt.slice(0, 80))

    // 2. Call Ideogram V2
    const falRes = await fetch('https://fal.run/fal-ai/ideogram/v2', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: foodPrompt,
        style_type: 'REALISTIC',
        aspect_ratio: '4:5',
        num_images: 1,
        expand_prompt: false,
      }),
    })

    let foodImageUrl = ''
    if (falRes.ok) {
      const falData = await falRes.json()
      foodImageUrl = falData.images?.[0]?.url || ''
      console.log('food image url:', foodImageUrl.slice(0, 80))
    } else {
      const errText = await falRes.text()
      console.error('fal error:', falRes.status, errText.slice(0, 200))
    }

    // 3. Quote card metadata (rendered client-side via Canvas)
    const quoteCard = {
      caption_short: caption.slice(0, 140),
      business_name: bizName,
      one_liner: oneLiner.slice(0, 60),
      primary_color: primary,
      secondary_color: secondary,
      accent_color: accent,
      post_type: postType,
      heading_font: headingFont,
    }

    // 4. Update post in DB
    posts[post_index] = {
      ...post,
      food_image_url: foodImageUrl,
      quote_card: quoteCard,
      food_prompt: foodPrompt,
      images_generated_at: new Date().toISOString(),
    }

    const { error: updateError } = await adminClient
      .from('brand_kits')
      .update({ content_data: { ...content, posts } })
      .eq('id', brand_kit_id)

    if (updateError) {
      console.error('DB update error:', updateError)
      return NextResponse.json({ error: 'DB error: ' + updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      post_index,
      food_image_url: foodImageUrl,
      has_food: !!foodImageUrl,
      quote_card: quoteCard,
    })
  } catch (err) {
    console.error('generate-post-images error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}