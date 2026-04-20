'use client'
import { useState } from 'react'

interface QuoteCard {
  caption_short: string
  business_name: string
  one_liner: string
  primary_color: string
  secondary_color: string
  accent_color: string
  post_type: string
}

interface Post {
  day: number
  platform: string
  type: string
  caption: string
  hashtags: string[] | string
  food_image_url?: string
  quote_card?: QuoteCard
  images_generated_at?: string
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  TikTok: '#010101',
}

// CSS-based quote card — no Canvas, no freeze
function QuoteCardDiv({ qc }: { qc: QuoteCard }) {
  const lines = qc.caption_short.split(' ')
  const preview = lines.slice(0, 10).join(' ') + (lines.length > 10 ? '...' : '')
  return (
    <div style={{
      width: '100%',
      aspectRatio: '3/4',
      background: 'linear-gradient(160deg, ' + qc.primary_color + ' 0%, ' + shadeColor(qc.primary_color, -40) + ' 100%)',
      borderRadius: '10px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Decorative circles */}
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '100px', height: '100px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', bottom: '-30px', left: '-30px', width: '140px', height: '140px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      {/* Top: Brand name */}
      <div>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.65)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>
          {qc.business_name}
        </p>
        <div style={{ width: '36px', height: '3px', background: qc.accent_color, marginTop: '8px', borderRadius: '2px' }} />
      </div>
      {/* Middle: Caption */}
      <div>
        <p style={{ fontSize: '15px', color: '#FFFFFF', fontWeight: 700, lineHeight: 1.55, margin: 0 }}>
          {preview}
        </p>
      </div>
      {/* Bottom: One-liner */}
      <div>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '10px' }} />
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', margin: 0, fontStyle: 'italic' }}>
          {qc.one_liner}
        </p>
      </div>
    </div>
  )
}

function shadeColor(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#',''), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + pct))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + pct))
  const b = Math.min(255, Math.max(0, (n & 0xff) + pct))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

function PostImages({ post, kitId, postIndex }: { post: Post; kitId?: string; postIndex: number }) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const hasImages = !!(post.food_image_url || post.quote_card)

  async function generate() {
    if (!kitId) return
    setGenerating(true); setError('')
    try {
      const res = await fetch('/api/generate-post-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ brand_kit_id: kitId, post_index: postIndex }),
      })
      const data = await res.json()
      if (data.ok) window.location.reload()
      else setError(data.error || 'Gagal')
    } catch(e) { setError(String(e)) }
    setGenerating(false)
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>Visuals (1080x1350 IG Portrait)</p>
        <button onClick={(e) => { e.stopPropagation(); generate() }} disabled={generating}
          style={{ background: hasImages ? 'white' : '#1D9E75', color: hasImages ? '#1D9E75' : 'white', border: '1.5px solid #1D9E75', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
          {generating ? 'Generating...' : hasImages ? 'Regenerate' : 'Generate Visual'}
        </button>
      </div>
      {error && <p style={{ fontSize: '12px', color: '#E53935', marginBottom: '8px' }}>{error}</p>}
      {generating && (
        <div style={{ background: '#F0FBF7', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: 600, margin: 0 }}>Ideogram V2 generating food photo...</p>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>~20 detik</p>
        </div>
      )}
      {!generating && hasImages && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {post.quote_card && (
            <div>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Quote Card</p>
              <QuoteCardDiv qc={post.quote_card} />
              <p style={{ fontSize: '10px', color: '#AAA', marginTop: '4px' }}>1080x1350</p>
            </div>
          )}
          {post.food_image_url ? (
            <div>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Food Photo (AI)</p>
              <img src={post.food_image_url} alt='Food' style={{ width: '100%', borderRadius: '10px', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }} />
              <p style={{ fontSize: '10px', color: '#AAA', marginTop: '4px' }}>1080x1350</p>
            </div>
          ) : (
            <div style={{ background: '#F5F5F5', borderRadius: '10px', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: '12px', color: '#AAA', textAlign: 'center', padding: '16px' }}>Food photo tidak tersedia. Klik Regenerate.</p>
            </div>
          )}
        </div>
      )}
      {!hasImages && !generating && (
        <div style={{ background: '#F9F9F9', border: '1px dashed #DDD', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>Klik Generate Visual:</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', background: '#E8F7F2', color: '#1D9E75', padding: '4px 12px', borderRadius: '100px', fontWeight: 600 }}>Quote Card branded</span>
            <span style={{ fontSize: '12px', background: '#E8F7F2', color: '#1D9E75', padding: '4px 12px', borderRadius: '100px', fontWeight: 600 }}>Food Photo AI</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function ContentTab({ data, kitId }: { data: Record<string, unknown>; kitId?: string }) {
  const posts = (data.posts as Post[]) || []
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  const filtered = posts.filter(p => p.platform === 'Instagram' || p.platform === 'TikTok')

  function getHashtags(h: string[] | string): string {
    if (Array.isArray(h)) return h.join(' ')
    return String(h || '')
  }

  function copyCaption(idx: number, caption: string, hashtags: string) {
    const text = caption + (hashtags ? '\n\n' + hashtags : '')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx); setTimeout(() => setCopied(null), 2000)
    })
  }

  if (!filtered.length) {
    return <div className='card' style={{ textAlign: 'center', padding: '48px' }}><p style={{ color: '#555' }}>Klik Buat Ulang untuk generate konten.</p></div>
  }

  const byPlatform = filtered.reduce((acc: Record<string, number>, p) => { acc[p.platform] = (acc[p.platform] || 0) + 1; return acc }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px', marginBottom: '4px' }}>
        <div className='card' style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#1D9E75', lineHeight: 1 }}>{filtered.length}</p>
          <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Total Post</p>
        </div>
        {Object.entries(byPlatform).map(([platform, count]) => (
          <div key={platform} className='card' style={{ textAlign: 'center', padding: '14px 8px' }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: PLATFORM_COLORS[platform] || '#888', lineHeight: 1 }}>{count as number}</p>
            <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{platform}</p>
          </div>
        ))}
      </div>
      {filtered.map((post, idx) => {
        const isOpen = expanded === idx
        const color = PLATFORM_COLORS[post.platform] || '#888'
        const hashtags = getHashtags(post.hashtags)
        const origIdx = posts.indexOf(post)
        const hasVis = !!(post.food_image_url || post.quote_card)
        return (
          <div key={idx} style={{ background: 'white', border: isOpen ? '2px solid #1D9E75' : '1px solid #E8E8E8', borderRadius: '12px', overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : idx)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1D9E75', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{post.day}</div>
              <span style={{ background: color + '18', color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{post.platform}</span>
              <span style={{ background: '#F5F5F5', color: '#555', padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{post.type}</span>
              {hasVis && <span style={{ fontSize: '10px', background: '#E8F7F2', color: '#1D9E75', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, flexShrink: 0 }}>Visual siap</span>}
              <p style={{ flex: 1, fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{(post.caption || '').slice(0, 70)}</p>
              <span style={{ color: '#BBB', fontSize: '16px', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>&#9660;</span>
            </div>
            {isOpen && (
              <div style={{ borderTop: '1px solid #F5F5F5', padding: '16px 20px', background: '#FAFAFA' }}>
                <div style={{ background: 'white', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid #F0F0F0' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>Caption</p>
                  <p style={{ fontSize: '14px', color: '#1A1A1A', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{post.caption}</p>
                  {hashtags && <p style={{ fontSize: '13px', color: '#1D9E75', marginTop: '12px', lineHeight: 1.7, fontWeight: 500 }}>{hashtags}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <button onClick={(e) => { e.stopPropagation(); copyCaption(idx, post.caption, hashtags) }}
                    style={{ background: copied === idx ? '#1D9E75' : 'white', color: copied === idx ? 'white' : '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    {copied === idx ? 'Tersalin!' : 'Copy Caption'}
                  </button>
                  <p style={{ fontSize: '12px', color: '#AAA', marginLeft: 'auto' }}>Hari ke-{post.day} &middot; {post.platform}</p>
                </div>
                <PostImages post={post} kitId={kitId} postIndex={origIdx} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}