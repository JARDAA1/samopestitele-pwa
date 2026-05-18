/**
 * Hook pro správu nových objednávek v operativě.
 * Zapouzdřuje načítání dat, realtime subscription a akce potvrdit/odmítnout.
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useFarmarAuth } from '@/features/auth/hooks/farmarAuthContext';
import { useRealtimeOrders } from './useRealtimeOrders';
import {
  fetchNoveObjednavky,
  potvrditObjednavku,
  odmitnoutObjednavku,
} from '../services/objednavkyService';
import type { NoveObjednavky } from '../types';

export interface UseNoveObjednavkyReturn {
  loading: boolean;
  refreshing: boolean;
  noveObjednavky: NoveObjednavky[];
  potvrdit: (id: string) => Promise<void>;
  odmitnout: (id: string) => Promise<void>;
  refresh: () => void;
}

export function useNoveObjednavky(): UseNoveObjednavkyReturn {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [noveObjednavky, setNoveObjednavky] = useState<NoveObjednavky[]>([]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!farmar?.id) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await fetchNoveObjednavky(farmar.id);
        setNoveObjednavky(data);
      } catch (err) {
        console.error('[useNoveObjednavky] load error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [farmar?.id]
  );

  // Načíst při focusu obrazovky
  useFocusEffect(useCallback(() => { load(); }, [load]));

  // Realtime – přidat novou objednávku ihned
  const handleNewOrder = useCallback((newOrder: any) => {
    if (['nova', 'cekajici_na_potvrzeni'].includes(newOrder.stav)) {
      setNoveObjednavky((prev) => [
        { ...newOrder, pocet_polozek: 0 },
        ...prev,
      ]);
    }
  }, []);

  useRealtimeOrders(farmar?.id, handleNewOrder);

  const potvrdit = useCallback(async (id: string) => {
    await potvrditObjednavku(id);
    setNoveObjednavky((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const odmitnout = useCallback(async (id: string) => {
    await odmitnoutObjednavku(id);
    setNoveObjednavky((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  return { loading, refreshing, noveObjednavky, potvrdit, odmitnout, refresh };
}
