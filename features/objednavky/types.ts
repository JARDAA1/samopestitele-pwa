// Sdílené typy pro doménu Objednávky

export interface ObjednavkaPolozka {
  id: string;
  nazev_produktu: string;
  mnozstvi: number;
  jednotka: string;
  cena?: number;
  stav_polozky?: 'novy' | 'pripraveno' | 'neni_k_dispozici' | 'zruseno';
}

export interface Objednavka {
  id: string;
  stav: string;
  created_at: string;
  datum_vyzvednuti?: string;
  anon_customer_code?: string;
  celkova_cena?: number;
  zakaznik_telefon?: string;
  poznamka_farmare?: string;
  phone_consent?: boolean;
  ready_at?: string;
}

export interface ObjednavkaSPolozkami extends Objednavka {
  polozky: ObjednavkaPolozka[];
}

/** Objednávka rozšířená o počet položek (pro operativu) */
export interface NoveObjednavky extends Objednavka {
  pocet_polozek: number;
}

export type StavObjednavky =
  | 'nova'
  | 'cekajici_na_potvrzeni'
  | 'potvrzena'
  | 'zpracovana'
  | 'ceka_na_vyzvednuti'
  | 'dokoncena'
  | 'odmitnuta'
  | 'zrusena';
