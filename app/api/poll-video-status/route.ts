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

    // Cek status di fal queue
    const statusRes = await fetch(
      `https://queue.fal.run/fal-ai/ltx-video/image-to-video/requests/${request_id}/status`,
      { headers: { 'Authorization': 'Key ' + falKey } }
    )

    if (!statusRes.ok) {
      return NextResponse.json({ status: 'error', error: 'Status check failed: ' + statusRes.status })
    }

    const statusData = await statusRes.json()
    const queueStatus = statusData.status // 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

    console.log('fal queue status:', queueStatus, 'for request:', request_id)

    if (queueStatus === 'COMPLETED') {
      // Ambil hasil video
      const resultRes = await fetch(
        `https://queue.fal.run/fal-ai/ltx-video/image-to-video/requests/${request_id}`,
        { headers: { 'Authorization': 'Key ' + falKey } }
      )
      const resultData = await resultRes.json()
      const videoUrl = resultData.video?.url || ''

      if (!videoUrl) {
        return NextResponse.json({ status: 'error', error: 'No video URL in completed result' })
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

      return NextResponse.json({
        status: 'completed',
        video_url: videoUrl,
      })
    }

    if (queueStatus === 'FAILED') {
      return NextResponse.json({
        status: 'error',
        error: statusData.error || 'Video generation failed',
      })
    }

    // Masih IN_QUEUE atau IN_PROGRESS
    return NextResponse.json({
      status: 'pending',
      queue_status: queueStatus,
    })
  } catch (err) {
    console.error('poll-video-status:', err)
    return NextResponse.json({ status: 'error', error: String(err) })
  }
}
