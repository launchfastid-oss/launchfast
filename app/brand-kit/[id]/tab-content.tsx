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
  video_url?: string
  video_generated_at?: string
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

function extractHeadline(caption: string): string {
  const clean = caption
    .replace(/^[#*-]+\s*Caption.*?\n+/gi, '')
    .replace(/^\*\*.*?\*\*\s*\n+/g, '')
    .replace(/^---+\s*\n*/g, '')
    .trim()
  const first = clean.split(/[.!?\n]/)[0]?.trim() || clean
  if (first.length <= 55) return first
  const words = first.split(' ')
  let result = ''
  for (const word of words) {
    if ((result + ' ' + word).trim().length > 52) break
    result = (result + ' ' + word).trim()
  }
  return result + '...'
}

function DownloadButton({ url, filename, color = '#1D9E75' }: { url: string; filename: string; color?: string }) {
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
    <button
      onClick={(e) => { e.stopPropagation(); download() }}
      disabled={loading}
      style={{
        background: loading ? '#ccc' : color, color: 'white',
        border: 'none', borderRadius: '6px',
        padding: '6px 12px', fontSize: '12px', fontWeight: 600,
        cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0,
      }}
    >
      {loading ? '...' : '\u2193 Download'}
    </button>
  )
}

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
      <div style={{ position: 'relative' }}>
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', margin: 0 }}>{qc.business_name}</p>
        <div style={{ width: '32px', height: '3px', background: qc.accent_color, marginTop: '8px', borderRadius: '2px' }} />
      </div>
      <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', padding: '16px 0' }}>
        <p style={{ fontSize: '18px', color: '#FFFFFF', fontWeight: 800, lineHeight: 1.45, margin: 0, textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          {headline}
        </p>
      </div>
      <div style={{ position: 'relative' }}>
        <div style={{ height: '1px', background: 'rgba(255,255,255,0.2)', marginBottom: '10px' }} />
        <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', margin: 0, fontStyle: 'italic', lineHeight: 1.4 }}>{qc.one_liner}</p>
      </div>
    </div>
  )
}

function FoodPhotoWithOverlay({ url, qc }: { url: string; qc?: QuoteCard }) {
  const headline = qc ? extractHeadline(qc.caption_short) : ''
  return (
    <div style={{ width: '100%', aspectRatio: '3/4', borderRadius: '10px', overflow: 'hidden', position: 'relative' }}>
      <img src={url} alt='Food' style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: '40%', background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' }} />
      {headline && (
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px' }}>
          <p style={{ fontSize: '14px', color: '#FFFFFF', fontWeight: 800, lineHeight: 1.4, margin: '0 0 6px', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>
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

// Download video sebagai MP4, GIF hint via ezgif
async function triggerVideoDownload(videoUrl: string, filename: string) {
  try {
    const res = await fetch(videoUrl)
    const blob = await res.blob()
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = filename
    a.click()
    URL.revokeObjectURL(a.href)
  } catch {
    window.open(videoUrl, '_blank')
  }
}

// VideoSection: submit ke fal queue, lalu poll setiap 3 detik
function VideoSection({ post, kitId, postIndex, onUpdate }: {
  post: Post
  kitId?: string
  postIndex: number
  onUpdate: (index: number, updates: Partial<Post>) => void
}) {
  const [genVideo, setGenVideo] = useState(false)
  const [videoError, setVideoError] = useState('')
  const [gifLoading, setGifLoading] = useState(false)
  const [pollMsg, setPollMsg] = useState('')
  const hasVideo = !!post.video_url
  const hasSource = !!(post.food_image_url || post.quote_card)
  const day = post.day
  const type = (post.type || 'post').toLowerCase().replace(/\\s+/g, '-')

  async function generateVideo() {
    if (!kitId) return
    setGenVideo(true); setVideoError(''); setPollMsg('Mengirim ke fal.ai queue...')
    try {
      // Step 1: Submit job
      const res = await fetch('/api/generate-post-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ brand_kit_id: kitId, post_index: postIndex }),
      })
      const data = await res.json()
      if (!data.ok || !data.request_id) {
        setVideoError(data.error || 'Gagal submit ke queue')
        setGenVideo(false); return
      }

      const requestId = data.request_id
      const statusUrl = data.status_url || ''
      const responseUrl = data.response_url || ''
      setPollMsg('Job dikirim! Menunggu LTX Video memproses...')

      // Step 2: Poll setiap 3 detik sampai selesai (max 3 menit)
      let attempts = 0
      const maxAttempts = 60 // 60 x 3s = 3 menit

      while (attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 3000))
        attempts++
        setPollMsg('Memproses video... (' + (attempts * 3) + 's)')

        const pollRes = await fetch('/api/poll-video-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ brand_kit_id: kitId, post_index: postIndex, request_id: requestId, status_url: statusUrl, response_url: responseUrl }),
        })
        const pollData = await pollRes.json()

        if (pollData.status === 'completed' && pollData.video_url) {
          onUpdate(postIndex, { video_url: pollData.video_url, video_generated_at: new Date().toISOString() })
          setPollMsg('')
          setGenVideo(false)
          return
        }

        if (pollData.status === 'error') {
          setVideoError(pollData.error || 'Video generation failed')
          setGenVideo(false)
          return
        }
        // status === 'pending'  lanjut poll
      }

      setVideoError('Timeout setelah 3 menit. Coba lagi.')
    } catch (e) { setVideoError(String(e)) }
    setGenVideo(false); setPollMsg('')
  }

  return (
    <div style={{ marginTop: '16px', borderTop: '1px solid #F0F0F0', paddingTop: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div>
          <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, margin: '0 0 2px' }}>
            Video (MP4 + GIF)
          </p>
          <p style={{ fontSize: '11px', color: '#AAA', margin: 0 }}>
            {hasVideo ? 'LTX Video \u00b7 5 detik \u00b7 576x768'
              : hasSource ? 'Siap di-generate dari foto produk'
              : 'Generate foto dulu sebelum video'}
          </p>
        </div>
        {hasSource && (
          <button
            onClick={(e) => { e.stopPropagation(); generateVideo() }}
            disabled={genVideo}
            style={{
              background: hasVideo ? 'white' : '#1A1A1A',
              color: hasVideo ? '#1A1A1A' : 'white',
              border: '1.5px solid #1A1A1A',
              borderRadius: '8px', padding: '6px 14px',
              fontSize: '12px', fontWeight: 600,
              cursor: genVideo ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0,
            }}
          >
            <span>&#9654;</span>
            {genVideo ? 'Processing...' : hasVideo ? 'Regenerate Video' : 'Generate Video'}
          </button>
        )}
      </div>

      {videoError && <p style={{ fontSize: '12px', color: '#E53935', marginBottom: '8px' }}>{videoError}</p>}

      {genVideo && (
        <div style={{ background: '#F5F5F5', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #1A1A1A', borderTopColor: 'transparent', borderRadius: '50%', marginBottom: '8px', animation: 'spin 0.8s linear infinite' }} />
          <p style={{ fontSize: '13px', color: '#1A1A1A', fontWeight: 600, margin: '0 0 2px' }}>
            {pollMsg || 'LTX Video sedang animate foto...'}
          </p>
          <p style={{ fontSize: '11px', color: '#888', margin: 0 }}>Async queue  halaman tidak perlu stay terbuka</p>
        </div>
      )}

      {!genVideo && hasVideo && post.video_url && (
        <div>
          <video
            src={post.video_url}
            controls loop muted autoPlay playsInline
            style={{ width: '100%', maxWidth: '280px', borderRadius: '10px', display: 'block', aspectRatio: '3/4', objectFit: 'cover' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            <DownloadButton url={post.video_url} filename={'video-hari-' + day + '-' + type + '.mp4'} />
            <button
              onClick={async (e) => {
                e.stopPropagation()
                setGifLoading(true)
                await triggerVideoDownload(post.video_url as string, 'gif-hari-' + day + '-' + type + '.mp4')
                setGifLoading(false)
              }}
              disabled={gifLoading}
              style={{ background: '#FF6B35', color: 'white', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
            >
              {gifLoading ? '...' : '\u2193 Download GIF'}
            </button>
            <p style={{ fontSize: '11px', color: '#AAA', margin: 0 }}>Konversi ke GIF di ezgif.com/video-to-gif</p>
          </div>
        </div>
      )}

      {!hasSource && !genVideo && (
        <div style={{ background: '#F9F9F9', border: '1px dashed #DDD', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#888', margin: 0 }}>Generate foto produk dulu agar video bisa dibuat</p>
        </div>
      )}
    </div>
  )
}


function PostImages({ post, kitId, postIndex, onUpdate }: {
  post: Post
  kitId?: string
  postIndex: number
  onUpdate: (index: number, updates: Partial<Post>) => void
}) {
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const hasImages = !!(post.food_image_url || post.quote_card)
  const day = post.day
  const type = (post.type || 'post').toLowerCase().replace(/\s+/g, '-')

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
      } else {
        setError(data.error || 'Gagal generate')
      }
    } catch (e) { setError(String(e)) }
    setGenerating(false)
  }

  return (
    <div style={{ marginTop: '16px' }}>
      {/* Header + generate button */}
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
          <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: 600, margin: '0 0 4px' }}>Ideogram V2 sedang generate foto makanan...</p>
          <p style={{ fontSize: '12px', color: '#555', margin: 0 }}>~20 detik</p>
        </div>
      )}

      {/* Images grid */}
      {!generating && hasImages && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {post.quote_card && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <p style={{ fontSize: '11px', color: '#888', fontWeight: 600, margin: 0 }}>Quote Card</p>
              </div>
              <QuoteCardDiv qc={post.quote_card} />
              <p style={{ fontSize: '10px', color: '#AAA', marginTop: '4px' }}>1080x1350</p>
            </div>
          )}
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

      {/* VideoSection selalu muncul setelah images (baik ada foto maupun tidak) */}
      <VideoSection post={post} kitId={kitId} postIndex={postIndex} onUpdate={onUpdate} />
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

  const byPlatform = filtered.reduce((acc: Record<string, number>, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1; return acc
  }, {})


  // Locked state  konten belum bisa digenerate sebelum logo dipilih
  if (data.locked === true) {
    const lockedReason = (data.locked_reason as string) || 'Pilih dan lock logo terlebih dahulu.'
    return (
      <div className="space-y-4">
        {/* Lock banner -- prominent */}
        <div style={{ background: '#FFF8E1', border: '2px solid #FFB300', borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '24px', flexShrink: 0 }}>&#128274;</span>
          <div>
            <p style={{ fontWeight: 700, color: '#E65100', fontSize: '14px', marginBottom: '4px' }}>Konten terkunci</p>
            <p style={{ fontSize: '13px', color: '#795548', lineHeight: 1.5 }}>{lockedReason} Setelah logo dipilih, konten 30 hari akan otomatis tersedia.</p>
          </div>
        </div>
        {/* Content Pillars tetap ditampilkan */}
        {(data.content_pillars as Array<{name:string;percentage:number;description:string}>)?.length > 0 && (
          <div className="card">
            <p style={{ fontSize: '11px', fontWeight: 700, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '12px' }}>Content Pillars</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {(data.content_pillars as Array<{name:string;percentage:number;description:string}>).map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '10px', background: '#F9F9F9', borderRadius: '8px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '999px', background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontSize: '12px', fontWeight: 800 }}>{p.percentage}%</span>
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '13px', color: '#1A1A1A', margin: '0 0 2px' }}>{p.name}</p>
                    <p style={{ fontSize: '12px', color: '#666', margin: 0 }}>{p.description}</p>
                  </div>
                </div>
              ))}
            </div>
            {!!data.content_strategy && (
              <p style={{ fontSize: '13px', color: '#555', lineHeight: 1.6, marginTop: '12px', padding: '12px', background: '#F5F5F5', borderRadius: '8px' }}>
                {String(data.content_strategy)}
              </p>
            )}
          </div>
        )}
        {/* Lock banner */}
        <div style={{ background: '#FFFBEB', border: '2px solid #F59E0B', borderRadius: '16px', padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}></div>
          <p style={{ fontWeight: 800, fontSize: '18px', color: '#1A1A1A', marginBottom: '8px' }}>Konten Belum Dibuat</p>
          <p style={{ color: '#666', fontSize: '14px', lineHeight: 1.6, maxWidth: '300px', margin: '0 auto 20px' }}>{lockedReason}</p>
          <div style={{ background: '#FEF3C7', borderRadius: '10px', padding: '12px 16px', display: 'inline-block' }}>
            <p style={{ fontSize: '13px', color: '#92400E', fontWeight: 600, margin: 0 }}>
               Tab Visual  Pilih logo  Klik "Lock Logo Ini"
            </p>
          </div>
        </div>
      </div>
    )
  }
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
        const hasVid = !!post.video_url
        const previewCaption = post.caption
          .replace(/^[#*-]+\s*Caption.*?\n+/gi, '')
          .replace(/^\*\*.*?\*\*\s*\n+/g, '')
          .trim().slice(0, 70)
        return (
          <div key={origIdx} style={{ background: 'white', border: isOpen ? '2px solid #1D9E75' : '1px solid #E8E8E8', borderRadius: '12px', overflow: 'hidden' }}>
            <div onClick={() => setExpanded(isOpen ? null : idx)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1D9E75', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{post.day}</div>
              <span style={{ background: color + '18', color, padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 700, flexShrink: 0 }}>{post.platform}</span>
              <span style={{ background: '#F5F5F5', color: '#555', padding: '3px 10px', borderRadius: '100px', fontSize: '12px', fontWeight: 600, flexShrink: 0 }}>{post.type}</span>
              {hasVis && <span style={{ fontSize: '10px', background: '#E8F7F2', color: '#1D9E75', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, flexShrink: 0 }}>Foto</span>}
              {hasVid && <span style={{ fontSize: '10px', background: '#1A1A1A', color: 'white', padding: '2px 8px', borderRadius: '100px', fontWeight: 600, flexShrink: 0 }}>Video</span>}
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
                  <button
                    onClick={(e) => { e.stopPropagation(); copyCaption(idx, post.caption, hashtags) }}
                    style={{ background: copied === idx ? '#1D9E75' : 'white', color: copied === idx ? 'white' : '#1D9E75', border: '1.5px solid #1D9E75', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                  >
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
