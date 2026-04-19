import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return new NextResponse('Unauthorized', { status: 401 })

    const adminClient = createAdminClient()
    const { data: kit } = await adminClient
      .from('brand_kits')
      .select('landing_page_html, user_id')
      .eq('id', params.id)
      .single()

    if (!kit || kit.user_id !== user.id) return new NextResponse('Not found', { status: 404 })
    if (!kit.landing_page_html) return new NextResponse('Landing page belum dibuat', { status: 404 })

    return new NextResponse(kit.landing_page_html as string, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    })
  } catch (err) {
    console.error('landing preview error:', err)
    return new NextResponse('Error', { status: 500 })
  }
}
