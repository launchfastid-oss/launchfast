import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { brand_kit_id, logo_index, logo_url, logo_svg } = await request.json()
    const adminClient = createAdminClient()

    const { data: kit } = await adminClient
      .from('brand_kits').select('visual_data, content_data').eq('id', brand_kit_id).single()
    if (!kit) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const visual = (kit.visual_data || {}) as Record<string, unknown>
    const updatedVisual = {
      ...visual,
      locked_logo_index: logo_index,
      locked_logo_url: logo_url,
      locked_logo_svg: logo_svg,
      logo_locked_at: new Date().toISOString(),
    }

    const content = (kit.content_data || {}) as Record<string, unknown>
    const updatedContent = { ...content, locked: false }

    await adminClient.from('brand_kits').update({
      visual_data: updatedVisual,
      content_data: updatedContent,
    }).eq('id', brand_kit_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('lock-logo error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
