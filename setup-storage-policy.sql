-- Storage policy pro bucket stanky-photos
-- Povolí upload, update, delete a select pro všechny authenticated uživatele

-- 1. Povolit INSERT (upload)
CREATE POLICY "Allow authenticated users to upload stanky photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stanky-photos');

-- 2. Povolit SELECT (zobrazení)
CREATE POLICY "Allow public to view stanky photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'stanky-photos');

-- 3. Povolit UPDATE (aktualizace)
CREATE POLICY "Allow authenticated users to update stanky photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'stanky-photos');

-- 4. Povolit DELETE (smazání)
CREATE POLICY "Allow authenticated users to delete stanky photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stanky-photos');

-- NEBO jednodušší varianta - povolit všem bez autentizace (pro development):
-- DROP POLICY IF EXISTS "Allow authenticated users to upload stanky photos" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow public to view stanky photos" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to update stanky photos" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated users to delete stanky photos" ON storage.objects;

-- CREATE POLICY "Allow anyone to upload stanky photos"
-- ON storage.objects FOR INSERT
-- TO public
-- WITH CHECK (bucket_id = 'stanky-photos');

-- CREATE POLICY "Allow anyone to update stanky photos"
-- ON storage.objects FOR UPDATE
-- TO public
-- USING (bucket_id = 'stanky-photos');

-- CREATE POLICY "Allow anyone to delete stanky photos"
-- ON storage.objects FOR DELETE
-- TO public
-- USING (bucket_id = 'stanky-photos');
