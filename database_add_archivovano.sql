-- Přidání pole archivovano do tabulky produkty
-- Produkty mohou být archivovány místo mazány, aby zůstala historie v objednávkách

-- Přidat sloupec archivovano (default false)
ALTER TABLE produkty
ADD COLUMN IF NOT EXISTS archivovano BOOLEAN DEFAULT false;

-- Nastavit všem existujícím produktům archivovano na false
UPDATE produkty
SET archivovano = false
WHERE archivovano IS NULL;

-- Vytvořit index pro rychlejší filtrování
CREATE INDEX IF NOT EXISTS idx_produkty_archivovano ON produkty(archivovano);

-- Vytvořit index pro kombinaci pestitel_id + archivovano (pro optimalizaci dotazů)
CREATE INDEX IF NOT EXISTS idx_produkty_pestitel_archivovano ON produkty(pestitel_id, archivovano);

COMMENT ON COLUMN produkty.archivovano IS 'Zda je produkt archivován (skrytý z nabídky, ale zachovaný pro historii objednávek)';
