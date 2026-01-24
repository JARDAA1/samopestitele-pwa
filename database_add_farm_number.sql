-- Přidání sloupce farm_number do tabulky pestitele
-- Tento sloupec slouží jako unikátní identifikátor farmy pro autentizaci
-- Formát: Náhodná kombinace 4 znaků (písmena A-Z a číslice 0-9), např. K7M9, B3N8

-- 1. Přidat sloupec farm_number (pokud neexistuje)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pestitele' AND column_name = 'farm_number'
  ) THEN
    ALTER TABLE pestitele ADD COLUMN farm_number VARCHAR(4) UNIQUE;
  END IF;
END $$;

-- 2. Vytvořit index pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_pestitele_farm_number ON pestitele(farm_number);

-- 3. Přidat komentář k sloupci
COMMENT ON COLUMN pestitele.farm_number IS 'Unikátní náhodné číslo farmy (např. K7M9) používané jako identifikátor při přihlášení PINem';

-- 4. Vytvořit funkci pro generování náhodného farm_number
CREATE OR REPLACE FUNCTION generate_random_farm_number()
RETURNS VARCHAR(4) AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Bez O, I, 0, 1 kvůli záměně
  result VARCHAR(4) := '';
  i INTEGER;
  random_pos INTEGER;
BEGIN
  -- Vygenerovat 4 náhodné znaky
  FOR i IN 1..4 LOOP
    random_pos := floor(random() * length(chars) + 1)::INTEGER;
    result := result || substring(chars FROM random_pos FOR 1);
  END LOOP;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 5. Vygenerovat farm_number pro existující záznamy (pokud ještě nemají)
-- Tento krok přiřadí náhodná čísla farmy všem stávajícím farmářům
DO $$
DECLARE
  rec RECORD;
  new_farm_number VARCHAR(4);
  max_attempts INTEGER := 100;
  attempt INTEGER;
BEGIN
  FOR rec IN
    SELECT id FROM pestitele
    WHERE farm_number IS NULL
    ORDER BY id ASC
  LOOP
    attempt := 0;
    LOOP
      -- Vygenerovat náhodné číslo
      new_farm_number := generate_random_farm_number();

      -- Zkontrolovat, jestli už neexistuje
      IF NOT EXISTS (SELECT 1 FROM pestitele WHERE farm_number = new_farm_number) THEN
        -- Je unikátní, můžeme ho použít
        UPDATE pestitele
        SET farm_number = new_farm_number
        WHERE id = rec.id;
        EXIT; -- Vyskočit z LOOP
      END IF;

      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Nepodařilo se vygenerovat unikátní farm_number po % pokusech', max_attempts;
      END IF;
    END LOOP;
  END LOOP;
END $$;

-- 6. Vytvořit trigger funkci pro automatické generování farm_number při vložení nového záznamu
CREATE OR REPLACE FUNCTION trigger_generate_farm_number()
RETURNS TRIGGER AS $$
DECLARE
  new_farm_number VARCHAR(4);
  max_attempts INTEGER := 100;
  attempt INTEGER := 0;
BEGIN
  -- Pokud farm_number ještě není nastaveno
  IF NEW.farm_number IS NULL THEN
    LOOP
      -- Vygenerovat náhodné číslo
      new_farm_number := generate_random_farm_number();

      -- Zkontrolovat, jestli už neexistuje
      IF NOT EXISTS (SELECT 1 FROM pestitele WHERE farm_number = new_farm_number) THEN
        -- Je unikátní, můžeme ho použít
        NEW.farm_number := new_farm_number;
        EXIT; -- Vyskočit z LOOP
      END IF;

      attempt := attempt + 1;
      IF attempt >= max_attempts THEN
        RAISE EXCEPTION 'Nepodařilo se vygenerovat unikátní farm_number po % pokusech', max_attempts;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Vytvořit trigger pro automatické generování farm_number
DROP TRIGGER IF EXISTS trigger_generate_farm_number ON pestitele;
CREATE TRIGGER trigger_generate_farm_number
  BEFORE INSERT ON pestitele
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_farm_number();

-- HOTOVO!
-- Po spuštění této migrace:
-- - Všichni stávající farmáři dostanou náhodné číslo farmy (např. K7M9, B3N8, P2X4)
-- - Noví farmáři dostanou náhodné číslo farmy automaticky při registraci
-- - farm_number je UNIQUE, takže nedojde k duplicitám
-- - Čísla jsou náhodná a nelze je uhodnout/odvodit

-- BEZPEČNOSTNÍ VÝHODY:
-- ✅ 4 znaky z 32 možných = 32^4 = 1,048,576 kombinací (přes milion)
-- ✅ Nelze uhodnout/odvodit číslo jiného farmáře
-- ✅ Vyloučeny znaky podobné sobě (0/O, 1/I) pro lepší čitelnost
-- ✅ Pouze velká písmena a číslice pro jednoduchost zadávání
-- ✅ Krátké a snadno zapamatovatelné
