import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';

interface Objednavka {
  id: string;
  zakaznik_jmeno: string;
  zakaznik_telefon: string;
  celkova_cena: number;
  stav: string;
  created_at: string;
  poznamka: string | null;
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

      const { data, error} = await supabase
        .from('objednavky')
        .select('*')
        .eq('pestitel_id', farmar.id)
        .order('created_at', { ascending: false});

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

  const formatDatum = (datum: string) => {
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
          <ActivityIndicator size="large" color="#4CAF50" />
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
            objednavky.map((objednavka) => (
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
                <View style={styles.orderHeader}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>
                      👤 {objednavka.zakaznik_jmeno}
                    </Text>
                    <Text style={styles.customerPhone}>
                      📱 {objednavka.zakaznik_telefon}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: getStavBarva(objednavka.stav) + '20' }
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

                <View style={styles.orderFooter}>
                  <Text style={styles.orderDate}>
                    📅 {formatDatum(objednavka.created_at)}
                  </Text>
                  <Text style={styles.orderPrice}>
                    {objednavka.celkova_cena} Kč
                  </Text>
                </View>

                {objednavka.poznamka && (
                  <Text style={styles.orderNote} numberOfLines={2}>
                    💬 {objednavka.poznamka}
                  </Text>
                )}
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
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  backButton: {
    marginBottom: 10
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  content: {
    flex: 1,
    padding: 15
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20
  },
  emptyText: {
    fontSize: 18,
    color: '#999',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600'
  },
  emptySubtext: {
    fontSize: 14,
    color: '#BBB',
    textAlign: 'center'
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 10
  },
  customerInfo: {
    flex: 1,
    gap: 4
  },
  customerName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333'
  },
  customerPhone: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500'
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold'
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  orderDate: {
    fontSize: 13,
    color: '#888'
  },
  orderPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50'
  },
  orderNote: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 18
  }
});
