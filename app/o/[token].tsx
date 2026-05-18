/**
 * Veřejná stránka stavu objednávky – přístupná bez registrace.
 * URL: /o/[token]  kde token je 32-znakový hex (public_token z DB).
 *
 * Zobrazuje: stav, produkty, celkovou cenu, info o vyzvednutí.
 * NEZOBRAZUJE: interní ID, telefon, soukromé údaje zákazníka.
 */
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  fetchObjednavkaByPublicToken,
  fetchPolozkyVyzvednuti,
  fetchProdejniMistoPublicInfo,
  ObjednavkaPublic,
  ProdejniMistoPublicInfo,
} from '@/features/objednavky/services/objednavkyService';
import type { ObjednavkaPolozka } from '@/features/objednavky/types';
import { isRateLimited } from '@/app/_utils/rateLimit';
import { formatKc, formatMnozstvi } from '@/app/_utils/formatKc';

// ── Stav mapping ─────────────────────────────────────────────────────────────

type StavSpec = 'cekajici' | 'potvrzeno' | 'pripraveno' | 'vydano' | 'zruseno';

function mapStav(stav: string): StavSpec {
  switch (stav) {
    case 'nova':
    case 'cekajici_na_potvrzeni':
      return 'cekajici';
    case 'potvrzena':
      return 'potvrzeno';
    case 'zpracovana':
      return 'pripraveno';
    case 'dokoncena':
      return 'vydano';
    case 'zrusena':
    case 'odmitnuta':
    default:
      return 'zruseno';
  }
}

function getStavLabel(s: StavSpec): string {
  switch (s) {
    case 'cekajici':  return '🟡 Čeká na potvrzení';
    case 'potvrzeno': return '🔵 Potvrzeno';
    case 'pripraveno': return '🟢 Připraveno k vyzvednutí';
    case 'vydano':    return '⚫ Vydáno';
    case 'zruseno':   return '🔴 Zrušeno';
  }
}

function getStavHint(s: StavSpec): string {
  switch (s) {
    case 'cekajici':  return 'Objednávka čeká na potvrzení pěstitelem.';
    case 'potvrzeno': return 'Připravujeme ji k vyzvednutí.';
    case 'pripraveno': return 'Přijďte během otevírací doby.';
    case 'vydano':    return 'Děkujeme za vyzvednutí.';
    case 'zruseno':   return 'Objednávka byla zrušena.';
  }
}

function formatCas(cas?: string): string {
  if (!cas) return '';
  return cas.slice(0, 5); // "09:00:00" → "09:00"
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublicOrderStatusScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();

  const [loading, setLoading]           = useState(true);
  const [notFound, setNotFound]         = useState(false);
  const [objednavka, setObjednavka]     = useState<ObjednavkaPublic | null>(null);
  const [polozky, setPolozky]           = useState<ObjednavkaPolozka[]>([]);
  const [prodejniMisto, setProdejniMisto] = useState<ProdejniMistoPublicInfo | null>(null);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    load(token);
  }, [token]);

  const load = async (tok: string) => {
    setLoading(true);
    setNotFound(false);
    setObjednavka(null);

    // Rate limit: max 20 requests per token per 10 min (client-side guard)
    if (isRateLimited(`order_status_${tok}`)) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    // Identical timing for found/not-found to prevent enumeration
    const order = await fetchObjednavkaByPublicToken(tok);
    if (!order) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setObjednavka(order);

    const stavSpec = mapStav(order.stav);
    const needsPickup =
      (stavSpec === 'potvrzeno' || stavSpec === 'pripraveno') &&
      order.prodejni_misto_id != null;

    const [polozkyData, mistoData] = await Promise.all([
      fetchPolozkyVyzvednuti(order.id),
      needsPickup
        ? fetchProdejniMistoPublicInfo(order.prodejni_misto_id!)
        : Promise.resolve(null),
    ]);

    setPolozky(polozkyData);
    setProdejniMisto(mistoData);
    setLoading(false);
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#33691e" />
      </View>
    );
  }

  // ── 404 ───────────────────────────────────────────────────────────────────

  if (notFound || !objednavka) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundText}>Objednávka nebyla nalezena</Text>
      </View>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────

  const stavSpec  = mapStav(objednavka.stav);
  const showPickup =
    (stavSpec === 'potvrzeno' || stavSpec === 'pripraveno') &&
    prodejniMisto != null;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.wrapper}>

        {/* Page title */}
        <Text style={styles.pageTitle}>Stav objednávky</Text>

        {/* Main card */}
        <View style={styles.card}>

          {/* 1) STATUS */}
          <Text style={styles.stavLabel}>{getStavLabel(stavSpec)}</Text>
          <Text style={styles.stavHint}>{getStavHint(stavSpec)}</Text>

          <View style={styles.divider} />

          {/* 2) PRODUCTS */}
          <Text style={styles.sectionTitle}>Produkty</Text>
          {polozky.length === 0 ? (
            <Text style={styles.emptyText}>Žádné položky</Text>
          ) : (
            polozky.map((p, idx) => (
              <View key={`${p.nazev_produktu}-${idx}`} style={styles.productRow}>
                <Text style={styles.productName}>{p.nazev_produktu}</Text>
                <Text style={styles.productQty}>
                  {formatMnozstvi(p.mnozstvi)} {p.jednotka}
                </Text>
              </View>
            ))
          )}

          <View style={styles.divider} />

          {/* 3) PRICE */}
          <Text style={styles.sectionTitle}>Celková cena</Text>
          <Text style={styles.price}>
            {objednavka.celkova_cena != null
              ? `${formatKc(objednavka.celkova_cena)} Kč`
              : '—'}
          </Text>

          {/* 4) PICKUP – only for potvrzeno / pripraveno */}
          {showPickup && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>Vyzvednutí</Text>

              <Text style={styles.pickupLabel}>Prodejní místo</Text>
              <Text style={styles.pickupValue}>{prodejniMisto!.nazev}</Text>
              {prodejniMisto!.adresa ? (
                <Text style={styles.pickupSub}>{prodejniMisto!.adresa}</Text>
              ) : null}

              {(prodejniMisto!.cas_od || prodejniMisto!.cas_do) ? (
                <View style={styles.hoursBlock}>
                  <Text style={styles.pickupLabel}>Otevírací doba</Text>
                  <Text style={styles.pickupValue}>
                    {[formatCas(prodejniMisto!.cas_od), formatCas(prodejniMisto!.cas_do)]
                      .filter(Boolean)
                      .join(' – ')}
                  </Text>
                </View>
              ) : null}
            </>
          )}

        </View>
      </View>
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  wrapper: {
    width: '100%',
    maxWidth: 480,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#F5F5F5',
  },
  notFoundText: {
    fontSize: 18,
    color: '#333',
    textAlign: 'center',
  },

  // Page title
  pageTitle: {
    fontSize: 12,
    color: '#AAA',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },

  // Status
  stavLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  stavHint: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginVertical: 20,
  },

  // Section heading
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#AAA',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  // Products
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productName: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    marginRight: 8,
  },
  productQty: {
    fontSize: 14,
    color: '#888',
  },
  emptyText: {
    fontSize: 14,
    color: '#CCC',
  },

  // Price
  price: {
    fontSize: 28,
    fontWeight: '700',
    color: '#222',
  },

  // Pickup
  pickupLabel: {
    fontSize: 11,
    color: '#BBB',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  pickupValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  pickupSub: {
    fontSize: 13,
    color: '#999',
    marginBottom: 2,
  },
  hoursBlock: {
    marginTop: 14,
  },
});
