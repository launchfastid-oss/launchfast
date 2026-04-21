import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import BrandKitClient from './client'

export default async function BrandKitPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: kit } = await supabase
    .from('brand_kits').select('id').eq('id', params.id).eq('user_id', user.id).single()

  if (!kit) redirect('/dashboard')

  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center"><p className="text-[#555555]">Memuat...</p></div>}>
      <BrandKitClient kitId={params.id} userId={user.id} />
    </Suspense>
  )
}
