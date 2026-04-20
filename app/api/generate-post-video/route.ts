import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

// Build motion prompt berdasarkan tipe post dan produk
function buildMotionPrompt(postType: string, product: string, bizName: string): string {
  const p = product.toLowerCase()
  const isPadang = p.includes('padang') || p.includes('rendang') || p.includes('gulai')
  const isCake = p.includes('kue') || p.includes('cake') || p.includes('bakery')

  const foodMotion = isPadang
    ? 'gentle steam rising from hot rice, slow camera zoom into rendang and sambal, warm golden light'
    : isCake
    ? 'slow pan across colorful cakes, gentle bokeh background, appetizing close-up'
    : 'gentle steam rising from hot food, slow zoom in, warm natural lighting'

  const motionByType: Record<string, string> = {
    'Perkenalan': 'slow cinematic zoom in, warm welcoming atmosphere, gentle fade',
    'Behind the Scene': 'subtle handheld motion, authentic feel, natural movement',
    'Edukasi': 'smooth slow zoom, steady camera, clean presentation',
    'Promo': 'dynamic push in, energetic but elegant motion',
    'Cerita': 'slow gentle drift, emotional warm lighting',
    'Tips': 'clean steady shot, professional minimal movement',
    'Testimoni': 'warm handheld feel, authentic natural motion',
    'Product Showcase': 'glamour shot slow rotation, product hero moment, bokeh background',
    'Interaktif': 'lively gentle bounce, inviting energy',
    'Nilai & Misi': 'slow majestic pan, cinematic quality',
  }

  const motion = motionByType[postType] || 'slow gentle zoom, cinematic quality'
  return foodMotion + '. ' + motion + '. No text, no logos, photorealistic.'
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

    const content = (kit.content_data || {}) as Record<string, unknown>
    const posts = (content.posts as Array<Record<string, unknown>>) || []
    const post = posts[post_index]
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    // Cari source image — prioritas: foto user, lalu food photo AI
    const userPhoto = ob.product_image_url || ''
    const foodPhoto = String(post.food_image_url || '')
    const sourceImage = (userPhoto.startsWith('http') ? userPhoto : null) || (foodPhoto.startsWith('http') ? foodPhoto : null)

    if (!sourceImage) {
      return NextResponse.json({ error: 'Tidak ada foto tersedia. Generate foto produk dulu sebelum membuat video.' }, { status: 400 })
    }

    const bizName = (ob.business_name || kit.business_name || '').split(',')[0].trim()
    const product = ob.product_service || ''
    const postType = String(post.type || '')
    const motionPrompt = buildMotionPrompt(postType, product, bizName)

    console.log('Source image:', sourceImage.slice(0, 60))
    console.log('Motion prompt:', motionPrompt.slice(0, 80))

    const falKey = process.env.FAL_KEY!

    // Generate video dengan LTX Video ($0.02/video, ~30 detik)
    const falRes = await fetch('https://fal.run/fal-ai/ltx-video/image-to-video', {
      method: 'POST',
      headers: { 'Authorization': 'Key ' + falKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: sourceImage,
        prompt: motionPrompt,
        negative_prompt: 'blur, distort, low quality, text overlay, watermark, chopsticks, fast motion',
        num_frames: 121,
        fps: 24,
        height: 768,
        width: 576,
      }),
    })

    if (!falRes.ok) {
      const err = await falRes.text()
      console.error('LTX error:', falRes.status, err.slice(0, 200))
      return NextResponse.json({ error: 'Video generation failed: ' + falRes.status }, { status: 500 })
    }

    const falData = await falRes.json()
    const videoUrl = falData.video?.url || ''
    if (!videoUrl) return NextResponse.json({ error: 'No video URL from LTX' }, { status: 500 })

    console.log('Video generated:', videoUrl.slice(0, 60))

    // Simpan video URL ke post
    const updatedPosts = [...posts]
    updatedPosts[post_index] = {
      ...post,
      video_url: videoUrl,
      video_source_image: sourceImage,
      video_generated_at: new Date().toISOString(),
    }
    await adminClient.from('brand_kits')
      .update({ content_data: { ...content, posts: updatedPosts } })
      .eq('id', brand_kit_id)

    return NextResponse.json({
      ok: true,
      post_index,
      video_url: videoUrl,
      source_used: userPhoto.startsWith('http') ? 'user_photo' : 'ai_photo',
    })
  } catch (err) {
    console.error('generate-post-video:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}