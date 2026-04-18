'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MSGS = [
  'Menganalisis bisnis kamu...', 'Menyusun strategi brand...', 'Merancang visual identity...',
  'Menyusun konten 30 hari...', 'Membuat WA scripts...', 'Menyiapkan data legal...', 'Finalisasi brand kit...',
]

function GeneratingContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % MSGS.length), 4000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!orderId) return
    const supabase = createClient()
    const ch = supabase.channel(`bk_order_${orderId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'brand_kits' }, (p) => {
        const k = p.new as { id: string; order_id: string; is_preview_only: boolean }
        if (k.order_id === orderId && !k.is_preview_only) router.push(`/brand-kit/${k.id}`)
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'brand_kits' }, (p) => {
        const k = p.new as { id: string; order_id: string; is_preview_only: boolean }
        if (k.order_id === orderId && !k.is_preview_only) router.push(`/brand-kit/${k.id}`)
      })
      .subscribe()
    const poll = setInterval(async () => {
      const { data } = await supabase.from('brand_kits').select('id, is_preview_only')
        .eq('order_id', orderId).eq('is_preview_only', false).single()
      if (data) router.push(`/brand-kit/${data.id}`)
    }, 5000)
    return () => { supabase.removeChannel(ch); clearInterval(poll) }
  }, [orderId, router])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center py-12">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-[#E0E0E0] rounded-full" />
          <div className="absolute inset-0 border-4 border-[#1D9E75] rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">⚡</div>
        </div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-3">AI sedang membangun brand kit kamu</h2>
        <p className="text-sm text-[#1D9E75] font-medium mb-8">{MSGS[idx]}</p>
        <div className="w-full bg-[#E0E0E0] rounded-full h-1.5 mb-6">
          <div className="bg-[#1D9E75] h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
        <p className="text-xs text-[#888888]">Biasanya selesai dalam 2-3 menit.<br />Jangan tutup halaman ini.</p>
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