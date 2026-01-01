-- Oprava sloupce emoji - udělat ho nullable nebo smazat
-- Varianta 1: Udělat emoji nullable (doporučeno)
ALTER TABLE produkty
ALTER COLUMN emoji DROP NOT NULL;

-- Varianta 2: Pokud emoji nechceš používat, smaž ho
-- ALTER TABLE produkty DROP COLUMN IF EXISTS emoji;
