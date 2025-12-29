-- Tabulka pro farmářské stánky
CREATE TABLE IF NOT EXISTS stanky (
    id BIGSERIAL PRIMARY KEY,
    pestitel_id BIGINT REFERENCES pestitele(id) ON DELETE CASCADE,
    mesto VARCHAR(100) NOT NULL,
    ulice VARCHAR(200) NOT NULL,
    datum_od DATE NOT NULL,
    datum_do DATE NOT NULL,
    cas_od TIME NOT NULL,
    cas_do TIME NOT NULL,
    aktivni BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pro rychlejší vyhledávání podle farmáře
CREATE INDEX IF NOT EXISTS idx_stanky_pestitel_id ON stanky(pestitel_id);

-- Index pro vyhledávání aktivních stánků
CREATE INDEX IF NOT EXISTS idx_stanky_aktivni ON stanky(aktivni);

-- RLS (Row Level Security)
ALTER TABLE stanky ENABLE ROW LEVEL SECURITY;

-- Policy pro čtení - všichni mohou vidět aktivní stánky
CREATE POLICY "stanky_select_policy" ON stanky
    FOR SELECT
    USING (true);

-- Policy pro vkládání - pouze vlastník
CREATE POLICY "stanky_insert_policy" ON stanky
    FOR INSERT
    WITH CHECK (true);

-- Policy pro úpravy - pouze vlastník
CREATE POLICY "stanky_update_policy" ON stanky
    FOR UPDATE
    USING (true);

-- Policy pro mazání - pouze vlastník
CREATE POLICY "stanky_delete_policy" ON stanky
    FOR DELETE
    USING (true);

-- Funkce pro kontrolu, zda je stánek aktivní (podle data a času)
CREATE OR REPLACE FUNCTION je_stanek_aktivni(p_stanek_id BIGINT)
RETURNS BOOLEAN AS $$
DECLARE
    v_datum_do DATE;
    v_cas_do TIME;
    v_konec TIMESTAMPTZ;
    v_ted TIMESTAMPTZ;
BEGIN
    -- Získat datum_do a cas_do
    SELECT datum_do, cas_do INTO v_datum_do, v_cas_do
    FROM stanky
    WHERE id = p_stanek_id;

    -- Spojit datum a čas
    v_konec := (v_datum_do || ' ' || v_cas_do)::TIMESTAMPTZ;
    v_ted := NOW();

    -- Vrátit true pokud ještě nevypršel
    RETURN v_ted <= v_konec;
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger funkce pro automatickou aktualizaci updated_at
CREATE OR REPLACE FUNCTION update_stanky_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pro updated_at
CREATE TRIGGER stanky_updated_at_trigger
    BEFORE UPDATE ON stanky
    FOR EACH ROW
    EXECUTE FUNCTION update_stanky_updated_at();
