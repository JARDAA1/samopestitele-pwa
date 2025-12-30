import React, { createContext, useContext, useState, ReactNode } from 'react';

type CartItem = {
  produkt_id: number;
  nazev: string;
  cena: number;
  jednotka: string;
  mnozstvi: number;
  pestitelNazev: string;
  pestitelId: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'mnozstvi'>) => void;
  removeFromCart: (produkt_id: number) => void;
  updateQuantity: (produkt_id: number, mnozstvi: number) => void;
  clearCart: () => void;
  totalPrice: number;
  itemCount: number;
  currentPestitelId: number | null;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [currentPestitelId, setCurrentPestitelId] = useState<number | null>(null);

  const addToCart = (item: Omit<CartItem, 'mnozstvi'>) => {
    // Pokud je košík prázdný, nastavíme farmáře
    if (cart.length === 0) {
      setCurrentPestitelId(item.pestitelId);
    }

    // Zkontrolujeme, zda produkt již není v košíku
    const existingItem = cart.find((i) => i.produkt_id === item.produkt_id);

    if (existingItem) {
      // Zvýšíme množství
      setCart(
        cart.map((i) =>
          i.produkt_id === item.produkt_id
            ? { ...i, mnozstvi: i.mnozstvi + 1 }
            : i
        )
      );
    } else {
      // Přidáme nový produkt s množstvím 1
      setCart([...cart, { ...item, mnozstvi: 1 }]);
    }
  };

  const removeFromCart = (produkt_id: number) => {
    const newCart = cart.filter((item) => item.produkt_id !== produkt_id);
    setCart(newCart);

    // Pokud je košík prázdný, resetujeme farmáře
    if (newCart.length === 0) {
      setCurrentPestitelId(null);
    }
  };

  const updateQuantity = (produkt_id: number, mnozstvi: number) => {
    if (mnozstvi <= 0) {
      removeFromCart(produkt_id);
      return;
    }

    setCart(
      cart.map((item) =>
        item.produkt_id === produkt_id ? { ...item, mnozstvi } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
    setCurrentPestitelId(null);
  };

  const totalPrice = cart.reduce((sum, item) => sum + item.cena * item.mnozstvi, 0);
  const itemCount = cart.reduce((count, item) => count + item.mnozstvi, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalPrice,
        itemCount,
        currentPestitelId,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
