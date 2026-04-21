'use client'
import { useState } from 'react'

interface VisualData {
  colors?: Array<{ hex: string; name: string; usage: string }>
  typography?: { heading?: { font: string; reason: string }; body?: { font: string; reason: string } }
  logo_concepts?: Array<{ name: string; description: string; style: string }>
  logo_urls?: string[]
  logo_prompts?: string[]
  visual_mood?: string
}

interface StrategyData {
  golden_one_liner?: string
  brand_narrative?: string
  unique_value_proposition?: string
  brand_personality?: string[]
  stp?: { segmentation?: string; targeting?: string; positioning?: string }
  sb7?: {
    hero?: string
    problem_external?: string
    problem_internal?: string
    problem_philosophical?: string
    guide_empathy?: string
    guide_authority?: string
    plan?: string[]
    cta_direct?: string
    cta_transitional?: string
    success?: string
    failure?: string
    // legacy fields
    headline?: string
    subheadline?: string
    problem?: { external?: string; internal?: string; philosophical?: string }
  }
}

export function StrategyTab({ data }: { data: Record<string, unknown> }) {
  const d = data as StrategyData
  return (
    <div className="space-y-5">
      {d.golden_one_liner && (
        <div className="card" style={{ background: '#1D9E75', color: 'white' }}>
          <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', opacity: 0.75, marginBottom: '8px' }}>Golden One-Liner</p>
          <p style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1.3 }}>"{d.golden_one_liner}"</p>
        </div>
      )}
      {d.brand_narrative && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Brand Narrative</p>
          <p style={{ color: '#1A1A1A', lineHeight: 1.8, fontSize: '15px', fontStyle: 'italic' }}>{d.brand_narrative}</p>
        </div>
      )}
      {d.unique_value_proposition && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Unique Value Proposition</p>
          <p style={{ color: '#1A1A1A', lineHeight: 1.6 }}>{d.unique_value_proposition}</p>
        </div>
      )}
      {d.brand_personality && d.brand_personality.length > 0 && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Brand Personality</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {d.brand_personality.map((p, i) => (
              <span key={i} style={{ background: '#E8F7F2', color: '#1D9E75', padding: '6px 14px', borderRadius: '100px', fontSize: '13px', fontWeight: 600 }}>{p}</span>
            ))}
          </div>
        </div>
      )}
      {d.sb7?.hero && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>StoryBrand â Hero Message</p>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>{d.sb7.hero.headline}</h3>
          <p style={{ color: '#555555' }}>{d.sb7.hero.subheadline}</p>
          {d.sb7.cta_direct && (
            <div style={{ marginTop: '16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <span className="btn-primary" style={{ fontSize: '13px', cursor: 'default' }}>{d.sb7.cta_direct}</span>
              {d.sb7.cta_transitional && <span className="btn-secondary" style={{ fontSize: '13px', cursor: 'default' }}>{d.sb7.cta_transitional}</span>}
            </div>
          )}
        </div>
      )}
      {d.sb7?.problem && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Masalah Customer</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {d.sb7.problem.external && <div><p style={{ fontSize: '11px', color: '#888888', marginBottom: '4px' }}>External</p><p style={{ color: '#1A1A1A' }}>{d.sb7.problem.external}</p></div>}
            {d.sb7.problem.internal && <div><p style={{ fontSize: '11px', color: '#888888', marginBottom: '4px' }}>Internal (Emosional)</p><p style={{ color: '#1A1A1A' }}>{d.sb7.problem.internal}</p></div>}
            {d.sb7.problem.philosophical && <div><p style={{ fontSize: '11px', color: '#888888', marginBottom: '4px' }}>Filosofis</p><p style={{ color: '#1A1A1A' }}>{d.sb7.problem.philosophical}</p></div>}
          </div>
        </div>
      )}
      {d.sb7?.plan && d.sb7.plan.length > 0 && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Rencana 3 Langkah</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {d.sb7.plan.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1D9E75', color: 'white', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i+1}</div>
                <p style={{ color: '#1A1A1A', paddingTop: '4px' }}>{step}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      {d.stp && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>STP Framework</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {d.stp.segmentation && <div><p style={{ fontSize: '11px', color: '#888888', marginBottom: '4px' }}>Segmentasi</p><p style={{ color: '#1A1A1A' }}>{d.stp.segmentation}</p></div>}
            {d.stp.targeting && <div><p style={{ fontSize: '11px', color: '#888888', marginBottom: '4px' }}>Targeting</p><p style={{ color: '#1A1A1A' }}>{d.stp.targeting}</p></div>}
            {d.stp.positioning && <div><p style={{ fontSize: '11px', color: '#888888', marginBottom: '4px' }}>Positioning</p><p style={{ color: '#1A1A1A' }}>{d.stp.positioning}</p></div>}
          </div>
        </div>
      )}
    </div>
  )
}

export function VisualTab({ data, kitId }: { data: Record<string, unknown>; kitId?: string }) {
  const d = data as VisualData
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError] = useState('')
  const [progress, setProgress] = useState(0)

  const validLogos = (d.logo_urls || []).filter(u => u && u.startsWith('http'))

  async function handleGenerate() {
    if (!kitId) return
    setGenerating(true); setGenError(''); setProgress(10)
    const interval = setInterval(() => setProgress(p => Math.min(p + 5, 90)), 2000)
    try {
      const res = await fetch('/api/generate-logos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ brand_kit_id: kitId })
      })
      const result = await res.json()
      clearInterval(interval); setProgress(100)
      if (result.ok) setTimeout(() => window.location.reload(), 500)
      else setGenError(result.error || 'Gagal generate')
    } catch(e) { clearInterval(interval); setGenError(String(e)) }
    setGenerating(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Color Palette */}
      {d.colors && d.colors.length > 0 && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Color Palette</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
            {d.colors.map((c, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ width: '100%', aspectRatio: '1', borderRadius: '12px', background: c.hex, border: '1px solid #E0E0E0', marginBottom: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#1A1A1A', fontFamily: 'monospace' }}>{c.hex}</p>
                <p style={{ fontSize: '11px', color: '#555555', marginTop: '2px', fontWeight: 600 }}>{c.name}</p>
                <p style={{ fontSize: '10px', color: '#888888', marginTop: '2px' }}>{c.usage}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Typography */}
      {d.typography && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>Typography</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {d.typography.heading && (
              <div style={{ background: '#F5F5F5', borderRadius: '12px', padding: '20px' }}>
                <p style={{ fontSize: '10px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Heading</p>
                <p style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A1A' }}>{d.typography.heading.font}</p>
                <p style={{ fontSize: '13px', color: '#555555', marginTop: '8px', lineHeight: 1.5 }}>{d.typography.heading.reason}</p>
              </div>
            )}
            {d.typography.body && (
              <div style={{ background: '#F5F5F5', borderRadius: '12px', padding: '20px' }}>
                <p style={{ fontSize: '10px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Body</p>
                <p style={{ fontSize: '18px', color: '#1A1A1A' }}>{d.typography.body.font}</p>
                <p style={{ fontSize: '13px', color: '#555555', marginTop: '8px', lineHeight: 1.5 }}>{d.typography.body.reason}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logo Section */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Logo AI â Recraft V3</p>
            <p style={{ fontSize: '12px', color: '#888888', marginTop: '4px' }}>
              {validLogos.length > 0 ? `${validLogos.length} logo berhasil dibuat Â· SOTA image generation` : 'Belum di-generate Â· Klik tombol untuk mulai'}
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: generating ? '#ccc' : '#1D9E75',
              color: 'white', border: 'none', borderRadius: '8px',
              padding: '10px 20px', fontSize: '13px', fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0
            }}
          >
            {generating ? (
              <><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>â³</span> Generating {progress}%</>
            ) : (
              <>{validLogos.length > 0 ? 'âº Regenerate' : 'â¦ Generate Logos AI'}</>
            )}
          </button>
        </div>

        {/* Progress bar */}
        {generating && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ background: '#F0F0F0', borderRadius: '100px', height: '6px', overflow: 'hidden' }}>
              <div style={{ background: '#1D9E75', height: '100%', width: progress + '%', transition: 'width 0.5s ease', borderRadius: '100px' }} />
            </div>
            <p style={{ fontSize: '12px', color: '#888888', marginTop: '8px', textAlign: 'center' }}>
              Recraft V3 sedang render logo... biasanya 30-60 detik
            </p>
          </div>
        )}

        {genError && (
          <div style={{ background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#E53935', fontWeight: 600 }}>Error: {genError}</p>
            {genError.includes('FAL_KEY') && (
              <p style={{ fontSize: '12px', color: '#E53935', marginTop: '4px' }}>Tambahkan FAL_KEY di Vercel Environment Variables</p>
            )}
          </div>
        )}

        {validLogos.length > 0 && !generating && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
            {validLogos.map((url, i) => (
              <div key={i} style={{ border: '1px solid #E8E8E8', borderRadius: '16px', overflow: 'hidden', transition: 'all 0.2s' }}>
                <div style={{ background: '#FAFAFA', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px' }}>
                  <img src={url} alt={"Logo " + (i+1)} style={{ width: '100%', maxHeight: '200px', objectFit: 'contain' }} />
                </div>
                <div style={{ background: 'white', padding: '14px 16px', borderTop: '1px solid #F0F0F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ background: '#E8F7F2', color: '#1D9E75', padding: '2px 10px', borderRadius: '100px', fontSize: '11px', fontWeight: 700 }}>Opsi {i+1}</span>
                      {d.logo_concepts?.[i] && (
                        <p style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A1A', marginTop: '6px' }}>{d.logo_concepts[i].name}</p>
                      )}
                    </div>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#1D9E75', fontWeight: 600, textDecoration: 'none' }}>
                      Download â
                    </a>
                  </div>
                  {d.logo_concepts?.[i] && (
                    <p style={{ fontSize: '12px', color: '#555555', marginTop: '6px', lineHeight: 1.5 }}>{d.logo_concepts[i].description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {validLogos.length === 0 && !generating && (
          <div style={{ border: '2px dashed #E0E0E0', borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>â¦</div>
            <p style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: '4px', fontSize: '16px' }}>Generate Logo dengan AI Terbaik</p>
            <p style={{ fontSize: '13px', color: '#555555', marginBottom: '16px', lineHeight: 1.6 }}>
              Menggunakan <strong>Recraft V3</strong> â SOTA model untuk logo dan brand identity.<br/>
              3 opsi logo sesuai brand personality kamu.
            </p>
            {(d.logo_concepts || []).map((c, i) => (
              <p key={i} style={{ fontSize: '12px', color: '#888888', marginBottom: '4px' }}>
                <strong>Opsi {i+1}:</strong> {c.name} â {c.style}
              </p>
            ))}
          </div>
        )}
      </div>

      {d.visual_mood && (
        <div className="card">
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Visual Mood</p>
          <p style={{ color: '#1A1A1A', lineHeight: 1.6, fontStyle: 'italic' }}>"{d.visual_mood}"</p>
        </div>
      )}
    </div>
  )
}
