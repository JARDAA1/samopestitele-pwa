-- Přidání sloupce farm_number do tabulky pestitele
-- Tento sloupec slouží jako unikátní identifikátor farmy pro autentizaci
-- Formát: F001, F002, F003, ... F999, F1000, ...

-- 1. Přidat sloupec farm_number (pokud neexistuje)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pestitele' AND column_name = 'farm_number'
  ) THEN
    ALTER TABLE pestitele ADD COLUMN farm_number VARCHAR(10) UNIQUE;
  END IF;
END $$;

-- 2. Vytvořit index pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_pestitele_farm_number ON pestitele(farm_number);

-- 3. Přidat komentář k sloupci
COMMENT ON COLUMN pestitele.farm_number IS 'Unikátní číslo farmy (např. F001, F002) používané jako identifikátor při přihlášení PINem';

-- 4. Vygenerovat farm_number pro existující záznamy (pokud ještě nemají)
-- Tento krok přiřadí čísla farmy všem stávajícím farmářům
DO $$
DECLARE
  rec RECORD;
  counter INTEGER := 1;
  new_farm_number VARCHAR(10);
BEGIN
  FOR rec IN
    SELECT id FROM pestitele
    WHERE farm_number IS NULL
    ORDER BY id ASC
  LOOP
    new_farm_number := 'F' || LPAD(counter::TEXT, 3, '0');

    UPDATE pestitele
    SET farm_number = new_farm_number
    WHERE id = rec.id;

    counter := counter + 1;
  END LOOP;
END $$;

-- 5. Vytvořit funkci pro automatické generování farm_number při vložení nového záznamu
CREATE OR REPLACE FUNCTION generate_farm_number()
RETURNS TRIGGER AS $$
DECLARE
  max_number INTEGER;
  new_farm_number VARCHAR(10);
BEGIN
  -- Pokud farm_number ještě není nastaveno
  IF NEW.farm_number IS NULL THEN
    -- Najít nejvyšší číslo farmy
    SELECT COALESCE(
      MAX(
        CASE
          WHEN farm_number ~ '^F[0-9]+$' THEN
            SUBSTRING(farm_number FROM 2)::INTEGER
          ELSE 0
        END
      ),
      0
    ) INTO max_number
    FROM pestitele
    WHERE farm_number IS NOT NULL;

    -- Vygenerovat nové číslo farmy
    new_farm_number := 'F' || LPAD((max_number + 1)::TEXT, 3, '0');
    NEW.farm_number := new_farm_number;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Vytvořit trigger pro automatické generování farm_number
DROP TRIGGER IF EXISTS trigger_generate_farm_number ON pestitele;
CREATE TRIGGER trigger_generate_farm_number
  BEFORE INSERT ON pestitele
  FOR EACH ROW
  EXECUTE FUNCTION generate_farm_number();

-- HOTOVO!
-- Po spuštění této migrace:
-- - Všichni stávající farmáři dostanou číslo farmy (F001, F002, ...)
-- - Noví farmáři dostanou číslo farmy automaticky při registraci
-- - farm_number je UNIQUE, takže nedojde k duplicitám
