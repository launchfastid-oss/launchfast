'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MSGS = [
  'Menganalisis bisnis kamu...',
  'Menyusun strategi brand...',
  'Merancang visual identity...',
  'Menyiapkan panduan legal...',
  'Membuat WA scripts...',
  'Finalisasi brand kit...',
]

function GeneratingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order_id') || searchParams.get('order')
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(15)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<'idle' | 'triggering' | 'waiting' | 'done'>('idle')

  // Rotate messages
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % MSGS.length)
      setProgress(p => Math.min(p + 7, 88))
    }, 4000)
    return () => clearInterval(t)
  }, [])

  // Main effect — trigger once using sessionStorage guard
  useEffect(() => {
    if (!orderId) return

    const sessionKey = 'lf_generating_' + orderId

    // Guard against double-trigger using sessionStorage
    if (sessionStorage.getItem(sessionKey) === 'triggered') {
      setStatus('waiting')
      startPolling()
      return
    }

    async function triggerAndPoll() {
      const supabase = createClient()

      // Cek dulu apakah brand kit sudah ada (dari run sebelumnya)
      const { data: existing } = await supabase
        .from('brand_kits')
        .select('id, status')
        .eq('order_id', orderId)
        .eq('is_preview_only', false)
        .maybeSingle()

      if (existing?.id) {
        setProgress(100)
        router.push('/brand-kit/' + existing.id)
        return
      }

      // Mark sebagai triggered SEBELUM fetch — prevent race condition
      sessionStorage.setItem(sessionKey, 'triggered')
      setStatus('triggering')

      console.log('Triggering generate-full for order:', orderId)

      try {
        const res = await fetch('/api/generate-full', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ order_id: orderId }),
        })

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Unknown error' }))
          console.error('generate-full error:', err)
          setError(err.error || 'Generate gagal. Coba refresh halaman.')
          sessionStorage.removeItem(sessionKey) // Reset agar bisa retry
          return
        }

        const data = await res.json()
        console.log('generate-full success:', data)
        setStatus('waiting')
      } catch (e) {
        console.error('generate-full exception:', e)
        setError('Network error. Coba refresh halaman.')
        sessionStorage.removeItem(sessionKey)
        return
      }

      startPolling()
    }

    async function startPolling() {
      const supabase = createClient()

      // Realtime subscription
      const ch = supabase.channel('bk_' + orderId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_kits' }, (p) => {
          const k = p.new as { id: string; order_id: string; is_preview_only: boolean }
          if (k.order_id === orderId && !k.is_preview_only) {
            setProgress(100)
            setTimeout(() => router.push('/brand-kit/' + k.id), 500)
          }
        })
        .subscribe()

      // Polling fallback setiap 4 detik
      const poll = setInterval(async () => {
        const { data } = await supabase
          .from('brand_kits')
          .select('id, is_preview_only')
          .eq('order_id', orderId)
          .eq('is_preview_only', false)
          .maybeSingle()

        if (data?.id) {
          clearInterval(poll)
          supabase.removeChannel(ch)
          setProgress(100)
          setTimeout(() => router.push('/brand-kit/' + data.id), 500)
        }
      }, 4000)

      return () => { supabase.removeChannel(ch); clearInterval(poll) }
    }

    triggerAndPoll()
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center py-12">
        {/* Spinner */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%',
          border: '4px solid #E0E0E0', borderTopColor: '#1D9E75',
          animation: 'spin 0.8s linear infinite', margin: '0 auto 24px',
        }} />

        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">
          AI sedang membangun brand kit kamu
        </h1>
        <p className="font-medium mb-6" style={{ color: '#1D9E75' }}>{MSGS[idx]}</p>

        {/* Progress bar */}
        <div style={{ background: '#E0E0E0', borderRadius: '999px', height: '6px', marginBottom: '20px', overflow: 'hidden' }}>
          <div style={{
            background: '#1D9E75', height: '100%',
            width: progress + '%',
            borderRadius: '999px',
            transition: 'width 0.8s ease',
          }} />
        </div>

        {error ? (
          <div style={{ background: '#FEE2E2', borderRadius: '10px', padding: '14px', marginTop: '8px' }}>
            <p style={{ fontSize: '13px', color: '#DC2626', marginBottom: '8px' }}>{error}</p>
            <button
              onClick={() => { sessionStorage.clear(); window.location.reload() }}
              style={{ fontSize: '13px', color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}
            >
              🔄 Coba lagi
            </button>
          </div>
        ) : (
          <p className="text-sm text-[#888888]">
            Biasanya selesai dalam 2–3 menit.<br />Jangan tutup halaman ini.
          </p>
        )}
      </div>
    </div>
  )
}

export default function GeneratingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center">
        <p className="text-[#555555]">Memuat...</p>
      </div>
    }>
      <GeneratingContent />
    </Suspense>
  )
}
