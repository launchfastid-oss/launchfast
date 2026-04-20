import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 30

function buildMotionPrompt(postType: string, product: string): string {
  const p = product.toLowerCase()
  const isPadang = p.includes('padang') || p.includes('rendang') || p.includes('gulai')
  const isCake = p.includes('kue') || p.includes('cake') || p.includes('bakery')

  const foodMotion = isPadang
    ? 'gentle steam rising from hot rice and rendang, slow cinematic zoom, warm golden light'
    : isCake
    ? 'slow pan across colorful cakes, gentle bokeh, appetizing close-up'
    : 'gentle steam rising from hot food, slow zoom, warm natural light'

  const motionMap: Record<string, string> = {
    'Perkenalan': 'slow cinematic zoom in, warm welcoming atmosphere',
    'Behind the Scene': 'subtle handheld authentic feel',
    'Edukasi': 'smooth slow zoom, steady camera',
    'Promo': 'dynamic push in, energetic elegant motion',
    'Tips': 'clean steady professional shot',
    'Testimoni': 'warm handheld authentic motion',
    'Product Showcase': 'glamour slow rotation, bokeh hero shot',
    'Interaktif': 'lively gentle motion, inviting energy',
  }
  const motion = motionMap[postType] || 'slow gentle zoom, cinematic'
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
      .from('brand_kits').select('business_name, content_data, order_id')
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

    // Pilih source image — user photo prioritas
    const userPhoto = ob.product_image_url || ''
    const foodPhoto = String(post.food_image_url || '')
    const sourceImage = (userPhoto.startsWith('http') ? userPhoto : null)
      || (foodPhoto.startsWith('http') ? foodPhoto : null)

    if (!sourceImage) {
      return NextResponse.json({ error: 'Generate foto produk dulu sebelum membuat video.' }, { status: 400 })
    }

    const product = ob.product_service || ''
    const postType = String(post.type || '')
    const motionPrompt = buildMotionPrompt(postType, product)
    const falKey = process.env.FAL_KEY!

    // Submit ke fal QUEUE — tidak tunggu hasil, langsung return request_id
    const queueRes = await fetch('https://queue.fal.run/fal-ai/ltx-video/image-to-video', {
      method: 'POST',
      headers: {
        'Authorization': 'Key ' + falKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image_url: sourceImage,
        prompt: motionPrompt,
        negative_prompt: 'blur, distort, low quality, text overlay, watermark, fast motion',
        num_frames: 121,
        fps: 24,
        height: 768,
        width: 576,
      }),
    })

    if (!queueRes.ok) {
      const errText = await queueRes.text()
      console.error('fal queue submit error:', queueRes.status, errText.slice(0, 200))
      return NextResponse.json({ error: 'Gagal submit ke fal queue: ' + queueRes.status }, { status: 500 })
    }

    const queueData = await queueRes.json()
    const requestId = queueData.request_id

    if (!requestId) {
      return NextResponse.json({ error: 'Tidak dapat request_id dari fal' }, { status: 500 })
    }

    console.log('Submitted to fal queue, request_id:', requestId)

    // Simpan request_id ke post agar bisa di-poll
    const updatedPosts = [...posts]
    updatedPosts[post_index] = {
      ...post,
      video_request_id: requestId,
      video_status: 'pending',
      video_submitted_at: new Date().toISOString(),
    }
    await adminClient.from('brand_kits')
      .update({ content_data: { ...content, posts: updatedPosts } })
      .eq('id', brand_kit_id)

    return NextResponse.json({
      ok: true,
      request_id: requestId,
      status: 'pending',
      post_index,
    })
  } catch (err) {
    console.error('generate-post-video:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
