-- ODSTRANIT PŘEDVOLBU +420 Z TELEFONNÍCH ČÍSEL
-- Tento skript upraví všechna telefonní čísla v databázi

-- 1. Aktualizovat tabulku pestitele - odstranit +420
UPDATE pestitele
SET telefon = REPLACE(telefon, '+420', '')
WHERE telefon LIKE '+420%';

-- 2. Aktualizovat tabulku zakaznici - odstranit +420 (pokud existuje)
UPDATE zakaznici
SET telefon = REPLACE(telefon, '+420', '')
WHERE telefon LIKE '+420%';

-- 3. Aktualizovat tabulku objednavky - odstranit +420 z telefonů zákazníků
UPDATE objednavky
SET zakaznik_telefon = REPLACE(zakaznik_telefon, '+420', '')
WHERE zakaznik_telefon LIKE '+420%';

-- 4. Aktualizovat tabulku oblibeni_farmari - odstranit +420
UPDATE oblibeni_farmari
SET zakaznik_telefon = REPLACE(zakaznik_telefon, '+420', '')
WHERE zakaznik_telefon LIKE '+420%';

-- Zkontrolovat výsledek
SELECT id, nazev_farmy, telefon FROM pestitele WHERE smazano = false LIMIT 10;
