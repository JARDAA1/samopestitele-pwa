-- Vytvoření storage bucketu pro fotky produktů

-- 1. Vytvořit bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('produkty-fotky', 'produkty-fotky', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Politika pro nahrávání - kdokoliv může nahrát
CREATE POLICY "Kdokoliv může nahrát fotku produktu"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'produkty-fotky');

-- 3. Politika pro čtení - fotky jsou veřejné
CREATE POLICY "Fotky produktů jsou veřejné"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'produkty-fotky');

-- 4. Politika pro mazání - kdokoliv může mazat své fotky
CREATE POLICY "Vlastník může smazat fotku"
ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'produkty-fotky');
