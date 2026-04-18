import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BrandKitClient from './client'

export default async function BrandKitPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: kit } = await supabase
    .from('brand_kits').select('id').eq('id', params.id).eq('user_id', user.id).single()

  if (!kit) redirect('/dashboard')

  return <BrandKitClient kitId={params.id} userId={user.id} />
}
