'use client'
import { useState, useEffect, useRef } from 'react'

interface QuoteCard {
  quote_text: string
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

function QuoteCardCanvas({ qc }: { qc: QuoteCard }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 1080x1350 portrait â render at 540x675 (50%) for display
    const W = 540, H = 675
    canvas.width = W
    canvas.height = H

    // Background gradient
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, qc.primary_color)
    grad.addColorStop(0.6, qc.primary_color)
    grad.addColorStop(1, shadeColor(qc.primary_color, -30))
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)

    // Decorative circles
    ctx.beginPath()
    ctx.arc(W * 0.85, H * 0.15, 120, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.06)'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(W * 0.1, H * 0.85, 160, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255,255,255,0.04)'
    ctx.fill()

    // Accent line
    ctx.fillStyle = qc.accent_color
    ctx.fillRect(48, 180, 60, 5)

    // Business name
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.fillText(qc.business_name.toUpperCase(), 48, 160)

    // Big quote mark
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    ctx.font = 'bold 120px serif'
    ctx.fillText('\u201C', 36, 280)
    ctx.font = 'bold 34px system-ui, sans-serif'

    // Main quote text - word wrap
    ctx.fillStyle = '#FFFFFF'
    ctx.font = 'bold 34px system-ui, sans-serif'
    const lines = wrapText(ctx, qc.quote_text || qc.business_name, W - 96, 34)
    lines.forEach((line, i) => {
      ctx.fillText(line, 48, 230 + i * 48)
    })

    // One-liner at bottom
    const oneY = H - 100
    ctx.fillStyle = qc.accent_color
    ctx.fillRect(48, oneY - 8, W - 96, 1)
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.font = '20px system-ui, sans-serif'
    ctx.fillText(qc.one_liner || qc.business_name, 48, oneY + 28)
  }, [qc])

  return <canvas ref={canvasRef} style={{ width: '100%', height: 'auto', borderRadius: '8px', display: 'block' }} />
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.max(0, (num >> 16) + percent))
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent))
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent))
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, fontSize: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  const maxLines = 5
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
      if (lines.length >= maxLines) break
    } else {
      current = test
    }
  }
  if (current && lines.length < maxLines) lines.push(current)
  return lines
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
      else setError(data.error || 'Gagal generate')
    } catch (e) { setError(String(e)) }
    setGenerating(false)
  }

  return (
    <div style={{ marginTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Visuals</p>
        <button
          onClick={(e) => { e.stopPropagation(); generate() }}
          disabled={generating}
          style={{
            background: generating ? '#ccc' : (hasImages ? 'white' : '#1D9E75'),
            color: generating ? '#666' : (hasImages ? '#1D9E75' : 'white'),
            border: '1.5px solid ' + (generating ? '#ccc' : '#1D9E75'),
            borderRadius: '8px', padding: '6px 14px',
            fontSize: '12px', fontWeight: 600, cursor: generating ? 'not-allowed' : 'pointer',
          }}
        >
          {generating ? 'Generating...' : (hasImages ? 'Regenerate' : 'Generate Visual')}
        </button>
      </div>

      {error && <p style={{ fontSize: '12px', color: '#E53935', marginBottom: '8px' }}>{error}</p>}

      {generating && (
        <div style={{ background: '#F0FBF7', borderRadius: '10px', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #1D9E75', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: 600 }}>Ideogram V2 generating food photo...</p>
          <p style={{ fontSize: '12px', color: '#555', marginTop: '4px' }}>Quote card siap instan</p>
        </div>
      )}

      {!generating && hasImages && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {post.quote_card && (
            <div>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Quote Card</p>
              <QuoteCardCanvas qc={post.quote_card} />
              <p style={{ fontSize: '10px', color: '#AAA', marginTop: '4px' }}>1080 x 1350 (IG Portrait)</p>
            </div>
          )}
          {post.food_image_url && (
            <div>
              <p style={{ fontSize: '11px', color: '#888', marginBottom: '6px', fontWeight: 600 }}>Food Photo</p>
              <img
                src={post.food_image_url}
                alt='Food photo'
                style={{ width: '100%', borderRadius: '8px', display: 'block', aspectRatio: '4/5', objectFit: 'cover' }}
              />
              <p style={{ fontSize: '10px', color: '#AAA', marginTop: '4px' }}>1080 x 1350 (IG Portrait)</p>
            </div>
          )}
          {post.food_image_url && !post.quote_card && (
            <div style={{ background: '#F5F5F5', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', aspectRatio: '4/5' }}>
              <p style={{ fontSize: '12px', color: '#AAA' }}>Quote card tidak tersedia</p>
            </div>
          )}
        </div>
      )}

      {!hasImages && !generating && (
        <div style={{ background: '#F9F9F9', border: '1px dashed #DDD', borderRadius: '10px', padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#888' }}>Klik Generate Visual untuk membuat:</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
            <span style={{ fontSize: '12px', background: '#E8F7F2', color: '#1D9E75', padding: '4px 12px', borderRadius: '100px', fontWeight: 600 }}>Quote Card branded</span>
            <span style={{ fontSize: '12px', background: '#E8F7F2', color: '#1D9E75', padding: '4px 12px', borderRadius: '100px', fontWeight: 600 }}>Food Photo AI</span>
          </div>
          <p style={{ fontSize: '11px', color: '#AAA', marginTop: '8px' }}>Format 1080x1350 siap posting IG</p>
        </div>
      )}
    </div>
  )
}

export function ContentTab({ data, kitId }: { data: Record<string, unknown>; kitId?: string }) {
  const posts = (data.posts as Post[]) || []
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  // Filter: Instagram & TikTok only
  const filteredPosts = posts.filter(p => p.platform === 'Instagram' || p.platform === 'TikTok')

  function getHashtags(h: string[] | string): string {
    if (Array.isArray(h)) return h.join(' ')
    return String(h || '')
  }

  function copyCaption(idx: number, caption: string, hashtags: string) {
    const text = caption + (hashtags ? '\n\n' + hashtags : '')
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (!filteredPosts.length) {
    return (
      <div className='card' style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>Konten belum tersedia</p>
        <p style={{ fontSize: '13px', color: '#555555' }}>Klik Buat Ulang untuk generate konten</p>
      </div>
    )
  }

  const byPlatform = filteredPosts.reduce((acc: Record<string, number>, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px', marginBottom: '4px' }}>
        <div className='card' style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#1D9E75', lineHeight: 1 }}>{filteredPosts.length}</p>
          <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Total Post</p>
        </div>
        {Object.entries(byPlatform).map(([platform, count]) => (
          <div key={platform} className='card' style={{ textAlign: 'center', padding: '14px 8px' }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: PLATFORM_COLORS[platform] || '#888', lineHeight: 1 }}>{count as number}</p>
            <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{platform}</p>
          </div>
        ))}
      </div>

      {filteredPosts.map((post, idx) => {
        const isOpen = expanded === idx
        const color = PLATFORM_COLORS[post.platform] || '#888'
        const hashtags = getHashtags(post.hashtags)
        const originalIndex = posts.indexOf(post)
        const hasVisuals = !!(post.food_image_url || post.quote_card)

        return (
          <div key={idx} style={{
            background: 'white',
            border: isOpen ? '2px solid #1D9E75' : '1px solid #E8E8E8',
            borderRadius: '12px', overflow: 'hidden',
          }}>
            <div
              onClick={() => setExpanded(isOpen ? null : idx)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer' }}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: '#1D9E75', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>{post.day}</div>
              <span style={{ background: color + '18', color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>
                {post.platform}
              </span>
              <span style={{ background: '#F5F5F5', color: '#555', padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>
                {post.type}
              </span>
              {hasVisuals && <span style={{ fontSize: '10px', background: '#E8F7F2', color: '#1D9E75', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, flexShrink: 0 }}>Visual siap</span>}
              <p style={{ flex: 1, fontSize: '13px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
                {(post.caption || '').slice(0, 70)}
              </p>
              <span style={{ color: '#BBB', fontSize: '18px', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>
                &#9660;
              </span>
            </div>

            {isOpen && (
              <div style={{ borderTop: '1px solid #F5F5F5', padding: '16px 20px', background: '#FAFAFA' }}>
                <div style={{ background: 'white', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid #F0F0F0' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>Caption</p>
                  <p style={{ fontSize: '14px', color: '#1A1A1A', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{post.caption}</p>
                  {hashtags && <p style={{ fontSize: '13px', color: '#1D9E75', marginTop: '12px', lineHeight: 1.7, fontWeight: 500 }}>{hashtags}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyCaption(idx, post.caption, hashtags) }}
                    style={{
                      background: copied === idx ? '#1D9E75' : 'white',
                      color: copied === idx ? 'white' : '#1D9E75',
                      border: '1.5px solid #1D9E75', borderRadius: '8px',
                      padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {copied === idx ? 'Tersalin!' : 'Copy Caption'}
                  </button>
                  <p style={{ fontSize: '12px', color: '#AAA', marginLeft: 'auto' }}>Hari ke-{post.day} &middot; {post.platform}</p>
                </div>
                <PostImages post={post} kitId={kitId} postIndex={originalIndex} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}