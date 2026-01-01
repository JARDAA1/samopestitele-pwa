-- AKTUALIZOVAT FUNKCI PRO ANONYMIZACI - bez předvolby +420

CREATE OR REPLACE FUNCTION anonymizovat_farmare(p_pestitel_id BIGINT)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE pestitele
    SET
        telefon = '999999999',  -- 9 číslic bez +420
        email = 'vymazano@vymazano.cz',
        adresa = NULL,
        mesto = NULL,
        psc = NULL,
        gps_lat = 0,
        gps_lng = 0,
        popis = NULL,
        foto_url = NULL,
        smazano = true,
        smazano_at = NOW()
    WHERE id = p_pestitel_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;
