import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 15

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id, post_index, request_id } = await request.json()
    if (!request_id) return NextResponse.json({ error: 'request_id required' }, { status: 400 })

    const falKey = process.env.FAL_KEY!

    // fal queue status — pakai GET bukan POST
    const statusRes = await fetch(
      `https://queue.fal.run/fal-ai/ltx-video/image-to-video/requests/${request_id}/status`,
      {
        method: 'GET',
        headers: { 'Authorization': 'Key ' + falKey },
      }
    )

    if (!statusRes.ok) {
      const errText = await statusRes.text()
      console.error('fal status error:', statusRes.status, errText.slice(0, 200))
      return NextResponse.json({ status: 'error', error: 'Status check failed: ' + statusRes.status + ' ' + errText.slice(0, 100) })
    }

    const statusData = await statusRes.json()
    const queueStatus = statusData.status // 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

    console.log('fal queue status:', queueStatus, 'request_id:', request_id)

    if (queueStatus === 'COMPLETED') {
      // Ambil hasil — juga pakai GET
      const resultRes = await fetch(
        `https://queue.fal.run/fal-ai/ltx-video/image-to-video/requests/${request_id}`,
        {
          method: 'GET',
          headers: { 'Authorization': 'Key ' + falKey },
        }
      )

      if (!resultRes.ok) {
        const errText = await resultRes.text()
        console.error('fal result error:', resultRes.status, errText.slice(0, 200))
        return NextResponse.json({ status: 'error', error: 'Result fetch failed: ' + resultRes.status })
      }

      const resultData = await resultRes.json()
      const videoUrl = resultData.video?.url || ''

      console.log('Video URL:', videoUrl.slice(0, 80))

      if (!videoUrl) {
        return NextResponse.json({ status: 'error', error: 'No video URL in result: ' + JSON.stringify(resultData).slice(0, 200) })
      }

      // Simpan video URL ke database
      const adminClient = createAdminClient()
      const { data: kit } = await adminClient
        .from('brand_kits').select('content_data')
        .eq('id', brand_kit_id).single()

      if (kit) {
        const content = (kit.content_data || {}) as Record<string, unknown>
        const posts = (content.posts as Array<Record<string, unknown>>) || []
        if (posts[post_index]) {
          const updatedPosts = [...posts]
          updatedPosts[post_index] = {
            ...posts[post_index],
            video_url: videoUrl,
            video_status: 'completed',
            video_generated_at: new Date().toISOString(),
          }
          await adminClient.from('brand_kits')
            .update({ content_data: { ...content, posts: updatedPosts } })
            .eq('id', brand_kit_id)
        }
      }

      return NextResponse.json({ status: 'completed', video_url: videoUrl })
    }

    if (queueStatus === 'FAILED') {
      const errMsg = statusData.error || statusData.detail || 'Video generation failed'
      console.error('fal job FAILED:', errMsg)
      return NextResponse.json({ status: 'error', error: errMsg })
    }

    // IN_QUEUE atau IN_PROGRESS — masih jalan
    return NextResponse.json({
      status: 'pending',
      queue_status: queueStatus,
      queue_position: statusData.queue_position,
    })

  } catch (err) {
    console.error('poll-video-status error:', err)
    return NextResponse.json({ status: 'error', error: String(err) })
  }
}
