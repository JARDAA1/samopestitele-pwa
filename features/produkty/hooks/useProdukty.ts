/**
 * Hook pro načítání seznamu produktů prodejce (aktivní + archivované).
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useFarmarAuth } from '@/features/auth/hooks/farmarAuthContext';
import {
  fetchAktivniProdukty,
  fetchArchivovaneProdukty,
} from '../services/produktyService';
import type { Produkt } from '../types';

export interface UseProduktyReturn {
  loading: boolean;
  refreshing: boolean;
  produkty: Produkt[];
  archivovaneProdukty: Produkt[];
  refresh: () => void;
}

export function useProdukty(): UseProduktyReturn {
  const { farmar, isAuthenticated } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [archivovaneProdukty, setArchivovaneProdukty] = useState<Produkt[]>([]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!isAuthenticated || !farmar?.id) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const [aktivni, archivovane] = await Promise.all([
          fetchAktivniProdukty(farmar.id),
          fetchArchivovaneProdukty(farmar.id),
        ]);
        setProdukty(aktivni);
        setArchivovaneProdukty(archivovane);
      } catch (err) {
        console.error('[useProdukty] load error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [farmar?.id, isAuthenticated]
  );

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = useCallback(() => load(true), [load]);

  return { loading, refreshing, produkty, archivovaneProdukty, refresh };
}
