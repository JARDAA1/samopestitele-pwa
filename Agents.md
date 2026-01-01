# Codex instructions

This repository is the project root.

Frontend:
- Expo Router / PWA
- Main app lives in `app/`

Database:
- Backend is Supabase PostgreSQL
- Database name: postgres
- Access is READ-ONLY via DATABASE_URL (env var)

Rules:
- Before reasoning about data or writing SQL, ALWAYS run:
  psql "$DATABASE_URL" -f db/introspect.sql --csv
- Use only tables and columns that exist
- Do NOT invent schema objects
- Assume Row Level Security (RLS) may be enabled
