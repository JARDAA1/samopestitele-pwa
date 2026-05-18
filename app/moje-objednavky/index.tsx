import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { DrawerMenu } from '@/shared/ui/DrawerMenu';
import { useDrawerMenu } from '@/shared/hooks/useDrawerMenu';
import { formatKc } from '../_utils/formatKc';
import {
  fetchMojeObjednavkyByAnonId,
  type MojeObjednavkaSupabase,
} from '@/features/objednavky/services/objednavkyService';
import { getOrCreateCustomerId } from '../_utils/customerIdentity';

function getStavInfo(stav?: string) {
  switch (stav) {
    case 'nova':
      return { bg: 'rgba(255,152,0,0.2)', text: '#FF9800', label: 'Nová' };
    case 'cekajici_na_potvrzeni':
      return { bg: 'rgba(255,152,0,0.2)', text: '#FF9800', label: 'Čeká na potvrzení' };
    case 'potvrzena':
      return { bg: 'rgba(33,150,243,0.2)', text: '#2196F3', label: 'Potvrzena' };
    case 'zpracovana':
      return { bg: 'rgba(33,150,243,0.2)', text: '#2196F3', label: 'Zpracovává se' };
    case 'ceka_na_vyzvednuti':
      return { bg: 'rgba(33,150,243,0.2)', text: '#2196F3', label: 'Připravena k vyzvednutí' };
    case 'dokoncena':
      return { bg: 'rgba(76,175,80,0.2)', text: '#4CAF50', label: 'Dokončena ✓' };
    case 'odmitnuta':
      return { bg: 'rgba(244,67,54,0.2)', text: '#F44336', label: 'Odmítnuta' };
    case 'zrusena':
      return { bg: 'rgba(244,67,54,0.2)', text: '#F44336', label: 'Zrušena' };
    default:
      return { bg: 'rgba(255,255,255,0.1)', text: 'rgba(255,255,255,0.7)', label: stav ?? '…' };
  }
}

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export default function MojeObjednavkyScreen() {
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();
  const [objednavky, setObjednavky] = useState<MojeObjednavkaSupabase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadObjednavky();
  }, []);

  const loadObjednavky = async () => {
    setLoading(true);
    try {
      const customer = await getOrCreateCustomerId();
      const data = await fetchMojeObjednavkyByAnonId(customer.id);
      setObjednavky(data);
    } catch {
      // tiché selhání – zobrazí se prázdný stav
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>📦 Moje objednávky</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF9800" />
          <Text style={styles.loadingText}>Načítám objednávky…</Text>
        </View>
      ) : objednavky.length === 0 ? (
        /* Empty state */
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>Zatím žádné objednávky</Text>
          <Text style={styles.emptyText}>
            Jakmile odešlete první objednávku, objeví se zde.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => router.push('/mapa')}
          >
            <Text style={styles.ctaButtonText}>Najít pěstitele na mapě →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
          <Text style={styles.sectionHint}>
            Stavy jsou aktuální k tomuto okamžiku.
          </Text>

          {objednavky.map((obj) => {
            const stav = getStavInfo(obj.stav);
            return (
              <View key={obj.id} style={styles.card}>
                {/* Farmer + date row */}
                <View style={styles.cardRow}>
                  <Text style={styles.cardFarmer} numberOfLines={1}>
                    🧺 {obj.pestitelNazev}
                  </Text>
                  <Text style={styles.cardDate}>{formatDate(obj.created_at)}</Text>
                </View>

                {/* Price + status row */}
                <View style={styles.cardRow}>
                  <Text style={styles.cardPrice}>
                    {obj.celkova_cena && obj.celkova_cena > 0 ? `${formatKc(obj.celkova_cena)} Kč` : '—'}
                  </Text>
                  <View style={[styles.stavBadge, { backgroundColor: stav.bg }]}>
                    <Text style={[styles.stavBadgeText, { color: stav.text }]}>
                      {stav.label}
                    </Text>
                  </View>
                </View>

                {/* Pickup date if available */}
                {obj.datum_vyzvednuti && (
                  <Text style={styles.cardPickup}>
                    📅 Vyzvednutí: {formatDate(obj.datum_vyzvednuti)}
                  </Text>
                )}
              </View>
            );
          })}

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a1a' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#1a3a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuButton: { marginRight: 12, padding: 6 },
  menuIcon: { fontSize: 24, color: '#FFFFFF' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  ctaButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  ctaButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  content: { flex: 1 },
  contentInner: { padding: 12 },

  sectionHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 12,
  },

  card: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardFarmer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  cardDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  cardPrice: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FF9800',
  },
  stavBadge: {
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  stavBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardPickup: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});
