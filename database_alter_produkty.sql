-- Přidání sloupce kategorie do tabulky produkty
ALTER TABLE produkty
ADD COLUMN IF NOT EXISTS kategorie TEXT NOT NULL DEFAULT 'Ostatní';

-- Volitelně: Přidat emoji sloupec (pokud ho chceš používat)
-- ALTER TABLE produkty
-- ADD COLUMN IF NOT EXISTS emoji TEXT;
