import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="border-b border-[#E0E0E0] bg-white sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-bold"><span className="text-[#1D9E75]">Launchfast</span>.id</span>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-[#555555] hover:text-[#1A1A1A]">Masuk</Link>
            <Link href="/register" className="btn-primary text-sm py-2 px-5">Coba Gratis →</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-b from-[#F0FBF7] to-white py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#E8F7F2] text-[#1D9E75] text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
            ⚡ AI Brand Kit dalam 2 Menit
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-[#1A1A1A] leading-tight mb-6">
            Brand Kit Lengkap untuk<br />
            <span className="text-[#1D9E75]">UMKM Indonesia</span>
          </h1>
          <p className="text-lg text-[#555555] mb-8 max-w-2xl mx-auto leading-relaxed">
            Strategi brand, konten 30 hari, WA scripts, landing page, dan data legal — semua dibuat AI dalam hitungan menit. Tanpa agency, tanpa mahal.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/register" className="btn-primary text-base py-3.5 px-8">
              Mulai Gratis — Lihat Preview ✨
            </Link>
            <Link href="#cara-kerja" className="btn-secondary text-base py-3.5 px-8">
              Lihat Cara Kerjanya
            </Link>
          </div>
          <p className="text-xs text-[#888888] mt-4">Preview gratis. Bayar hanya kalau suka. Rp 1.000.000 sekali bayar.</p>
        </div>
      </section>

      {/* Social proof numbers */}
      <section className="border-y border-[#E0E0E0] py-10 px-4">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-[#1D9E75]">6</p>
            <p className="text-sm text-[#555555] mt-1">Konten Siap Pakai</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1D9E75]">30</p>
            <p className="text-sm text-[#555555] mt-1">Ide Konten Sosmed</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#1D9E75]">2 mnt</p>
            <p className="text-sm text-[#555555] mt-1">Waktu Generate</p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">Satu Bayar, Dapat Semua</h2>
            <p className="text-[#555555]">Brand kit lengkap yang biasanya butuh 3 konsultan dan jutaan rupiah</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🎯', title: 'Strategi Brand (STP + SB7)', desc: 'Positioning, targeting, dan StoryBrand framework yang tepat untuk bisnis kamu' },
              { icon: '🎨', title: 'Visual Identity', desc: '5 color palette, typography, dan 3 konsep logo yang sesuai brand kamu' },
              { icon: '📅', title: '30 Hari Konten Sosmed', desc: 'Kalender konten lengkap untuk Instagram, TikTok, dan Facebook' },
              { icon: '💬', title: 'WA Scripts Siap Kirim', desc: 'Script sapaan, follow-up, closing objection, dan broadcast template' },
              { icon: '✅', title: 'Checklist 30 Hari', desc: 'To-do list peluncuran bisnis mingguan yang bisa langsung dijalankan' },
              { icon: '⚖️', title: 'Panduan Legal', desc: 'Rekomendasi struktur bisnis, perizinan NIB, dan kewajiban pajak' },
              { icon: '🌐', title: 'Landing Page AI', desc: 'Halaman web siap publish yang dibuat otomatis dari brand strategy kamu' },
            ].map((item, i) => (
              <div key={i} className="card hover:border-[#1D9E75] transition-all">
                <div className="text-3xl mb-3">{item.icon}</div>
                <h3 className="font-bold text-[#1A1A1A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#555555] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="cara-kerja" className="bg-[#F5F5F5] py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">Cara Kerjanya Simpel</h2>
            <p className="text-[#555555]">3 langkah, brand kit kamu siap</p>
          </div>
          <div className="space-y-5">
            {[
              { step: '1', title: 'Jawab 8 Pertanyaan', desc: 'Ceritakan bisnis kamu — nama, target customer, produk, dan tone yang diinginkan. Cuma 2 menit.' },
              { step: '2', title: 'AI Generate Brand Kit', desc: 'Claude AI (model terkuat Anthropic) menganalisis bisnis kamu dan membuat semua konten secara otomatis.' },
              { step: '3', title: 'Download & Gunakan', desc: 'Semua sudah siap pakai. Copy-paste script WA, posting konten, atau deploy landing page langsung.' },
            ].map((item) => (
              <div key={item.step} className="card flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-[#1D9E75] text-white flex items-center justify-center font-bold text-lg flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-bold text-[#1A1A1A] mb-1">{item.title}</h3>
                  <p className="text-sm text-[#555555]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 px-4">
        <div className="max-w-lg mx-auto text-center">
          <h2 className="text-3xl font-bold text-[#1A1A1A] mb-3">Harga Transparan</h2>
          <p className="text-[#555555] mb-10">Sekali bayar, milik selamanya. Tidak ada langganan.</p>
          <div className="card border-[#1D9E75] border-2">
            <div className="text-center mb-6">
              <p className="text-sm text-[#888888] mb-1">Brand Kit Lengkap</p>
              <p className="text-5xl font-bold text-[#1A1A1A]">Rp 1 juta</p>
              <p className="text-sm text-[#888888] mt-2">sekali bayar • semua fitur • bukan langganan</p>
            </div>
            <ul className="space-y-3 mb-8 text-left">
              {[
                'Strategi STP + StoryBrand SB7',
                'Visual identity (warna, font, logo)',
                '30 konten sosmed siap posting',
                '10+ WhatsApp scripts',
                'Checklist peluncuran 30 hari',
                'Panduan legal & perizinan',
                'Landing page AI siap publish',
                'Regenerasi konten 3x gratis per tab',
              ].map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[#1A1A1A]">
                  <span className="text-[#1D9E75] font-bold">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="btn-primary w-full block text-center py-3.5 text-base">
              Mulai Gratis — Lihat Preview Dulu
            </Link>
            <p className="text-xs text-[#888888] mt-3 text-center">Preview 100% gratis. Bayar hanya kalau kamu puas.</p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="bg-[#1D9E75] py-16 px-4 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Siap Bangun Brand yang Kuat?</h2>
          <p className="text-white/80 mb-8">Bergabung dengan ribuan UMKM Indonesia yang sudah punya brand kit profesional.</p>
          <Link href="/register" className="bg-white text-[#1D9E75] font-bold py-3.5 px-10 rounded-lg hover:bg-gray-50 transition-colors inline-block text-base">
            Buat Brand Kit Gratis →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#E0E0E0] py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <span className="font-bold text-[#1A1A1A]"><span className="text-[#1D9E75]">Launchfast</span>.id</span>
          <p className="text-xs text-[#888888]">© 2025 Launchfast.id · AI Brand Kit untuk UMKM Indonesia</p>
          <div className="flex gap-4 text-xs text-[#888888]">
            <Link href="/login" className="hover:text-[#1A1A1A]">Masuk</Link>
            <Link href="/register" className="hover:text-[#1A1A1A]">Daftar</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
