import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Pestitel {
  id: number;
  nazev_farmy: string;
  mesto: string;
  popis: string | null;
  telefon: string;
}

interface OblibenyPestitel {
  id: number;
  pestitel_id: number;
  pestitele: Pestitel;
}

export default function PestiteleScreen() {
  const [oblibeni, setOblibeni] = useState<OblibenyPestitel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOblibeniPestitele();
  }, []);

  const loadOblibeniPestitele = async () => {
    try {
      // Získáme ID zákazníka z AsyncStorage
      const zakaznikId = await AsyncStorage.getItem('zakaznik_id');

      if (!zakaznikId) {
        // Pokud nemáme uložené ID, nejsou žádní oblíbení
        setOblibeni([]);
        setLoading(false);
        return;
      }

      // Načteme oblíbené farmáře
      const { data: oblibeniFarmariData, error: oblibeniError } = await supabase
        .from('oblibeni_farmari')
        .select('id, pestitel_id')
        .eq('zakaznik_telefon', zakaznikId)
        .order('created_at', { ascending: false });

      if (oblibeniError) throw oblibeniError;

      if (!oblibeniFarmariData || oblibeniFarmariData.length === 0) {
        setOblibeni([]);
        setLoading(false);
        return;
      }

      // Pro každý oblíbený záznam načteme data farmáře
      const oblibeniWithDetails = await Promise.all(
        oblibeniFarmariData.map(async (item) => {
          const { data: pestitelData, error: pestitelError } = await supabase
            .from('pestitele')
            .select('id, nazev_farmy, mesto, popis, telefon')
            .eq('id', item.pestitel_id)
            .single();

          if (pestitelError) {
            console.error(`Chyba při načítání farmáře ${item.pestitel_id}:`, pestitelError);
            return null;
          }

          return {
            id: item.id,
            pestitel_id: item.pestitel_id,
            pestitele: pestitelData,
          };
        })
      );

      // Odfiltrujeme případné null hodnoty (farmáře, kteří nebyli nalezeni)
      const validOblibeni = oblibeniWithDetails.filter((item): item is OblibenyPestitel => item !== null);

      setOblibeni(validOblibeni);
    } catch (error) {
      console.error('Chyba při načítání oblíbených pěstitelů:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Načítám oblíbené farmáře...</Text>
      </View>
    );
  }

  if (oblibeni.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity
              style={styles.homeButton}
              onPress={() => router.push('/')}
            >
              <Text style={styles.homeIcon}>🏠</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>⭐ Moji farmáři</Text>
              <Text style={styles.headerSubtitle}>Oblíbení a nákupy</Text>
            </View>
          </View>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌾</Text>
          <Text style={styles.emptyTitle}>Zatím žádní oblíbení farmáři</Text>
          <Text style={styles.emptyText}>
            Najděte farmáře na mapě a uložte si je do oblíbených, nebo u nich nakupte!
          </Text>
          <TouchableOpacity
            style={styles.findButton}
            onPress={() => router.push('/mapa')}
          >
            <Text style={styles.findButtonText}>🗺️ Najít farmáře</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.homeButton}
            onPress={() => router.push('/')}
          >
            <Text style={styles.homeIcon}>🏠</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>⭐ Moji farmáři</Text>
            <Text style={styles.headerSubtitle}>{oblibeni.length} {oblibeni.length === 1 ? 'farmář' : 'farmářů'}</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.list}>
        {oblibeni.map((item) => {
          const pestitel = item.pestitele;
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              onPress={() => router.push(`/pestitele/${pestitel.id}`)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardIcon}>🌾</Text>
                <View style={styles.cardInfo}>
                  <Text style={styles.cardTitle}>{pestitel.nazev_farmy}</Text>
                  <Text style={styles.cardSubtitle}>📍 {pestitel.mesto}</Text>
                  {pestitel.telefon && (
                    <Text style={styles.cardPhone}>📞 {pestitel.telefon}</Text>
                  )}
                </View>
              </View>
              {pestitel.popis && (
                <Text style={styles.cardDescription} numberOfLines={2}>
                  {pestitel.popis}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#4CAF50', paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  homeButton: { padding: 8 },
  homeIcon: { fontSize: 28 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  headerSubtitle: { fontSize: 14, color: '#FFFFFF', opacity: 0.9 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20 },
  findButton: { backgroundColor: '#4CAF50', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10, marginTop: 10 },
  findButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  list: { flex: 1, padding: 15 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardIcon: { fontSize: 40, marginRight: 12 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 },
  cardSubtitle: { fontSize: 14, color: '#666' },
  cardPhone: { fontSize: 13, color: '#4CAF50', fontWeight: '600', marginTop: 2 },
  cardDescription: { fontSize: 14, color: '#888', marginTop: 8, lineHeight: 20 },
});
