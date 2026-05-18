// Sdílené typy pro doménu Produkty

export interface Produkt {
  id: string;
  nazev: string;
  popis: string | null;
  cena: number;
  jednotka: string;
  dostupnost: boolean;
  emoji: string | null;
  kategorie: string;
  created_at: string;
  archivovano: boolean;
}

export interface PredefinedProduct {
  id: number;
  nazev: string;
  emoji: string;
  kategorie: string;
}

export interface InsertProdukt {
  pestitel_id: number;
  nazev: string;
  popis: string | null;
  cena: number;
  mnozstvi: null;
  jednotka: string;
  kategorie: string;
  dostupnost: boolean;
  emoji: string;
  archivovano: boolean;
}
