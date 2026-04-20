'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { StrategyTab, VisualTab } from './tab-strategy'
import { ContentTab } from './tab-content'
import { WhatsappTab } from './tab-whatsapp'
import { ChecklistTab } from './tab-checklist'
import { LegalTab } from './tab-legal'
import { LandingTab } from './tab-landing'

interface BrandKit {
  id: string
  business_name: string
  created_at: string
  strategy_data: Record<string, unknown> | null
  visual_data: Record<string, unknown> | null
  content_data: Record<string, unknown> | null
  whatsapp_data: Record<string, unknown> | null
  checklist_data: Record<string, unknown> | null
  legal_data: Record<string, unknown> | null
  landing_page_html: string | null
  regen_counts: Record<string, number>
}

const TABS = [
  { key: 'strategy', label: 'Strategi' },
  { key: 'visual', label: 'Visual' },
  { key: 'content', label: 'Konten 30 Hari' },
  { key: 'whatsapp', label: 'WA Scripts' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'legal', label: 'Legal' },
  { key: 'landing', label: 'Landing Page' },
]

export default function BrandKitClient({ kitId, userId }: { kitId: string; userId: string }) {
  const [kit, setKit] = useState<BrandKit | null>(null)
  const [activeTab, setActiveTab] = useState('strategy')
  const [loading, setLoading] = useState(true)
  const [regen, setRegen] = useState<string | null>(null)
  const [regenError, setRegenError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('brand_kits').select('*').eq('id', kitId).eq('user_id', userId).single()
      .then(({ data }) => { setKit(data); setLoading(false) })
  }, [kitId, userId])

  async function handleRegen(tab: string) {
    setRegen(tab); setRegenError(null)
    try {
      const res = await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brand_kit_id: kitId, tab })
      })
      const data = await res.json()
      if (data.ok) {
        const supabase = createClient()
        const { data: updated } = await supabase.from('brand_kits').select('*').eq('id', kitId).single()
        setKit(updated)
      } else {
        setRegenError(data.error || 'Gagal regenerate')
      }
    } catch { setRegenError('Terjadi kesalahan') }
    finally { setRegen(null) }
  }

  if (loading) return <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center"><p className="text-[#555555]">Memuat brand kit...</p></div>
  if (!kit) return <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center"><p className="text-[#555555]">Brand kit tidak ditemukan</p></div>

  const tabData = { strategy: kit.strategy_data, visual: kit.visual_data, content: kit.content_data, whatsapp: kit.whatsapp_data, checklist: kit.checklist_data, legal: kit.legal_data }[activeTab] as Record<string, unknown> | null
  const isLandingTab = activeTab === 'landing'

  return (
    <div className="min-h-screen bg-[#F5F5F5]">
      <div className="bg-white border-b border-[#E0E0E0] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex justify-between items-center">
          <div>
            <span className="text-base font-bold"><span className="text-[#1D9E75]">Launchfast</span>.id</span>
            <span className="text-[#888888] text-sm ml-3">/ {kit.business_name}</span>
          </div>
          <Link href="/dashboard" className="text-sm text-[#555555] hover:text-[#1A1A1A]">Dashboard</Link>
        </div>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map(t => (
              <button key={t.key} onClick={() => setActiveTab(t.key)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.key ? 'border-[#1D9E75] text-[#1D9E75]' : 'border-transparent text-[#555555] hover:text-[#1A1A1A]'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {isLandingTab ? (
          <LandingTab kitId={kitId} initialHtml={kit.landing_page_html} />
        ) : !tabData ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-[#F5F5F5] rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl font-bold text-[#888888]">?</span>
            </div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">Konten belum tersedia</h2>
            <p className="text-sm text-[#555555] mb-4">Konten untuk tab ini belum di-generate</p>
          </div>
        ) : (
          <div>
            <div className="flex justify-end mb-4">
              {regenError && <p className="text-sm text-red-500 mr-auto">{regenError}</p>}
              <button onClick={() => handleRegen(activeTab)} disabled={regen === activeTab}
                className="btn-secondary text-sm py-2 px-4 flex items-center gap-2">
                <span className={regen === activeTab ? 'animate-spin inline-block' : ''}>&#8635;</span>
                {regen === activeTab ? 'Membuat ulang...' : 'Buat Ulang'}
                <span className="text-xs text-[#888888]">({kit.regen_counts?.[activeTab] || 0}/3)</span>
              </button>
            </div>
            {activeTab === 'strategy' && <StrategyTab data={tabData} />}
            {activeTab === 'visual' && <VisualTab data={tabData} kitId={kitId} />}
            {activeTab === 'content' && <ContentTab data={tabData} />}
            {activeTab === 'whatsapp' && <WhatsappTab data={tabData} />}
            {activeTab === 'checklist' && <ChecklistTab data={tabData} />}
            {activeTab === 'legal' && <LegalTab data={tabData} />}
          </div>
        )}
      </div>
    </div>
  )
}
