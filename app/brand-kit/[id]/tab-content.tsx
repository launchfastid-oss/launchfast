'use client'
import { useState } from 'react'

export function ContentTab({ data }: { data: Record<string, unknown> }) {
  const d = data as Record<string, unknown>
  const pillars = d.content_pillars as Array<{ name: string; percentage: number; description: string }>
  const posts = d.posts as Array<{ day: number; pillar: string; platform: string; type: string; caption: string; hashtags: string }>
  const [expanded, setExpanded] = useState<number | null>(null)
  return (
    <div className="space-y-4">
      {pillars && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-4">Content Pillars</p>
          <div className="space-y-3">
            {pillars.map((p, i) => (
              <div key={i}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-[#1A1A1A]">{p.name}</span>
                  <span className="text-sm font-bold text-[#1D9E75]">{p.percentage}%</span>
                </div>
                <div className="w-full bg-[#E0E0E0] rounded-full h-2 mb-1">
                  <div className="bg-[#1D9E75] h-2 rounded-full" style={{ width: `${p.percentage}%` }} />
                </div>
                <p className="text-xs text-[#555555]">{p.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {posts && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-4">30 Hari Konten</p>
          <div className="space-y-2">
            {posts.map((p, i) => (
              <div key={i} className="border border-[#E0E0E0] rounded-lg overflow-hidden">
                <button onClick={() => setExpanded(expanded === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[#F5F5F5]">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-[#1D9E75] text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">{p.day}</span>
                    <div>
                      <span className="text-sm font-medium text-[#1A1A1A]">{p.platform} Â· {p.type}</span>
                      <span className="text-xs text-[#888888] ml-2">{p.pillar}</span>
                    </div>
                  </div>
                  <span className="text-[#888888]">{expanded === i ? 'â²' : 'â¼'}</span>
                </button>
                {expanded === i && (
                  <div className="px-4 pb-4 border-t border-[#E0E0E0] pt-3">
                    <p className="text-sm text-[#1A1A1A] whitespace-pre-line mb-2">{p.caption}</p>
                    <p className="text-xs text-[#1D9E75]">{p.hashtags}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
