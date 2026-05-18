/**
 * Supabase operace pro doménu Stánky (tabulka `stanky`).
 */
import { supabase } from '@/lib/supabaseClient';
import { captureException } from '@/lib/monitoring';

// ─── Typy ────────────────────────────────────────────────────────────────────

export interface Stanek {
  id: string;
  pestitel_id: string;
  nazev: string;
  popis: string | null;
  mesto: string;
  ulice: string;
  foto_url: string | null;
  datum_od: string;   // ISO date string (YYYY-MM-DD)
  datum_do: string;
  cas_od: string;    // HH:MM
  cas_do: string;
  aktivni?: boolean; // computed field, not in DB
}

export type InsertStanek = Omit<Stanek, 'id' | 'aktivni'>;
export type UpdateStanek = Partial<Omit<Stanek, 'id' | 'pestitel_id' | 'aktivni'>>;

// ─── Service funkce ───────────────────────────────────────────────────────────

/** Načte všechny stánky farmáře, seřazené sestupně podle datum_od. */
export async function fetchStanky(pestitelId: string): Promise<Stanek[]> {
  const { data, error } = await supabase
    .from('stanky')
    .select('*')
    .eq('pestitel_id', pestitelId)
    .order('datum_od', { ascending: false });

  if (error) {
    captureException(error);
    throw error;
  }
  return (data as Stanek[]) ?? [];
}

/** Vloží nový stánek. */
export async function insertStanek(data: InsertStanek): Promise<void> {
  const { error } = await supabase.from('stanky').insert(data);
  if (error) {
    captureException(error);
    throw error;
  }
}

/** Aktualizuje existující stánek podle ID. */
export async function updateStanek(
  id: string,
  updates: UpdateStanek
): Promise<void> {
  const { error } = await supabase
    .from('stanky')
    .update(updates)
    .eq('id', id);

  if (error) {
    captureException(error);
    throw error;
  }
}

/** Smaže stánek podle ID. */
export async function deleteStanek(id: string): Promise<void> {
  const { error } = await supabase.from('stanky').delete().eq('id', id);
  if (error) {
    captureException(error);
    throw error;
  }
}
