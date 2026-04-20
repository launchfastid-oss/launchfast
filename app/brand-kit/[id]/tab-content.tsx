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
  TikTok: '#000000',
  Facebook: '#1877F2',
  Twitter: '#1DA1F2',
  YouTube: '#FF0000',
}

export function ContentTab({ data }: { data: Record<string, unknown> }) {
  const posts = (data.posts as Post[]) || []
  const [expanded, setExpanded] = useState<number | null>(null)
  const [copied, setCopied] = useState<number | null>(null)

  function copyCaption(idx: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  function getHashtags(h: string[] | string): string {
    if (Array.isArray(h)) return h.join(' ')
    return (h || '').toString()
  }

  if (!posts.length) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '64px 24px' }}>
        <p style={{ fontSize: '40px', marginBottom: '12px' }}>📅</p>
        <p style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>Konten belum tersedia</p>
        <p style={{ fontSize: '13px', color: '#555555' }}>Klik "Buat Ulang" untuk generate konten 30 hari</p>
      </div>
    )
  }

  // Count by platform
  const byPlatform = posts.reduce((acc: Record<string, number>, p) => {
    acc[p.platform] = (acc[p.platform] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px', marginBottom: '8px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
          <p style={{ fontSize: '26px', fontWeight: 800, color: '#1D9E75', lineHeight: 1 }}>{posts.length}</p>
          <p style={{ fontSize: '11px', color: '#555555', marginTop: '4px' }}>Total Post</p>
        </div>
        {Object.entries(byPlatform).map(([platform, count]) => (
          <div key={platform} className="card" style={{ textAlign: 'center', padding: '14px 10px' }}>
            <p style={{ fontSize: '26px', fontWeight: 800, color: PLATFORM_COLORS[platform] || '#888', lineHeight: 1 }}>{count as number}</p>
            <p style={{ fontSize: '11px', color: '#555555', marginTop: '4px' }}>{platform}</p>
          </div>
        ))}
      </div>

      {/* Post cards */}
      {posts.map((post, idx) => {
        const isOpen = expanded === idx
        const platformColor = PLATFORM_COLORS[post.platform] || '#888888'
        const hashtags = getHashtags(post.hashtags)
        const fullText = post.caption + (hashtags ? '

' + hashtags : '')

        return (
          <div key={idx} style={{
            background: 'white',
            border: isOpen ? '2px solid #1D9E75' : '1px solid #E8E8E8',
            borderRadius: '12px',
            overflow: 'hidden',
            transition: 'border-color 0.15s',
          }}>
            {/* Header row */}
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
                background: platformColor + '18', color: platformColor,
                padding: '3px 10px', borderRadius: '100px',
                fontSize: '12px', fontWeight: 700, flexShrink: 0,
              }}>
                {post.platform}
              </span>
              <span style={{
                background: '#F5F5F5', color: '#555555',
                padding: '3px 10px', borderRadius: '100px',
                fontSize: '12px', fontWeight: 600, flexShrink: 0,
              }}>
                {post.type}
              </span>
              <p style={{
                flex: 1, fontSize: '13px', color: '#666666',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0,
              }}>
                {post.caption?.slice(0, 80)}
              </p>
              <span style={{ color: '#BBBBBB', fontSize: '20px', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                &#8964;
              </span>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #F5F5F5', padding: '16px 20px', background: '#FAFAFA' }}>
                <div style={{ background: 'white', borderRadius: '10px', padding: '16px', marginBottom: '12px', border: '1px solid #F0F0F0' }}>
                  <p style={{ fontSize: '11px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px', fontWeight: 600 }}>Caption</p>
                  <p style={{ fontSize: '14px', color: '#1A1A1A', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{post.caption}</p>
                  {hashtags && (
                    <p style={{ fontSize: '13px', color: '#1D9E75', marginTop: '12px', lineHeight: 1.7, fontWeight: 500 }}>{hashtags}</p>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={() => copyCaption(idx, fullText)}
                    style={{
                      background: copied === idx ? '#1D9E75' : 'white',
                      color: copied === idx ? 'white' : '#1D9E75',
                      border: '1.5px solid #1D9E75', borderRadius: '8px',
                      padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {copied === idx ? '✓ Tersalin!' : '📋 Copy Caption + Hashtag'}
                  </button>
                  <p style={{ fontSize: '12px', color: '#AAAAAA', marginLeft: 'auto' }}>
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
