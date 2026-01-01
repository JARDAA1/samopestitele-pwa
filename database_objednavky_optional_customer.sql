-- Upravit tabulku objednavky - zákaznická data jsou volitelná
-- Tento skript upraví sloupce tak, aby umožňovaly NULL hodnoty

-- 1. Změnit sloupec zakaznik_jmeno na volitelný (pokud existuje)
ALTER TABLE objednavky
ALTER COLUMN zakaznik_jmeno DROP NOT NULL;

-- 2. Změnit sloupec zakaznik_telefon na volitelný (pokud existuje)
ALTER TABLE objednavky
ALTER COLUMN zakaznik_telefon DROP NOT NULL;

-- 3. Pokud sloupec zakaznik_jmeno neexistuje, vytvořit ho jako volitelný
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky' AND column_name = 'zakaznik_jmeno'
    ) THEN
        ALTER TABLE objednavky ADD COLUMN zakaznik_jmeno TEXT;
    END IF;
END $$;

-- 4. Pokud sloupec zakaznik_telefon neexistuje, vytvořit ho jako volitelný
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky' AND column_name = 'zakaznik_telefon'
    ) THEN
        ALTER TABLE objednavky ADD COLUMN zakaznik_telefon TEXT;
    END IF;
END $$;

-- 5. Pokud sloupec zakaznik_email neexistuje, vytvořit ho jako volitelný
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky' AND column_name = 'zakaznik_email'
    ) THEN
        ALTER TABLE objednavky ADD COLUMN zakaznik_email TEXT;
    END IF;
END $$;

-- 6. Ověření - zobrazit strukturu tabulky objednavky
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'objednavky'
ORDER BY ordinal_position;
