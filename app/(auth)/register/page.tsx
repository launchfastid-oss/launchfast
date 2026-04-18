'use client'
import { useState } from 'react'
import { register, loginWithGoogle } from '@/lib/actions/auth'
import Link from 'next/link'

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(null)
    const result = await register(new FormData(e.currentTarget))
    if (result?.error) { setError(result.error); setLoading(false) }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await loginWithGoogle()
  }

  return (
    <div className="card">
      <h1 className="text-xl font-bold text-[#1A1A1A] mb-1">Buat akun gratis</h1>
      <p className="text-sm text-[#555555] mb-6">Lihat preview brand kit bisnis kamu — gratis</p>
      {error && <div className="error-box mb-4">{error}</div>}
      <button onClick={handleGoogle} disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-[#E0E0E0] rounded-lg text-sm font-medium text-[#1A1A1A] hover:bg-[#F5F5F5] transition-colors mb-5 disabled:opacity-50">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"/>
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.09 0-3.85-1.4-4.49-3.29H1.8v2.07A8 8 0 0 0 8.98 17z"/>
          <path fill="#FBBC05" d="M4.49 10.52A4.8 4.8 0 0 1 4.24 9c0-.52.09-1.03.25-1.52V5.41H1.8A8 8 0 0 0 .98 9c0 1.29.3 2.5.82 3.59l2.69-2.07z"/>
          <path fill="#EA4335" d="M8.98 3.58c1.18 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.8 5.4L4.49 7.48C5.13 5.59 6.9 3.58 8.98 3.58z"/>
        </svg>
        {googleLoading ? 'Mengarahkan...' : 'Daftar dengan Google'}
      </button>
      <div className="relative mb-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E0E0E0]"/></div>
        <div className="relative flex justify-center text-xs text-[#888888] bg-white px-3">atau</div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Nama lengkap</label>
          <input name="full_name" type="text" required placeholder="Nama kamu" className="input-field"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Email</label>
          <input name="email" type="email" required placeholder="kamu@email.com" className="input-field"/>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Password</label>
          <input name="password" type="password" required placeholder="Min. 8 karakter" minLength={8} className="input-field"/>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Membuat akun...' : 'Buat akun & mulai'}</button>
      </form>
      <p className="mt-5 text-center text-sm text-[#555555]">
        Sudah punya akun?{' '}
        <Link href="/login" className="text-[#1D9E75] font-semibold hover:underline">Masuk</Link>
      </p>
    </div>
  )
}