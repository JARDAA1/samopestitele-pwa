import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { Feather } from '@expo/vector-icons';

interface Objednavka {
  id: string;
  stav: string;
  created_at: string;
  anon_customer_code?: string;
  celkova_cena?: number;
  zakaznik_telefon?: string;
  poznamka_farmare?: string;
}

export default function DokonceneObjednavkyScreen() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [objednavky, setObjednavky] = useState<Objednavka[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (farmar?.id) {
        loadData(farmar.id);
      } else {
        setLoading(false);
      }
    }, [farmar])
  );

  const loadData = async (pestitelId: string, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { data, error } = await supabase
        .from('objednavky')
        .select('id, stav, created_at, anon_customer_code, celkova_cena, zakaznik_telefon, poznamka_farmare')
        .eq('pestitel_id', pestitelId)
        .in('stav', ['dokoncena', 'odmitnuta', 'zrusena'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Chyba:', error);
      } else {
        setObjednavky(data || []);
      }
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    if (farmar?.id) {
      loadData(farmar.id, true);
    }
  }, [farmar]);

  const formatDate = (datum: string) => {
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const getStavInfo = (stav: string) => {
    switch (stav) {
      case 'dokoncena':
        return { text: 'Dokončena', color: '#4CAF50', icon: '✅' };
      case 'odmitnuta':
        return { text: 'Odmítnuta', color: '#F44336', icon: '❌' };
      case 'zrusena':
        return { text: 'Zrušena', color: '#9E9E9E', icon: '🚫' };
      default:
        return { text: stav, color: '#999', icon: '📋' };
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dokončené objednávky</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={['#FF9800']}
          />
        }
      >
        {objednavky.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📚</Text>
            <Text style={styles.emptyText}>Žádné dokončené objednávky</Text>
          </View>
        ) : (
          objednavky.map((objednavka) => {
            const stavInfo = getStavInfo(objednavka.stav);

            return (
              <TouchableOpacity
                key={objednavka.id}
                style={styles.orderCard}
                onPress={() => router.push(`/moje-prodejna/detail-objednavky?id=${objednavka.id}`)}
              >
                <View style={styles.orderRow}>
                  <Text style={styles.orderIcon}>{stavInfo.icon}</Text>
                  <View style={styles.orderInfo}>
                    <Text style={styles.customerCode}>
                      {objednavka.poznamka_farmare ||
                        (objednavka.anon_customer_code
                          ? `Zákazník ${objednavka.anon_customer_code}`
                          : 'Zákazník')}
                    </Text>
                    <Text style={styles.orderDate}>{formatDate(objednavka.created_at)}</Text>
                    {objednavka.celkova_cena && objednavka.celkova_cena > 0 && (
                      <Text style={styles.orderPrice}>{objednavka.celkova_cena.toFixed(0)} Kč</Text>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: stavInfo.color + '30' }]}>
                    <Text style={[styles.statusText, { color: stavInfo.color }]}>
                      {stavInfo.text}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 4,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
    padding: 12,
  },

  // Empty
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
  },

  // Order cards
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  orderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  customerCode: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  orderDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  orderPrice: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
