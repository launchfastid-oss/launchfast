import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: kits } = await supabase
    .from('brand_kits')
    .select('id, business_name, created_at, is_preview_only, preview_data')
    .eq('user_id', user.id)
    .eq('is_preview_only', false)
    .order('created_at', { ascending: false })

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const name = (profile as Record<string, string> | null)?.full_name || user.email?.split('@')[0] || 'kamu'

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold"><span className="text-[#1D9E75]">Launchfast</span>.id</span>
          <Link href="/onboarding" className="btn-primary text-sm py-2 px-4">+ Brand Kit Baru</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-1">Halo, {name}! ð</h1>
        <p className="text-sm text-[#555555] mb-8">Brand kit kamu ada di sini.</p>

        {!kits || kits.length === 0 ? (
          <div className="card text-center py-16">
            <div className="text-5xl mb-4">ð</div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Belum ada brand kit</h2>
            <p className="text-sm text-[#555555] mb-6">Buat brand kit pertama kamu sekarang â gratis lihat preview-nya!</p>
            <Link href="/onboarding" className="btn-primary inline-block px-8 py-3">Mulai Sekarang â</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {kits.map((kit) => {
              const preview = kit.preview_data as Record<string, unknown> | null
              const oneLiner = preview?.golden_one_liner as string | undefined
              const colors = preview?.colors as Array<{ hex: string }> | undefined
              return (
                <Link key={kit.id} href={`/brand-kit/${kit.id}`}
                  className="card hover:border-[#1D9E75] transition-all cursor-pointer group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {colors && colors.slice(0, 3).map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-[#E0E0E0]"
                            style={{ backgroundColor: c.hex }} />
                        ))}
                      </div>
                      <h3 className="font-bold text-[#1A1A1A] text-lg group-hover:text-[#1D9E75] transition-colors">
                        {kit.business_name as string}
                      </h3>
                      {oneLiner && (
                        <p className="text-sm text-[#555555] mt-1 italic">"{oneLiner}"</p>
                      )}
                      <p className="text-xs text-[#888888] mt-2">
                        {new Date(kit.created_at as string).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 ml-4">
                      <span className="text-xs bg-[#E8F7F2] text-[#1D9E75] px-2 py-1 rounded-pill font-semibold">â Lengkap</span>
                      <span className="text-[#1D9E75] text-sm group-hover:translate-x-1 transition-transform">â</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
