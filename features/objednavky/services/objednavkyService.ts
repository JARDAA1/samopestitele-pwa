/**
 * Supabase operace pro doménu Objednávky.
 * Všechny přímé dotazy do DB jsou zde – screen komponenty ani hooky
 * nesmí importovat supabase přímo.
 */
import { supabase } from '@/lib/supabaseClient';
import type {
  Objednavka,
  ObjednavkaPolozka,
  ObjednavkaSPolozkami,
  NoveObjednavky,
} from '../types';
import { captureException } from '@/lib/monitoring';

// ─── NOVÉ OBJEDNÁVKY (Operativa) ────────────────────────────────────────────

/**
 * Načte všechny aktivní objednávky (všechny stavy kromě dokoncena/odmitnuta/zrusena).
 * Ke každé objednávce přidá počet položek.
 */
export async function fetchVsechnyAktivniObjednavky(
  pestitelId: string
): Promise<NoveObjednavky[]> {
  const AKTIVNI_STAVY = ['nova', 'cekajici_na_potvrzeni', 'potvrzena', 'zpracovana', 'ceka_na_vyzvednuti'];

  const { data, error } = await supabase
    .from('objednavky')
    .select('id, stav, created_at, anon_customer_code, zakaznik_telefon, poznamka_farmare')
    .eq('pestitel_id', pestitelId)
    .in('stav', AKTIVNI_STAVY)
    .order('created_at', { ascending: false });

  if (error) {
    captureException(error);
    throw error;
  }
  if (!data) return [];

  const withCount = await Promise.all(
    data.map(async (obj) => {
      const { count } = await supabase
        .from('objednavky_polozky')
        .select('*', { count: 'exact', head: true })
        .eq('objednavka_id', obj.id);

      return { ...obj, pocet_polozek: count ?? 0 } as NoveObjednavky;
    })
  );

  return withCount;
}

/**
 * Načte objednávky se stavem 'nova' nebo 'cekajici_na_potvrzeni' pro daného prodejce.
 * Ke každé objednávce přidá počet položek.
 */
export async function fetchNoveObjednavky(
  pestitelId: string
): Promise<NoveObjednavky[]> {
  const { data, error } = await supabase
    .from('objednavky')
    .select(
      'id, stav, created_at, anon_customer_code, zakaznik_telefon, poznamka_farmare'
    )
    .eq('pestitel_id', pestitelId)
    .in('stav', ['nova', 'cekajici_na_potvrzeni'])
    .order('created_at', { ascending: false });

  if (error) {
    captureException(error);
    throw error;
  }
  if (!data) return [];

  const withCount = await Promise.all(
    data.map(async (obj) => {
      const { count } = await supabase
        .from('objednavky_polozky')
        .select('*', { count: 'exact', head: true })
        .eq('objednavka_id', obj.id);

      return { ...obj, pocet_polozek: count ?? 0 } as NoveObjednavky;
    })
  );

  return withCount;
}

/** Změní stav objednávky na 'potvrzena'. */
export async function potvrditObjednavku(id: string): Promise<void> {
  const { error } = await supabase
    .from('objednavky')
    .update({ stav: 'potvrzena' })
    .eq('id', id);
  if (error) {
    captureException(error);
    throw error;
  }
}

/**
 * Odešle zákazníkovi SMS s potvrzením objednávky přes smsbrana.cz.
 * Vrací true pokud SMS byla odeslána, false pokud selhal API call nebo chybí credentials.
 */
export async function poslatSMSPotvrzeni(
  telefon: string,
  anonCode?: string
): Promise<boolean> {
  const login = process.env.EXPO_PUBLIC_SMSBRANA_LOGIN;
  const password = process.env.EXPO_PUBLIC_SMSBRANA_PASSWORD;

  if (!login || !password || login === 'VAS_LOGIN') return false;

  const cleanPhone = telefon.replace(/\s/g, '').replace('+420', '');
  const link = anonCode
    ? `\n\nStav objednávky: https://samopestitele.cz/vyzvednuti/${anonCode}`
    : '';
  const message = `Dobrý den, vaše objednávka byla potvrzena! ✅${link}`;

  try {
    const response = await fetch('https://api.smsbrana.cz/smsconnect/http.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'send_sms',
        login,
        password,
        number: cleanPhone,
        message,
        type: 'economy',
      }),
    });
    const result = await response.text();
    return result.includes('OK');
  } catch (err) {
    captureException(err);
    return false;
  }
}

/** Změní stav objednávky na 'odmitnuta'. */
export async function odmitnoutObjednavku(id: string): Promise<void> {
  const { error } = await supabase
    .from('objednavky')
    .update({ stav: 'odmitnuta' })
    .eq('id', id);
  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── DETAIL OBJEDNÁVKY ───────────────────────────────────────────────────────

/** Načte detail jedné objednávky. */
export async function fetchObjednavkaDetail(
  objednavkaId: string
): Promise<Objednavka> {
  const { data, error } = await supabase
    .from('objednavky')
    .select(
      'id, stav, datum_vyzvednuti, anon_customer_code, celkova_cena, created_at, zakaznik_telefon, poznamka_farmare, phone_consent, ready_at'
    )
    .eq('id', objednavkaId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as Objednavka;
}

/** Načte položky dané objednávky. */
export async function fetchObjednavkaPolozky(
  objednavkaId: string
): Promise<ObjednavkaPolozka[]> {
  const { data, error } = await supabase
    .from('objednavky_polozky')
    .select('id, nazev_produktu, mnozstvi, jednotka, cena')
    .eq('objednavka_id', objednavkaId);

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as ObjednavkaPolozka[]) ?? [];
}

/** Změní stav objednávky na libovolný stav. */
export async function zmeniStavObjednavky(
  id: string,
  novyStav: string
): Promise<void> {
  const { error } = await supabase
    .from('objednavky')
    .update({ stav: novyStav })
    .eq('id', id);
  if (error) {
    captureException(error);
    throw error;
  }
}

/** Uloží poznámku farmáře k objednávce (null = smaže). */
export async function ulozitPoznamkuFarmare(
  id: string,
  poznamka: string | null
): Promise<void> {
  const { error } = await supabase
    .from('objednavky')
    .update({ poznamka_farmare: poznamka })
    .eq('id', id);
  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── DOKONČENÉ OBJEDNÁVKY ────────────────────────────────────────────────────

/**
 * Načte dokončené/odmítnuté/zrušené objednávky (archiv), max 50.
 */
export async function fetchDokonceneObjednavky(
  pestitelId: string
): Promise<Objednavka[]> {
  const { data, error } = await supabase
    .from('objednavky')
    .select(
      'id, stav, created_at, anon_customer_code, celkova_cena, zakaznik_telefon, poznamka_farmare'
    )
    .eq('pestitel_id', pestitelId)
    .in('stav', ['dokoncena', 'odmitnuta', 'zrusena'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as Objednavka[]) ?? [];
}

// ─── DASHBOARD (moje-prodejna/index) ────────────────────────────────────────

/**
 * Načte aktivní objednávky (nova/cekajici/potvrzena/zpracovana) s jejich položkami.
 */
export async function fetchAktivniObjednavky(
  pestitelId: string
): Promise<ObjednavkaSPolozkami[]> {
  const { data, error } = await supabase
    .from('objednavky')
    .select(
      `id, stav, created_at, datum_vyzvednuti, anon_customer_code,
       celkova_cena, zakaznik_telefon, poznamka_farmare`
    )
    .eq('pestitel_id', pestitelId)
    .in('stav', ['nova', 'cekajici_na_potvrzeni', 'potvrzena', 'zpracovana', 'ceka_na_vyzvednuti'])
    .order('created_at', { ascending: false });

  if (error) {
    captureException(error);
    throw error;
  }
  if (!data) return [];

  const withPolozky = await Promise.all(
    data.map(async (obj) => {
      const { data: polozkyData } = await supabase
        .from('objednavky_polozky')
        .select('id, nazev_produktu, mnozstvi, jednotka, cena, stav_polozky')
        .eq('objednavka_id', obj.id);

      return {
        ...obj,
        polozky: (polozkyData as ObjednavkaPolozka[]) ?? [],
      } as ObjednavkaSPolozkami;
    })
  );

  return withPolozky;
}

/**
 * Vrátí počet objednávek čekajících na akci (nova + cekajici_na_potvrzeni).
 */
export async function fetchPocetNovychObjednavek(
  pestitelId: string
): Promise<number> {
  const { count } = await supabase
    .from('objednavky')
    .select('*', { count: 'exact', head: true })
    .eq('pestitel_id', pestitelId)
    .in('stav', ['nova', 'cekajici_na_potvrzeni']);
  return count ?? 0;
}

/**
 * Změní stav jedné položky objednávky.
 * Vrátí, zda jsou všechny položky vyřízené (pro auto-update stavu objednávky).
 */
export async function zmeniStavPolozky(
  polozkaId: string,
  novyStav: string
): Promise<void> {
  const { error } = await supabase
    .from('objednavky_polozky')
    .update({ stav_polozky: novyStav })
    .eq('id', polozkaId);
  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── VYTVOŘENÍ OBJEDNÁVKY (košík / nákupní seznam) ───────────────────────────

export interface CreateObjednavkaData {
  pestitel_id: number;
  stav: string;
  celkova_cena?: number;
  zpusob_kontaktu?: string;
  zakaznik_jmeno?: string | null;
  zakaznik_telefon?: string | null;
  poznamka?: string | null;
  prodejni_misto_id?: number | null;
  datum_vyzvednuti?: string | null;
  anon_customer_id?: string | null;
  anon_customer_code?: string | null;
  public_token?: string;
  phone_consent?: boolean;
}

export interface CreatePolozkaData {
  produkt_id: number;
  nazev_produktu: string;
  cena: number;
  mnozstvi: number;
  jednotka: string;
}

/**
 * Vytvoří novou objednávku a vrátí její ID.
 */
export async function createObjednavka(
  data: CreateObjednavkaData
): Promise<string> {
  const { data: objednavka, error } = await supabase
    .from('objednavky')
    .insert(data)
    .select()
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return (objednavka as { id: string }).id;
}

/**
 * Smaže objednávku podle ID (kompenzační rollback při selhání).
 * Použito pouze pokud createObjednavkyPolozky selže po createObjednavka.
 */
export async function deleteObjednavka(id: string): Promise<void> {
  await supabase.from('objednavky').delete().eq('id', id);
}

/**
 * Vloží položky k existující objednávce.
 */
export async function createObjednavkyPolozky(
  objednavkaId: string,
  polozky: CreatePolozkaData[]
): Promise<void> {
  const rows = polozky.map((p) => ({ ...p, objednavka_id: objednavkaId }));
  const { error } = await supabase.from('objednavky_polozky').insert(rows);
  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── ANONYMNÍ EVIDENCE ZÁKAZNÍKŮ ────────────────────────────────────────────

/**
 * Uloží zákazníka do tabulky anonymni_zakaznici (pouze jednou – ON CONFLICT DO NOTHING).
 * Lokace = město farmáře, u kterého zákazník poprvé nakoupil.
 */
export async function upsertAnonymniZakaznik(
  anonCustomerId: string,
  pestitelId: number
): Promise<void> {
  try {
    const { data: pestitel } = await supabase
      .from('pestitele')
      .select('mesto')
      .eq('id', pestitelId)
      .single();

    const lokace = pestitel?.mesto ?? null;

    await supabase
      .from('anonymni_zakaznici')
      .insert({ anon_id: anonCustomerId, lokace })
      .onConflict('anon_id')
      .ignore();
  } catch {
    // tiché selhání – evidence zákazníků není kritická
  }
}

// ─── OBJEDNÁVKY ZÁKAZNÍKA (podle anon_customer_id) ───────────────────────────

export interface MojeObjednavkaSupabase {
  id: string;
  stav: string;
  created_at: string;
  datum_vyzvednuti?: string;
  celkova_cena?: number;
  pestitel_id: number;
  pestitelNazev: string;
}

/**
 * Načte všechny objednávky zákazníka podle anon_customer_id.
 * Funguje na všech zařízeních – nezávisí na localStorage.
 */
export async function fetchMojeObjednavkyByAnonId(
  anonCustomerId: string
): Promise<MojeObjednavkaSupabase[]> {
  const { data, error } = await supabase
    .from('objednavky')
    .select('id, stav, created_at, datum_vyzvednuti, celkova_cena, pestitel_id, pestitele(nazev_farmy, jmeno, prijmeni)')
    .eq('anon_customer_id', anonCustomerId)
    .order('created_at', { ascending: false });

  if (error) {
    captureException(error);
    throw error;
  }
  if (!data) return [];

  return data.map((o: any) => {
    const p = o.pestitele;
    const pestitelNazev = p?.nazev_farmy || [p?.jmeno, p?.prijmeni].filter(Boolean).join(' ') || 'Pěstitel';
    return {
      id: o.id,
      stav: o.stav,
      created_at: o.created_at,
      datum_vyzvednuti: o.datum_vyzvednuti,
      celkova_cena: o.celkova_cena,
      pestitel_id: o.pestitel_id,
      pestitelNazev,
    };
  });
}

// ─── VYZVEDNUTÍ OBJEDNÁVKY ────────────────────────────────────────────────────

/**
 * Najde objednávku podle anonymního kódu zákazníka.
 */
export async function fetchObjednavkaByKod(
  kod: string
): Promise<Objednavka> {
  const { data, error } = await supabase
    .from('objednavky')
    .select('id, stav, datum_vyzvednuti, anon_customer_code, celkova_cena, created_at, pestitel_id')
    .eq('anon_customer_code', kod)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as Objednavka;
}

/**
 * Načte položky objednávky pro stránku vyzvednutí.
 */
export async function fetchPolozkyVyzvednuti(
  objednavkaId: string
): Promise<ObjednavkaPolozka[]> {
  const { data, error } = await supabase
    .from('objednavky_polozky')
    .select('id, nazev_produktu, mnozstvi, jednotka, cena')
    .eq('objednavka_id', objednavkaId);

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as ObjednavkaPolozka[]) ?? [];
}

// ─── VEŘEJNÉ SLEDOVÁNÍ OBJEDNÁVKY (/o/[token]) ────────────────────────────────

/** Bezpečná veřejná data objednávky (bez telefonu, soukromých dat). */
export interface ObjednavkaPublic {
  id: string;
  stav: string;
  celkova_cena?: number;
  datum_vyzvednuti?: string;
  ready_at?: string;
  pestitel_id: string;
  prodejni_misto_id?: number;
}

/** Veřejná data pěstitele (bez telefonu / e-mailu). */
export interface FarmerPublicInfo {
  nazev_farmy?: string;
  jmeno?: string;
  prijmeni?: string;
  mesto?: string;
  adresa?: string;
}

/**
 * Načte bezpečná veřejná data objednávky podle public_token.
 * Nevybírá žádná privátní pole (telefon, jméno zákazníka, …).
 * Vrátí null místo chyby, aby nebylo možné odlišit „nenalezeno" od „chyba"
 * a tím zabránit informačním únikům.
 */
export async function fetchObjednavkaByPublicToken(
  token: string
): Promise<ObjednavkaPublic | null> {
  const { data, error } = await supabase
    .from('objednavky')
    .select('id, stav, celkova_cena, datum_vyzvednuti, ready_at, pestitel_id, prodejni_misto_id')
    .eq('public_token', token)
    .single();

  if (error || !data) return null;
  return data as ObjednavkaPublic;
}

/**
 * Načte veřejně zobrazitelné informace o pěstiteli (bez telefonu / e-mailu).
 */
export async function fetchFarmerPublicInfo(
  pestitelId: string
): Promise<FarmerPublicInfo | null> {
  const { data } = await supabase
    .from('pestitele')
    .select('nazev_farmy, jmeno, prijmeni, mesto, adresa')
    .eq('id', pestitelId)
    .single();

  return data ?? null;
}

/** Veřejná data prodejního místa (název, adresa, otevírací doba). */
export interface ProdejniMistoPublicInfo {
  nazev: string;
  adresa?: string;
  cas_od?: string;
  cas_do?: string;
}

/**
 * Načte veřejně zobrazitelné informace o prodejním místě.
 */
export async function fetchProdejniMistoPublicInfo(
  id: number
): Promise<ProdejniMistoPublicInfo | null> {
  const { data } = await supabase
    .from('prodejni_mista')
    .select('nazev, adresa, cas_od, cas_do')
    .eq('id', id)
    .single();

  return data ?? null;
}

// ─── OZNAČENÍ OBJEDNÁVKY JAKO PŘIPRAVENÉ (farmář) ────────────────────────────

/**
 * Nastaví stav objednávky na 'zpracovana' a zaznamená čas připravení.
 * Smí být voláno jen při přechodu z 'potvrzena' → 'zpracovana'.
 */
export async function oznacitObjednavkuJakoPripravena(
  id: string
): Promise<void> {
  const { error } = await supabase
    .from('objednavky')
    .update({ stav: 'zpracovana', ready_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    captureException(error);
    throw error;
  }
}

/**
 * Odešle SMS zákazníkovi: „Vaše objednávka je připravena k vyzvednutí."
 * Vrátí true pokud SMS byla odeslána, false pokud chybí credentials nebo selhal API call.
 */
export async function poslatSMSPripraveno(telefon: string): Promise<boolean> {
  const login = process.env.EXPO_PUBLIC_SMSBRANA_LOGIN;
  const password = process.env.EXPO_PUBLIC_SMSBRANA_PASSWORD;

  if (!login || !password || login === 'VAS_LOGIN') return false;

  const cleanPhone = telefon.replace(/\s/g, '').replace('+420', '');
  const message = 'Vaše objednávka je připravena k vyzvednutí. Samopestitele.cz';

  try {
    const response = await fetch('https://api.smsbrana.cz/smsconnect/http.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        action: 'send_sms',
        login,
        password,
        number: cleanPhone,
        message,
        type: 'economy',
      }),
    });
    const result = await response.text();
    return result.includes('OK');
  } catch (err) {
    captureException(err);
    return false;
  }
}
