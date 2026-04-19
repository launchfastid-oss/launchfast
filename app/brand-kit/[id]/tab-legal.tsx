export function LegalTab({ data }: { data: Record<string, unknown> }) {
  const d = data as Record<string, unknown>
  const biz = d.business_structure_recommendation as Record<string, string>
  const licenses = d.required_licenses as Array<{ name: string; issuer: string; url: string; required: boolean; description: string }>
  const taxes = d.tax_obligations as Array<{ type: string; threshold: string; description: string }>
  const notes = d.important_notes as string[]
  const domains = d.domain_suggestions as string[]
  const handles = d.social_media_handles as string[]
  return (
    <div className="space-y-4">
      {biz && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Rekomendasi Struktur Bisnis</p>
          <div className="bg-[#E8F7F2] rounded-lg p-4 mb-3">
            <p className="font-bold text-[#1D9E75] text-lg">{biz.recommended}</p>
            <p className="text-sm text-[#555555] mt-1">{biz.reason}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#F5F5F5] rounded-lg p-3"><p className="text-xs text-[#888888]">Estimasi Biaya</p><p className="text-sm font-bold text-[#1A1A1A] mt-1">{biz.estimated_cost}</p></div>
            <div className="bg-[#F5F5F5] rounded-lg p-3"><p className="text-xs text-[#888888]">Estimasi Waktu</p><p className="text-sm font-bold text-[#1A1A1A] mt-1">{biz.processing_time}</p></div>
          </div>
        </div>
      )}
      {licenses && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Perizinan yang Diperlukan</p>
          <div className="space-y-2">
            {licenses.map((l, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border border-[#E0E0E0] rounded-lg">
                <span className="text-lg">{l.required ? 'â ï¸' : 'â¹ï¸'}</span>
                <div>
                  <p className="text-sm font-semibold text-[#1A1A1A]">{l.name}</p>
                  <p className="text-xs text-[#555555]">{l.description}</p>
                  <a href={`https://${l.url}`} target="_blank" rel="noopener noreferrer" className="text-xs text-[#1D9E75] hover:underline mt-1 inline-block">{l.url} â</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {taxes && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Kewajiban Pajak</p>
          <div className="space-y-2">
            {taxes.map((t, i) => (
              <div key={i} className="p-3 border border-[#E0E0E0] rounded-lg">
                <p className="text-sm font-semibold text-[#1A1A1A]">{t.type}</p>
                <p className="text-xs text-[#888888]">Threshold: {t.threshold}</p>
                <p className="text-xs text-[#555555] mt-1">{t.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {(domains || handles) && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Saran Domain & Handle</p>
          {domains && <div className="mb-3"><p className="text-xs text-[#888888] mb-2">Domain Website</p><div className="flex flex-wrap gap-2">{domains.map((d, i) => <span key={i} className="text-sm bg-[#F5F5F5] px-3 py-1.5 rounded font-mono">{d}</span>)}</div></div>}
          {handles && <div><p className="text-xs text-[#888888] mb-2">Social Media Handle</p><div className="flex flex-wrap gap-2">{handles.map((h, i) => <span key={i} className="text-sm bg-[#E8F7F2] text-[#1D9E75] px-3 py-1.5 rounded font-semibold">{h}</span>)}</div></div>}
        </div>
      )}
      {notes && (
        <div className="card bg-yellow-50 border-yellow-200">
          <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wide mb-3">â ï¸ Catatan Penting</p>
          <ul className="space-y-2">{notes.map((n, i) => <li key={i} className="text-sm text-yellow-800 flex items-start gap-2"><span>â¢</span>{n}</li>)}</ul>
        </div>
      )}
    </div>
  )
}
