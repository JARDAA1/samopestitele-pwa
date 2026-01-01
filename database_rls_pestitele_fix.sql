-- RLS politiky pro tabulku pestitele
-- Tyto politiky umožní farmářům upravovat své vlastní záznamy

-- 1. Nejprve povolíme RLS (pokud ještě není povolen)
ALTER TABLE pestitele ENABLE ROW LEVEL SECURITY;

-- 2. Smažeme všechny existující politiky (pokud existují)
DROP POLICY IF EXISTS "pestitele_select_policy" ON pestitele;
DROP POLICY IF EXISTS "pestitele_insert_policy" ON pestitele;
DROP POLICY IF EXISTS "pestitele_update_policy" ON pestitele;
DROP POLICY IF EXISTS "pestitele_delete_policy" ON pestitele;

-- 3. SELECT - Všichni mohou číst všechny farmáře (veřejná data pro mapu)
CREATE POLICY "pestitele_select_policy" ON pestitele
  FOR SELECT
  USING (true);

-- 4. INSERT - Kdokoliv může vytvořit nový záznam farmáře (pro registraci)
CREATE POLICY "pestitele_insert_policy" ON pestitele
  FOR INSERT
  WITH CHECK (true);

-- 5. UPDATE - Farmář může upravovat pouze svůj vlastní záznam
-- DOČASNÉ ŘEŠENÍ: Povolíme UPDATE všem, protože nemáme user authentication
-- V budoucnu můžete přidat podmínku: WHERE telefon = auth.jwt() ->> 'phone'
CREATE POLICY "pestitele_update_policy" ON pestitele
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 6. DELETE - Volitelně, pokud chcete povolit mazání
CREATE POLICY "pestitele_delete_policy" ON pestitele
  FOR DELETE
  USING (true);

-- Poznámka: Toto je zjednodušená verze RLS politik, která povoluje všechny operace.
-- Pro produkční prostředí byste měli implementovat správnou autentizaci a omezit
-- UPDATE pouze na záznamy, které patří přihlášenému uživateli.
-- Například: USING (telefon = current_setting('app.user_phone')::text)
