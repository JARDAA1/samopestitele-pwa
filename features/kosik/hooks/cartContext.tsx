import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';

type ShoppingListItem = {
  produkt_id: number;
  nazev: string;
  cena: number;
  jednotka: string;
  mnozstvi: number;
  pestitelNazev: string;
  pestitelId: number;
  pestitelTelefon?: string;
  pestitelMesto?: string;
};

export type AddToListResult = { blocked: boolean; existingFarmerNazev: string | null };

type ShoppingListContextType = {
  shoppingList: ShoppingListItem[];
  addToList: (item: Omit<ShoppingListItem, 'mnozstvi'>) => AddToListResult;
  clearAndAddToList: (item: Omit<ShoppingListItem, 'mnozstvi'>) => void;
  removeFromList: (produkt_id: number) => void;
  updateQuantity: (produkt_id: number, mnozstvi: number) => void;
  clearList: () => void;
  clearSellerFromList: (pestitelId: number) => void;
  totalPrice: number;
  itemCount: number;
};

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined);

// ─── localStorage helpers (Safari-safe) ──────────────────────────────────────
const STORAGE_KEY = 'draftCart';
const EXPIRY_DAYS = 7;

function lsGet(): string | null {
  try { return typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null; }
  catch { return null; }
}
function lsSave(value: string): void {
  try { if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, value); }
  catch { /* ignore */ }
}
function lsRemove(): void {
  try { if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY); }
  catch { /* ignore */ }
}

function serializeCart(list: ShoppingListItem[]): void {
  if (list.length === 0) { lsRemove(); return; }
  const sellers: Record<string, { sellerName: string; items: object[] }> = {};
  for (const item of list) {
    const key = String(item.pestitelId);
    if (!sellers[key]) sellers[key] = { sellerName: item.pestitelNazev, items: [] };
    sellers[key].items.push({
      productId: item.produkt_id,
      nazev: item.nazev,
      qty: item.mnozstvi,
      cena: item.cena,
      jednotka: item.jednotka,
      pestitelNazev: item.pestitelNazev,
      pestitelId: item.pestitelId,
      pestitelTelefon: item.pestitelTelefon,
      pestitelMesto: item.pestitelMesto,
    });
  }
  const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 86_400_000);
  lsSave(JSON.stringify({
    sellers,
    updatedAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
  }));
}

function deserializeCart(): ShoppingListItem[] {
  const raw = lsGet();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.expiresAt || new Date(parsed.expiresAt) < new Date()) {
      lsRemove();
      return [];
    }
    const items: ShoppingListItem[] = [];
    for (const seller of Object.values(parsed.sellers as Record<string, any>)) {
      for (const it of seller.items) {
        items.push({
          produkt_id: it.productId,
          nazev: it.nazev ?? '',
          cena: it.cena ?? 0,
          jednotka: it.jednotka ?? '',
          mnozstvi: it.qty ?? 1,
          pestitelNazev: it.pestitelNazev ?? seller.sellerName ?? '',
          pestitelId: it.pestitelId ?? 0,
          pestitelTelefon: it.pestitelTelefon,
          pestitelMesto: it.pestitelMesto,
        });
      }
    }
    return items;
  } catch { return []; }
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ShoppingListProvider({ children }: { children: ReactNode }) {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from localStorage on mount (once, no deps)
  useEffect(() => {
    const stored = deserializeCart();
    if (stored.length > 0) setShoppingList(stored);
    setHydrated(true);
  }, []);

  // Debounced persistence – fires only after hydration, no infinite loop
  // (setShoppingList(stored) runs before setHydrated(true), so save effect
  //  is skipped on the first render when hydrated=false)
  useEffect(() => {
    if (!hydrated) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => serializeCart(shoppingList), 300);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [shoppingList, hydrated]);

  const addToList = (item: Omit<ShoppingListItem, 'mnozstvi'>): AddToListResult => {
    // Guard: block adding items from a different farmer
    if (shoppingList.length > 0 && shoppingList[0].pestitelId !== item.pestitelId) {
      return { blocked: true, existingFarmerNazev: shoppingList[0].pestitelNazev };
    }
    setShoppingList(prev => {
      const existing = prev.find(i => i.produkt_id === item.produkt_id);
      if (existing) {
        return prev.map(i => i.produkt_id === item.produkt_id ? { ...i, mnozstvi: i.mnozstvi + 1 } : i);
      }
      return [...prev, { ...item, mnozstvi: 1 }];
    });
    return { blocked: false, existingFarmerNazev: null };
  };

  // Atomic clear + add – used when user confirms switching farmers
  const clearAndAddToList = (item: Omit<ShoppingListItem, 'mnozstvi'>) => {
    lsRemove();
    setShoppingList([{ ...item, mnozstvi: 1 }]);
  };

  const removeFromList = (produkt_id: number) => {
    setShoppingList(prev => prev.filter(i => i.produkt_id !== produkt_id));
  };

  const updateQuantity = (produkt_id: number, mnozstvi: number) => {
    if (mnozstvi <= 0) { removeFromList(produkt_id); return; }
    setShoppingList(prev => prev.map(i => i.produkt_id === produkt_id ? { ...i, mnozstvi } : i));
  };

  const clearList = () => {
    lsRemove(); // Immediate clear (e.g. after order submit) – no debounce needed
    setShoppingList([]);
  };

  const clearSellerFromList = (pestitelId: number) => {
    setShoppingList(prev => prev.filter(i => i.pestitelId !== pestitelId));
  };

  const totalPrice = shoppingList.reduce((sum, item) => sum + item.cena * item.mnozstvi, 0);
  const itemCount = shoppingList.reduce((count, item) => count + item.mnozstvi, 0);

  return (
    <ShoppingListContext.Provider value={{
      shoppingList,
      addToList,
      clearAndAddToList,
      removeFromList,
      updateQuantity,
      clearList,
      clearSellerFromList,
      totalPrice,
      itemCount,
    }}>
      {children}
    </ShoppingListContext.Provider>
  );
}

export function useShoppingList() {
  const context = useContext(ShoppingListContext);
  if (!context) throw new Error('useShoppingList must be used within ShoppingListProvider');
  return context;
}

// Alias pro zpětnou kompatibilitu – košík a nákupní seznam jsou to samé
export function useCart() {
  const context = useShoppingList();
  return {
    cart: context.shoppingList,
    addToCart: context.addToList,
    clearAndAddToCart: context.clearAndAddToList,
    removeFromCart: context.removeFromList,
    updateQuantity: context.updateQuantity,
    clearCart: context.clearList,
    clearSellerFromCart: context.clearSellerFromList,
    totalPrice: context.totalPrice,
    itemCount: context.itemCount,
  };
}
