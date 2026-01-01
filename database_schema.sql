-- DATABÁZOVÉ SCHÉMA PRO APLIKACI SAMOPĚSTITELÉ
-- DŮLEŽITÉ: Spouštějte postupně po částech!

-- ČÁST 1: Základní tabulky BEZ foreign keys
-- ================================================

-- 1. Tabulka produkty (produkty farmářů)
CREATE TABLE IF NOT EXISTS produkty (
  id SERIAL PRIMARY KEY,
  pestitel_id INTEGER NOT NULL,
  nazev TEXT NOT NULL,
  popis TEXT,
  cena DECIMAL(10,2) NOT NULL,
  jednotka TEXT NOT NULL DEFAULT 'kg',
  dostupnost BOOLEAN DEFAULT true,
  foto_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Tabulka zákazníci
CREATE TABLE IF NOT EXISTS zakaznici (
  id SERIAL PRIMARY KEY,
  jmeno TEXT NOT NULL,
  telefon TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Tabulka objednávky
CREATE TABLE IF NOT EXISTS objednavky (
  id SERIAL PRIMARY KEY,
  pestitel_id INTEGER,
  zakaznik_id INTEGER,
  zakaznik_jmeno TEXT,
  zakaznik_telefon TEXT,
  stav TEXT DEFAULT 'nova',
  celkova_cena DECIMAL(10,2),
  poznamka TEXT,
  zpusob_kontaktu TEXT DEFAULT 'telefon',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Tabulka položky objednávky
CREATE TABLE IF NOT EXISTS objednavky_polozky (
  id SERIAL PRIMARY KEY,
  objednavka_id INTEGER,
  produkt_id INTEGER,
  nazev_produktu TEXT NOT NULL,
  cena DECIMAL(10,2) NOT NULL,
  mnozstvi DECIMAL(10,2) NOT NULL,
  jednotka TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Tabulka oblíbení farmáři
CREATE TABLE IF NOT EXISTS oblibeni_farmari (
  id SERIAL PRIMARY KEY,
  zakaznik_id INTEGER,
  zakaznik_telefon TEXT,
  pestitel_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ČÁST 2: Indexy
-- ================================================
CREATE INDEX IF NOT EXISTS idx_produkty_pestitel ON produkty(pestitel_id);
CREATE INDEX IF NOT EXISTS idx_objednavky_pestitel ON objednavky(pestitel_id);
CREATE INDEX IF NOT EXISTS idx_objednavky_zakaznik ON objednavky(zakaznik_id);
CREATE INDEX IF NOT EXISTS idx_oblibeni_zakaznik ON oblibeni_farmari(zakaznik_telefon);
CREATE INDEX IF NOT EXISTS idx_pestitele_gps ON pestitele(gps_lat, gps_lng);

-- ČÁST 3: RLS (Row Level Security)
-- ================================================
ALTER TABLE produkty ENABLE ROW LEVEL SECURITY;
ALTER TABLE objednavky ENABLE ROW LEVEL SECURITY;
ALTER TABLE objednavky_polozky ENABLE ROW LEVEL SECURITY;
ALTER TABLE oblibeni_farmari ENABLE ROW LEVEL SECURITY;

-- ČÁST 4: RLS Politiky
-- ================================================

-- Produkty
DROP POLICY IF EXISTS "Produkty jsou veřejně viditelné" ON produkty;
CREATE POLICY "Produkty jsou veřejně viditelné" ON produkty FOR SELECT USING (true);

DROP POLICY IF EXISTS "Každý může přidat produkt" ON produkty;
CREATE POLICY "Každý může přidat produkt" ON produkty FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Každý může upravit produkt" ON produkty;
CREATE POLICY "Každý může upravit produkt" ON produkty FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Každý může smazat produkt" ON produkty;
CREATE POLICY "Každý může smazat produkt" ON produkty FOR DELETE USING (true);

-- Objednávky
DROP POLICY IF EXISTS "Objednávky jsou veřejně viditelné" ON objednavky;
CREATE POLICY "Objednávky jsou veřejně viditelné" ON objednavky FOR SELECT USING (true);

DROP POLICY IF EXISTS "Každý může vytvořit objednávku" ON objednavky;
CREATE POLICY "Každý může vytvořit objednávku" ON objednavky FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Každý může upravit objednávku" ON objednavky;
CREATE POLICY "Každý může upravit objednávku" ON objednavky FOR UPDATE USING (true);

-- Položky objednávek
DROP POLICY IF EXISTS "Položky objednávek jsou veřejně viditelné" ON objednavky_polozky;
CREATE POLICY "Položky objednávek jsou veřejně viditelné" ON objednavky_polozky FOR SELECT USING (true);

DROP POLICY IF EXISTS "Každý může přidat položku objednávky" ON objednavky_polozky;
CREATE POLICY "Každý může přidat položku objednávky" ON objednavky_polozky FOR INSERT WITH CHECK (true);

-- Oblíbení farmáři
DROP POLICY IF EXISTS "Oblíbení farmáři jsou veřejně viditelní" ON oblibeni_farmari;
CREATE POLICY "Oblíbení farmáři jsou veřejně viditelní" ON oblibeni_farmari FOR SELECT USING (true);

DROP POLICY IF EXISTS "Každý může přidat oblíbeného farmáře" ON oblibeni_farmari;
CREATE POLICY "Každý může přidat oblíbeného farmáře" ON oblibeni_farmari FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Každý může smazat oblíbeného farmáře" ON oblibeni_farmari;
CREATE POLICY "Každý může smazat oblíbeného farmáře" ON oblibeni_farmari FOR DELETE USING (true);
