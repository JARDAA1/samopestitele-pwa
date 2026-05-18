/**
 * Supabase operace pro doménu Produkty.
 * Všechny přímé dotazy do DB jsou zde.
 */
import { supabase } from '@/lib/supabaseClient';
import type { Produkt, PredefinedProduct, InsertProdukt } from '../types';
import { captureException } from '@/lib/monitoring';

// ─── SEZNAM PRODUKTŮ ─────────────────────────────────────────────────────────

/** Načte aktivní produkty daného prodejce. */
export async function fetchAktivniProdukty(
  pestitelId: string
): Promise<Produkt[]> {
  const { data, error } = await supabase
    .from('produkty')
    .select('*')
    .eq('pestitel_id', pestitelId)
    .eq('archivovano', false)
    .order('created_at', { ascending: false });

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as Produkt[]) ?? [];
}

/** Načte archivované produkty daného prodejce. */
export async function fetchArchivovaneProdukty(
  pestitelId: string
): Promise<Produkt[]> {
  const { data, error } = await supabase
    .from('produkty')
    .select('*')
    .eq('pestitel_id', pestitelId)
    .eq('archivovano', true)
    .order('created_at', { ascending: false });

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as Produkt[]) ?? [];
}

/** Vrátí počet aktivních produktů. */
export async function fetchPocetAktivnichProduktu(
  pestitelId: string
): Promise<number> {
  const { count } = await supabase
    .from('produkty')
    .select('*', { count: 'exact', head: true })
    .eq('pestitel_id', pestitelId)
    .eq('archivovano', false);
  return count ?? 0;
}

// ─── PŘIDAT PRODUKT ──────────────────────────────────────────────────────────

/** Načte seznam předdefinovaných produktů ze šablonovací tabulky. */
export async function fetchPredefinovaneProdukty(): Promise<
  PredefinedProduct[]
> {
  const { data, error } = await supabase
    .from('predefinovane_produkty')
    .select('*')
    .order('kategorie', { ascending: true })
    .order('nazev', { ascending: true });

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as PredefinedProduct[]) ?? [];
}

/**
 * Zkontroluje, zda pro daného prodejce existuje aktivní produkt se stejným
 * nebo velmi podobným názvem (ochrana před duplikáty).
 * Vrátí nalezený produkt nebo null.
 */
export async function checkDuplicateProdukt(
  pestitelId: string,
  nazev: string
): Promise<Produkt | null> {
  const { data, error } = await supabase
    .from('produkty')
    .select('id, nazev')
    .eq('pestitel_id', Number(pestitelId))
    .eq('archivovano', false);

  if (error) {
    captureException(error);
    throw error;
  }
  if (!data) return null;

  const normalizedNew = normalizeProductName(nazev);

  const found = data.find((p: any) => {
    const normalizedExisting = normalizeProductName(p.nazev);
    if (normalizedExisting === normalizedNew) return true;
    const distance = levenshteinDistance(normalizedExisting, normalizedNew);
    const maxLen = Math.max(normalizedExisting.length, normalizedNew.length);
    const threshold = Math.min(2, Math.ceil(maxLen * 0.2));
    return distance <= threshold;
  });

  return (found as Produkt) ?? null;
}

/** Vloží nový produkt do DB. */
export async function insertProdukt(data: InsertProdukt): Promise<Produkt> {
  const { data: result, error } = await supabase
    .from('produkty')
    .insert(data)
    .select()
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return result as Produkt;
}

// ─── EDITACE PRODUKTU ────────────────────────────────────────────────────────

/** Načte jeden produkt podle ID. */
export async function fetchProduktById(id: string | number): Promise<Produkt> {
  const { data, error } = await supabase
    .from('produkty')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as Produkt;
}

/** Aktualizuje produkt v DB. */
export async function updateProdukt(
  id: string | number,
  updates: Partial<InsertProdukt & { archivovano: boolean; dostupnost: boolean }>
): Promise<void> {
  const { error } = await supabase
    .from('produkty')
    .update(updates)
    .eq('id', id);

  if (error) {
    captureException(error);
    throw error;
  }
}

/** Přepne archivační stav produktu. */
export async function archivujProdukt(
  id: string | number,
  novyStav: boolean
): Promise<void> {
  const { data, error } = await supabase
    .from('produkty')
    .update({ archivovano: novyStav })
    .eq('id', id)
    .select();

  if (error) {
    captureException(error);
    throw error;
  }
  if (!data || data.length === 0)
    throw new Error('Produkt nebyl nalezen nebo nemáte oprávnění k této akci');
}

/**
 * Kontrola duplicitního názvu produktu při editaci –
 * vyloučí aktuální produkt (podle excludeId) z výsledků.
 */
export async function checkDuplicateExcluding(
  pestitelId: string | number,
  nazev: string,
  excludeId: string | number
): Promise<Produkt | null> {
  const { data, error } = await supabase
    .from('produkty')
    .select('id, nazev')
    .eq('pestitel_id', Number(pestitelId))
    .eq('archivovano', false)
    .neq('id', excludeId);

  if (error) {
    captureException(error);
    throw error;
  }
  if (!data) return null;

  const normalizedNew = normalizeProductName(nazev);

  const found = data.find((p: any) => {
    const normalizedExisting = normalizeProductName(p.nazev);
    if (normalizedExisting === normalizedNew) return true;
    const distance = levenshteinDistance(normalizedExisting, normalizedNew);
    const maxLen = Math.max(normalizedExisting.length, normalizedNew.length);
    const threshold = Math.min(2, Math.ceil(maxLen * 0.2));
    return distance <= threshold;
  });

  return (found as Produkt) ?? null;
}

// ─── HELPERS (interní) ───────────────────────────────────────────────────────

function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2[i - 1] === str1[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}
