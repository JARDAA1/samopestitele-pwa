-- Vytvořit tabulku pro hodnocení farmářů
CREATE TABLE IF NOT EXISTS hodnoceni (
    id BIGSERIAL PRIMARY KEY,
    objednavka_id BIGINT REFERENCES objednavky(id) ON DELETE CASCADE,
    pestitel_id BIGINT REFERENCES pestitele(id) ON DELETE CASCADE,
    hvezdicky INT NOT NULL CHECK (hvezdicky >= 1 AND hvezdicky <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(objednavka_id) -- Každá objednávka může být hodnocena pouze jednou
);

-- Přidat RLS (Row Level Security)
ALTER TABLE hodnoceni ENABLE ROW LEVEL SECURITY;

-- Politika pro čtení - všichni mohou číst hodnocení
CREATE POLICY "hodnoceni_select_policy" ON hodnoceni
  FOR SELECT
  USING (true);

-- Politika pro vkládání - kdokoliv může přidat hodnocení
CREATE POLICY "hodnoceni_insert_policy" ON hodnoceni
  FOR INSERT
  WITH CHECK (true);

-- Politika pro aktualizaci - zatím povolit všem (v budoucnu omezit na autora)
CREATE POLICY "hodnoceni_update_policy" ON hodnoceni
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Index pro rychlé vyhledávání
CREATE INDEX IF NOT EXISTS idx_hodnoceni_pestitel ON hodnoceni(pestitel_id);
CREATE INDEX IF NOT EXISTS idx_hodnoceni_objednavka ON hodnoceni(objednavka_id);

-- Funkce pro výpočet průměrného hodnocení farmáře
CREATE OR REPLACE FUNCTION get_average_rating(p_pestitel_id BIGINT)
RETURNS NUMERIC AS $$
    SELECT ROUND(AVG(hvezdicky), 1)
    FROM hodnoceni
    WHERE pestitel_id = p_pestitel_id;
$$ LANGUAGE SQL STABLE;

-- Funkce pro počet hodnocení farmáře
CREATE OR REPLACE FUNCTION get_rating_count(p_pestitel_id BIGINT)
RETURNS BIGINT AS $$
    SELECT COUNT(*)
    FROM hodnoceni
    WHERE pestitel_id = p_pestitel_id;
$$ LANGUAGE SQL STABLE;
