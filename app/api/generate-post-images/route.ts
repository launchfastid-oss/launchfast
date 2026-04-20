import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

function cleanCaption(text: string): string {
  return text
    .replace(/^#+\s+.*(\n|$)/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/---+.*/g, '')
    .replace(/Caption \d+[:\s].*/gi, '')
    .replace(/^[\s\n]+|[\s\n]+$/g, '')
    .replace(/\n{3,}/g, '\n\n')
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
    if (!post) return NextResponse.json({ error: 'Post not found at index ' + post_index }, { status: 404 })

    const colors = (visual.colors as Array<{hex:string,name:string}>) || []
    const primary = colors[0]?.hex || '#8B4513'
    const secondary = colors[1]?.hex || '#D4A574'
    const accent = colors[2]?.hex || '#2D5016'
    const bizName = (ob.business_name || kit.business_name || '').split(',')[0].trim()
    const product = ob.product_service || 'masakan Indonesia'
    const rawCaption = String(post.caption || '')
    const caption = cleanCaption(rawCaption)
    const postType = String(post.type || '')
    const oneLiner = String((strategy.golden_one_liner as string) || bizName)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const falKey = process.env.FAL_KEY
    if (!falKey) return NextResponse.json({ error: 'FAL_KEY not set' }, { status: 500 })

    // 1. Generate short quote untuk quote card (bukan caption panjang)
    const quoteRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 60,
      system: 'Kamu copywriter Instagram. Buat 1 kalimat pendek yang powerful dan emosional untuk quote card. Maksimal 10 kata. Bahasa Indonesia. Tidak ada tanda baca berlebihan. Langsung kalimat saja tanpa penjelasan.',
      messages: [{ role: 'user', content: 'Buat quote card untuk post ' + postType + ' dari bisnis ' + bizName + '. Produk: ' + product + '. Tema caption: ' + caption.slice(0, 60) }]
    })
    const quoteText = quoteRes.content[0].type === 'text' ? quoteRes.content[0].text.trim().replace(/["*#]/g, '') : oneLiner

    // 2. Generate food photo prompt
    const promptRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      system: 'Write a concise Ideogram V2 food photo prompt. English only. No text in image. Return only the prompt.',
      messages: [{ role: 'user', content: 'Instagram food photo for: ' + bizName + ', ' + product + '. Post type: ' + postType + '. Warm Indonesian kitchen atmosphere, wooden table, natural daylight. Portrait 4:5. Max 50 words.' }]
    })
    const foodPrompt = promptRes.content[0].type === 'text' ? promptRes.content[0].text.trim() : 'Authentic Indonesian nasi padang food, warm lighting, wooden table, portrait'

    // 3. Call Ideogram V2 for food photo
    const falRes = await fetch('https://fal.run/fal-ai/ideogram/v2', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: foodPrompt, style_type: 'REALISTIC', aspect_ratio: '4:5', num_images: 1, expand_prompt: false }),
    })

    let foodImageUrl = ''
    if (falRes.ok) {
      const falData = await falRes.json()
      foodImageUrl = falData.images?.[0]?.url || ''
      console.log('food photo:', foodImageUrl.slice(0, 80))
    } else {
      const errText = await falRes.text()
      console.error('fal error:', falRes.status, errText.slice(0, 100))
    }

    // 4. Build quote card data
    const quoteCard = {
      quote_text: quoteText,
      business_name: bizName,
      one_liner: oneLiner.slice(0, 55),
      primary_color: primary,
      secondary_color: secondary,
      accent_color: accent,
      post_type: postType,
    }

    // 5. Update post — also clean the caption
    const updatedPosts = [...posts]
    updatedPosts[post_index] = {
      ...post,
      caption: caption, // cleaned caption
      food_image_url: foodImageUrl,
      quote_card: quoteCard,
      food_prompt: foodPrompt,
      images_generated_at: new Date().toISOString(),
    }
    await adminClient.from('brand_kits').update({ content_data: { ...content, posts: updatedPosts } }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true, post_index, food_image_url: foodImageUrl, quote_text: quoteText, quote_card: quoteCard })
  } catch (err) {
    console.error('generate-post-images:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}