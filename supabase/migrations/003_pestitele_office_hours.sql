-- Přidání sloupců pro otevírací dobu farmáře do tabulky pestitele

ALTER TABLE public.pestitele
ADD COLUMN IF NOT EXISTS casova_dostupnost TEXT,
ADD COLUMN IF NOT EXISTS office_hours JSONB;

COMMENT ON COLUMN public.pestitele.casova_dostupnost IS 'Textový popis časové dostupnosti farmáře (např. Po-Pá 8-18h)';
COMMENT ON COLUMN public.pestitele.office_hours IS 'Strukturovaná otevírací doba ve formátu JSON: {"po": {"otevreno": true, "od": "08:00", "do": "17:00"}, ...}';
