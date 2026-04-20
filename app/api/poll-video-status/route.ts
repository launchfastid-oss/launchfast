import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export const maxDuration = 15

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id, post_index, request_id, status_url, response_url } = await request.json()

    if (!status_url && !request_id) {
      return NextResponse.json({ status: 'error', error: 'status_url or request_id required' })
    }

    const falKey = process.env.FAL_KEY!

    // Pakai status_url yang dikembalikan fal saat submit — ini adalah URL yang benar
    // Kalau tidak ada, fallback ke build manual (legacy support)
    const checkUrl = status_url || `https://queue.fal.run/fal-ai/ltx-video/image-to-video/requests/${request_id}/status`

    console.log('Polling status_url:', checkUrl.slice(0, 100))

    const statusRes = await fetch(checkUrl, {
      method: 'GET',
      headers: { 'Authorization': 'Key ' + falKey },
    })

    if (!statusRes.ok) {
      const errText = await statusRes.text()
      console.error('fal status error:', statusRes.status, errText.slice(0, 200))
      return NextResponse.json({ status: 'error', error: 'Status check gagal: HTTP ' + statusRes.status })
    }

    const statusData = await statusRes.json()
    const queueStatus = statusData.status // 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

    console.log('Queue status:', queueStatus, '| position:', statusData.queue_position)

    if (queueStatus === 'COMPLETED') {
      // Ambil hasil — pakai response_url dari fal, atau build dari request_id
      const resultUrl = response_url || statusData.response_url
        || `https://queue.fal.run/fal-ai/ltx-video/image-to-video/requests/${request_id}`

      console.log('Fetching result from:', resultUrl.slice(0, 100))

      const resultRes = await fetch(resultUrl, {
        method: 'GET',
        headers: { 'Authorization': 'Key ' + falKey },
      })

      if (!resultRes.ok) {
        const errText = await resultRes.text()
        console.error('fal result error:', resultRes.status, errText.slice(0, 200))
        return NextResponse.json({ status: 'error', error: 'Result fetch gagal: HTTP ' + resultRes.status })
      }

      const resultData = await resultRes.json()
      const videoUrl = resultData.video?.url || ''

      console.log('Video URL:', videoUrl.slice(0, 80))

      if (!videoUrl) {
        return NextResponse.json({
          status: 'error',
          error: 'No video URL in result. Keys: ' + Object.keys(resultData).join(', ')
        })
      }

      // Simpan ke database
      const adminClient = createAdminClient()
      const { data: kit } = await adminClient
        .from('brand_kits').select('content_data').eq('id', brand_kit_id).single()

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
      const errMsg = statusData.error || statusData.detail || 'Video generation failed di fal'
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
