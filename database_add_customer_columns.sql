-- Přidat chybějící sloupce pro zákaznická data do tabulky objednavky
-- Tento skript přidá sloupce pokud neexistují

-- 1. Přidat sloupec zakaznik_jmeno (volitelný)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky' AND column_name = 'zakaznik_jmeno'
    ) THEN
        ALTER TABLE objednavky ADD COLUMN zakaznik_jmeno TEXT;
        RAISE NOTICE 'Sloupec zakaznik_jmeno byl přidán';
    ELSE
        RAISE NOTICE 'Sloupec zakaznik_jmeno již existuje';
    END IF;
END $$;

-- 2. Přidat sloupec zakaznik_telefon (volitelný)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky' AND column_name = 'zakaznik_telefon'
    ) THEN
        ALTER TABLE objednavky ADD COLUMN zakaznik_telefon TEXT;
        RAISE NOTICE 'Sloupec zakaznik_telefon byl přidán';
    ELSE
        RAISE NOTICE 'Sloupec zakaznik_telefon již existuje';
    END IF;
END $$;

-- 3. Přidat sloupec zakaznik_email (volitelný)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky' AND column_name = 'zakaznik_email'
    ) THEN
        ALTER TABLE objednavky ADD COLUMN zakaznik_email TEXT;
        RAISE NOTICE 'Sloupec zakaznik_email byl přidán';
    ELSE
        RAISE NOTICE 'Sloupec zakaznik_email již existuje';
    END IF;
END $$;

-- 4. Přidat sloupec zpusob_kontaktu (volitelný)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky' AND column_name = 'zpusob_kontaktu'
    ) THEN
        ALTER TABLE objednavky ADD COLUMN zpusob_kontaktu TEXT;
        RAISE NOTICE 'Sloupec zpusob_kontaktu byl přidán';
    ELSE
        RAISE NOTICE 'Sloupec zpusob_kontaktu již existuje';
    END IF;
END $$;

-- 5. Přidat sloupec poznamka (volitelný) - pokud neexistuje
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky' AND column_name = 'poznamka'
    ) THEN
        ALTER TABLE objednavky ADD COLUMN poznamka TEXT;
        RAISE NOTICE 'Sloupec poznamka byl přidán';
    ELSE
        RAISE NOTICE 'Sloupec poznamka již existuje';
    END IF;
END $$;

-- 6. Pokud některé sloupce existují ale mají NOT NULL constraint, změnit je na nullable
DO $$
BEGIN
    -- zakaznik_jmeno
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky'
        AND column_name = 'zakaznik_jmeno'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE objednavky ALTER COLUMN zakaznik_jmeno DROP NOT NULL;
        RAISE NOTICE 'Sloupec zakaznik_jmeno je nyní volitelný (nullable)';
    END IF;

    -- zakaznik_telefon
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky'
        AND column_name = 'zakaznik_telefon'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE objednavky ALTER COLUMN zakaznik_telefon DROP NOT NULL;
        RAISE NOTICE 'Sloupec zakaznik_telefon je nyní volitelný (nullable)';
    END IF;

    -- zakaznik_email
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky'
        AND column_name = 'zakaznik_email'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE objednavky ALTER COLUMN zakaznik_email DROP NOT NULL;
        RAISE NOTICE 'Sloupec zakaznik_email je nyní volitelný (nullable)';
    END IF;

    -- zpusob_kontaktu
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky'
        AND column_name = 'zpusob_kontaktu'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE objednavky ALTER COLUMN zpusob_kontaktu DROP NOT NULL;
        RAISE NOTICE 'Sloupec zpusob_kontaktu je nyní volitelný (nullable)';
    END IF;

    -- poznamka
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'objednavky'
        AND column_name = 'poznamka'
        AND is_nullable = 'NO'
    ) THEN
        ALTER TABLE objednavky ALTER COLUMN poznamka DROP NOT NULL;
        RAISE NOTICE 'Sloupec poznamka je nyní volitelný (nullable)';
    END IF;
END $$;

-- 5. Zobrazit finální strukturu sloupců pro ověření
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'objednavky'
ORDER BY ordinal_position;
