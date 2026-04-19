import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    let onboardingId: string | null = null
    const contentType = request.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      const body = await request.json()
      onboardingId = body.onboarding_id
    } else {
      const formData = await request.formData()
      onboardingId = formData.get('onboarding_id') as string
    }
    if (!onboardingId) return NextResponse.json({ error: 'onboarding_id required' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: onboarding } = await adminClient
      .from('onboarding_answers').select('*').eq('id', onboardingId).eq('user_id', user.id).single()
    if (!onboarding) return NextResponse.json({ error: 'Onboarding not found' }, { status: 404 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = `Kamu adalah brand strategist expert untuk UMKM Indonesia.

Data bisnis:
- Nama bisnis: ${onboarding.business_name}
- Target customer: ${onboarding.target_customer}
- Produk/jasa: ${onboarding.product_service}
- Model bisnis: ${onboarding.business_model}
- Kompetitor: ${onboarding.competitors}
- Tone of voice: ${onboarding.tone_of_voice}
- Kisaran harga: ${onboarding.price_range}
- Goal 30 hari: ${onboarding.thirty_day_goal}

Buat preview brand kit. Semua teks Bahasa Indonesia.
Kembalikan HANYA JSON valid ini (tanpa markdown, tanpa backtick):
{
  "golden_one_liner": "satu kalimat positioning yang kuat",
  "sb7_hero": { "headline": "headline yang menyentuh pain point", "subheadline": "penjelasan singkat solusi" },
  "sb7_guide": { "empathy": "kalimat empati terhadap customer", "authority": "bukti kredibilitas bisnis" },
  "colors": [
    {"hex": "#XXXXXX", "name": "Primary", "rationale": "alasan pemilihan"},
    {"hex": "#XXXXXX", "name": "Secondary", "rationale": "alasan"},
    {"hex": "#XXXXXX", "name": "Accent", "rationale": "alasan"}
  ]
}`

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500,
      system: 'Kembalikan HANYA JSON valid tanpa markdown atau backtick.',
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    let previewData: Record<string, unknown>
    try {
      const clean = rawText.replace(/```json|```/g, '').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      previewData = JSON.parse(match ? match[0] : clean)
    } catch {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const { data: existing } = await adminClient
      .from('brand_kits').select('id').eq('user_id', user.id).eq('is_preview_only', true).single()

    if (existing) {
      await adminClient.from('brand_kits')
        .update({ preview_data: previewData, updated_at: new Date().toISOString() }).eq('id', existing.id)
    } else {
      await adminClient.from('brand_kits').insert({
        user_id: user.id,
        business_name: onboarding.business_name,
        is_preview_only: true,
        preview_data: previewData,
        regen_counts: { strategy: 0, visual: 0, content: 0, whatsapp: 0, checklist: 0, legal: 0 }
      })
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
    return NextResponse.redirect(new URL(`/preview?onboarding=${onboardingId}`, siteUrl))
  } catch (err) {
    console.error('generate-preview error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
