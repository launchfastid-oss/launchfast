'use client'
import { useState } from 'react'

interface Post {
  day: number
  platform: string
  type: string
  caption: string
  hashtags: string[] | string
}

const PLATFORM_COLORS: Record<string, string> = {
  Instagram: '#E1306C',
  TikTok: '#010101',
  Facebook: '#1877F2',
  Twitter: '#1DA1F2',
  YouTube: '#FF0000',
}

export function ContentTab({ data }: { data: Record<string, unknown> }) {
  const posts = (data.posts as Post[]) || []
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

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

  if (!posts.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <p style={{ fontSize: '36px', marginBottom: '12px' }}>[kalender]#128197;</p>
        <p style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>Konten belum tersedia</p>
        <p style={{ fontSize: '13px', color: '#555555' }}>Klik "Buat Ulang" untuk generate konten 30 hari</p>
      </div>
    )
  }

  const byPlatform = posts.reduce((acc: Record<string, number>, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '10px', marginBottom: '4px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
          <p style={{ fontSize: '24px', fontWeight: 800, color: '#1D9E75', lineHeight: 1 }}>{posts.length}</p>
          <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>Total Post</p>
        </div>
        {Object.entries(byPlatform).map(([platform, count]) => (
          <div key={platform} className="card" style={{ textAlign: 'center', padding: '14px 8px' }}>
            <p style={{ fontSize: '24px', fontWeight: 800, color: PLATFORM_COLORS[platform] || '#888', lineHeight: 1 }}>{count as number}</p>
            <p style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>{platform}</p>
          </div>
        ))}
      </div>

      {posts.map((post, idx) => {
        const isOpen = expanded === idx
        const color = PLATFORM_COLORS[post.platform] || '#888'
        const hashtags = getHashtags(post.hashtags)

        return (
          <div
            key={idx}
            style={{
              background: 'white',
              border: isOpen ? '2px solid #1D9E75' : '1px solid #E8E8E8',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div
              onClick={() => setExpanded(isOpen ? null : idx)}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', cursor: 'pointer' }}
            >
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: '#1D9E75', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>
                {post.day}
              </div>
              <span style={{
                background: color + '18', color: color,
                padding: '3px 10px', borderRadius: '100px',
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>
                {post.platform}
              </span>
              <span style={{
                background: '#F5F5F5', color: '#555',
                padding: '3px 10px', borderRadius: '100px',
                fontSize: '12px', fontWeight: 600, flexShrink: 0,
              }}>
                {post.type}
              </span>
              <p style={{
                flex: 1, fontSize: '13px', color: '#666',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>
                {(post.caption || '').slice(0, 80)}
              </p>
              <span style={{
                color: '#BBB', fontSize: '18px', flexShrink: 0,
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s', display: 'inline-block',
              }}>
                &#9660;
              </span>
            </div>

            {isOpen && (
              <div style={{ borderTop: '1px solid #F5F5F5', padding: '16px 20px', background: '#FAFAFA' }}>
                <div style={{
                  background: 'white', borderRadius: '10px',
                  padding: '16px', marginBottom: '12px', border: '1px solid #F0F0F0',
                }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>
                    Caption
                  </p>
                  <p style={{ fontSize: '14px', color: '#1A1A1A', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>
                    {post.caption}
                  </p>
                  {hashtags && (
                    <p style={{ fontSize: '13px', color: '#1D9E75', marginTop: '12px', lineHeight: 1.7, fontWeight: 500 }}>
                      {hashtags}
                    </p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); copyCaption(idx, post.caption, hashtags) }}
                    style={{
                      background: copied === idx ? '#1D9E75' : 'white',
                      color: copied === idx ? 'white' : '#1D9E75',
                      border: '1.5px solid #1D9E75', borderRadius: '8px',
                      padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {copied === idx ? 'Tersalin!' : 'Copy Caption + Hashtag'}
                  </button>
                  <p style={{ fontSize: '12px', color: '#AAA', marginLeft: 'auto' }}>
                    Hari ke-{post.day} &middot; {post.platform} &middot; {post.type}
                  </p>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
