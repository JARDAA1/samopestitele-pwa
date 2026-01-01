-- TABULKA PRO SMS OVĚŘOVACÍ KÓDY (MAGIC LINK / PASSWORDLESS AUTH)
-- ================================================================

-- Tabulka pro ověřovací SMS kódy
CREATE TABLE IF NOT EXISTS sms_overovaci_kody (
  id SERIAL PRIMARY KEY,
  telefon TEXT NOT NULL,
  kod TEXT NOT NULL, -- 4-místný kód
  vyprsi_v TIMESTAMP WITH TIME ZONE NOT NULL, -- Platnost 10 minut
  pouzity BOOLEAN DEFAULT false,
  typ TEXT NOT NULL DEFAULT 'registrace', -- 'registrace' nebo 'prihlaseni'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Index pro rychlé vyhledávání podle telefonu
CREATE INDEX IF NOT EXISTS idx_sms_kody_telefon ON sms_overovaci_kody(telefon);

-- Index pro rychlé vyhledávání nevypršených kódů
CREATE INDEX IF NOT EXISTS idx_sms_kody_nevyprsi ON sms_overovaci_kody(vyprsi_v) WHERE pouzity = false;

-- RLS politiky
ALTER TABLE sms_overovaci_kody ENABLE ROW LEVEL SECURITY;

-- Každý může vložit nový kód (pro registraci/přihlášení)
DROP POLICY IF EXISTS "Každý může vytvořit SMS kód" ON sms_overovaci_kody;
CREATE POLICY "Každý může vytvořit SMS kód" ON sms_overovaci_kody
  FOR INSERT WITH CHECK (true);

-- Každý může číst kódy (pro ověření)
DROP POLICY IF EXISTS "Každý může číst SMS kódy" ON sms_overovaci_kody;
CREATE POLICY "Každý může číst SMS kódy" ON sms_overovaci_kody
  FOR SELECT USING (true);

-- Každý může aktualizovat kódy (označit jako použitý)
DROP POLICY IF EXISTS "Každý může aktualizovat SMS kódy" ON sms_overovaci_kody;
CREATE POLICY "Každý může aktualizovat SMS kódy" ON sms_overovaci_kody
  FOR UPDATE USING (true);

-- Čistící funkce - smaže staré kódy starší než 24 hodin
CREATE OR REPLACE FUNCTION cistit_stare_sms_kody()
RETURNS void AS $$
BEGIN
  DELETE FROM sms_overovaci_kody
  WHERE created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Poznámka: V Supabase můžete nastavit cron job, který spustí tuto funkci každý den
-- Nebo ji zavoláte ručně z Dashboard > SQL Editor:
-- SELECT cistit_stare_sms_kody();
