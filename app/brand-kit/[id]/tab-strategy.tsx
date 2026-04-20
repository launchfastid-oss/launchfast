'use client'

interface StrategyData {
  golden_one_liner?: string
  unique_value_proposition?: string
  brand_personality?: string[]
  target_segment?: string
  stp?: { segmentation?: string; targeting?: string; positioning?: string }
  sb7?: {
    hero?: { headline?: string; subheadline?: string }
    problem?: { external?: string; internal?: string; philosophical?: string }
    guide?: { empathy?: string; authority?: string }
    plan?: string[]
    cta_direct?: string
    cta_transitional?: string
    success?: string
    failure?: string
  }
}

interface VisualData {
  colors?: Array<{ hex: string; name: string; usage: string }>
  typography?: { heading?: { font: string; reason: string }; body?: { font: string; reason: string } }
  logo_concepts?: Array<{ name: string; description: string; style: string }>
  logo_svgs?: string[]
  visual_mood?: string
}

export function StrategyTab({ data }: { data: Record<string, unknown> }) {
  const d = data as StrategyData
  return (
    <div className="space-y-5">
      {d.golden_one_liner && (
        <div className="card bg-[#1D9E75] text-white">
          <p className="text-xs font-semibold uppercase tracking-wide opacity-75 mb-2">Golden One-Liner</p>
          <p className="text-2xl font-bold leading-snug">"{d.golden_one_liner}"</p>
        </div>
      )}
      {d.unique_value_proposition && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-2">Unique Value Proposition</p>
          <p className="text-[#1A1A1A] leading-relaxed">{d.unique_value_proposition}</p>
        </div>
      )}
      {d.brand_personality && d.brand_personality.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Brand Personality</p>
          <div className="flex flex-wrap gap-2">
            {d.brand_personality.map((p, i) => (
              <span key={i} className="bg-[#E8F7F2] text-[#1D9E75] px-3 py-1.5 rounded-pill text-sm font-semibold">{p}</span>
            ))}
          </div>
        </div>
      )}
      {d.sb7?.hero && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">StoryBrand — Hero Message</p>
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-2">{d.sb7.hero.headline}</h3>
          <p className="text-[#555555]">{d.sb7.hero.subheadline}</p>
          {d.sb7.cta_direct && (
            <div className="mt-4 flex gap-3">
              <span className="btn-primary text-sm py-2 px-4 cursor-default">{d.sb7.cta_direct}</span>
              {d.sb7.cta_transitional && <span className="btn-secondary text-sm py-2 px-4 cursor-default">{d.sb7.cta_transitional}</span>}
            </div>
          )}
        </div>
      )}
      {d.sb7?.problem && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Masalah Customer</p>
          <div className="space-y-3">
            {d.sb7.problem.external && <div><p className="text-xs text-[#888888] mb-1">External</p><p className="text-[#1A1A1A]">{d.sb7.problem.external}</p></div>}
            {d.sb7.problem.internal && <div><p className="text-xs text-[#888888] mb-1">Internal (Emosional)</p><p className="text-[#1A1A1A]">{d.sb7.problem.internal}</p></div>}
            {d.sb7.problem.philosophical && <div><p className="text-xs text-[#888888] mb-1">Filosofis</p><p className="text-[#1A1A1A]">{d.sb7.problem.philosophical}</p></div>}
          </div>
        </div>
      )}
      {d.sb7?.plan && d.sb7.plan.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Rencana 3 Langkah</p>
          <div className="space-y-3">
            {d.sb7.plan.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-[#1D9E75] text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{i+1}</div>
                <p className="text-[#1A1A1A] pt-0.5">{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.stp && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">STP Framework</p>
          <div className="space-y-3">
            {d.stp.segmentation && <div><p className="text-xs text-[#888888] mb-1">Segmentasi</p><p className="text-[#1A1A1A]">{d.stp.segmentation}</p></div>}
            {d.stp.targeting && <div><p className="text-xs text-[#888888] mb-1">Targeting</p><p className="text-[#1A1A1A]">{d.stp.targeting}</p></div>}
            {d.stp.positioning && <div><p className="text-xs text-[#888888] mb-1">Positioning</p><p className="text-[#1A1A1A]">{d.stp.positioning}</p></div>}
          </div>
        </div>
      )}
    </div>
  )
}

export function VisualTab({ data, kitId }: { data: Record<string, unknown>; kitId?: string }) {
  const d = data as VisualData
  const hasLogos = d.logo_svgs && d.logo_svgs.length > 0

  return (
    <div className="space-y-5">
      {/* Colors */}
      {d.colors && d.colors.length > 0 && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-4">Color Palette</p>
          <div className="grid grid-cols-5 gap-3">
            {d.colors.map((c, i) => (
              <div key={i} className="text-center">
                <div className="w-full aspect-square rounded-xl border border-[#E0E0E0] mb-2 shadow-sm" style={{ backgroundColor: c.hex }} />
                <p className="text-xs font-bold text-[#1A1A1A] font-mono">{c.hex}</p>
                <p className="text-xs text-[#555555] mt-0.5">{c.name}</p>
                <p className="text-xs text-[#888888] mt-0.5">{c.usage}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Typography */}
      {d.typography && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-4">Typography</p>
          <div className="grid grid-cols-2 gap-4">
            {d.typography.heading && (
              <div className="bg-[#F5F5F5] rounded-lg p-4">
                <p className="text-xs text-[#888888] mb-1">Heading Font</p>
                <p className="text-xl font-bold text-[#1A1A1A]" style={{ fontFamily: d.typography.heading.font }}>{d.typography.heading.font}</p>
                <p className="text-xs text-[#555555] mt-1">{d.typography.heading.reason}</p>
              </div>
            )}
            {d.typography.body && (
              <div className="bg-[#F5F5F5] rounded-lg p-4">
                <p className="text-xs text-[#888888] mb-1">Body Font</p>
                <p className="text-lg text-[#1A1A1A]" style={{ fontFamily: d.typography.body.font }}>{d.typography.body.font}</p>
                <p className="text-xs text-[#555555] mt-1">{d.typography.body.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logo Concepts dengan SVG */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide">Konsep Logo (3 Opsi)</p>
          {kitId && !hasLogos && (
            <button
              onClick={async () => {
                const btn = document.getElementById('gen-logo-btn')
                if (btn) btn.textContent = 'Generating...'
                const res = await fetch('/api/generate-logos', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ brand_kit_id: kitId })
                })
                if (res.ok) window.location.reload()
              }}
              id="gen-logo-btn"
              className="btn-primary text-xs py-1.5 px-3"
            >
              Generate Logo AI
            </button>
          )}
        </div>

        {hasLogos ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {d.logo_svgs!.map((svg, i) => (
              <div key={i} className="border border-[#E0E0E0] rounded-xl overflow-hidden">
                <div className="bg-white p-6 flex items-center justify-center" style={{ minHeight: '200px' }}>
                  <div
                    style={{ width: '100%', maxWidth: '180px', aspectRatio: '1' }}
                    dangerouslySetInnerHTML={{ __html: svg }}
                  />
                </div>
                <div className="bg-[#F5F5F5] p-3 border-t border-[#E0E0E0]">
                  <p className="text-xs font-semibold text-[#1D9E75]">Opsi {i + 1}</p>
                  {d.logo_concepts?.[i] && (
                    <>
                      <p className="text-sm font-bold text-[#1A1A1A] mt-0.5">{d.logo_concepts[i].name}</p>
                      <p className="text-xs text-[#555555] mt-1">{d.logo_concepts[i].description}</p>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {(d.logo_concepts || []).map((concept, i) => (
              <div key={i} className="border border-[#E0E0E0] rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-lg bg-[#F5F5F5] flex items-center justify-center flex-shrink-0 border border-[#E0E0E0]">
                    <span className="text-xs text-[#888888] font-bold text-center leading-tight">Logo{i+1}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-[#E8F7F2] text-[#1D9E75] px-2 py-0.5 rounded-pill font-semibold">Opsi {i+1}</span>
                      <span className="font-bold text-[#1A1A1A]">{concept.name}</span>
                      <span className="text-xs text-[#888888]">• {concept.style}</span>
                    </div>
                    <p className="text-sm text-[#555555] leading-relaxed">{concept.description}</p>
                  </div>
                </div>
              </div>
            ))}
            {kitId && (
              <div className="bg-[#E8F7F2] rounded-lg p-4 text-center mt-2">
                <p className="text-sm font-semibold text-[#1D9E75] mb-1">Logo AI belum di-generate</p>
                <p className="text-xs text-[#555555] mb-3">Klik tombol "Generate Logo AI" di atas untuk membuat visual logo dari konsep ini</p>
              </div>
            )}
          </div>
        )}
      </div>

      {d.visual_mood && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-2">Visual Mood</p>
          <p className="text-[#1A1A1A] leading-relaxed">{d.visual_mood}</p>
        </div>
      )}
    </div>
  )
}
