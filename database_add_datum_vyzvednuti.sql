-- Přidání sloupce datum_vyzvednuti do tabulky objednavky
-- Tento sloupec uchovává datum, kdy si zákazník vyzvedne objednávku

ALTER TABLE objednavky
ADD COLUMN IF NOT EXISTS datum_vyzvednuti TIMESTAMP WITH TIME ZONE;

-- Přidání komentáře k sloupci
COMMENT ON COLUMN objednavky.datum_vyzvednuti IS 'Datum a čas vyzvednutí objednávky zákazníkem';
