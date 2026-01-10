-- Přidání nových sloupců do tabulky stanky
ALTER TABLE stanky
ADD COLUMN IF NOT EXISTS nazev TEXT,
ADD COLUMN IF NOT EXISTS popis TEXT,
ADD COLUMN IF NOT EXISTS foto_url TEXT;

-- Nastavit výchozí název pro existující stánky
UPDATE stanky
SET nazev = CONCAT(mesto, ' - ', ulice)
WHERE nazev IS NULL;
