'use client'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MESSAGES = [
  'Menganalisis bisnis kamu...',
  'Menyusun strategi brand...',
  'Merancang visual identity...',
  'Menyusun konten 30 hari...',
  'Membuat WA scripts...',
  'Menyiapkan data legal...',
  'Finalisasi brand kit...',
]

export default function GeneratingPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const orderId = searchParams.get('order')
  const [msgIndex, setMsgIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(i => (i + 1) % MESSAGES.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!orderId) return
    const supabase = createClient()

    const channel = supabase
      .channel(`brand_kit_order_${orderId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'brand_kits' },
        (payload) => {
          const kit = payload.new as { id: string; order_id: string; is_preview_only: boolean }
          if (kit.order_id === orderId && !kit.is_preview_only) {
            router.push(`/brand-kit/${kit.id}`)
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'brand_kits' },
        (payload) => {
          const kit = payload.new as { id: string; order_id: string; is_preview_only: boolean }
          if (kit.order_id === orderId && !kit.is_preview_only) {
            router.push(`/brand-kit/${kit.id}`)
          }
        }
      )
      .subscribe()

    // Fallback polling every 5s
    const poll = setInterval(async () => {
      const { data } = await supabase
        .from('brand_kits')
        .select('id, is_preview_only')
        .eq('order_id', orderId)
        .eq('is_preview_only', false)
        .single()
      if (data) router.push(`/brand-kit/${data.id}`)
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      clearInterval(poll)
    }
  }, [orderId, router])

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
      <div className="card max-w-md w-full text-center py-12">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-[#E0E0E0] rounded-full" />
          <div className="absolute inset-0 border-4 border-[#1D9E75] rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">â¡</div>
        </div>
        <h2 className="text-xl font-bold text-[#1A1A1A] mb-3">
          AI sedang membangun brand kit kamu
        </h2>
        <p className="text-sm text-[#1D9E75] font-medium mb-8 min-h-5">
          {MESSAGES[msgIndex]}
        </p>
        <div className="w-full bg-[#E0E0E0] rounded-full h-1.5 mb-6">
          <div className="bg-[#1D9E75] h-1.5 rounded-full animate-pulse" style={{ width: '60%' }} />
        </div>
        <p className="text-xs text-[#888888]">
          Biasanya selesai dalam 2-3 menit.<br />Jangan tutup halaman ini.
        </p>
      </div>
    </div>
  )
}
