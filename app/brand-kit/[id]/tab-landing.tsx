'use client'
import { useState } from 'react'

interface LandingTabProps {
  kitId: string
  initialHtml?: string | null
}

export function LandingTab({ kitId, initialHtml }: LandingTabProps) {
  const [html, setHtml] = useState<string | null>(initialHtml || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/generate-landing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_kit_id: kitId })
      })
      const data = await res.json()
      if (data.ok) setHtml(data.html)
      else setError(data.error || 'Gagal generate landing page')
    } catch { setError('Terjadi kesalahan') }
    finally { setLoading(false) }
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-1">Landing Page AI</p>
            <p className="text-sm text-[#555555]">Generate landing page otomatis berdasarkan brand kit kamu</p>
          </div>
          <div className="flex gap-2">
            {html && (
              <a href={`/api/landing-preview/${kitId}`} target="_blank" rel="noopener noreferrer"
                className="btn-secondary text-sm py-2 px-3">
                ð Preview
              </a>
            )}
            <button onClick={handleGenerate} disabled={loading}
              className="btn-primary text-sm py-2 px-4">
              {loading ? 'â¡ Generating...' : html ? 'ð Buat Ulang' : 'â¡ Generate'}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        {loading && (
          <div className="bg-[#F5F5F5] rounded-lg p-8 text-center">
            <div className="text-3xl mb-3 animate-pulse">â¡</div>
            <p className="text-sm text-[#555555]">AI sedang membuat landing page kamu...</p>
            <p className="text-xs text-[#888888] mt-1">Biasanya 20-30 detik</p>
          </div>
        )}
        {html && !loading && (
          <div className="space-y-3">
            <div className="bg-[#E8F7F2] rounded-lg p-4 flex items-center gap-3">
              <span className="text-2xl">â</span>
              <div>
                <p className="text-sm font-semibold text-[#1D9E75]">Landing page sudah siap!</p>
                <p className="text-xs text-[#555555]">Klik Preview untuk melihat hasilnya</p>
              </div>
            </div>
            <div className="border border-[#E0E0E0] rounded-lg overflow-hidden">
              <iframe
                srcDoc={html}
                className="w-full h-[500px] border-0"
                title="Landing Page Preview"
                sandbox="allow-same-origin"
              />
            </div>
            <div className="flex gap-2">
              <a href={`/api/landing-preview/${kitId}`} target="_blank" rel="noopener noreferrer"
                className="btn-secondary text-sm py-2 px-4 flex-1 text-center">
                ð Buka Full Screen
              </a>
              <button
                onClick={() => {
                  const blob = new Blob([html], { type: 'text/html' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url; a.download = 'landing-page.html'; a.click()
                }}
                className="btn-secondary text-sm py-2 px-4 flex-1">
                â¬ Download HTML
              </button>
            </div>
          </div>
        )}
        {!html && !loading && (
          <div className="bg-[#F5F5F5] rounded-lg p-6 text-center">
            <p className="text-sm text-[#555555]">Klik Generate untuk membuat landing page otomatis berdasarkan strategi brand kamu</p>
          </div>
        )}
      </div>
    </div>
  )
}
