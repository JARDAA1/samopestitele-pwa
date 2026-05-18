import { supabase } from '@/lib/supabaseClient';

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
  cas_od: string | null;    // Otevírací doba od, formát HH:MM (např. '09:00')
  cas_do: string | null;    // Otevírací doba do, formát HH:MM (např. '17:00')
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
    popis?: string | null;
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

  const now = new Date();

  if (misto.platne_od) {
    const isDatetime = misto.platne_od.includes('T');
    const platneOd = new Date(misto.platne_od);
    if (!isDatetime) platneOd.setHours(0, 0, 0, 0);
    const compareFrom = isDatetime
      ? now
      : (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); return d; })();
    if (compareFrom < platneOd) return false;
  }

  if (misto.platne_do) {
    const isDatetime = misto.platne_do.includes('T');
    const platneDo = new Date(misto.platne_do);
    if (!isDatetime) platneDo.setHours(23, 59, 59, 999);
    if (now > platneDo) return false;
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
        telefon,
        popis
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
 * Prodejní místo pro mapové zobrazení – s farmářem (název, kontakt, foto).
 * Poznámka: rating není v DB (budoucí funkce).
 */
export interface ProdejniMistoMapaItem extends ProdejniMisto {
  pestitel: {
    id: number;
    nazev_farmy: string;
    telefon: string;
    popis?: string | null;
    foto_url?: string | null;
  };
}

/**
 * Načte aktivní prodejní místa s platnými GPS souřadnicemi pro mapu.
 * Primární entita mapového zobrazení = prodejni_mista (ne pestitele).
 *
 * Filtry (DB úroveň):
 *   - aktivni = true
 *   - lat IS NOT NULL AND lat != 0
 *   - lng IS NOT NULL AND lng != 0
 *
 * Filtry (JS úroveň):
 *   - platne_od / platne_do – dnešní datum musí být v rozsahu
 */
export async function fetchProdejniMistaProMapu(): Promise<ProdejniMistoMapaItem[]> {
  const { data, error } = await supabase
    .from('prodejni_mista')
    .select(`
      *,
      pestitel:pestitele (
        id,
        nazev_farmy,
        telefon,
        popis,
        foto_url
      )
    `)
    .eq('aktivni', true)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .neq('lat', 0)
    .neq('lng', 0);

  if (error) {
    console.error('Chyba při načítání prodejních míst pro mapu:', error);
    return [];
  }

  return filterAktivniProdejniMista(data ?? []);
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
      cas_od: data.cas_od ?? null,
      cas_do: data.cas_do ?? null,
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
 * Načte počet prodejních míst farmáře.
 */
export async function fetchPocetProdejnichMist(pestitelId: number): Promise<number> {
  const { count, error } = await supabase
    .from('prodejni_mista')
    .select('*', { count: 'exact', head: true })
    .eq('pestitel_id', pestitelId);

  if (error) {
    console.error('[locationService] fetchPocetProdejnichMist error:', error);
    return 0;
  }
  return count || 0;
}

/**
 * Načte časovou dostupnost z prvního aktivního prodejního místa farmáře.
 * Vrátí string "cas_od – cas_do" nebo null.
 */
export async function fetchCasovaDostupnostMist(
  pestitelId: number
): Promise<string | null> {
  const { data, error } = await supabase
    .from('prodejni_mista')
    .select('cas_od, cas_do')
    .eq('pestitel_id', pestitelId)
    .eq('aktivni', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;
  const d = data as { cas_od: string | null; cas_do: string | null };
  if (!d.cas_od) return null;
  return `${d.cas_od} – ${d.cas_do || '?'}`;
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

/**
 * Načte aktivní dočasný stánek farmáře (aktivni=true AND platne_do >= now).
 * Pokud najde expirované záznamy, jednorázově je deaktivuje (bez smyčky, fire-and-forget).
 */
export async function fetchAktivniStanek(pestitelId: number): Promise<ProdejniMisto | null> {
  const { data, error } = await supabase
    .from('prodejni_mista')
    .select('*')
    .eq('pestitel_id', pestitelId)
    .eq('aktivni', true)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) return null;

  const now = new Date();
  const active = data.find(m => !m.platne_do || new Date(m.platne_do) >= now);
  const expired = data.filter(m => m.platne_do && new Date(m.platne_do) < now);

  // Fyzicky smazat expirované dočasné stánky (fire-and-forget)
  if (expired.length > 0) {
    const ids = expired.map(m => m.id);
    supabase.from('prodejni_mista').delete().in('id', ids).then(() => {});
  }

  return active ?? null;
}

/**
 * Fyzicky smaže všechny dočasné stánky farmáře (záznamy kde platne_do IS NOT NULL).
 * Permanentní prodejní místa (platne_do IS NULL) zůstávají nedotčena.
 */
export async function deleteDocasneStanky(pestitelId: number): Promise<boolean> {
  const { error } = await supabase
    .from('prodejni_mista')
    .delete()
    .eq('pestitel_id', pestitelId)
    .not('platne_do', 'is', null);

  if (error) {
    console.error('[locationService] deleteDocasneStanky:', error);
    return false;
  }
  return true;
}

/**
 * Vytvoří nový dočasný stánek farmáře.
 *
 * Pravidlo: před vložením fyzicky smaže všechny existující dočasné stánky
 * (platne_do IS NOT NULL) – žádná akumulace záznamů.
 * Permanentní prodejní místa jsou pouze deaktivována (aktivni=false), nikdy smazána.
 *
 * Mapa fallback: když není žádný aktivní stánek, zobrazí se permanentní adresa farmáře
 * z tabulky pestitele (gps_lat/gps_lng) – viz loadPestitele() v app/mapa/index.tsx.
 */
export async function createOrActivateDocasnyStanek(
  pestitelId: number,
  lat: number,
  lng: number,
  platneDo: Date,
  nazev?: string
): Promise<ProdejniMisto | null> {
  const now = new Date();

  // 1. Fyzicky smazat všechny dočasné stánky (platne_do IS NOT NULL).
  await deleteDocasneStanky(pestitelId);

  // 2. Deaktivovat permanentní prodejní místa (platne_do IS NULL).
  await supabase
    .from('prodejni_mista')
    .update({ aktivni: false })
    .eq('pestitel_id', pestitelId)
    .is('platne_do', null)
    .eq('aktivni', true);

  // 3. Vložit nový dočasný stánek.
  const { data: novy, error: insertErr } = await supabase
    .from('prodejni_mista')
    .insert({
      pestitel_id: pestitelId,
      nazev: nazev ?? 'Dočasný stánek',
      lat,
      lng,
      aktivni: true,
      platne_od: now.toISOString(),
      platne_do: platneDo.toISOString(),
      cas_od: null,
      cas_do: null,
    })
    .select()
    .single();

  if (insertErr) {
    console.error('[locationService] createOrActivateDocasnyStanek insert:', insertErr);
    return null;
  }
  return novy;
}

/**
 * Ukončí stánek (aktivni=false).
 */
export async function stopStanek(stanekId: number): Promise<boolean> {
  return toggleAktivniStav(stanekId, false);
}

/**
 * Aktualizuje platne_do stánku.
 */
export async function updateStanekPlatneDo(stanekId: number, platneDo: Date): Promise<boolean> {
  return updateProdejniMisto(stanekId, { platne_do: platneDo.toISOString() });
}
