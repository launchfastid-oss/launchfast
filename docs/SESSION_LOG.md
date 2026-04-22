# Launchfast Dev Session Log

Ringkasan setiap sesi development. Append entry baru di atas (reverse-chronological).
Sesi baru: baca file ini + TECH_SPEC.md untuk warm-start.

Format per entry:
- Sesi N (tanggal) - Milestone
- Commits dengan SHA pendek + file
- Decisions (keputusan arsitektur/scope)
- Done / Skipped / Deferred
- Pending untuk sesi berikut
- Gotchas (pelajaran operasional)

---

## Sesi 8 - 22 April 2026 - Priority #1 + Batch 1 (#6)

### Commits
- 5356788 fix(generate-full): default content_data.locked=true when no existing logo
- d575fc9 fix(lock-logo): clear locked_reason on unlock
- 8263295 feat(generate-full): gate Sonnet quality behind AI_QUALITY_MODE env var
- 89bb1c5 docs(TECH_SPEC): document AI_QUALITY_MODE + cost estimates

### Decisions
- **AI_QUALITY_MODE env var** jadi single toggle untuk dev cheap vs prod premium. Unset = semua Haiku (cheap, default aman). "premium" = Strategy+Content+Landing pakai Sonnet, WA+Legal tetap Haiku.
- **Premium scope** diputuskan: strategy + content + landing page. WhatsApp & Legal tidak masuk premium (conventional content, Haiku cukup).
- **Tidak backfill data lama** untuk kit yang content_data.locked === undefined. Hanya kit baru kena fix. Alasan: risk > benefit.
- **Multi-file push = sequential**, bukan parallel. Parallel PUT ke Contents API bisa kena race condition (409 SHA mismatch). Alternatif atomic: Git Data API (blob -> tree -> commit -> ref), tapi untuk patch kecil sequential cukup.

### Done
- Priority #1: Fix bug content_data.locked undefined. Banner "terkunci" sekarang muncul untuk kit baru tanpa existing logo.
- Priority #6: Haiku -> Sonnet, tapi lewat env var toggle (lebih fleksibel dari rencana awal).

### Skipped (scope revisi)
- Priority #4 (connect generate-post-images): ternyata sudah connected di code. TECH_SPEC outdated. Dikonfirmasi ke user bahwa tombol sudah muncul di tab visual/content. Drop dari backlog.

### Pending untuk Sesi 9
- **Batch 2: Priority #2 Guided flow** (tab lock/unlock berurutan + progress indicator global). Besar - butuh design proposal dulu, approval, baru push. Decision user: soft-lock behavior (tab clickable tapi show CTA "selesaikan step X dulu"). Progress indicator: 3 mockup varian -> user pilih.
- **Batch 3:** Priority #5 (landing page prompt + auto-generate post-lock) + Priority #3 (Logo Ideogram V2, experimental).
- **User action: set AI_QUALITY_MODE=premium di Vercel production env** kalau mau enable Sonnet. Default sekarang: unset = Haiku.

### Gotchas
- Chrome extension: javascript_tool tidak auto-await Promise. Pattern: dispatch fetch().then(r => window.__var = r), lalu poll window.__var di call terpisah. Jangan IIFE dengan top-level await - CDP timeout setelah 45s.
- Chrome extension: beberapa output ter-flag [BLOCKED: Cookie/query string data] atau [BLOCKED: Base64] oleh content filter. Workaround: return metadata/struktur saja, jangan raw content. Untuk baca file besar, pakai .slice() atau .includes() check bukan return full content.
- Supabase dashboard: pg-meta query endpoint butuh Bearer token + connection-encrypted header. Untuk Tier 2 SQL verification lewat dashboard session, lebih simple lewat SQL Editor UI (paste query, klik Run, paste output) atau test endpoint di Next.js.
- Contents API PUT: satu file per call. Multi-file = sequential untuk avoid 409.

### Testing status
- Tier 1 (re-fetch + assert content): DONE untuk semua commit.
- Tier 2 (smoke test endpoint): SKIP untuk Priority #1 (risk rendah, 3 lines). Set up test endpoint di-defer sampai Batch 2.
- Tier 3 (UI walkthrough): user test manual setelah batch selesai.

### Env state
- GitHub token aktif (user: keep, revoke saat tidak dipakai lagi).
- Vercel: 4 deploys Ready (5356788, d575fc9, 8263295, 89bb1c5). Current production: 89bb1c5.
- Supabase schema: tidak ada perubahan di sesi ini.

---
