# SKILL: Launchfast Supabase Schema

## WHEN TO USE
Read this skill BEFORE:
- Adding any new column to any table
- Writing a query that references a specific column
- Troubleshooting "column not found in schema cache" errors
- Designing a new feature that needs DB changes

**RULE:** Setiap kali ada kolom baru di code, WAJIB jalankan ALTER TABLE dulu di Supabase SQL Editor sebelum push code. Tanpa ini akan dapat error: `Could not find the 'xxx' column of 'yyy' in the schema cache`