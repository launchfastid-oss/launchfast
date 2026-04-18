import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error && data.user) {
      const adminClient = createAdminClient()
      await adminClient.from('profiles').upsert({ id: data.user.id, full_name: data.user.user_metadata?.full_name || data.user.email, role: 'client' }, { onConflict: 'id', ignoreDuplicates: true })
      const { data: onboarding } = await adminClient.from('onboarding_answers').select('id').eq('user_id', data.user.id).limit(1).single()
      return NextResponse.redirect(`${origin}${onboarding ? next : '/onboarding'}`)
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}