import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  type CustomerListItem,
  type CustomerListMeta,
  getCustomerList,
  setCustomerList,
  getCustomerListMeta,
  setCustomerListMeta,
  clearCustomerListStorage,
} from '../services/customerListStorage';

export type { CustomerListItem };

interface CustomerListContextType {
  items: CustomerListItem[];
  /** Počet unikátních produktů v seznamu */
  itemCount: number;
  /** Součet mnozstvi přes všechny položky */
  totalCount: number;
  lastFarmer: { id: string; name: string } | null;
  addItem: (item: CustomerListItem) => void;
  removeItem: (produktId: string) => void;
  hasItem: (produktId: string) => boolean;
  getItem: (produktId: string) => CustomerListItem | undefined;
  clearList: () => void;
}

const CustomerListContext = createContext<CustomerListContextType | null>(null);

export function CustomerListProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CustomerListItem[]>([]);
  const [meta, setMetaState] = useState<CustomerListMeta>({
    lastFarmer: null,
    updatedAt: new Date().toISOString(),
  });

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(getCustomerList());
    setMetaState(getCustomerListMeta());
  }, []);

  const itemCount = items.length;
  const totalCount = items.reduce((sum, item) => sum + item.mnozstvi, 0);

  const addItem = useCallback((item: CustomerListItem) => {
    setItems(prev => {
      const exists = prev.some(i => i.produktId === item.produktId);
      const next = exists
        ? prev.map(i => (i.produktId === item.produktId ? item : i))
        : [...prev, item];
      setCustomerList(next);
      return next;
    });
    const newMeta: CustomerListMeta = {
      lastFarmer: { id: item.farmarId, name: item.farmarNazev },
      updatedAt: new Date().toISOString(),
    };
    setMetaState(newMeta);
    setCustomerListMeta(newMeta);
  }, []);

  const removeItem = useCallback((produktId: string) => {
    setItems(prev => {
      const next = prev.filter(i => i.produktId !== produktId);
      setCustomerList(next);
      return next;
    });
  }, []);

  const hasItem = useCallback(
    (produktId: string) => items.some(i => i.produktId === produktId),
    [items]
  );

  const getItem = useCallback(
    (produktId: string) => items.find(i => i.produktId === produktId),
    [items]
  );

  const clearList = useCallback(() => {
    setItems([]);
    const newMeta: CustomerListMeta = {
      lastFarmer: null,
      updatedAt: new Date().toISOString(),
    };
    setMetaState(newMeta);
    clearCustomerListStorage();
  }, []);

  return (
    <CustomerListContext.Provider
      value={{
        items,
        itemCount,
        totalCount,
        lastFarmer: meta.lastFarmer,
        addItem,
        removeItem,
        hasItem,
        getItem,
        clearList,
      }}
    >
      {children}
    </CustomerListContext.Provider>
  );
}

export function useCustomerList(): CustomerListContextType {
  const ctx = useContext(CustomerListContext);
  if (!ctx) {
    throw new Error('useCustomerList must be used within CustomerListProvider');
  }
  return ctx;
}
