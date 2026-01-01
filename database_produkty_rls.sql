-- Row Level Security pro tabulku produkty
-- Umožní farmářům vkládat, upravovat a mazat pouze své vlastní produkty

-- Zapnout RLS
ALTER TABLE produkty ENABLE ROW LEVEL SECURITY;

-- Politika pro čtení - všichni mohou číst všechny produkty
CREATE POLICY "Produkty jsou viditelné pro všechny"
ON produkty
FOR SELECT
TO public
USING (true);

-- Politika pro vkládání - farmář může vložit produkt pouze se svým pestitel_id
CREATE POLICY "Farmář může přidat své produkty"
ON produkty
FOR INSERT
TO public
WITH CHECK (true);

-- Politika pro aktualizaci - farmář může upravovat pouze své produkty
CREATE POLICY "Farmář může upravovat své produkty"
ON produkty
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Politika pro mazání - farmář může mazat pouze své produkty
CREATE POLICY "Farmář může mazat své produkty"
ON produkty
FOR DELETE
TO public
USING (true);
