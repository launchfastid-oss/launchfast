import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

function cleanCaption(raw: string): string {
  return raw
    .replace(/^[#*-]+\s*Caption.*?\n+/gi, '')
    .replace(/^\*\*.*?\*\*\s*\n+/g, '')
    .replace(/^---+\s*\n*/g, '')
    .trim()
}

// Ekstrak headline terbaik dari caption untuk overlay gambar
function extractHeadline(caption: string): string {
  const clean = cleanCaption(caption)
  const first = clean.split(/[.!?\n]/)[0]?.trim() || clean
  if (first.length <= 60) return first
  const words = first.split(' ')
  let result = ''
  for (const word of words) {
    if ((result + ' ' + word).trim().length > 55) break
    result = (result + ' ' + word).trim()
  }
  return result + '...'
}

function buildVisualContext(product: string) {
  const p = product.toLowerCase()
  if (p.includes('padang') || p.includes('minang') || p.includes('rendang') || p.includes('gulai')) {
    return {
      cuisine: 'Nasi Padang (Minangkabau cuisine)',
      dishes: 'rendang sapi, gulai ayam, ayam pop, telur balado, sambal lado hijau, nasi putih panas',
      props: 'piring putih atau piring rotan, daun pisang, meja kayu jati, sendok dan garpu (BUKAN sumpit)',
      style: 'warm golden Indonesian food photography, steam rising, rich dark rendang sauce, vibrant green sambal',
      forbidden: 'NO chopsticks, NO sushi, NO curry jar, NO Chinese props, NO noodles',
    }
  }
  if (p.includes('warung') || p.includes('rumahan') || p.includes('masakan')) {
    return {
      cuisine: 'Indonesian home cooking',
      dishes: 'nasi putih, lauk pauk Indonesia, sayur, tempe goreng, sambal terasi',
      props: 'piring sederhana, meja kayu, daun pisang, sendok garpu',
      style: 'warm homestyle Indonesian food photography, natural daylight',
      forbidden: 'NO chopsticks, NO sushi, NO East Asian styling',
    }
  }
  if (p.includes('kue') || p.includes('jajan') || p.includes('cake') || p.includes('bakery')) {
    return {
      cuisine: 'Indonesian traditional snacks and cakes',
      dishes: 'kue tradisional, jajanan pasar, klepon, onde-onde, kue basah',
      props: 'piring anyaman, daun pandan, warna-warna cerah',
      style: 'bright cheerful Indonesian bakery photography',
      forbidden: 'NO Western-only styling',
    }
  }
  return {
    cuisine: 'Indonesian cuisine',
    dishes: product || 'makanan Indonesia',
    props: 'piring putih, meja kayu, garnish segar, sendok garpu',
    style: 'authentic Indonesian food photography, warm lighting',
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
    const headline = extractHeadline(rawCaption)
    const postType = String(post.type || '')
    const oneLiner = String((strategy.golden_one_liner as string) || bizName)

    // Cek apakah user sudah upload foto produk sendiri
    const userProductPhoto = ob.product_image_url || ''
    const hasUserPhoto = userProductPhoto.startsWith('http')

    const falKey = process.env.FAL_KEY!
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    let foodImageUrl = ''

    if (hasUserPhoto) {
      // Gunakan foto produk user yang sudah diupload — langsung pakai tanpa generate baru
      // Ini lebih kontekstual karena adalah foto asli produk mereka
      foodImageUrl = userProductPhoto
      console.log('Using user product photo:', userProductPhoto.slice(0, 60))
    } else {
      // Generate dengan Ideogram V2 berdasarkan konteks bisnis
      const ctx = buildVisualContext(product)

      const promptRes = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        system: 'You generate food photography prompts. STRICTLY follow the forbidden list. Never use chopsticks for Indonesian food.',
        messages: [{
          role: 'user',
          content: 'Prompt for Ideogram V2 food photo. Business: ' + bizName + ' in ' + location + '. EXACT cuisine: ' + ctx.cuisine + '. Dishes: ' + ctx.dishes + '. Props: ' + ctx.props + '. Style: ' + ctx.style + '. Post type: ' + postType + '. FORBIDDEN: ' + ctx.forbidden + '. No text overlay. Portrait 3:4. Max 55 words English. Return ONLY the prompt.'
        }]
      })

      let foodPrompt = promptRes.content[0].type === 'text' ? promptRes.content[0].text.trim().replace(/^["']|["']$/g, '') : ''

      const dangerous = ['chopstick', 'sushi', 'ramen', 'noodle', 'chinese', 'japanese', 'curry jar']
      if (dangerous.some(w => foodPrompt.toLowerCase().includes(w)) || !foodPrompt) {
        foodPrompt = 'Authentic nasi padang Minangkabau on white plate: rendang, gulai ayam, sambal lado, white rice. Wooden table, daun pisang, warm golden light. Portrait food photography, no text, Indonesian sendok garpu only.'
      }

      console.log('Generating with prompt:', foodPrompt.slice(0, 80))

      try {
        const falRes = await fetch('https://fal.run/fal-ai/ideogram/v2', {
          method: 'POST',
          headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: foodPrompt, style_type: 'REALISTIC', aspect_ratio: '3:4', num_images: 1, expand_prompt: false }),
        })
        if (falRes.ok) {
          const d = await falRes.json()
          foodImageUrl = d.images?.[0]?.url || ''
        } else {
          console.error('Ideogram error:', falRes.status, await falRes.text().then(t => t.slice(0,200)))
        }
      } catch(e) { console.error('Fal error:', e) }
    }

    const quoteCard = {
      caption_short: caption.slice(0, 130),
      business_name: bizName,
      one_liner: oneLiner.slice(0, 70),
      primary_color: primary,
      secondary_color: secondary,
      accent_color: accent,
      post_type: postType,
      headline: headline,
    }

    const updatedPosts = [...posts]
    updatedPosts[post_index] = {
      ...post,
      food_image_url: foodImageUrl,
      quote_card: quoteCard,
      used_user_photo: hasUserPhoto,
      images_generated_at: new Date().toISOString(),
    }
    await adminClient.from('brand_kits')
      .update({ content_data: { ...content, posts: updatedPosts } })
      .eq('id', brand_kit_id)

    return NextResponse.json({
      ok: true, post_index,
      food_image_url: foodImageUrl,
      has_food: !!foodImageUrl,
      used_user_photo: hasUserPhoto,
      quote_card: quoteCard,
    })
  } catch (err) {
    console.error('generate-post-images:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}