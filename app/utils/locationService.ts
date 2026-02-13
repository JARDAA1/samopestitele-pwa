import { supabase } from '../../lib/supabase';

/**
 * Prodejní místo - TypeScript typ
 */
export interface ProdejniMisto {
  id: number;
  pestitel_id: number;
  nazev: string;
  adresa: string | null;
  lat: number | null;
  lng: number | null;
  aktivni: boolean;
  platne_od: string | null; // ISO date string
  platne_do: string | null; // ISO date string
  created_at: string;
}

/**
 * Prodejní místo s informacemi o farmáři (pro mapu)
 */
export interface ProdejniMistoSFarmarem extends ProdejniMisto {
  pestitel: {
    id: number;
    nazev_farmy: string;
    jmeno: string;
    telefon: string;
  };
}

/**
 * Zkontroluje, zda je prodejní místo aktivní pro dnešní datum
 *
 * Logika:
 * - aktivni = true
 * - (platne_od IS NULL OR today >= platne_od)
 * - (platne_do IS NULL OR today <= platne_do)
 */
export function isProdejniMistoAktivniDnes(misto: ProdejniMisto): boolean {
  if (!misto.aktivni) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (misto.platne_od) {
    const platneOd = new Date(misto.platne_od);
    platneOd.setHours(0, 0, 0, 0);
    if (today < platneOd) return false;
  }

  if (misto.platne_do) {
    const platneDo = new Date(misto.platne_do);
    platneDo.setHours(23, 59, 59, 999);
    if (today > platneDo) return false;
  }

  return true;
}

/**
 * Filtruje pole prodejních míst a vrací pouze aktivní pro dnešní datum
 */
export function filterAktivniProdejniMista<T extends ProdejniMisto>(mista: T[]): T[] {
  return mista.filter(isProdejniMistoAktivniDnes);
}

/**
 * Načte všechna prodejní místa farmáře
 */
export async function getProdejniMistaFarmare(pestitelId: number): Promise<ProdejniMisto[]> {
  const { data, error } = await supabase
    .from('prodejni_mista')
    .select('*')
    .eq('pestitel_id', pestitelId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Chyba při načítání prodejních míst:', error);
    return [];
  }

  return data || [];
}

/**
 * Načte pouze aktivní prodejní místa farmáře (pro dnešek)
 */
export async function getAktivniProdejniMistaFarmare(pestitelId: number): Promise<ProdejniMisto[]> {
  const mista = await getProdejniMistaFarmare(pestitelId);
  return filterAktivniProdejniMista(mista);
}

/**
 * Načte všechna aktivní prodejní místa pro mapu (všichni farmáři)
 */
export async function getVsechnaAktivniProdejniMista(): Promise<ProdejniMistoSFarmarem[]> {
  const { data, error } = await supabase
    .from('prodejni_mista')
    .select(`
      *,
      pestitel:pestitele (
        id,
        nazev_farmy,
        jmeno,
        telefon
      )
    `)
    .eq('aktivni', true);

  if (error) {
    console.error('Chyba při načítání prodejních míst pro mapu:', error);
    return [];
  }

  // Filtrovat podle datumové platnosti
  return filterAktivniProdejniMista(data || []);
}

/**
 * Vytvoří nové prodejní místo
 */
export async function createProdejniMisto(
  pestitelId: number,
  data: Partial<Omit<ProdejniMisto, 'id' | 'pestitel_id' | 'created_at'>>
): Promise<ProdejniMisto | null> {
  const { data: noveMisto, error } = await supabase
    .from('prodejni_mista')
    .insert({
      pestitel_id: pestitelId,
      nazev: data.nazev,
      adresa: data.adresa,
      lat: data.lat,
      lng: data.lng,
      aktivni: data.aktivni,
      platne_od: data.platne_od,
      platne_do: data.platne_do,
    })
    .select()
    .single();

  if (error) {
    console.error('Chyba při vytváření prodejního místa:', error);
    return null;
  }

  return noveMisto;
}

/**
 * Aktualizuje prodejní místo
 */
export async function updateProdejniMisto(
  mistoId: number,
  data: Partial<Omit<ProdejniMisto, 'id' | 'pestitel_id' | 'created_at'>>
): Promise<boolean> {
  const { error } = await supabase
    .from('prodejni_mista')
    .update(data)
    .eq('id', mistoId);

  if (error) {
    console.error('Chyba při aktualizaci prodejního místa:', error);
    return false;
  }

  return true;
}

/**
 * Smaže prodejní místo
 */
export async function deleteProdejniMisto(mistoId: number): Promise<boolean> {
  const { error } = await supabase
    .from('prodejni_mista')
    .delete()
    .eq('id', mistoId);

  if (error) {
    console.error('Chyba při mazání prodejního místa:', error);
    return false;
  }

  return true;
}

/**
 * Přepne aktivní stav prodejního místa
 */
export async function toggleAktivniStav(mistoId: number, aktivni: boolean): Promise<boolean> {
  return updateProdejniMisto(mistoId, { aktivni });
}

/**
 * Získá jedno prodejní místo podle ID
 */
export async function getProdejniMistoById(mistoId: number): Promise<ProdejniMisto | null> {
  const { data, error } = await supabase
    .from('prodejni_mista')
    .select('*')
    .eq('id', mistoId)
    .single();

  if (error) {
    console.error('Chyba při načítání prodejního místa:', error);
    return null;
  }

  return data;
}
