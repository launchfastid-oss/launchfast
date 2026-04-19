'use client'
import { useState } from 'react'

export function WhatsappTab({ data }: { data: Record<string, unknown> }) {
  const d = data as Record<string, unknown>
  const [copied, setCopied] = useState<string | null>(null)
  function copyText(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id); setTimeout(() => setCopied(null), 2000)
  }
  const sections = [
    { key: 'greeting_scripts', label: 'Sapaan Pertama' },
    { key: 'follow_up_scripts', label: 'Follow Up' },
    { key: 'closing_scripts', label: 'Closing Objection' },
    { key: 'broadcast_templates', label: 'Broadcast Template' },
  ]
  return (
    <div className="space-y-4">
      {sections.map(s => {
        const items = d[s.key] as Array<{ name: string; message: string }> | undefined
        if (!items) return null
        return (
          <div key={s.key} className="card">
            <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-4">{s.label}</p>
            <div className="space-y-3">
              {items.map((item, i) => (
                <div key={i} className="border border-[#E0E0E0] rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-[#1A1A1A]">{item.name}</span>
                    <button onClick={() => copyText(item.message, `${s.key}_${i}`)}
                      className="text-xs text-[#1D9E75] border border-[#1D9E75] px-2 py-1 rounded hover:bg-[#E8F7F2]">
                      {copied === `${s.key}_${i}` ? 'â Disalin' : 'Salin'}
                    </button>
                  </div>
                  <p className="text-sm text-[#555555] whitespace-pre-line bg-[#F5F5F5] rounded p-3">{item.message}</p>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
