export type UserRole = 'client' | 'admin'
export interface Profile { id: string; full_name: string | null; role: UserRole; created_at: string }
export interface OnboardingAnswers {
  id: string; user_id: string; business_name: string; target_customer: string;
  product_service: string; business_model: string; competitors: string;
  tone_of_voice: string; price_range: string; thirty_day_goal: string; created_at: string;
}
export type OrderStatus = 'pending_payment' | 'paid' | 'generating' | 'completed' | 'failed'
export type UpsellType = 'custom_domain' | 'video_reels' | 'pt_registration'
export interface Order {
  id: string; user_id: string; onboarding_id: string; status: OrderStatus;
  base_amount: number; total_amount: number; midtrans_order_id: string | null;
  midtrans_payment_type: string | null; paid_at: string | null; created_at: string;
}
export interface RegenCounts { strategy: number; visual: number; content: number; whatsapp: number; checklist: number; legal: number }
export interface BrandKit {
  id: string; order_id: string; user_id: string; business_name: string;
  strategy_data: Record<string, unknown> | null; visual_data: Record<string, unknown> | null;
  content_data: Record<string, unknown> | null; whatsapp_data: Record<string, unknown> | null;
  checklist_data: Record<string, unknown> | null; legal_data: Record<string, unknown> | null;
  preview_data: Record<string, unknown> | null; landing_page_url: string | null;
  github_repo_url: string | null; is_preview_only: boolean; regen_counts: RegenCounts;
  created_at: string; updated_at: string;
}
export type FulfillmentStatus = 'not_started' | 'in_progress' | 'completed'
export interface PtFulfillment {
  id: string; order_id: string; status: FulfillmentStatus;
  pt_registration_number: string | null; nib_number: string | null;
  notes: string | null; admin_updated_at: string | null;
}