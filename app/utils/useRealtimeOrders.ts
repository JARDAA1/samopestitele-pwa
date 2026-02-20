import { useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook pro realtime subscription na nové objednávky pro daného prodejce.
 * Automaticky se subscribuje při mount a unsubscribuje při unmount.
 *
 * @param pestitelId - ID prodejce (farmar.id)
 * @param onNewOrder - Callback volaný při vytvoření nové objednávky
 */
export function useRealtimeOrders(
  pestitelId: string | undefined,
  onNewOrder: (order: any) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const callbackRef = useRef(onNewOrder);

  // Aktualizovat callback ref při změně (bez re-subscription)
  useEffect(() => {
    callbackRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    // Nepřihlašovat se pokud nemáme ID prodejce
    if (!pestitelId) return;

    // Vytvořit unikátní channel pro tohoto prodejce
    const channel = supabase
      .channel(`objednavky-seller-${pestitelId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'objednavky',
          filter: `pestitel_id=eq.${pestitelId}`,
        },
        (payload) => {
          // Zavolat callback s novou objednávkou
          callbackRef.current(payload.new);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Subscribed to orders for seller:', pestitelId);
        }
      });

    channelRef.current = channel;

    // Cleanup při unmount nebo změně pestitelId
    return () => {
      if (channelRef.current) {
        console.log('[Realtime] Unsubscribing from orders for seller:', pestitelId);
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [pestitelId]);
}
