// Supabase konfigurace
const SUPABASE_URL = 'https://ozxzowfzhdulofkxniji.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96eHpvd2Z6aGR1bG9ma3huaWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNTg5MDMsImV4cCI6MjA4MDkzNDkwM30.ZfDrCvq7pCX6Y9RQm7MNFyuOMSeH3iVQUhRaoXBAu9M';

// Funkce pro získání Supabase clienta (lazy initialization)
function getSupabaseClient() {
    if (!window.supabaseClient) {
        const { createClient } = window.supabase;
        window.supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
    return window.supabaseClient;
}

/**
 * Generuje náhodný 4-místný kód
 */
function generateSMSCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Uloží SMS kód do databáze
 */
async function ulozitSMSKod(telefon, kod, typ = 'prihlaseni') {
    try {
        // Vypršení za 10 minut
        const vyprsiV = new Date();
        vyprsiV.setMinutes(vyprsiV.getMinutes() + 10);

        const { error } = await getSupabaseClient()
            .from('sms_overovaci_kody')
            .insert({
                telefon,
                kod,
                vyprsi_v: vyprsiV.toISOString(),
                typ,
                pouzity: false,
            });

        if (error) {
            console.error('Chyba při ukládání SMS kódu:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Chyba při ukládání SMS kódu:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Ověří SMS kód
 */
async function overitSMSKod(telefon, kod) {
    try {
        // Najdi platný nepoužitý kód
        const currentTime = new Date().toISOString();
        const { data, error } = await getSupabaseClient()
            .from('sms_overovaci_kody')
            .select('*')
            .eq('telefon', telefon)
            .eq('kod', kod)
            .eq('pouzity', false)
            .gte('vyprsi_v', currentTime)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (error || !data) {
            return { valid: false, error: 'Neplatný nebo vypršený kód' };
        }

        // Označ kód jako použitý
        await getSupabaseClient()
            .from('sms_overovaci_kody')
            .update({ pouzity: true })
            .eq('id', data.id);

        return { valid: true };
    } catch (error) {
        console.error('Chyba při ověřování SMS kódu:', error);
        return { valid: false, error: error.message };
    }
}

/**
 * Zkontroluje, jestli farmář s tímto telefonem už existuje
 */
async function existujeFarmar(telefon) {
    try {
        const { data, error } = await getSupabaseClient()
            .from('pestitele')
            .select('id')
            .eq('telefon', telefon)
            .single();

        return !!data && !error;
    } catch {
        return false;
    }
}

/**
 * Načte data farmáře podle telefonu
 */
async function nacistFarmarePoTelefonu(telefon) {
    try {
        const { data, error } = await getSupabaseClient()
            .from('pestitele')
            .select('id, nazev_farmy, jmeno, telefon, email, mesto')
            .eq('telefon', telefon)
            .single();

        if (error || !data) {
            return { success: false, error: 'Farmář nebyl nalezen' };
        }

        return { success: true, data };
    } catch (error) {
        console.error('Chyba při načítání farmáře:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Hlavní funkce: Odeslat SMS kód a uložit do DB
 */
async function odeslatOverovaciKod(telefon, typ = 'prihlaseni') {
    try {
        // 1. Zkontroluj, jestli farmář existuje (pouze pro přihlášení)
        if (typ === 'prihlaseni') {
            const existuje = await existujeFarmar(telefon);
            if (!existuje) {
                return { success: false, error: 'Účet s tímto telefonem neexistuje' };
            }
        }

        // 2. Vygeneruj kód
        const kod = generateSMSCode();

        // 3. Ulož do databáze
        const ulozenResult = await ulozitSMSKod(telefon, kod, typ);
        if (!ulozenResult.success) {
            return { success: false, error: ulozenResult.error };
        }

        // PRO TESTOVÁNÍ: Vrátíme kód (v produkci by se poslal SMS)
        console.log(`SMS kód pro ${telefon}: ${kod}`);

        return { success: true, kod }; // V produkci: return { success: true }
    } catch (error) {
        console.error('Chyba při odesílání ověřovacího kódu:', error);
        return { success: false, error: error.message };
    }
}
