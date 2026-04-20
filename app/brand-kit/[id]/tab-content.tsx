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

const PLATFORM_ICONS: Record<string, string> = {
  Instagram: '📸',
  TikTok: '🎵',
  Facebook: '👥',
  Twitter: '🐦',
  YouTube: '▶️',
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
    return h || ''
  }

  if (!posts.length) {
    return (
      <div className="card text-center py-16">
        <p style={{ fontSize: '40px', marginBottom: '12px' }}>📅</p>
        <p style={{ fontWeight: 700, color: '#1A1A1A', marginBottom: '8px' }}>Konten belum tersedia</p>
        <p style={{ fontSize: '13px', color: '#555555' }}>Klik "Buat Ulang" untuk generate konten 30 hari</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '8px' }}>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#1D9E75' }}>{posts.length}</p>
          <p style={{ fontSize: '12px', color: '#555555' }}>Total Konten</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#1D9E75' }}>
            {[...new Set(posts.map(p => p.platform))].length}
          </p>
          <p style={{ fontSize: '12px', color: '#555555' }}>Platform</p>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '16px' }}>
          <p style={{ fontSize: '28px', fontWeight: 800, color: '#1D9E75' }}>30</p>
          <p style={{ fontSize: '12px', color: '#555555' }}>Hari</p>
        </div>
      </div>

      {/* Posts list */}
      {posts.map((post, idx) => {
        const isOpen = expanded === idx
        const platformColor = PLATFORM_COLORS[post.platform] || '#888888'
        const hashtags = getHashtags(post.hashtags)
        const fullText = post.caption + (hashtags ? '\n\n' + hashtags : '')

        return (
          <div
            key={idx}
            style={{
              background: 'white',
              border: isOpen ? '2px solid #1D9E75' : '1px solid #E8E8E8',
              borderRadius: '12px',
              overflow: 'hidden',
              transition: 'all 0.2s',
            }}
          >
            {/* Row header - selalu tampil */}
            <div
              onClick={() => setExpanded(isOpen ? null : idx)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '14px 16px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              {/* Day badge */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%',
                background: '#1D9E75', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '13px', fontWeight: 700, flexShrink: 0,
              }}>
                {post.day}
              </div>

              {/* Platform pill */}
              <div style={{
                background: platformColor + '15',
                color: platformColor,
                padding: '3px 10px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: 700,
                flexShrink: 0,
              }}>
                {PLATFORM_ICONS[post.platform] || '📱'} {post.platform}
              </div>

              {/* Type */}
              <div style={{
                background: '#F5F5F5',
                color: '#555555',
                padding: '3px 10px',
                borderRadius: '100px',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0,
              }}>
                {post.type}
              </div>

              {/* Caption preview */}
              <p style={{
                flex: 1,
                fontSize: '13px',
                color: '#555555',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                minWidth: 0,
              }}>
                {post.caption?.slice(0, 80)}...
              </p>

              {/* Chevron */}
              <span style={{
                color: '#888888', fontSize: '18px', flexShrink: 0,
                transform: isOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}>
                ⌄
              </span>
            </div>

            {/* Expanded content */}
            {isOpen && (
              <div style={{ borderTop: '1px solid #F0F0F0', padding: '16px 20px' }}>
                {/* Caption */}
                <div style={{ background: '#FAFAFA', borderRadius: '10px', padding: '16px', marginBottom: '12px' }}>
                  <p style={{ fontSize: '11px', color: '#888888', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', fontWeight: 600 }}>
                    Caption
                  </p>
                  <p style={{ fontSize: '14px', color: '#1A1A1A', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {post.caption}
                  </p>
                  {hashtags && (
                    <p style={{ fontSize: '13px', color: '#1D9E75', marginTop: '12px', lineHeight: 1.6 }}>
                      {hashtags}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => copyCaption(idx, fullText)}
                    style={{
                      background: copied === idx ? '#1D9E75' : 'white',
                      color: copied === idx ? 'white' : '#1D9E75',
                      border: '1px solid #1D9E75',
                      borderRadius: '8px',
                      padding: '8px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {copied === idx ? '✓ Tersalin!' : '📋 Copy Caption'}
                  </button>
                  <div style={{ marginLeft: 'auto', fontSize: '12px', color: '#888888', alignSelf: 'center' }}>
                    Hari ke-{post.day} · {post.platform} · {post.type}
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
