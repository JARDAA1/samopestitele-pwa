import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';

interface Produkt {
  id: string;
  nazev: string;
  popis: string | null;
  cena: number;
  jednotka: string;
  dostupnost: boolean;
  emoji: string | null;
  kategorie: string;
  created_at: string;
}

export default function SeznamProduktScreen() {
  const { farmar, isAuthenticated } = useFarmarAuth();
  const params = useLocalSearchParams();
  const filtr = params.filtr as string; // 'vse' nebo 'skladem'

  const [loading, setLoading] = useState(true);
  const [produkty, setProdukty] = useState<Produkt[]>([]);

  useEffect(() => {
    if (isAuthenticated && farmar?.id) {
      loadProdukty();
    }
  }, [isAuthenticated, farmar]);

  const loadProdukty = async () => {
    try {
      if (!farmar?.id) {
        router.replace('/prihlaseni');
        return;
      }

      let query = supabase
        .from('produkty')
        .select('*')
        .eq('pestitel_id', farmar.id)
        .order('created_at', { ascending: false });

      // Pokud je filtr "skladem", zobraz jen dostupné produkty
      if (filtr === 'skladem') {
        query = query.eq('dostupnost', true);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Chyba při načítání produktů:', error);
        return;
      }

      setProdukty(data || []);
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNadpis = () => {
    if (filtr === 'skladem') {
      return `Produkty skladem (${produkty.length})`;
    }
    return `Všechny produkty (${produkty.length})`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/moje-farma')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{getNadpis()}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Načítám produkty...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content}>
          {produkty.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyText}>
                {filtr === 'skladem'
                  ? 'Žádné produkty skladem'
                  : 'Zatím nemáte žádné produkty'
                }
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => router.push('/moje-farma/pridat-produkt')}
              >
                <Text style={styles.addButtonText}>+ Přidat produkt</Text>
              </TouchableOpacity>
            </View>
          ) : (
            produkty.map((produkt, index) => (
              <View key={produkt.id} style={styles.productItem}>
                <View style={styles.productLeft}>
                  <Text style={styles.productEmoji}>{produkt.emoji || '📦'}</Text>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{produkt.nazev}</Text>
                    <Text style={styles.productPrice}>
                      {produkt.cena} Kč / {produkt.jednotka}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.availabilityBadge,
                    produkt.dostupnost ? styles.availableBadge : styles.unavailableBadge
                  ]}
                >
                  <Text style={styles.availabilityText}>
                    {produkt.dostupnost ? '✓' : '✗'}
                  </Text>
                </View>
              </View>
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
    marginBottom: 30,
    textAlign: 'center'
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  productItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0'
  },
  productLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  productEmoji: {
    fontSize: 36,
    minWidth: 50,
    textAlign: 'center'
  },
  productInfo: {
    flex: 1
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  productPrice: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '500'
  },
  availabilityBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center'
  },
  availableBadge: {
    backgroundColor: '#E8F5E9'
  },
  unavailableBadge: {
    backgroundColor: '#FFEBEE'
  },
  availabilityText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  }
});
