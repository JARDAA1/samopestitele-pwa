/**
 * Supabase operace pro efemérní stánky (tabulka `stanky_dnes`).
 * Farmář nemusí být registrován — fotka + GPS + půlnoční expirace.
 */
import { supabase } from '@/lib/supabaseClient';
import { captureException } from '@/lib/monitoring';

// ─── Typy ─────────────────────────────────────────────────────────────────────

export interface StanekDnes {
  id: string;
  foto_url: string;
  gps_lat: number;
  gps_lng: number;
  lokace_text: string | null;
  poznamka: string | null;
  datum_prodeje: string | null; // YYYY-MM-DD, null = dnes
  created_at: string;
  expires_at: string;
  delete_token?: string; // vrací se jen při vytvoření
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Vrátí ISO string pro půlnoc zadaného dne (nebo dnes). */
function getMidnightExpiry(datum_prodeje?: string | null): string {
  const d = datum_prodeje ? new Date(datum_prodeje) : new Date();
  d.setHours(24, 0, 0, 0);
  return d.toISOString();
}

// ─── Service funkce ───────────────────────────────────────────────────────────

/** Načte všechny stánky platné do půlnoci, seřazené od nejnovějšího. */
export async function fetchActiveStankyDnes(): Promise<StanekDnes[]> {
  const { data, error } = await supabase
    .from('stanky_dnes')
    .select('*')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    captureException(error);
    return [];
  }
  return (data as StanekDnes[]) ?? [];
}

/** Přidá nový stánek. `datum_prodeje` ve formátu YYYY-MM-DD, null = dnes. */
export async function addStanekDnes(
  foto_url: string,
  gps_lat: number,
  gps_lng: number,
  lokace_text: string | null = null,
  poznamka: string | null = null,
  datum_prodeje: string | null = null
): Promise<StanekDnes> {
  const { data, error } = await supabase
    .from('stanky_dnes')
    .insert({
      foto_url,
      gps_lat,
      gps_lng,
      lokace_text,
      poznamka,
      datum_prodeje,
      expires_at: getMidnightExpiry(datum_prodeje),
    })
    .select('id, foto_url, gps_lat, gps_lng, lokace_text, poznamka, datum_prodeje, created_at, expires_at, delete_token')
    .single();

  if (error) {
    captureException(error);
    throw error;
  }
  return data as StanekDnes;
}

/** Smaže stánek podle ID a delete_token. Bezpečné i bez autentifikace. */
export async function deleteStanekDnes(
  id: string,
  delete_token: string
): Promise<void> {
  const { error } = await supabase
    .from('stanky_dnes')
    .delete()
    .eq('id', id)
    .eq('delete_token', delete_token);

  if (error) {
    captureException(error);
    throw error;
  }
}
