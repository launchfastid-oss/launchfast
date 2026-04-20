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

function shadeColor(hex: string, pct: number): string {
  const n = parseInt(hex.replace('#',''), 16)
  const r = Math.min(255, Math.max(0, (n >> 16) + pct))
  const g = Math.min(255, Math.max(0, ((n >> 8) & 0xff) + pct))
  const b = Math.min(255, Math.max(0, (n & 0xff) + pct))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

// Ekstrak headline dari caption — ambil kalimat pertama yang bermakna
function extractHeadline(caption: string): string {
  // Bersihkan prefix dari Claude
  const clean = caption
    .replace(/^[#*-]+\s*Caption.*?\n+/gi, '')
    .replace(/^\*\*.*?\*\*\s*\n+/g, '')
    .replace(/^---+\s*\n*/g, '')
    .trim()
  // Ambil kalimat pertama
  const firstSentence = clean.split(/[.!?\n]/)[0]?.trim() || clean
  // Potong maksimal 60 karakter, di word boundary
  if (firstSentence.length <= 55) return firstSentence
  const words = firstSentence.split(' ')
  let result = ''
  for (const word of words) {
    if ((result + ' ' + word).trim().length > 52) break
    result = (result + ' ' + word).trim()
  }
  return result + '...'
}

// Tombol download gambar
function DownloadButton({ url, filename }: { url: string; filename: string }) {
  const [loading, setLoading] = useState(false)

  async function download() {
    setLoading(true)
    try {
      const res = await fetch(url)
      const blob = await res.blob()
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = filename
      a.click()
      URL.revokeObjectURL(a.href)
    } catch {
      window.open(url, '_blank')
    }
    setLoading(false)
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); download() }} disabled={loading}
      style={{
        background: loading ? '#ccc' : '#1D9E75', color: 'white',
        border: 'none', borderRadius: '6px',
        padding: '6px 12px', fontSize: '12px', fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px',
      }}
    >
      {loading ? '...' : '↓ Download'}
    </button>
  )
}

// Quote card branded dengan headline yang benar
function QuoteCardDiv({ qc }: { qc: QuoteCard }) {
  const headline = extractHeadline(qc.caption_short)
  return (
    <div style={{
      width: '100%', aspectRatio: '3/4',
      background: 'linear-gradient(160deg, ' + qc.primary_color + ' 0%, ' + shadeColor(qc.primary_color, -45) + ' 100%)',
      borderRadius: '10px', padding: '20px',
      display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
      position: 'relative', overflow: 'hidden', boxSizing: 'border-box',
    }}>
      <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '110px', height: '110px', borderRadius: '50%', background: 'rgba(255,255,255,0.07)' }} />
      <div style={{ position: 'absolute', bottom: '-35px', left: '-35px', width: '150px', height: '150px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
      {/* Top */}
      <div style={{ position: 'relative' }}>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{qc.business_name}</p>
        <div style={{ width: '32px', height: '3px', background: qc.accent_color, marginTop: '8px', borderRadius: '2px' }} />
      </div>
      {/* Headline — teks utama yang readable */}
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', paddingTop: '16px', paddingBottom: '16px' }}>
        <p style={{
          fontSize: '18px', color: '#FFFFFF', fontWeight: 800,
          lineHeight: 1.45, margin: 0,
          textShadow: '0 1px 3px rgba(0,0,0,0.3)',
          display: '-webkit-box', WebkitLineClamp: 4,
          WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {headline}
        </p>
      </div>
      {/* Bottom */}
      <div style={{ position: 'relative' }}>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '10px' }} />
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>{qc.one_liner}</p>
      </div>
    </div>
  )
}

// Food photo dengan text overlay yang benar — headline pendek di dalam gambar
function FoodPhotoWithOverlay({ url, qc }: { url: string; qc?: QuoteCard }) {
  const headline = qc ? extractHeadline(qc.caption_short) : ''
  return (
    <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
      <img src={url} alt='Food' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      {/* Gradient overlay kuat di bawah */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, top: '40%',
        background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
      }} />
      {/* Text overlay */}
      {headline && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
          <p style={{
            fontSize: '14px', color: '#FFFFFF', fontWeight: 800,
            lineHeight: 1.4, margin: '0 0 6px', textShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}>
            {headline}
          </p>
          {qc && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '16px', height: '2px', background: qc.accent_color, borderRadius: '1px', flexShrink: 0 }} />
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.8)', margin: 0, fontWeight: 600, letterSpacing: '0.06em' }}>
                {qc.business_name}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PostImages({ post, kitId, postIndex, onUpdate }: {
  post: Post; kitId?: string; postIndex: number; onUpdate: (index: number, data: Partial<Post>) => void
}) {
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
      if (data.ok) {
        onUpdate(postIndex, {
          food_image_url: data.food_image_url,
          quote_card: data.quote_card,
          images_generated_at: new Date().toISOString(),
        })
      } else setError(data.error || 'Gagal generate')
    } catch(e) { setError(String(e)) }
    setGenerating(false)
  }

  const day = post.day
  const type = post.type?.toLowerCase().replace(/\s+/g, '-') || 'post'

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: 0 }}>
          Visuals (1080x1350 IG Portrait)
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); generate() }}
          disabled={generating}
          style={{
            background: hasImages ? 'white' : '#1D9E75',
            color: hasImages ? '#1D9E75' : 'white',
            border: '1.5px solid #1D9E75', borderRadius: '8px',
            padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
          }}
        >
          {generating ? 'Generating...' : hasImages ? 'Regenerate' : 'Generate Visual'}
        </button>
      </div>

      {error && <p style={{ fontSize: '12px', color: '#E53935', marginBottom: '8px' }}>{error}</p>}

      {generating && (
        <div style={{ background: '#F0FBF7', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: 600, margin: '0 0 4px' }}>
            Ideogram V2 sedang generate foto makanan...
          </p>
          <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>~20 detik</p>
        </div>
      )}

      {!generating && hasImages && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* Quote Card */}
          {post.quote_card && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: '#888', fontWeight: 600, margin: 0 }}>Quote Card</p>
                <DownloadButton url={'data:text/plain,'} filename={'quote-hari-' + day + '-' + type + '.png'} />
              </div>
              <QuoteCardDiv qc={post.quote_card} />
              <p style={{ fontSize: '10px', color: '#AAA', marginTop: '4px' }}>1080x1350</p>
            </div>
          )}
          {/* Food Photo */}
          {post.food_image_url ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: '#888', fontWeight: 600, margin: 0 }}>Food Photo + Teks</p>
                <DownloadButton url={post.food_image_url} filename={'foto-hari-' + day + '-' + type + '.jpg'} />
              </div>
              <FoodPhotoWithOverlay url={post.food_image_url} qc={post.quote_card} />
              <p style={{ fontSize: '10px', color: '#AAA', marginTop: '4px' }}>1080x1350</p>
            </div>
          ) : (
            <div style={{ background: '#F5F5F5', borderRadius: '10px', aspectRatio: '3/4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: '12px', color: '#AAA', textAlign: 'center', padding: '16px', margin: 0 }}>
                Food photo tidak tersedia.<br/>Klik Regenerate.
              </p>
            </div>
          )}
        </div>
      )}

      {!hasImages && !generating && (
        <div style={{ background: '#F9F9F9', border: '1px dashed #DDD', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#888', margin: '0 0 8px' }}>Klik Generate untuk buat 2 visual:</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', background: '#E8F7F2', color: '#1D9E75', padding: '4px 12px', borderRadius: '100px', fontWeight: 600 }}>Quote Card</span>
            <span style={{ fontSize: '12px', background: '#E8F7F2', color: '#1D9E75', padding: '4px 12px', borderRadius: '100px', fontWeight: 600 }}>Food Photo + Teks</span>
          </div>
        </div>
      )}
    </div>
  )
}

export function ContentTab({ data, kitId }: { data: Record<string, unknown>; kitId?: string }) {
  const rawPosts = (data.posts as Post[]) || []
  const [posts, setPosts] = useState<Post[]>(rawPosts)
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  function handleUpdate(origIndex: number, updates: Partial<Post>) {
    setPosts(prev => prev.map((p, i) => i === origIndex ? { ...p, ...updates } : p))
  }

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
        const previewCaption = post.caption.replace(/^[#*-]+\s*Caption.*?\n+/gi, '').replace(/^\*\*.*?\*\*\s*\n+/g, '').trim().slice(0, 70)
        return (
          <div key={origIdx} style={{ background: 'white', border: isOpen ? '2px solid #1D9E75' : '1px solid #E8E8E8', borderRadius: '12px', overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : idx)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1D9E75', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{post.day}</div>
              <span style={{ background: color + '18', color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{post.platform}</span>
              <span style={{ background: '#F5F5F5', color: '#555', padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{post.type}</span>
              {hasVis && <span style={{ fontSize: '10px', background: '#E8F7F2', color: '#1D9E75', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, flexShrink: 0 }}>Visual siap</span>}
              <p style={{ flex: 1, fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>{previewCaption}</p>
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
                <PostImages post={post} kitId={kitId} postIndex={origIdx} onUpdate={handleUpdate} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}