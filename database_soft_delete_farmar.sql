-- SOFT DELETE PRO FARMÁŘE
-- Tento skript přidá možnost "měkkého" mazání farmářů
-- Spusťte postupně po částech!

-- ČÁST 1: Přidat sloupce (pokud neexistují)
DO $$
BEGIN
    -- Přidat sloupec smazano
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pestitele' AND column_name = 'smazano'
    ) THEN
        ALTER TABLE pestitele ADD COLUMN smazano BOOLEAN DEFAULT false;
    END IF;

    -- Přidat sloupec smazano_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'pestitele' AND column_name = 'smazano_at'
    ) THEN
        ALTER TABLE pestitele ADD COLUMN smazano_at TIMESTAMPTZ;
    END IF;
END $$;

-- ČÁST 2: Vytvořit index
CREATE INDEX IF NOT EXISTS idx_pestitele_smazano ON pestitele(smazano) WHERE smazano = false;

-- ČÁST 3: Funkce pro anonymizaci farmáře
CREATE OR REPLACE FUNCTION anonymizovat_farmare(p_pestitel_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE pestitele
    SET
        telefon = '+420999999999',
        email = 'vymazano@vymazano.cz',
        adresa = NULL,
        mesto = NULL,
        psc = NULL,
        gps_lat = NULL,
        gps_lng = NULL,
        popis = NULL,
        foto_url = NULL,
        smazano = true,
        smazano_at = NOW()
    WHERE id = p_pestitel_id;

    -- Vrátit true pokud byl farmář anonymizován
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ČÁST 4: Funkce pro deaktivaci produktů
CREATE OR REPLACE FUNCTION deaktivovat_produkty_smazaneho_farmare()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.smazano = true AND (OLD.smazano IS NULL OR OLD.smazano = false) THEN
        -- Deaktivovat všechny produkty farmáře
        UPDATE produkty
        SET dostupnost = false
        WHERE pestitel_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ČÁST 5: Trigger
DROP TRIGGER IF EXISTS trigger_deaktivovat_produkty ON pestitele;
CREATE TRIGGER trigger_deaktivovat_produkty
    AFTER UPDATE ON pestitele
    FOR EACH ROW
    EXECUTE FUNCTION deaktivovat_produkty_smazaneho_farmare();

-- HOTOVO!
-- Pro smazání farmáře použijte: SELECT anonymizovat_farmare(ID_FARMARE);
