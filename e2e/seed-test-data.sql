-- Testovací data pro Playwright E2E testy
-- Spusťte tento skript v Supabase SQL Editoru

-- 1. Vytvořit testovacího farmáře
INSERT INTO pestitele (
  nazev_farmy,
  jmeno,
  telefon,
  email,
  mesto,
  farm_number,
  heslo_hash,
  popis
) VALUES (
  'Testovací Farma',
  'Test Farmář',
  '+420777123456',
  'test@samopestitele.cz',
  'Praha',
  'TEST',
  '$2b$10$j6mxsuyH0STjyhhjjCc/genjVQI2pnV2x8yeaHQizvpEVOahjmRLa', -- heslo: Test1234
  'Testovací farma pro automatické testy'
) ON CONFLICT (telefon) DO UPDATE SET
  farm_number = 'TEST',
  heslo_hash = '$2b$10$j6mxsuyH0STjyhhjjCc/genjVQI2pnV2x8yeaHQizvpEVOahjmRLa';

-- Získat ID farmáře
DO $$
DECLARE
  farmar_id INTEGER;
BEGIN
  SELECT id INTO farmar_id FROM pestitele WHERE farm_number = 'TEST';

  -- 2. Vytvořit testovací produkty
  INSERT INTO produkty (pestitel_id, nazev, popis, cena, jednotka, dostupnost, archivovano)
  VALUES
    (farmar_id, 'Testovací Jablka', 'Čerstvá jablka z testovací farmy', 45, 'kg', 'skladem', false),
    (farmar_id, 'Testovací Mrkev', 'Bio mrkev pro testy', 30, 'kg', 'skladem', false),
    (farmar_id, 'Testovací Med', 'Včelí med pro automatické testy', 250, 'ks', 'na_objednavku', false)
  ON CONFLICT DO NOTHING;
END $$;

-- Ověření
SELECT
  p.id,
  p.nazev_farmy,
  p.farm_number,
  p.telefon,
  (SELECT COUNT(*) FROM produkty WHERE pestitel_id = p.id) as pocet_produktu
FROM pestitele p
WHERE p.farm_number = 'TEST';
