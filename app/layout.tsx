import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' })
export const metadata: Metadata = {
  title: 'Launchfast.id — Brand Kit AI untuk UMKM Indonesia',
  description: 'Buat brand kit profesional lengkap dalam 30 menit.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://launchfast.id'),
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${jakarta.variable} font-sans antialiased bg-white text-[#1A1A1A]`}>
        {children}
      </body>
    </html>
  )
}