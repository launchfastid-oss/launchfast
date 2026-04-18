'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveOnboardingAnswer } from '@/lib/actions/onboarding'

const QUESTIONS = [
  { step: 1, key: 'business_name', question: 'Nama bisnis & industri kamu apa?', hint: 'Contoh: Warung Makan Sederhana, industri kuliner', type: 'textarea' },
  { step: 2, key: 'target_customer', question: 'Siapa target customer kamu?', hint: 'Contoh: Ibu rumah tangga usia 25-40 tahun di Bandung', type: 'textarea' },
  { step: 3, key: 'product_service', question: 'Produk/jasa kamu dan keunggulannya?', hint: 'Contoh: Nasi padang dengan resep asli Minang, harga terjangkau', type: 'textarea' },
  { step: 4, key: 'business_model', question: 'Model bisnis kamu?', type: 'choice', options: ['Online Only','Offline (Toko Fisik)','Hybrid (Online + Offline)'] },
  { step: 5, key: 'competitors', question: 'Kompetitor utama kamu?', hint: 'Contoh: Warung Padang Sederhana, RM Pagi Sore', type: 'textarea' },
  { step: 6, key: 'tone_of_voice', question: 'Tone of voice brand yang kamu inginkan?', type: 'choice', options: ['Profesional & Terpercaya','Hangat & Personal','Fun & Energik','Premium & Eksklusif','Santai & Friendly'] },
  { step: 7, key: 'price_range', question: 'Kisaran harga produk/jasa kamu?', hint: 'Contoh: Rp 15.000 - Rp 50.000 per porsi', type: 'textarea' },
  { step: 8, key: 'thirty_day_goal', question: 'Goal utama kamu dalam 30 hari pertama?', hint: 'Contoh: Dapat 50 pelanggan baru dan buka cabang ke-2', type: 'textarea' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [onboardingId, setOnboardingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const q = QUESTIONS[currentStep]
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100

  async function handleNext() {
    const value = answers[q.key]
    if (!value?.trim()) return
    setLoading(true); setError(null)
    const result = await saveOnboardingAnswer(q.step, q.key, value, onboardingId || undefined)
    if ('error' in result) { setError(result.error); setLoading(false); return }
    if (!onboardingId) setOnboardingId(result.id)
    if (currentStep < QUESTIONS.length - 1) { setCurrentStep(currentStep + 1) }
    else { router.push(`/preview?onboarding=${result.id}`) }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col">
      <div className="bg-white border-b border-[#E0E0E0] px-4 py-4">
        <div className="max-w-xl mx-auto">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-[#1D9E75]">Launchfast.id</span>
            <span className="text-sm text-[#888888]">Langkah {currentStep + 1} dari {QUESTIONS.length}</span>
          </div>
          <div className="w-full bg-[#E0E0E0] rounded-full h-2">
            <div className="bg-[#1D9E75] h-2 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}/>
          </div>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-xl">
          <div className="card">
            <div className="mb-2"><span className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide">Pertanyaan {currentStep + 1}</span></div>
            <h2 className="text-xl font-bold text-[#1A1A1A] mb-2">{q.question}</h2>
            {q.hint && <p className="text-sm text-[#888888] mb-5">{q.hint}</p>}
            {error && <div className="error-box mb-4">{error}</div>}
            {q.type === 'textarea' ? (
              <textarea value={answers[q.key] || ''} onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })}
                placeholder="Tulis jawaban kamu di sini..." rows={4} className="input-field resize-none"/>
            ) : (
              <div className="space-y-2">
                {q.options?.map(option => (
                  <button key={option} onClick={() => setAnswers({ ...answers, [q.key]: option })}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ${answers[q.key] === option ? 'border-[#1D9E75] bg-[#E8F7F2] text-[#1D9E75]' : 'border-[#E0E0E0] text-[#1A1A1A] hover:border-[#1D9E75]'}`}>
                    {option}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 mt-6">
              {currentStep > 0 && <button onClick={() => setCurrentStep(currentStep - 1)} className="btn-secondary flex-1">Kembali</button>}
              <button onClick={handleNext} disabled={loading || !answers[q.key]?.trim()} className="btn-primary flex-1">
                {loading ? 'Menyimpan...' : currentStep === QUESTIONS.length - 1 ? 'Lihat preview brand kit' : 'Lanjut'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}