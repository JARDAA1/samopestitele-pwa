-- Přidání sloupce pro pořadí produktů
ALTER TABLE predefinovane_produkty
ADD COLUMN IF NOT EXISTS poradi INTEGER DEFAULT 999;

-- Nastavení prioritních produktů podle daného pořadí
UPDATE predefinovane_produkty SET poradi = 1 WHERE nazev = 'Brambory';
UPDATE predefinovane_produkty SET poradi = 2 WHERE nazev = 'Cibule';
UPDATE predefinovane_produkty SET poradi = 3 WHERE nazev = 'Rajčata';
UPDATE predefinovane_produkty SET poradi = 4 WHERE nazev = 'Papriky';
UPDATE predefinovane_produkty SET poradi = 5 WHERE nazev = 'Okurky';
UPDATE predefinovane_produkty SET poradi = 6 WHERE nazev = 'Česnek';
UPDATE predefinovane_produkty SET poradi = 7 WHERE nazev = 'Salát';
UPDATE predefinovane_produkty SET poradi = 8 WHERE nazev = 'Cuketa';
UPDATE predefinovane_produkty SET poradi = 9 WHERE nazev = 'Dýně';
UPDATE predefinovane_produkty SET poradi = 10 WHERE nazev = 'Jablka';
UPDATE predefinovane_produkty SET poradi = 11 WHERE nazev = 'Jahody';
UPDATE predefinovane_produkty SET poradi = 12 WHERE nazev = 'Třešně';
UPDATE predefinovane_produkty SET poradi = 13 WHERE nazev = 'Švestky';
UPDATE predefinovane_produkty SET poradi = 14 WHERE nazev = 'Hrušky';
UPDATE predefinovane_produkty SET poradi = 15 WHERE nazev = 'Maliny';
UPDATE predefinovane_produkty SET poradi = 16 WHERE nazev = 'Borůvky';
UPDATE predefinovane_produkty SET poradi = 17 WHERE nazev = 'Rybíz';
UPDATE predefinovane_produkty SET poradi = 18 WHERE nazev = 'Angrešt';

-- Přidání chybějících produktů, pokud neexistují
INSERT INTO predefinovane_produkty (nazev, emoji, kategorie, poradi)
SELECT 'Cuketa', '🥒', 'Zelenina', 8
WHERE NOT EXISTS (SELECT 1 FROM predefinovane_produkty WHERE nazev = 'Cuketa');

INSERT INTO predefinovane_produkty (nazev, emoji, kategorie, poradi)
SELECT 'Dýně', '🎃', 'Zelenina', 9
WHERE NOT EXISTS (SELECT 1 FROM predefinovane_produkty WHERE nazev = 'Dýně');

INSERT INTO predefinovane_produkty (nazev, emoji, kategorie, poradi)
SELECT 'Švestky', '🫐', 'Ovoce', 13
WHERE NOT EXISTS (SELECT 1 FROM predefinovane_produkty WHERE nazev = 'Švestky');

INSERT INTO predefinovane_produkty (nazev, emoji, kategorie, poradi)
SELECT 'Maliny', '🫐', 'Ovoce', 15
WHERE NOT EXISTS (SELECT 1 FROM predefinovane_produkty WHERE nazev = 'Maliny');

INSERT INTO predefinovane_produkty (nazev, emoji, kategorie, poradi)
SELECT 'Rybíz', '🫐', 'Ovoce', 17
WHERE NOT EXISTS (SELECT 1 FROM predefinovane_produkty WHERE nazev = 'Rybíz');

INSERT INTO predefinovane_produkty (nazev, emoji, kategorie, poradi)
SELECT 'Angrešt', '🫐', 'Ovoce', 18
WHERE NOT EXISTS (SELECT 1 FROM predefinovane_produkty WHERE nazev = 'Angrešt');

-- Nastavení pořadí pro ostatní produkty (začíná od 100)
-- Zelenina (mimo prioritní)
UPDATE predefinovane_produkty SET poradi = 100 WHERE nazev = 'Mrkev' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 101 WHERE nazev = 'Chilli papričky' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 102 WHERE nazev = 'Brokolice' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 103 WHERE nazev = 'Houby' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 104 WHERE nazev = 'Kukuřice' AND poradi = 999;

-- Ovoce (mimo prioritní)
UPDATE predefinovane_produkty SET poradi = 200 WHERE nazev = 'Hrozny' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 201 WHERE nazev = 'Meloun' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 202 WHERE nazev = 'Pomeranče' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 203 WHERE nazev = 'Citrony' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 204 WHERE nazev = 'Banány' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 205 WHERE nazev = 'Ananas' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 206 WHERE nazev = 'Mango' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 207 WHERE nazev = 'Broskve' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 208 WHERE nazev = 'Kiwi' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 209 WHERE nazev = 'Kokos' AND poradi = 999;

-- Vejce a mléčné
UPDATE predefinovane_produkty SET poradi = 300 WHERE nazev = 'Vejce' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 301 WHERE nazev = 'Mléko' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 302 WHERE nazev = 'Sýr' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 303 WHERE nazev = 'Máslo' AND poradi = 999;

-- Ostatní
UPDATE predefinovane_produkty SET poradi = 400 WHERE nazev = 'Hovězí maso' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 401 WHERE nazev = 'Kuřecí maso' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 402 WHERE nazev = 'Slanina' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 403 WHERE nazev = 'Ryby' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 404 WHERE nazev = 'Med' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 405 WHERE nazev = 'Chléb' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 406 WHERE nazev = 'Bageta' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 407 WHERE nazev = 'Rohlíky' AND poradi = 999;
UPDATE predefinovane_produkty SET poradi = 408 WHERE nazev = 'Obilí' AND poradi = 999;

-- Vytvoření indexu pro rychlejší řazení
CREATE INDEX IF NOT EXISTS idx_predefinovane_produkty_poradi
ON predefinovane_produkty(poradi);
