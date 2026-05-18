/**
 * Service pro operace nad tabulkou `pestitele`.
 * Pokrývá profil farmáře, heslo, lokaci, dostupnost, foto, telefon, username.
 */
import { supabase } from '@/lib/supabaseClient';
import { captureException } from '@/lib/monitoring';

// ─── Typy ────────────────────────────────────────────────────────────────────

export interface ProfilFarmara {
  id: string | number;
  nazev_farmy?: string | null;
  jmeno?: string | null;
  prijmeni?: string | null;
  email?: string | null;
  telefon?: string | null;
  mesto?: string | null;
  adresa?: string | null;
  popis?: string | null;
  gps_lat?: number | null;
  gps_lng?: number | null;
  foto_url?: string | null;
  foto_path?: string | null;
  casova_dostupnost?: string | null;
  farm_number?: string | null;
  heslo_hash?: string | null;
  [key: string]: unknown;
}

export interface LokaceData {
  id: string | number;
  mesto: string | null;
  adresa: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
}

export interface FotoFarmyData {
  foto_url: string | null;
  foto_path: string | null;
}

export interface PestitelVyzvednuti {
  id: string | number;
  nazev_farmy: string | null;
  jmeno: string | null;
  prijmeni: string | null;
  telefon: string | null;
  email: string | null;
  mesto: string | null;
  adresa: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
}

// ─── Celý profil ─────────────────────────────────────────────────────────────

/** Načte všechna data profilu farmáře. */
export async function fetchProfilFarmara(
  pestitelId: string | number
): Promise<ProfilFarmara> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('*')
    .eq('id', pestitelId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as ProfilFarmara;
}

/** Aktualizuje profil farmáře (libovolná podmnožina polí). */
export async function updateProfilFarmara(
  pestitelId: string | number,
  updates: Partial<ProfilFarmara>
): Promise<ProfilFarmara[]> {
  const { data, error } = await supabase
    .from('pestitele')
    .update(updates)
    .eq('id', pestitelId)
    .select();

  if (error) {
    captureException(error);
    throw error;
  }
  if (!data || data.length === 0)
    throw new Error('Nepodařilo se aktualizovat záznam. Možná nemáte oprávnění nebo záznam neexistuje.');
  return data as ProfilFarmara[];
}

// ─── Heslo ───────────────────────────────────────────────────────────────────

/** Načte hash hesla farmáře. */
export async function fetchHesloHash(
  pestitelId: string | number
): Promise<string | null> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('heslo_hash')
    .eq('id', pestitelId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as { heslo_hash: string | null } | null)?.heslo_hash ?? null;
}

/** Uloží nový hash hesla. */
export async function updateHesloHash(
  pestitelId: string | number,
  hash: string
): Promise<void> {
  const { error } = await supabase
    .from('pestitele')
    .update({ heslo_hash: hash })
    .eq('id', pestitelId);

  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── Lokace ──────────────────────────────────────────────────────────────────

/** Načte lokační data farmáře. */
export async function fetchLokace(
  pestitelId: string | number
): Promise<LokaceData> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('id, mesto, adresa, gps_lat, gps_lng')
    .eq('id', pestitelId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as LokaceData;
}

/** Aktualizuje lokaci farmáře. */
export async function updateLokace(
  pestitelId: string | number,
  updates: { mesto: string; adresa: string | null; gps_lat?: number | null; gps_lng?: number | null }
): Promise<void> {
  const { error } = await supabase
    .from('pestitele')
    .update(updates)
    .eq('id', pestitelId);

  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── Časová dostupnost ───────────────────────────────────────────────────────

/** Načte text časové dostupnosti farmáře. */
export async function fetchCasovaDostupnostProfil(
  pestitelId: string | number
): Promise<string | null> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('casova_dostupnost')
    .eq('id', pestitelId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as { casova_dostupnost: string | null } | null)?.casova_dostupnost ?? null;
}

/** Uloží text časové dostupnosti. */
export async function updateCasovaDostupnost(
  pestitelId: string | number,
  dostupnost: string
): Promise<void> {
  const { error } = await supabase
    .from('pestitele')
    .update({ casova_dostupnost: dostupnost })
    .eq('id', pestitelId);

  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── Foto farmy ──────────────────────────────────────────────────────────────

/** Načte URL a cestu k fotce farmy. */
export async function fetchFotoFarmy(
  pestitelId: string | number
): Promise<FotoFarmyData> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('foto_url, foto_path')
    .eq('id', pestitelId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as FotoFarmyData;
}

/** Uloží URL a cestu k fotce farmy (nebo null při smazání). */
export async function updateFotoFarmy(
  pestitelId: string | number,
  updates: { foto_url: string | null; foto_path: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('pestitele')
    .update(updates)
    .eq('id', pestitelId);

  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── Farm number ─────────────────────────────────────────────────────────────

/** Načte farm_number farmáře (zobrazovaný kód prodejny). */
export async function fetchFarmNumber(
  pestitelId: string | number
): Promise<string | null> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('farm_number')
    .eq('id', pestitelId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as { farm_number: string | null } | null)?.farm_number ?? null;
}

// ─── Telefon ─────────────────────────────────────────────────────────────────

/** Zkontroluje, zda telefonní číslo již existuje v DB. */
export async function checkTelefonExists(
  telefon: string
): Promise<boolean> {
  const { data } = await supabase
    .from('pestitele')
    .select('id')
    .eq('telefon', telefon)
    .maybeSingle();

  return !!data;
}

/** Aktualizuje telefonní číslo farmáře. */
export async function updateTelefon(
  pestitelId: string | number,
  telefon: string
): Promise<void> {
  const { error } = await supabase
    .from('pestitele')
    .update({ telefon })
    .eq('id', pestitelId);

  if (error) {
    captureException(error);
    throw error;
  }
}

/** Načte pouze telefon farmáře (pro SMS notifikace). */
export async function fetchPestitelTelefon(
  pestitelId: string | number
): Promise<string | null> {
  const { data } = await supabase
    .from('pestitele')
    .select('telefon')
    .eq('id', Number(pestitelId))
    .single();

  return (data as { telefon: string | null } | null)?.telefon ?? null;
}

// ─── Username ─────────────────────────────────────────────────────────────────

/** Zkontroluje, zda username již existuje v DB. */
export async function checkUsernameExists(
  username: string
): Promise<boolean> {
  const { data } = await supabase
    .from('pestitele')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle();

  return !!data;
}

// ─── Vyzvednutí ──────────────────────────────────────────────────────────────

/** Načte základní data pesstitele pro stránku vyzvednutí objednávky. */
export async function fetchPestitelVyzvednuti(
  pestitelId: string | number
): Promise<PestitelVyzvednuti | null> {
  const { data } = await supabase
    .from('pestitele')
    .select('id, nazev_farmy, jmeno, prijmeni, telefon, email, mesto, adresa, gps_lat, gps_lng')
    .eq('id', pestitelId)
    .single();

  return data as PestitelVyzvednuti | null;
}
