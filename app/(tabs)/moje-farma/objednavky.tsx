import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';

interface Objednavka {
  id: string;
  stav: string;
  created_at: string;
  datum_vyzvednutí?: string;
}

export default function ObjednavkyScreen() {
  const { farmar, isAuthenticated } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);

  useEffect(() => {
    if (isAuthenticated && farmar?.id) {
      loadObjednavky();
    }
  }, [isAuthenticated, farmar]);

  const loadObjednavky = async () => {
    try {
      if (!farmar?.id) {
        router.replace('/prihlaseni');
        return;
      }

      const { data, error } = await supabase
        .from('objednavky')
        .select('id, stav, created_at, datum_vyzvednutí')
        .eq('pestitel_id', farmar.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Chyba při načítání objednávek:', error);
        return;
      }

      setObjednavky(data || []);
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDatum = (datum?: string) => {
    if (!datum) return 'Neuvedeno';
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const getStavBarva = (stav: string) => {
    switch (stav) {
      case 'nova':
        return '#2196F3';
      case 'zpracovana':
        return '#FF9800';
      case 'dokoncena':
        return '#4CAF50';
      case 'zrusena':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStavText = (stav: string) => {
    switch (stav) {
      case 'nova':
        return 'Nová';
      case 'zpracovana':
        return 'Zpracovaná';
      case 'dokoncena':
        return 'Dokončená';
      case 'zrusena':
        return 'Zrušená';
      default:
        return stav;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/moje-farma')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Objednávky ({objednavky.length})</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Načítám objednávky...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {objednavky.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📋</Text>
              <Text style={styles.emptyText}>Zatím nemáte žádné objednávky</Text>
              <Text style={styles.emptySubtext}>
                Jakmile vám někdo objedná, zobrazí se zde
              </Text>
            </View>
          ) : (
            objednavky.map((objednavka, index) => (
              <TouchableOpacity
                key={objednavka.id}
                style={styles.orderCard}
                onPress={() =>
                  router.push({
                    pathname: '/moje-farma/detail-objednavky',
                    params: { id: objednavka.id }
                  })
                }
              >
                <View style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.customerNumber}>
                      Zákazník #{objednavky.length - index}
                    </Text>
                    <Text style={styles.orderDate}>
                      Vyzvednutí: {formatDatum(objednavka.datum_vyzvednutí)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStavBarva(objednavka.stav) + '30' }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: getStavBarva(objednavka.stav) }
                      ]}
                    >
                      {getStavText(objednavka.stav)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A'
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  backButton: {
    marginBottom: 8
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)'
  },
  content: {
    flex: 1,
    padding: 12
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600'
  },
  emptySubtext: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center'
  },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderInfo: {
    flex: 1,
    gap: 4
  },
  customerNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  orderDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700'
  }
});
