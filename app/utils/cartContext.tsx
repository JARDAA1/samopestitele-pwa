import React, { createContext, useContext, useState, ReactNode } from 'react';

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

type ShoppingListContextType = {
  shoppingList: ShoppingListItem[];
  addToList: (item: Omit<ShoppingListItem, 'mnozstvi'>) => void;
  removeFromList: (produkt_id: number) => void;
  updateQuantity: (produkt_id: number, mnozstvi: number) => void;
  clearList: () => void;
  totalPrice: number;
  itemCount: number;
};

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined);

export function ShoppingListProvider({ children }: { children: ReactNode }) {
  const [shoppingList, setShoppingList] = useState<ShoppingListItem[]>([]);

  const addToList = (item: Omit<ShoppingListItem, 'mnozstvi'>) => {
    // Zkontrolujeme, zda produkt již není v seznamu
    const existingItem = shoppingList.find((i) => i.produkt_id === item.produkt_id);

    if (existingItem) {
      // Zvýšíme množství
      setShoppingList(
        shoppingList.map((i) =>
          i.produkt_id === item.produkt_id
            ? { ...i, mnozstvi: i.mnozstvi + 1 }
            : i
        )
      );
    } else {
      // Přidáme nový produkt s množstvím 1 - MŮŽEME MÍT PRODUKTY OD RŮZNÝCH FARMÁŘŮ
      setShoppingList([...shoppingList, { ...item, mnozstvi: 1 }]);
    }
  };

  const removeFromList = (produkt_id: number) => {
    setShoppingList(shoppingList.filter((item) => item.produkt_id !== produkt_id));
  };

  const updateQuantity = (produkt_id: number, mnozstvi: number) => {
    if (mnozstvi <= 0) {
      removeFromList(produkt_id);
      return;
    }

    setShoppingList(
      shoppingList.map((item) =>
        item.produkt_id === produkt_id ? { ...item, mnozstvi } : item
      )
    );
  };

  const clearList = () => {
    setShoppingList([]);
  };

  const totalPrice = shoppingList.reduce((sum, item) => sum + item.cena * item.mnozstvi, 0);
  const itemCount = shoppingList.reduce((count, item) => count + item.mnozstvi, 0);

  return (
    <ShoppingListContext.Provider
      value={{
        shoppingList,
        addToList,
        removeFromList,
        updateQuantity,
        clearList,
        totalPrice,
        itemCount,
      }}
    >
      {children}
    </ShoppingListContext.Provider>
  );
}

export function useShoppingList() {
  const context = useContext(ShoppingListContext);
  if (!context) {
    throw new Error('useShoppingList must be used within ShoppingListProvider');
  }
  return context;
}

