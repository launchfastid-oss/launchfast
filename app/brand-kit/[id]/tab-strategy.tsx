export function StrategyTab({ data }: { data: Record<string, unknown> }) {
  const d = data as Record<string, unknown>
  const stp = d.stp as Record<string, string>
  const sb7 = d.sb7 as Record<string, unknown>
  const brandStory = d.brand_story as string | undefined
  const goldenOneLiner = d.golden_one_liner as string | undefined
  return (
    <div className="space-y-4">
      <div className="card bg-[#1D9E75] text-white">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80 mb-2">Golden One-Liner</p>
        <p className="text-2xl font-bold leading-relaxed">"{goldenOneLiner}"</p>
      </div>
      <div className="card">
        <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Strategi STP</p>
        <div className="space-y-3">
          <div><span className="text-xs font-semibold text-[#888888] uppercase">Segmentation</span><p className="text-sm text-[#1A1A1A] mt-1">{stp?.segmentation}</p></div>
          <div><span className="text-xs font-semibold text-[#888888] uppercase">Targeting</span><p className="text-sm text-[#1A1A1A] mt-1">{stp?.targeting}</p></div>
          <div><span className="text-xs font-semibold text-[#888888] uppercase">Positioning</span><p className="text-sm text-[#1A1A1A] mt-1">{stp?.positioning}</p></div>
        </div>
      </div>
      {sb7 && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">StoryBrand SB7</p>
          <div className="space-y-4">
            <div className="bg-[#F5F5F5] rounded-lg p-4">
              <p className="text-xs font-semibold text-[#888888] mb-2">HERO SECTION</p>
              <p className="font-bold text-[#1A1A1A]">{(sb7.hero as Record<string, string>)?.headline}</p>
              <p className="text-sm text-[#555555] mt-1">{(sb7.hero as Record<string, string>)?.subheadline}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#F5F5F5] rounded-lg p-3"><p className="text-xs font-semibold text-[#888888] mb-1">CTA LANGSUNG</p><p className="text-sm font-bold text-[#1D9E75]">{sb7.cta_direct as string}</p></div>
              <div className="bg-[#F5F5F5] rounded-lg p-3"><p className="text-xs font-semibold text-[#888888] mb-1">CTA TRANSITIONAL</p><p className="text-sm font-bold text-[#555555]">{sb7.cta_transitional as string}</p></div>
            </div>
          </div>
        </div>
      )}
      {brandStory && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-3">Brand Story</p>
          <p className="text-sm text-[#555555] leading-relaxed whitespace-pre-line">{brandStory}</p>
        </div>
      )}
    </div>
  )
}

export function VisualTab({ data }: { data: Record<string, unknown> }) {
  const d = data as Record<string, unknown>
  const colors = d.colors as Array<{ hex: string; name: string; usage: string; rationale: string }>
  const typo = d.typography as Record<string, { font: string; weight: string; rationale: string }>
  const logos = d.logo_concepts as Array<{ style: string; description: string; tagline: string }>
  return (
    <div className="space-y-4">
      {colors && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-4">Color Palette</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {colors.map((c, i) => (
              <div key={i} className="text-center">
                <div className="w-full h-16 rounded-lg border border-[#E0E0E0] mb-2" style={{ backgroundColor: c.hex }} />
                <p className="text-xs font-bold text-[#1A1A1A]">{c.name}</p>
                <p className="text-xs font-mono text-[#888888]">{c.hex}</p>
                <p className="text-xs text-[#555555] mt-1">{c.usage}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {typo && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-4">Typography</p>
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(typo).map(([key, val]) => (
              <div key={key} className="bg-[#F5F5F5] rounded-lg p-4">
                <p className="text-xs font-semibold text-[#888888] uppercase mb-2">{key}</p>
                <p className="font-bold text-[#1A1A1A]">{val.font}</p>
                <p className="text-xs text-[#555555] mt-1">Weight: {val.weight}</p>
                <p className="text-xs text-[#888888] mt-1">{val.rationale}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {logos && (
        <div className="card">
          <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-4">Konsep Logo (3 Opsi)</p>
          <div className="space-y-3">
            {logos.map((l, i) => (
              <div key={i} className="border border-[#E0E0E0] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-[#E8F7F2] text-[#1D9E75] px-2 py-0.5 rounded font-semibold">Opsi {i + 1}</span>
                  <span className="text-sm font-bold text-[#1A1A1A]">{l.style}</span>
                </div>
                <p className="text-sm text-[#555555]">{l.description}</p>
                <p className="text-xs text-[#888888] mt-2 italic">Tagline: "{l.tagline}"</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
