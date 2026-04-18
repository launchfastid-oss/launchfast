'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveOnboardingAnswer(step: number, key: string, value: string, onboardingId?: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (step === 1 || !onboardingId) {
    const { data, error } = await supabase.from('onboarding_answers').insert({ user_id: user.id, [key]: value }).select('id').single()
    if (error) return { error: error.message }
    return { id: data.id }
  } else {
    const { error } = await supabase.from('onboarding_answers').update({ [key]: value }).eq('id', onboardingId).eq('user_id', user.id)
    if (error) return { error: error.message }
    return { id: onboardingId }
  }
}

export async function submitOnboarding(onboardingId: string) {
  redirect(`/preview?onboarding=${onboardingId}`)
}