import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

function cleanCaption(raw: string): string {
  return raw
    .replace(/^[-*#]+\s*Caption.*?\n+/gi, '')
    .replace(/^\*\*.*?\*\*\n+/g, '')
    .replace(/^---+\n*/g, '')
    .trim()
}

// Deteksi industri/produk dari onboarding dan buat konteks visual yang tepat
function buildVisualContext(product: string, bizName: string, location: string) {
  const p = product.toLowerCase()
  
  // Nasi Padang / Masakan Minang
  if (p.includes('padang') || p.includes('minang') || p.includes('rendang') || p.includes('gulai')) {
    return {
      cuisine: 'Nasi Padang (Minangkabau cuisine)',
      dishes: 'rendang sapi, gulai ayam, ayam pop, telur balado, sambal lado hijau, gulai nangka, perkedel, nasi putih panas',
      props: 'piring putih atau piring rotan, daun pisang, meja kayu jati, sambal di mangkuk kecil, sendok dan garpu (BUKAN sumpit)',
      style: 'warm golden Indonesian food photography, steam rising from hot rice, rich dark rendang sauce, vibrant green sambal',
      forbidden: 'NO chopsticks, NO sushi, NO curry powder jar, NO wok, NO Chinese or Japanese props, NO noodles, NO fried rice in a bowl with chopsticks',
    }
  }
  // Warung / Masakan Rumahan
  if (p.includes('warung') || p.includes('rumahan') || p.includes('masakan')) {
    return {
      cuisine: 'Indonesian home cooking (masakan rumahan)',
      dishes: 'nasi putih, lauk pauk Indonesia, sayur bening, tempe goreng, ikan bakar, sambal terasi',
      props: 'piring bersih sederhana, meja kayu, daun pisang, sendok garpu',
      style: 'warm homestyle Indonesian food photography, rustic wooden table, natural daylight',
      forbidden: 'NO chopsticks, NO sushi, NO ramen, NO East Asian styling',
    }
  }
  // Kue / Jajanan
  if (p.includes('kue') || p.includes('jajan') || p.includes('snack') || p.includes('cake')) {
    return {
      cuisine: 'Indonesian traditional snacks and cakes',
      dishes: 'kue tradisional Indonesia, jajanan pasar, kue basah, klepon, onde-onde',
      props: 'piring anyaman, daun pandan, meja kayu, warna-warna cerah',
      style: 'bright cheerful Indonesian bakery photography, colorful traditional cakes',
      forbidden: 'NO Western-style cakes only, must show Indonesian elements',
    }
  }
  // Default: Indonesian food
  return {
    cuisine: 'Indonesian cuisine',
    dishes: product || 'makanan Indonesia',
    props: 'piring putih bersih, meja kayu, garnish segar, sendok garpu',
    style: 'authentic Indonesian food photography, warm lighting, appetizing',
    forbidden: 'NO chopsticks, NO sushi, NO East Asian food elements',
  }
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

    const bizName = (ob.business_name || kit.business_name || '').split(',')[0].trim()
    const product = ob.product_service || ''
    const location = ob.location || ob.city || 'Indonesia'
    const rawCaption = String(post.caption || '')
    const caption = cleanCaption(rawCaption)
    const postType = String(post.type || '')
    const oneLiner = String((strategy.golden_one_liner as string) || bizName)

    // Build konteks visual yang spesifik berdasarkan produk
    const ctx = buildVisualContext(product, bizName, location)

    const falKey = process.env.FAL_KEY!
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Generate prompt dengan konteks produk yang sangat spesifik
    const promptInstruction = 'You are an expert Indonesian food photographer and prompt engineer. ' +
      'Create a Ideogram V2 food photo prompt. ' +
      'Business: ' + bizName + ' in ' + location + '. ' +
      'EXACT cuisine: ' + ctx.cuisine + '. ' +
      'Featured dishes MUST be: ' + ctx.dishes + '. ' +
      'Props to use: ' + ctx.props + '. ' +
      'Photography style: ' + ctx.style + '. ' +
      'Post type: ' + postType + '. ' +
      'STRICTLY FORBIDDEN: ' + ctx.forbidden + '. ' +
      'Requirements: portrait orientation, warm lighting, appetizing, NO text overlay, authentic Indonesian styling. ' +
      'Max 60 words. English only. Return ONLY the prompt text, nothing else.'

    const promptRes = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      system: 'You generate food photography prompts. Always follow the STRICTLY FORBIDDEN list. Never include chopsticks, sushi, or non-Indonesian elements for Indonesian food businesses.',
      messages: [{ role: 'user', content: promptInstruction }]
    })

    let foodPrompt = promptRes.content[0].type === 'text' ? promptRes.content[0].text.trim() : ''
    foodPrompt = foodPrompt.replace(/^["']|["']$/g, '').trim()

    // Safety check: jika prompt masih ada kata-kata terlarang, override dengan fallback yang aman
    const dangerous = ['chopstick', 'sushi', 'ramen', 'noodle', 'wok', 'chinese', 'japanese', 'curry jar', 'fried rice bowl']
    const hasDangerous = dangerous.some(w => foodPrompt.toLowerCase().includes(w))
    if (hasDangerous || !foodPrompt) {
      foodPrompt = 'Authentic nasi padang Minangkabau served on white plate: rendang sapi, gulai ayam, ayam pop, sambal lado hijau, rice. ' +
        'Wooden table, daun pisang garnish, Indonesian batik cloth, warm golden light, steam rising. ' +
        'Portrait food photography, appetizing, no text, no chopsticks, Indonesian sendok garpu only.'
    }

    console.log('Food prompt:', foodPrompt.slice(0, 100))
    console.log('Cuisine context:', ctx.cuisine)

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
        const d = await falRes.json()
        foodImageUrl = d.images?.[0]?.url || ''
        console.log('Food image:', foodImageUrl ? 'OK ' + foodImageUrl.slice(0,50) : 'EMPTY')
      } else {
        const err = await falRes.text()
        console.error('Ideogram error:', falRes.status, err.slice(0, 200))
      }
    } catch(e) {
      console.error('Fal error:', e)
    }

    const quoteCard = {
      caption_short: caption.slice(0, 130),
      business_name: bizName,
      one_liner: oneLiner.slice(0, 70),
      primary_color: primary,
      secondary_color: secondary,
      accent_color: accent,
      post_type: postType,
    }

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
      prompt_used: foodPrompt.slice(0, 100),
    })
  } catch (err) {
    console.error('generate-post-images:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}