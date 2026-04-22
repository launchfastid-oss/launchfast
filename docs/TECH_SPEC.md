# Launchfast.id - Tech Spec

## PRODUCT
AI Brand Kit Generator untuk UMKM Indonesia. Pay-per-kit Rp 1.000.000.
Stack: Next.js 14 + Supabase + Vercel + Claude + fal.ai + Recraft V3
Live: launchfast-git-main-launchfastid-oss-projects.vercel.app
GitHub: launchfastid-oss/launchfast (public)
Supabase: fglpqokvsuiqukyrikih.supabase.co

## PROGRESS: ~45% (April 22, 2026)

### DONE
- Auth, Onboarding 11 langkah, Payment bypass (test)
- Generating page (no duplicate, sessionStorage guard)
- Tab routing URL param (?tab=)
- Strategi tab (SB7, encoding clean, regenerate)
- Checklist tab, WA Scripts tab, Legal tab

### BUGGY
- Visual/Logo: 3 logo tampil, Pilih button ada, lock state tidak smooth
- Konten: content_data.locked sering undefined -> banner tidak muncul
- Landing page: route ada, output pendek

### DISCONNECTED (ada di codebase, tidak di UI)
- generate-post-images route -> tidak ada tombol di tab-content
- generate-post-video route -> tidak ada tombol di tab-content

### MISSING
- Guided step-by-step flow (tab lock/unlock berurutan)
- Progress bar global di dashboard
- Generating page checklist live
- Midtrans payment live

## PRIORITY NEXT SESSION
1. Fix generate-full: content_data locked:true + 30 posts dengan caption
2. Implement guided flow: tab lock/unlock berurutan + progress indicator global
3. Upgrade logo: test Ideogram V2 via fal.ai
4. Connect generate-post-images ke UI (tombol per post)
5. Fix landing page: prompt detail + auto-generate setelah logo lock
6. Upgrade konten model ke Claude Sonnet

## USER FLOW (GUIDED - target UMKM kurang tech-savvy)
TAB 1 STRATEGI -> CTA "Lanjut ke Visual"
TAB 2 VISUAL: Generate logo (3 opsi) -> Pilih -> Lock -> CTA "Lanjut ke Konten"
TAB 3 KONTEN (unlock setelah logo dipilih): 30 posts + Generate Gambar per post (WAJIB)
TAB 4 WA SCRIPTS -> TAB 5 CHECKLIST -> TAB 6 LEGAL -> TAB 7 LANDING PAGE

## CONTENT LOCK FLOW (CRITICAL)
generate-full -> content_data = { locked: true, locked_reason: "...", content_pillars: [...], posts: [...30 posts dengan caption] }
lock-logo API -> SET content_data.locked = false -> refreshKit() callback
PROBLEM: Jika content_data = {} maka locked banner tidak muncul (data.locked === undefined)

## API ROUTES
/api/generate-full    - Generate semua konten (Claude Haiku)
/api/generate-logos   - 3 logo via fal.ai Recraft V3
/api/generate-post-images - Per-post image (DISCONNECTED dari UI)
/api/generate-post-video  - Per-post video LTX (DISCONNECTED dari UI)
/api/generate-landing - Landing page HTML (Claude Sonnet)
/api/lock-logo        - Lock logo + unlock content
/api/regenerate       - Regen satu tab (max 3x)

## AI MODELS
Strategy/WA/Checklist/Legal: claude-haiku-4-5-20251001
Content 30 hari: claude-haiku-4-5-20251001 (PERLU upgrade ke Sonnet)
Landing page: claude-sonnet-4-5-20250929
Logo: fal.ai Recraft V3 vector_illustration (PERLU upgrade ke Ideogram V2)

## KEY FILES
app/api/generate-full/route.ts
app/api/generate-logos/route.ts
app/api/generate-post-images/route.ts (disconnected)
app/api/generate-post-video/route.ts (disconnected)
app/api/lock-logo/route.ts
app/brand-kit/[id]/client.tsx      - tab router, URL param ?tab=
app/brand-kit/[id]/tab-strategy.tsx - Strategi + VisualTab
app/brand-kit/[id]/tab-content.tsx  - Konten + locked state
app/brand-kit/[id]/tab-landing.tsx
app/generating/page.tsx
app/onboarding/page.tsx             - 11 langkah

## DATA MODELS
content_data: { locked: bool, locked_reason: str, content_pillars: [...], posting_schedule: {...}, posts: [{day, pillar, platform, type, caption, hashtags, image_url, video_url}] }
visual_data: { colors, typography, logo_concepts, logo_urls, logo_svgs, locked_logo_index, locked_logo_url, logo_locked_at }
strategy_data: { golden_one_liner, brand_narrative, unique_value_proposition, sb7: {...}, stp: {...} }

## TEST BRAND KITS
Anomali Coffee:      b4be6c81-1dc9-43d6-8d0f-7fed23490dd9
Madu TJ Murni:       837174c1-9608-44fc-b6bc-ff412fb1545c
Warung Makan Sederhana: 130fb83e-2424-4a09-b5ce-1463ba2f8793

## DB SCHEMA (lihat docs/DB_SCHEMA.md)
brand_kits: id, order_id, user_id, business_name, strategy_data, visual_data, content_data, whatsapp_data, checklist_data, legal_data, landing_page_html, regen_counts
onboarding_answers: id, user_id, business_name, target_customer, product_service, business_model, competitor, price_range, goal_30_days, tone_of_voice, product_image_url, has_existing_logo, existing_logo_url

## SUPABASE MIGRATIONS (sudah dijalankan)
ALTER TABLE brand_kits ADD COLUMN IF NOT EXISTS landing_page_html TEXT;
ALTER TABLE onboarding_answers ADD COLUMN IF NOT EXISTS has_existing_logo TEXT, ADD COLUMN IF NOT EXISTS existing_logo_url TEXT;

## DEV RULES
- Encoding: pakai -- bukan em-dash, -> bukan arrow unicode
- TypeScript: semua data dari DB bertipe unknown, selalu cast dulu
- React hooks: useState SEBELUM kondisi/return apapun
- Suspense: useSearchParams harus di-wrap Suspense di parent
- SELALU run SQL migration di Supabase sebelum push kolom baru

## QUALITY STANDARDS
Logo: Professional, sesuai bisnis, test Ideogram V2 (support teks dalam logo)
Konten caption: Claude Sonnet minimum, spesifik untuk bisnis
Konten image: WAJIB per post, pakai foto produk user + brand colors
Landing page: Full HTML - hero, problem/solution, 3 fitur, FAQ, CTA WA
Cost: ~$0.50-2.00 per brand kit OK

## UX PRINCIPLES (UMKM market - kurang tech-savvy)
1. Guided bukan free-roam - user tidak boleh bingung
2. Progress visibility - selalu tunjukkan step X dari Y
3. Clear next action - satu CTA jelas per halaman
4. Lock & unlock visible - tab locked harus terlihat jelas
5. Feedback setelah aksi - konfirmasi setelah setiap action
6. Error teknis jangan expose ke user
7. Generate per tab - bukan all-at-once
8. Generating page: checklist live bukan hanya spinner

## HOW TO START NEW SESSION
Read this file first via: fetch from GitHub raw
Then confirm understanding before coding.
Credentials are NOT stored here - ask user if needed.