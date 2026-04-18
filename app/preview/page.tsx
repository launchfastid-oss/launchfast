import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function PreviewPage({
  searchParams,
}: {
  searchParams: { onboarding?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const onboardingId = searchParams.onboarding
  if (!onboardingId) redirect('/onboarding')

  const { data: onboarding } = await supabase
    .from('onboarding_answers')
    .select('*')
    .eq('id', onboardingId)
    .eq('user_id', user.id)
    .single()

  if (!onboarding) redirect('/onboarding')

  const { data: brandKit } = await supabase
    .from('brand_kits')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_preview_only', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const preview = brandKit?.preview_data as Record<string, unknown> | null

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-4xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold">
            <span className="text-[#1D9E75]">Launchfast</span>.id
          </span>
          <Link href="/dashboard" className="text-sm text-[#555555] hover:text-[#1A1A1A]">Dashboard</Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-[#E8F7F2] text-[#1D9E75] text-sm font-semibold px-4 py-2 rounded-pill mb-4">
            â¨ Preview Brand Kit â {onboarding.business_name}
          </div>
          <h1 className="text-3xl font-bold text-[#1A1A1A] mb-3">Brand kit bisnis kamu sudah siap!</h1>
          <p className="text-[#555555]">Lihat sebagian hasilnya di bawah. Bayar untuk unlock semuanya.</p>
        </div>

        {!preview ? (
          <div className="card text-center py-16">
            <div className="text-4xl mb-4">â¡</div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">AI sedang membuat preview kamu...</h2>
            <p className="text-sm text-[#555555] mb-6">Klik tombol di bawah untuk generate preview</p>
            <form action="/api/generate-preview" method="POST">
              <input type="hidden" name="onboarding_id" value={onboardingId} />
              <button type="submit" className="btn-primary">Generate Preview Sekarang</button>
            </form>
          </div>
        ) : (
          <PreviewContent preview={preview as Record<string, unknown>} onboardingId={onboardingId} />
        )}
      </div>
    </div>
  )
}

function PreviewContent({ preview, onboardingId }: { preview: Record<string, unknown>; onboardingId: string }) {
  const p = preview as Record<string, any>
  return (
    <div className="space-y-6">
      {p.golden_one_liner && (
        <div className="card">
          <span className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide block mb-3">â Golden One-Liner</span>
          <p className="text-xl font-bold text-[#1A1A1A] leading-relaxed">"{p.golden_one_liner}"</p>
        </div>
      )}

      {p.sb7_hero && (
        <div className="card">
          <span className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide block mb-3">â Hero Section</span>
          <div className="space-y-2 text-sm text-[#555555]">
            <p><strong className="text-[#1A1A1A]">Headline:</strong> {p.sb7_hero.headline}</p>
            <p><strong className="text-[#1A1A1A]">Subheadline:</strong> {p.sb7_hero.subheadline}</p>
          </div>
        </div>
      )}

      {p.colors && Array.isArray(p.colors) && (
        <div className="card">
          <span className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide block mb-3">â Color Palette</span>
          <div className="flex gap-4 flex-wrap">
            {p.colors.map((c: { hex: string; name: string }, i: number) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 rounded-lg border border-[#E0E0E0] mb-1" style={{ backgroundColor: c.hex }} />
                <p className="text-xs font-mono text-[#555555]">{c.hex}</p>
                <p className="text-xs text-[#888888]">{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card relative overflow-hidden">
        <div className="absolute inset-0 backdrop-blur-sm bg-white/80 flex flex-col items-center justify-center z-10 rounded-card">
          <div className="text-2xl mb-2">ð</div>
          <p className="font-semibold text-[#1A1A1A] mb-1">+30 konten, WA Scripts, Logo, Data Legal</p>
          <p className="text-sm text-[#555555]">Bayar untuk unlock semua 6 tab brand kit</p>
        </div>
        <div className="opacity-10 pointer-events-none select-none space-y-3 p-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded" style={{ width: `${60 + i * 8}%` }} />
          ))}
        </div>
      </div>

      <div className="card text-center" style={{ backgroundColor: '#1D9E75' }}>
        <h2 className="text-2xl font-bold text-white mb-2">Unlock Brand Kit Lengkap</h2>
        <p className="text-sm text-white/90 mb-1">Strategi Â· Logo Â· 30 Konten Â· WA Scripts Â· Legal Â· Landing Page</p>
        <p className="text-xs text-white/70 mb-6">Harga normal <s>Rp 2.000.000</s></p>
        <Link
          href={`/checkout?onboarding=${onboardingId}`}
          className="inline-block bg-white text-[#1D9E75] font-bold px-8 py-3 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Bayar Rp 1.000.000 & Unlock Semua â
        </Link>
        <p className="text-xs text-white/70 mt-3">â Preview gratis Â· â Bayar kalau puas Â· â Selesai ~30 menit</p>
      </div>
    </div>
  )
}
