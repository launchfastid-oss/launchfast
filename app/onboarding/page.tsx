'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { saveOnboardingAnswer } from '@/lib/actions/onboarding'
import { createClient } from '@/lib/supabase/client'

const QUESTIONS = [
  { step: 1, key: 'business_name', question: 'Nama bisnis & industri kamu apa?', hint: 'Contoh: Warung Makan Sederhana, industri kuliner', type: 'textarea' },
  { step: 2, key: 'target_customer', question: 'Siapa target customer kamu?', hint: 'Contoh: Ibu rumah tangga usia 25-40 tahun di Bandung', type: 'textarea' },
  { step: 3, key: 'product_service', question: 'Produk/jasa kamu dan keunggulannya?', hint: 'Contoh: Nasi padang dengan resep asli Minang, harga terjangkau', type: 'textarea' },
  { step: 4, key: 'business_model', question: 'Model bisnis kamu?', type: 'choice', options: ['Online Only', 'Offline (Toko Fisik)', 'Hybrid (Online + Offline)'] },
  { step: 5, key: 'competitors', question: 'Kompetitor utama kamu?', hint: 'Contoh: Warung Padang Sederhana, RM Pagi Sore', type: 'textarea' },
  { step: 6, key: 'tone_of_voice', question: 'Tone of voice brand yang kamu inginkan?', type: 'choice', options: ['Profesional & Terpercaya', 'Hangat & Personal', 'Fun & Energik', 'Premium & Eksklusif', 'Santai & Friendly'] },
  { step: 7, key: 'price_range', question: 'Kisaran harga produk/jasa kamu?', hint: 'Contoh: Rp 15.000 - Rp 50.000 per porsi', type: 'textarea' },
  { step: 8, key: 'thirty_day_goal', question: 'Goal utama kamu dalam 30 hari pertama?', hint: 'Contoh: Dapat 50 pelanggan baru dan buka cabang ke-2', type: 'textarea' },
  { step: 9, key: 'product_image_url', question: 'Upload foto produk kamu (opsional)', hint: 'Foto produk akan dipakai sebagai visual di konten sosial media kamu. Format: JPG/PNG, maks 5MB.', type: 'upload' },
] as const

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [onboardingId, setOnboardingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const q = QUESTIONS[currentStep]
  const progress = ((currentStep + 1) / QUESTIONS.length) * 100
  const isUploadStep = q.type === 'upload'

  async function handleFileSelect(file: File) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file maksimal 5MB')
      return
    }
    setError(null)
    setUploadProgress('Mengupload foto...')

    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'jpg'
      const filename = 'product-' + Date.now() + '.' + ext
      const path = (onboardingId || 'temp') + '/' + filename

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(path, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(path)

      const publicUrl = urlData.publicUrl
      setAnswers(prev => ({ ...prev, [q.key]: publicUrl }))
      setUploadPreview(URL.createObjectURL(file))
      setUploadProgress('Foto berhasil diupload!')
    } catch (err) {
      setError('Gagal upload foto: ' + String(err))
      setUploadProgress('')
    }
  }

  async function handleNext() {
    // Upload step boleh dilewati (opsional)
    if (isUploadStep && !answers[q.key]) {
      // Skip — lanjut ke preview
      if (onboardingId) router.push('/preview?onboarding=' + onboardingId)
      return
    }

    const value = answers[q.key]
    if (!isUploadStep && !value?.trim()) return

    setLoading(true); setError(null)

    if (isUploadStep && value) {
      // Simpan URL foto ke onboarding
      if (onboardingId) {
        const supabase = createClient()
        await supabase.from('onboarding_answers')
          .update({ product_image_url: value })
          .eq('id', onboardingId)
        router.push('/preview?onboarding=' + onboardingId)
        return
      }
    }

    const result = await saveOnboardingAnswer(q.step, q.key, value, onboardingId || undefined)
    if ('error' in result) { setError(result.error ?? 'Terjadi kesalahan'); setLoading(false); return }
    if (!onboardingId) setOnboardingId(result.id)

    if (currentStep < QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push('/preview?onboarding=' + result.id)
    }
    setLoading(false)
  }

  return (
    <div className='min-h-screen bg-[#F5F5F5] flex flex-col'>
      <div className='bg-white border-b border-[#E0E0E0] px-4 py-4'>
        <div className='max-w-xl mx-auto'>
          <div className='flex justify-between items-center mb-3'>
            <span className='text-sm font-medium text-[#1D9E75]'>Launchfast.id</span>
            <span className='text-sm text-[#888888]'>Langkah {currentStep + 1} dari {QUESTIONS.length}</span>
          </div>
          <div className='w-full bg-[#E0E0E0] rounded-full h-2'>
            <div className='bg-[#1D9E75] h-2 rounded-full transition-all duration-500' style={{ width: progress + '%' }} />
          </div>
        </div>
      </div>

      <div className='flex-1 flex items-center justify-center px-4 py-8'>
        <div className='w-full max-w-xl'>
          <div className='card'>
            <div className='mb-2'>
              <span className='text-xs font-semibold text-[#1D9E75] uppercase tracking-wide'>
                Pertanyaan {currentStep + 1}
                {isUploadStep && <span className='text-[#888888] ml-2 normal-case font-normal'>(opsional)</span>}
              </span>
            </div>
            <h2 className='text-xl font-bold text-[#1A1A1A] mb-2'>{q.question}</h2>
            {'hint' in q && q.hint && <p className='text-sm text-[#888888] mb-5'>{q.hint}</p>}
            {error && <div className='error-box mb-4'>{error}</div>}

            {/* Upload foto */}
            {isUploadStep && (
              <div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}
                />
                {uploadPreview ? (
                  <div>
                    <div style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', marginBottom: '12px' }}>
                      <img src={uploadPreview} alt='Preview' style={{ width: '100%', maxHeight: '240px', objectFit: 'cover', display: 'block' }} />
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.02)' }} />
                    </div>
                    {uploadProgress && <p style={{ fontSize: '13px', color: '#1D9E75', fontWeight: 600, marginBottom: '12px' }}>{uploadProgress}</p>}
                    <button
                      onClick={() => { setUploadPreview(null); setAnswers(prev => ({ ...prev, [q.key]: '' })); setUploadProgress('') }}
                      style={{ fontSize: '13px', color: '#888', background: 'none', border: '1px solid #DDD', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', marginBottom: '8px' }}
                    >
                      Ganti foto
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #1D9E75', borderRadius: '12px', padding: '32px',
                      textAlign: 'center', cursor: 'pointer', background: '#F9FFFE',
                      marginBottom: '12px',
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>&#128247;</div>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1D9E75', margin: '0 0 4px' }}>Klik untuk upload foto produk</p>
                    <p style={{ fontSize: '12px', color: '#888', margin: 0 }}>JPG, PNG &bull; Maks 5MB</p>
                    {uploadProgress && <p style={{ fontSize: '13px', color: '#555', marginTop: '8px' }}>{uploadProgress}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Textarea */}
            {q.type === 'textarea' && (
              <textarea
                value={answers[q.key] || ''}
                onChange={e => setAnswers({ ...answers, [q.key]: e.target.value })}
                placeholder='Tulis jawaban kamu di sini...'
                rows={4}
                className='input-field resize-none'
              />
            )}

            {/* Choice */}
            {q.type === 'choice' && (
              <div className='space-y-2'>
                {'options' in q && q.options.map((option: string) => (
                  <button key={option} type='button'
                    onClick={() => setAnswers({ ...answers, [q.key]: option })}
                    className={'w-full text-left px-4 py-3 rounded-lg border text-sm font-medium transition-all ' + (answers[q.key] === option ? 'border-[#1D9E75] bg-[#E8F7F2] text-[#1D9E75]' : 'border-[#E0E0E0] text-[#1A1A1A] hover:border-[#1D9E75]')}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            <div className='flex gap-3 mt-6'>
              {currentStep > 0 && (
                <button type='button' onClick={() => setCurrentStep(currentStep - 1)} className='btn-secondary flex-1'>
                  Kembali
                </button>
              )}
              <button
                type='button'
                onClick={handleNext}
                disabled={loading || (!isUploadStep && !answers[q.key]?.trim())}
                className='btn-primary flex-1'
              >
                {loading ? 'Menyimpan...' :
                  isUploadStep ? (uploadPreview ? 'Selesai & Lihat Preview' : 'Lewati, langsung ke preview') :
                  currentStep === QUESTIONS.length - 1 ? 'Lihat preview brand kit' : 'Lanjut'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}