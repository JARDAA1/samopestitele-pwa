/**
 * Supabase operace pro veřejné stránky farmářů a oblíbené farmáře.
 * Pokrývá: farmar/[id].tsx, pestitele/[id].tsx, explore.tsx
 */
import { supabase } from '@/lib/supabaseClient';
import { captureException } from '@/lib/monitoring';

// ─── Typy ────────────────────────────────────────────────────────────────────

export interface FarmarDetail {
  id: string;
  nazev_farmy: string;
  mesto: string;
  popis: string | null;
  telefon: string;
  email: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  casova_dostupnost: string | null;
}

export interface PestitelDetail {
  id: number;
  nazev_farmy: string;
  jmeno: string;
  mesto: string;
  adresa: string | null;
  popis: string | null;
  telefon: string;
  gps_lat?: number | null;
  gps_lng?: number | null;
  foto_url?: string | null;
  office_hours?: Record<string, { otevreno: boolean; od: string; do: string }> | null;
  casova_dostupnost?: string | null;
}

export interface FarmarProdukt {
  id: string | number;
  nazev: string;
  popis: string | null;
  cena: number | null;
  jednotka: string | null;
  dostupnost: string | boolean | null;
  foto_url?: string | null;
}

export interface OblibenyZaznam {
  id: number;
  pestitel_id: number;
  zakaznik_telefon?: string | null;
}

// ─── Farmář (pro farmar/[id].tsx) ─────────────────────────────────────────────

/** Načte veřejný profil farmáře (základní pole). */
export async function fetchFarmarDetail(
  farmarId: string | number
): Promise<FarmarDetail | null> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('id, nazev_farmy, mesto, popis, telefon, email, gps_lat, gps_lng, casova_dostupnost')
    .eq('id', farmarId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as FarmarDetail | null;
}

/** Načte všechny produkty farmáře (bez filtru dostupnosti). */
export async function fetchFarmarProdukty(
  farmarId: string | number
): Promise<FarmarProdukt[]> {
  const { data, error } = await supabase
    .from('produkty')
    .select('id, nazev, popis, cena, jednotka, dostupnost')
    .eq('pestitel_id', farmarId)
    .order('nazev', { ascending: true });

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as FarmarProdukt[]) ?? [];
}

// ─── Pěstitel (pro pestitele/[id].tsx) ──────────────────────────────────────

/** Načte rozšířený profil pěstitele (s GPS, adresou, fotkou). */
export async function fetchPestitelDetail(
  pestitelId: string | number
): Promise<PestitelDetail | null> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('id, nazev_farmy, jmeno, mesto, adresa, popis, telefon, gps_lat, gps_lng, foto_url, office_hours, casova_dostupnost')
    .eq('id', pestitelId)
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as PestitelDetail | null;
}

/** Načte dostupné produkty pěstitele (dostupnost = true). */
export async function fetchPestitelProdukty(
  pestitelId: string | number
): Promise<FarmarProdukt[]> {
  const { data, error } = await supabase
    .from('produkty')
    .select('id, nazev, popis, cena, jednotka, dostupnost, foto_url')
    .eq('pestitel_id', pestitelId)
    .eq('dostupnost', true);

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as FarmarProdukt[]) ?? [];
}

// ─── Oblíbení farmáři ─────────────────────────────────────────────────────────

/**
 * Zkontroluje, zda zákazník má pěstitele v oblíbených.
 * Vrátí ID záznamu nebo null.
 */
export async function checkOblibeny(
  zakaznikTelefon: string,
  pestitelId: string | number
): Promise<number | null> {
  const { data } = await supabase
    .from('oblibeni_farmari')
    .select('id')
    .eq('zakaznik_telefon', zakaznikTelefon)
    .eq('pestitel_id', pestitelId)
    .maybeSingle();

  return (data as { id: number } | null)?.id ?? null;
}

/** Přidá pěstitele do oblíbených zákazníka. */
export async function addOblibeny(
  zakaznikTelefon: string,
  pestitelId: string | number
): Promise<void> {
  const { error } = await supabase
    .from('oblibeni_farmari')
    .insert({ zakaznik_telefon: zakaznikTelefon, pestitel_id: pestitelId });

  // Ignorujeme chybu pokud farmář již je v oblíbených (unique constraint)
  if (error && !error.message.includes('unique')) throw error;
}

/**
 * Odebere pěstitele z oblíbených zákazníka
 * (podle zakaznik_telefon + pestitel_id).
 */
export async function removeOblibeny(
  zakaznikTelefon: string,
  pestitelId: string | number
): Promise<void> {
  const { error } = await supabase
    .from('oblibeni_farmari')
    .delete()
    .eq('zakaznik_telefon', zakaznikTelefon)
    .eq('pestitel_id', pestitelId);

  if (error) {
    captureException(error);
    throw error;
  }
}

/**
 * Odebere záznam oblíbeného farmáře podle ID záznamu
 * (používá explore.tsx kde máme přesné ID řádku).
 */
export async function removeOblibenyById(
  zaznamId: number,
  zakaznikTelefon: string
): Promise<void> {
  const { error } = await supabase
    .from('oblibeni_farmari')
    .delete()
    .eq('id', zaznamId)
    .eq('zakaznik_telefon', zakaznikTelefon);

  if (error) {
    captureException(error);
    throw error;
  }
}

// ─── Mapa ────────────────────────────────────────────────────────────────────

export interface FarmarMapaItem {
  id: number;
  nazev_farmy: string | null;
  mesto: string | null;
  popis: string | null;
  telefon: string | null;
  gps_lat: number;
  gps_lng: number;
}

/**
 * Načte farmáře s platnými GPS souřadnicemi pro zobrazení na mapě.
 * Filtruje NULL hodnoty i nulové souřadnice (0,0) již na úrovni DB.
 */
export async function fetchFarmariProMapu(): Promise<FarmarMapaItem[]> {
  const { data, error } = await supabase
    .from('pestitele')
    .select('id, nazev_farmy, mesto, popis, telefon, gps_lat, gps_lng')
    .not('gps_lat', 'is', null)
    .not('gps_lng', 'is', null)
    .neq('gps_lat', 0)
    .neq('gps_lng', 0)
    .order('nazev_farmy', { ascending: true });

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as FarmarMapaItem[]) ?? [];
}

// ─── Explore stránka ─────────────────────────────────────────────────────────

/**
 * Načte seznam oblíbených farmářů zákazníka (jen id + pestitel_id).
 * Detail každého farmáře lze donačíst pomocí fetchFarmarDetail.
 */
export async function fetchOblibeni(
  zakaznikTelefon: string
): Promise<OblibenyZaznam[]> {
  const { data, error } = await supabase
    .from('oblibeni_farmari')
    .select('id, pestitel_id')
    .eq('zakaznik_telefon', zakaznikTelefon)
    .order('created_at', { ascending: false });

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as OblibenyZaznam[]) ?? [];
}
