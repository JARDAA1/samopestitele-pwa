-- Přidat sloupce pro anonymní identifikátor zákazníka
-- Spustit v Supabase SQL editoru

-- 1. Přidat sloupec anon_customer_id (UUID)
ALTER TABLE objednavky
ADD COLUMN IF NOT EXISTS anon_customer_id TEXT;

-- 2. Přidat sloupec anon_customer_code (krátký 4-znakový kód)
ALTER TABLE objednavky
ADD COLUMN IF NOT EXISTS anon_customer_code TEXT;

-- 3. Ověření - zobrazit strukturu tabulky objednavky
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'objednavky'
ORDER BY ordinal_position;
