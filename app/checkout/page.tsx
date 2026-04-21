'use client'
import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'

const UPSELLS = [
  { key: 'custom_domain', label: 'Custom Domain Setup', desc: 'Sambungkan domain kamu ke landing page', price: 200000 },
  { key: 'video_reels', label: '4 Video Reels AI', desc: '4 video reels 15-30 detik untuk konten sosmed (coming soon)', price: 500000 },
  { key: 'pt_registration', label: 'Pengurusan PT Perorangan + NIB', desc: 'Admin kami urus semua dokumen legal kamu', price: 750000 },
]

declare global {
  interface Window { snap: { pay: (t: string, o: Record<string, unknown>) => void } }
}

// TEST_MODE: true = tampilkan tombol bypass, false = production normal
const TEST_MODE = true

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const onboardingId = searchParams.get('onboarding')
  const [selected, setSelected] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [bypassLoading, setBypassLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const basePrice = 1000000
  const total = basePrice + UPSELLS.filter(u => selected[u.key]).reduce((sum, u) => sum + u.price, 0)
  function fmt(n: number) { return 'Rp ' + n.toLocaleString('id-ID') }

  async function handlePay() {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/create-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboarding_id: onboardingId, upsells: Object.keys(selected).filter(k => selected[k]) })
      })
      const data = await res.json()
      if (data.snap_token && window.snap) {
        window.snap.pay(data.snap_token, {
          onSuccess: () => { window.location.href = '/generating?order=' + data.order_id },
          onPending: () => { window.location.href = '/generating?order=' + data.order_id },
          onError: () => { setLoading(false); setError('Pembayaran gagal, silakan coba lagi.') },
          onClose: () => setLoading(false),
        })
      } else {
        setError(data.error || 'Gagal memulai pembayaran'); setLoading(false)
      }
    } catch { setError('Terjadi kesalahan, coba lagi.'); setLoading(false) }
  }

  async function handleBypass() {
    if (!onboardingId) return
    setBypassLoading(true); setError(null)
    try {
      const res = await fetch('/api/bypass-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ onboarding_id: onboardingId })
      })
      const data = await res.json()
      if (data.ok && data.order_id) {
        router.push('/generating?order_id=' + data.order_id)
      } else {
        setError(data.error || 'Bypass gagal'); setBypassLoading(false)
      }
    } catch (e) { setError(String(e)); setBypassLoading(false) }
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-[#E0E0E0]">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-lg font-bold"><span className="text-[#1D9E75]">Launchfast</span>.id</span>
          <Link href={'/preview?onboarding=' + onboardingId} className="text-sm text-[#555555]">← Kembali</Link>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-2">Checkout</h1>
        <p className="text-sm text-[#555555] mb-6">Pilih paket yang sesuai kebutuhan bisnis kamu</p>

        {TEST_MODE && (
          <div style={{ background: '#FFFBEB', border: '2px solid #F59E0B', borderRadius: '12px', padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 700, color: '#92400E', margin: '0 0 2px' }}>⚡ Test Mode Aktif</p>
              <p style={{ fontSize: '12px', color: '#92400E', margin: 0 }}>Skip payment untuk langsung generate brand kit</p>
            </div>
            <button
              onClick={handleBypass}
              disabled={bypassLoading}
              style={{
                background: bypassLoading ? '#9CA3AF' : '#111827',
                color: 'white', border: 'none', borderRadius: '8px',
                padding: '9px 18px', fontSize: '13px', fontWeight: 700,
                cursor: bypassLoading ? 'not-allowed' : 'pointer', flexShrink: 0,
              }}
            >
              {bypassLoading ? 'Memproses...' : '⚡ Skip & Generate'}
            </button>
          </div>
        )}

        {error && <div className="error-box mb-4">{error}</div>}

        <div className="space-y-4 mb-6">
          <div className="card border-[#1D9E75]">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs bg-[#1D9E75] text-white px-2 py-0.5 rounded-pill font-medium">Wajib</span>
                  <h3 className="font-semibold text-[#1A1A1A]">Brand Kit Lengkap</h3>
                </div>
                <p className="text-sm text-[#555555]">Strategi STP+SB7 · 3 Logo · 30 Konten · WA Scripts · Data Legal · Landing Page</p>
              </div>
              <span className="font-bold text-[#1A1A1A] whitespace-nowrap ml-4">Rp 1.000.000</span>
            </div>
          </div>

          {UPSELLS.map(u => (
            <div key={u.key}
              onClick={() => setSelected(prev => ({ ...prev, [u.key]: !prev[u.key] }))}
              className={'card cursor-pointer transition-all ' + (selected[u.key] ? 'border-[#1D9E75] bg-[#E8F7F2]' : 'hover:border-[#1D9E75]')}>
              <div className="flex justify-between items-start">
                <div className="flex items-start gap-3">
                  <div className={'w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 flex-shrink-0 ' + (selected[u.key] ? 'border-[#1D9E75] bg-[#1D9E75]' : 'border-[#E0E0E0]')}>
                    {selected[u.key] && <span className="text-white text-xs font-bold">✓</span>}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1A1A1A]">{u.label}</h3>
                    <p className="text-sm text-[#555555]">{u.desc}</p>
                  </div>
                </div>
                <span className="font-semibold text-[#EF9F27] whitespace-nowrap ml-4">+{fmt(u.price)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-[#E0E0E0]">
            <span className="font-semibold text-[#1A1A1A]">Total Pembayaran</span>
            <span className="text-2xl font-bold text-[#1D9E75]">{fmt(total)}</span>
          </div>
          <button onClick={handlePay} disabled={loading || bypassLoading} className="btn-primary w-full text-base py-3.5">
            {loading ? 'Memproses...' : 'Bayar Sekarang →'}
          </button>
          <p className="text-xs text-center text-[#888888] mt-3">QRIS · Transfer Bank · Kartu Kredit/Debit · Aman via Midtrans</p>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center"><p className="text-[#555555]">Memuat...</p></div>}>
      <CheckoutContent />
    </Suspense>
  )
}
