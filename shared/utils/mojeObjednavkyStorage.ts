const LS_KEY = 'moje_objednavky';

export interface MojeObjednavkaRef {
  id: string;
  pestitelId?: number;
  pestitelNazev: string;
  celkovaCena: number;
  createdAt: string; // ISO
}

function isAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function getMojeObjednavky(): MojeObjednavkaRef[] {
  if (!isAvailable()) return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMojeObjednavka(ref: MojeObjednavkaRef): void {
  if (!isAvailable()) return;
  try {
    const existing = getMojeObjednavky();
    // avoid duplicates
    const filtered = existing.filter((o) => o.id !== ref.id);
    filtered.unshift(ref); // newest first
    localStorage.setItem(LS_KEY, JSON.stringify(filtered));
  } catch {
    // silent fail — non-critical
  }
}

export function clearMojeObjednavky(): void {
  if (!isAvailable()) return;
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // silent fail
  }
}
