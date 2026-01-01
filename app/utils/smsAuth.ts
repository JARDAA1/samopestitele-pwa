import { supabase } from '../../lib/supabase';

/**
 * Generuje náhodný 4-místný kód
 */
export function generateSMSCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Odešle SMS kód přes smsbrana.cz
 * POZNÁMKA: Pro produkci byste měli použít Supabase Edge Function,
 * aby API klíče nebyly v mobilní aplikaci!
 */
export async function odeslatSMS(telefon: string, kod: string): Promise<boolean> {
  try {
    // TODO: Nahraďte svými přihlašovacími údaji ze smsbrana.cz
    const SMSBRANA_LOGIN = 'VAS_LOGIN'; // Získáte na portal.smsbrana.cz
    const SMSBRANA_PASSWORD = 'VASE_HESLO'; // Získáte na portal.smsbrana.cz

    // Formátování telefonu - odstranit mezery a +420
    const cleanPhone = telefon.replace(/\s/g, '').replace('+420', '');

    // Zpráva
    const message = `Váš ověřovací kód pro Samopěstitelé: ${kod}`;

    // API volání na smsbrana.cz
    const response = await fetch('https://api.smsbrana.cz/smsconnect/http.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        action: 'send_sms',
        login: SMSBRANA_LOGIN,
        password: SMSBRANA_PASSWORD,
        number: cleanPhone,
        message: message,
        type: 'economy', // nebo 'reliable' pro vyšší spolehlivost
      }),
    });

    const result = await response.text();
    console.log('SMS odpověď:', result);

    // Kontrola odpovědi (smsbrana.cz vrací "OK" při úspěchu)
    return result.includes('OK');
  } catch (error) {
    console.error('Chyba při odesílání SMS:', error);
    return false;
  }
}

/**
 * Uloží SMS kód do databáze
 */
export async function ulozitSMSKod(
  telefon: string,
  kod: string,
  typ: 'registrace' | 'prihlaseni' = 'registrace'
): Promise<{ success: boolean; error?: string }> {
  try {
    // Vypršení za 10 minut
    const vyprsiV = new Date();
    vyprsiV.setMinutes(vyprsiV.getMinutes() + 10);

    const { error } = await supabase
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
  } catch (error: any) {
    console.error('Chyba při ukládání SMS kódu:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Ověří SMS kód
 */
export async function overitSMSKod(
  telefon: string,
  kod: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Najdi platný nepoužitý kód
    const currentTime = new Date().toISOString();
    const { data, error } = await supabase
      .from('sms_overovaci_kody')
      .select('*')
      .eq('telefon', telefon)
      .eq('kod', kod)
      .eq('pouzity', false)
      .gte('vyprsi_v', currentTime) // Kód vyprší v budoucnosti (větší nebo rovno než teď)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { valid: false, error: 'Neplatný nebo vypršený kód' };
    }

    // Označ kód jako použitý
    await supabase
      .from('sms_overovaci_kody')
      .update({ pouzity: true })
      .eq('id', data.id);

    return { valid: true };
  } catch (error: any) {
    console.error('Chyba při ověřování SMS kódu:', error);
    return { valid: false, error: error.message };
  }
}

/**
 * Zkontroluje, jestli farmář s tímto telefonem už existuje
 */
export async function existujeFarmar(telefon: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
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
 * Hlavní funkce: Odeslat SMS kód a uložit do DB
 */
export async function odeslatOverovaciKod(
  telefon: string,
  typ: 'registrace' | 'prihlaseni' = 'registrace'
): Promise<{ success: boolean; error?: string; kod?: string }> {
  try {
    // 1. Vygeneruj kód
    const kod = generateSMSCode();

    // 2. Ulož do databáze
    const ulozenResult = await ulozitSMSKod(telefon, kod, typ);
    if (!ulozenResult.success) {
      return { success: false, error: ulozenResult.error };
    }

    // 3. Odešli SMS
    // VAROVÁNÍ: Pro produkci přesuňte odesílání SMS do Supabase Edge Function!
    // const smsOdeslano = await odeslatSMS(telefon, kod);
    // if (!smsOdeslano) {
    //   return { success: false, error: 'Nepodařilo se odeslat SMS' };
    // }

    // PRO TESTOVÁNÍ: Vrátíme kód (v produkci NIKDY NEVRACEJTE!)
    console.log(`SMS kód pro ${telefon}: ${kod}`);

    return { success: true, kod }; // V produkci: return { success: true }
  } catch (error: any) {
    console.error('Chyba při odesílání ověřovacího kódu:', error);
    return { success: false, error: error.message };
  }
}
