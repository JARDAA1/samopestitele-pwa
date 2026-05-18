/**
 * Hook pro načítání dokončených/odmítnutých/zrušených objednávek (archiv).
 */
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import { useFarmarAuth } from '@/features/auth/hooks/farmarAuthContext';
import { fetchDokonceneObjednavky } from '../services/objednavkyService';
import type { Objednavka } from '../types';

export interface UseDokonceneObjednavkyReturn {
  loading: boolean;
  refreshing: boolean;
  objednavky: Objednavka[];
  refresh: () => void;
}

export function useDokonceneObjednavky(): UseDokonceneObjednavkyReturn {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);

  const load = useCallback(
    async (isRefresh = false) => {
      if (!farmar?.id) {
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      try {
        const data = await fetchDokonceneObjednavky(farmar.id);
        setObjednavky(data);
      } catch (err) {
        console.error('[useDokonceneObjednavky] load error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [farmar?.id]
  );

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const refresh = useCallback(() => load(true), [load]);

  return { loading, refreshing, objednavky, refresh };
}
