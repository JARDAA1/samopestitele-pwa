-- Přidání sloupce mnozstvi do tabulky produkty
ALTER TABLE produkty
ADD COLUMN IF NOT EXISTS mnozstvi DECIMAL(10,2);

-- Nastavit výchozí hodnotu pro existující záznamy
UPDATE produkty
SET mnozstvi = 0
WHERE mnozstvi IS NULL;
