/**
 * localStorage abstrakce pro zákaznický seznam.
 * Klíče: customer_list_v1 (položky), customer_list_meta_v1 (metadata – lastFarmer)
 */

const ITEMS_KEY = 'customer_list_v1';
const META_KEY = 'customer_list_meta_v1';

export interface CustomerListItem {
  produktId: string;
  produktNazev: string;
  farmarId: string;
  farmarNazev: string;
  farmarTelefon: string;
  cena: number | null;
  jednotka: string | null;
  mnozstvi: number;
  mnozstviJednotka: string;
  pridanoV: string; // ISO timestamp
  preferovaneVyzvednutiDatum?: string;
  preferovaneVyzvednutiCas?: string;
}

export interface CustomerListMeta {
  lastFarmer: { id: string; name: string } | null;
  updatedAt: string; // ISO
}

function isAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function getCustomerList(): CustomerListItem[] {
  if (!isAvailable()) return [];
  try {
    const raw = localStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function setCustomerList(items: CustomerListItem[]): void {
  if (!isAvailable()) return;
  try {
    localStorage.setItem(ITEMS_KEY, JSON.stringify(items));
  } catch {
    // silent fail — non-critical
  }
}

export function getCustomerListMeta(): CustomerListMeta {
  const fallback: CustomerListMeta = {
    lastFarmer: null,
    updatedAt: new Date().toISOString(),
  };
  if (!isAvailable()) return fallback;
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return fallback;
    return JSON.parse(raw) as CustomerListMeta;
  } catch {
    return fallback;
  }
}

export function setCustomerListMeta(meta: CustomerListMeta): void {
  if (!isAvailable()) return;
  try {
    localStorage.setItem(META_KEY, JSON.stringify(meta));
  } catch {
    // silent fail
  }
}

export function clearCustomerListStorage(): void {
  if (!isAvailable()) return;
  try {
    localStorage.removeItem(ITEMS_KEY);
    localStorage.removeItem(META_KEY);
  } catch {
    // silent fail
  }
}
