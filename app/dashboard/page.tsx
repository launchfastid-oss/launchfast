import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/lib/actions/auth'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', user.id).single()
  const { data: brandKits } = await supabase.from('brand_kits').select('*, orders(status, created_at)').eq('user_id', user.id).order('created_at', { ascending: false })

  const statusLabel: Record<string, { label: string; color: string }> = {
    pending_payment: { label: 'Menunggu Pembayaran', color: 'bg-yellow-100 text-yellow-700' },
    paid: { label: 'Dibayar', color: 'bg-blue-100 text-blue-700' },
    generating: { label: 'Sedang Diproses', color: 'bg-blue-100 text-blue-700' },
    completed: { label: 'Selesai', color: 'bg-green-100 text-[#1D9E75]' },
    failed: { label: 'Gagal', color: 'bg-red-100 text-red-600' },
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold"><span className="text-[#1D9E75]">Launchfast</span>.id</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[#555555] hidden sm:block">{profile?.full_name || user.email}</span>
            <form action={logout}><button type="submit" className="text-sm text-[#555555] hover:text-[#1A1A1A]">Keluar</button></form>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A1A]">Brand Kit Saya</h1>
            <p className="text-sm text-[#555555] mt-1">Semua brand kit yang pernah kamu buat</p>
          </div>
          <Link href="/onboarding" className="btn-primary text-sm">+ Buat Brand Kit Baru</Link>
        </div>
        {!brandKits || brandKits.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">🚀</div>
            <h2 className="text-lg font-bold text-[#1A1A1A] mb-2">Belum ada brand kit</h2>
            <p className="text-sm text-[#555555] mb-6">Mulai dengan menjawab 8 pertanyaan tentang bisnis kamu.<br/>Preview gratis, bayar kalau puas.</p>
            <Link href="/onboarding" className="btn-primary inline-block">Mulai sekarang — gratis</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {brandKits.map((kit: any) => {
              const status = statusLabel[kit.orders?.status] || statusLabel.pending_payment
              return (
                <Link key={kit.id} href={kit.orders?.status === 'completed' ? `/brand-kit/${kit.id}` : `/preview?kit=${kit.id}`}
                  className="card flex items-center justify-between hover:border-[#1D9E75] transition-colors group">
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A] group-hover:text-[#1D9E75]">{kit.business_name}</h3>
                    <p className="text-xs text-[#888888] mt-1">{new Date(kit.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <span className={`text-xs font-medium px-3 py-1 rounded-pill ${status.color}`}>{status.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}