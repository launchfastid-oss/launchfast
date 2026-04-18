import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/lib/actions/auth'

export default async function BrandKitPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: kit } = await supabase
    .from('brand_kits')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .single()

  if (!kit) redirect('/dashboard')

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold">
            <span className="text-[#1D9E75]">Launchfast</span>.id
          </span>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-[#555555] hover:text-[#1A1A1A]">â Dashboard</Link>
            <form action={logout}>
              <button type="submit" className="text-sm text-[#555555] hover:text-[#1A1A1A]">Keluar</button>
            </form>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">{kit.business_name}</h1>
            <p className="text-sm text-[#555555] mt-1">
              Dibuat {new Date(kit.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <button className="btn-secondary text-sm">â¬ Download ZIP</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white border border-[#E0E0E0] rounded-lg p-1 mb-6 overflow-x-auto">
          {['Strategi', 'Visual', 'Konten 30 Hari', 'WA Scripts', 'Checklist', 'Legal'].map((tab, i) => (
            <button key={tab}
              className={`flex-shrink-0 px-4 py-2 rounded-md text-sm font-medium transition-colors ${i === 0 ? 'bg-[#1D9E75] text-white' : 'text-[#555555] hover:bg-[#F5F5F5]'}`}>
              {tab}
            </button>
          ))}
        </div>

        {/* Coming soon content */}
        <div className="card text-center py-16">
          <div className="text-4xl mb-4">ð§</div>
          <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Brand Kit sedang disiapkan</h2>
          <p className="text-sm text-[#555555]">
            AI sedang memproses semua konten brand kit kamu.<br />
            Halaman ini akan otomatis terupdate setelah selesai.
          </p>
        </div>
      </div>
    </div>
  )
}
