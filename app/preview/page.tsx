'use client'
import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function PreviewContent() {
  const searchParams = useSearchParams()
  const onboardingId = searchParams.get('onboarding')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null)

  async function handleGenerate() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/generate-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_id: onboardingId })
      })
      const data = await res.json()
      if (data.error) { setError(data.error); setLoading(false); return }
      setPreview(data)
    } catch { setError('Gagal generate preview') }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold"><span className="text-[#1D9E75]">Launchfast</span>.id</span>
          <Link href="/dashboard" className="text-sm text-[#555555]">Dashboard</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="inline-block bg-[#E8F7F2] text-[#1D9E75] text-sm font-semibold px-4 py-2 rounded-full mb-4">
            Preview Brand Kit
          </div>
          <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Brand kit bisnis kamu sudah siap!</h1>
          <p className="text-[#555555]">Lihat sebagian hasilnya di bawah. Bayar untuk unlock semuanya.</p>
        </div>

        {error && <div className="error-box mb-6">{error}</div>}

        {!preview ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-[#E8F7F2] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[#1D9E75]">AI</span>
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">AI sedang menyiapkan preview kamu...</h2>
            <p className="text-sm text-[#555555] mb-6">Klik tombol di bawah untuk generate preview</p>
            <button onClick={handleGenerate} disabled={loading}
              className="btn-primary px-8 py-3 text-base">
              {loading ? 'Sedang generate...' : 'Generate Preview Sekarang'}
            </button>
            {loading && <p className="text-xs text-[#888888] mt-3">Biasanya 20-30 detik</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="card bg-[#1D9E75] text-white">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Golden One-Liner</p>
              <p className="text-xl font-bold leading-relaxed">"{preview.golden_one_liner as string}"</p>
            </div>

            {(preview.sb7_hero as Record<string, string>) && (
              <div className="card">
                <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Hero Website</p>
                <h3 className="text-lg font-bold text-[#1A1A1A] mb-2">{(preview.sb7_hero as Record<string, string>).headline}</h3>
                <p className="text-sm text-[#555555]">{(preview.sb7_hero as Record<string, string>).subheadline}</p>
              </div>
            )}

            {(preview.colors as Array<Record<string, string>>) && (
              <div className="card">
                <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Color Palette</p>
                <div className="flex gap-3">
                  {(preview.colors as Array<Record<string, string>>).map((c, i) => (
                    <div key={i} className="text-center">
                      <div className="w-12 h-12 rounded-lg border border-[#E0E0E0]" style={{ backgroundColor: c.hex }} />
                      <p className="text-xs text-[#888888] mt-1 font-mono">{c.hex}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card border-[#1D9E75] border-2">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-[#1A1A1A] text-lg mb-1">Mau lihat brand kit lengkap?</p>
                  <p className="text-sm text-[#555555]">Strategi STP, 30 konten, WA scripts, checklist, legal, dan landing page AI</p>
                </div>
                <span className="text-2xl font-bold text-[#1D9E75] whitespace-nowrap ml-4">Rp 1 juta</span>
              </div>
              <Link href={'/checkout?onboarding=' + onboardingId} className="btn-primary w-full block text-center py-3 text-base">
                Bayar & Unlock Brand Kit Lengkap
              </Link>
              <p className="text-xs text-center text-[#888888] mt-2">Sekali bayar, bukan langganan</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center"><p className="text-[#555555]">Memuat...</p></div>}>
      <PreviewContent />
    </Suspense>
  )
}
