'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MSGS = [
  'Menganalisis bisnis kamu...',
  'Menyusun strategi brand...',
  'Merancang visual identity...',
  'Menyusun konten 30 hari...',
  'Membuat WA scripts...',
  'Menyiapkan data legal...',
  'Finalisasi brand kit...',
]

function GeneratingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  // Support both ?order= and ?order_id= param names
  const orderId = searchParams.get('order_id') || searchParams.get('order')
  const [idx, setIdx] = useState(0)
  const [progress, setProgress] = useState(10)
  const [error, setError] = useState('')
  const triggered = useRef(false)

  // Rotate loading messages
  useEffect(() => {
    const t = setInterval(() => {
      setIdx(i => (i + 1) % MSGS.length)
      setProgress(p => Math.min(p + 8, 90))
    }, 4000)
    return () => clearInterval(t)
  }, [])

  // Trigger generate-full jika belum ada brand kit
  useEffect(() => {
    if (!orderId || triggered.current) return
    triggered.current = true

    async function triggerAndWait() {
      const supabase = createClient()

      // Cek dulu apakah brand kit sudah ada
      const { data: existing } = await supabase
        .from('brand_kits')
        .select('id, is_preview_only, status')
        .eq('order_id', orderId)
        .eq('is_preview_only', false)
        .single()

      if (existing?.id) {
        // Kalau status completed langsung redirect
        if (existing.status === 'completed') {
          router.push('/brand-kit/' + existing.id)
          return
        }
        // Kalau masih generating, tunggu saja
        console.log('Brand kit exists, waiting for completion...')
      } else {
        // Belum ada — trigger generate-full
        console.log('Triggering generate-full for order:', orderId)
        try {
          const res = await fetch('/api/generate-full', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ order_id: orderId }),
          })
          if (!res.ok) {
            const err = await res.text()
            console.error('generate-full error:', err.slice(0, 200))
            setError('Generate gagal. Coba refresh halaman.')
          } else {
            console.log('generate-full triggered successfully')
          }
        } catch (e) {
          console.error('generate-full exception:', e)
          setError('Network error. Coba refresh.')
        }
      }

      // Poll + realtime: tunggu brand_kit selesai
      const ch = supabase.channel('bk_' + orderId)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'brand_kits' }, (p) => {
          const k = p.new as { id: string; order_id: string; is_preview_only: boolean; status: string }
          if (k.order_id === orderId && !k.is_preview_only) {
            setProgress(100)
            setTimeout(() => router.push('/brand-kit/' + k.id), 500)
          }
        })
        .subscribe()

      const poll = setInterval(async () => {
        const { data } = await supabase
          .from('brand_kits')
          .select('id, is_preview_only, status')
          .eq('order_id', orderId)
          .eq('is_preview_only', false)
          .single()
        if (data?.id) {
          clearInterval(poll)
          supabase.removeChannel(ch)
          setProgress(100)
          setTimeout(() => router.push('/brand-kit/' + data.id), 500)
        }
      }, 4000)

      return () => { supabase.removeChannel(ch); clearInterval(poll) }
    }

    triggerAndWait()
  }, [orderId, router])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center py-12">
        <div className="w-16 h-16 rounded-full border-4 border-[#1D9E75] border-t-transparent animate-spin mx-auto mb-6" />
        <h1 className="text-2xl font-bold text-[#1A1A1A] mb-3">AI sedang membangun brand kit kamu</h1>
        <p className="text-[#1D9E75] font-medium mb-6">{MSGS[idx]}</p>
        <div className="w-full bg-[#E0E0E0] rounded-full h-2 mb-4">
          <div className="bg-[#1D9E75] h-2 rounded-full transition-all duration-1000" style={{ width: progress + '%' }} />
        </div>
        {error ? (
          <div style={{ background: '#FEE2E2', borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
            <p style={{ fontSize: '13px', color: '#DC2626', margin: 0 }}>{error}</p>
            <button onClick={() => window.location.reload()} style={{ marginTop: '8px', fontSize: '13px', color: '#1D9E75', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
              Refresh halaman
            </button>
          </div>
        ) : (
          <p className="text-sm text-[#888888]">Biasanya selesai dalam 2-3 menit.<br/>Jangan tutup halaman ini.</p>
        )}
      </div>
    </div>
  )
}

export default function GeneratingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center"><p className="text-[#555555]">Memuat...</p></div>}>
      <GeneratingContent />
    </Suspense>
  )
}
