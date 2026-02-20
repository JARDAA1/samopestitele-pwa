-- ============================================================
-- MIGRACE 002: Přidat otevírací dobu k prodejním místům
-- ============================================================
-- Spustit v Supabase SQL editoru: https://app.supabase.com → SQL Editor

ALTER TABLE public.prodejni_mista
ADD COLUMN IF NOT EXISTS cas_od TEXT,   -- formát HH:MM, např. '09:00'
ADD COLUMN IF NOT EXISTS cas_do TEXT;   -- formát HH:MM, např. '17:00'

COMMENT ON COLUMN public.prodejni_mista.cas_od IS 'Začátek otevírací doby, formát HH:MM (např. 09:00)';
COMMENT ON COLUMN public.prodejni_mista.cas_do IS 'Konec otevírací doby, formát HH:MM (např. 17:00)';
