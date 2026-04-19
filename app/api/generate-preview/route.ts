import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const onboardingId = body.onboarding_id || body.id || null
    if (!onboardingId) return NextResponse.json({ error: 'onboarding_id required' }, { status: 400 })

    const adminClient = createAdminClient()
    const { data: onboarding } = await adminClient
      .from('onboarding_answers').select('*').eq('id', onboardingId).single()
    if (!onboarding) return NextResponse.json({ error: 'Onboarding not found' }, { status: 404 })

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const prompt = 'Buat preview brand kit untuk: ' + onboarding.business_name + ', customer: ' + onboarding.target_customer + ', produk: ' + onboarding.product_service + ', tone: ' + onboarding.tone_of_voice + '. Kembalikan HANYA JSON: {"golden_one_liner":"tagline","sb7_hero":{"headline":"judul","subheadline":"sub"},"colors":[{"hex":"#hex1","name":"nama1"},{"hex":"#hex2","name":"nama2"},{"hex":"#hex3","name":"nama3"}]}'

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: 'Kembalikan HANYA JSON valid tanpa markdown.',
      messages: [{ role: 'user', content: prompt }]
    })

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '{}'
    let previewData: Record<string, unknown>
    try {
      const clean = rawText.replace(/```json/g, '').replace(/```/g, '').trim()
      const match = clean.match(/\{[\s\S]*\}/)
      previewData = JSON.parse(match ? match[0] : clean)
    } catch {
      previewData = { golden_one_liner: onboarding.business_name, raw: rawText.slice(0, 100) }
    }

    const { data: existing } = await adminClient
      .from('brand_kits').select('id').eq('user_id', user.id).eq('is_preview_only', true).single()

    if (existing) {
      await adminClient.from('brand_kits')
        .update({ preview_data: previewData, business_name: onboarding.business_name, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    } else {
      await adminClient.from('brand_kits').insert({
        user_id: user.id,
        business_name: onboarding.business_name,
        preview_data: previewData,
        is_preview_only: true,
      })
    }

    return NextResponse.json({ ...previewData, business_name: onboarding.business_name })
  } catch (err) {
    console.error('generate-preview error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
