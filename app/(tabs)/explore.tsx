import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerMenu } from '../utils/DrawerMenu';
import { useDrawerMenu } from '../utils/useDrawerMenu';
import { responsive, spacing, fontSize, borderRadius } from '../utils/responsive';

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
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();

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

  const handleRemoveFavorite = async (oblibenyId: number, nazevFarmy: string) => {
    try {
      const zakaznikId = await AsyncStorage.getItem('zakaznik_id');

      if (!zakaznikId) {
        alert('Nepodařilo se identifikovat uživatele');
        return;
      }

      const confirmed = window.confirm(`Opravdu chcete odebrat farmáře "${nazevFarmy}" z oblíbených?`);

      if (!confirmed) return;

      const { error } = await supabase
        .from('oblibeni_farmari')
        .delete()
        .eq('id', oblibenyId)
        .eq('zakaznik_telefon', zakaznikId);

      if (error) throw error;

      // Aktualizuj seznam
      setOblibeni(oblibeni.filter(item => item.id !== oblibenyId));
      alert(`✓ Farmář "${nazevFarmy}" byl odebrán z oblíbených`);
    } catch (error) {
      console.error('Chyba při odebírání z oblíbených:', error);
      alert('Nepodařilo se odebrat farmáře z oblíbených');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#7B1FA2" />
        <Text style={styles.loadingText}>Načítám oblíbené farmáře...</Text>
      </View>
    );
  }

  if (oblibeni.length === 0) {
    return (
      <View style={styles.container}>
        <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

        {/* Minimalistický header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={openMenu}
          >
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Moji farmáři</Text>
          <View style={{ width: 36 }} />
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧺</Text>
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
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

      {/* Minimalistický header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.menuButton}
          onPress={openMenu}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moji farmáři</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Info sekce */}
        <View style={styles.infoSection}>
          <Text style={styles.infoTitle}>
            {oblibeni.length} {oblibeni.length === 1 ? 'oblíbený farmář' : oblibeni.length < 5 ? 'oblíbení farmáři' : 'oblíbených farmářů'}
          </Text>
        </View>

        {/* Seznam farmářů */}
        {oblibeni.map((item) => {
          const pestitel = item.pestitele;
          return (
            <View key={item.id} style={styles.farmerCardWrapper}>
              <TouchableOpacity
                style={styles.farmerCard}
                onPress={() => router.push(`/pestitele/${pestitel.id}`)}
              >
                <View style={styles.farmerAvatar}>
                  <Text style={styles.farmerAvatarText}>
                    {pestitel.nazev_farmy.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.farmerInfo}>
                  <Text style={styles.farmerName}>{pestitel.nazev_farmy}</Text>
                  <View style={styles.farmerMeta}>
                    <Text style={styles.farmerLocation}>📍 {pestitel.mesto}</Text>
                  </View>
                  {pestitel.telefon && (
                    <Text style={styles.farmerPhone}>📞 {pestitel.telefon}</Text>
                  )}
                </View>
                <Text style={styles.farmerArrow}>›</Text>
              </TouchableOpacity>

              {/* Tlačítko pro odebrání z oblíbených */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleRemoveFavorite(item.id, pestitel.nazev_farmy);
                }}
              >
                <Text style={styles.removeButtonText}>★ Oblíbené</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    paddingTop: 10,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#7B1FA2',
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '400',
  },
  backButton: {
    padding: 4,
  },
  backArrow: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#6A1B9A', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24, marginBottom: 20 },
  findButton: {
    backgroundColor: '#7B1FA2',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  findButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  scrollContainer: { flex: 1 },
  scrollContent: { paddingBottom: 20 },
  infoSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 12,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  farmerCardWrapper: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
  },
  farmerCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: borderRadius.md,
    borderTopRightRadius: borderRadius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  farmerAvatar: {
    width: responsive({ mobile: 50, tablet: 60, desktop: 70 }),
    height: responsive({ mobile: 50, tablet: 60, desktop: 70 }),
    borderRadius: responsive({ mobile: 25, tablet: 30, desktop: 35 }),
    backgroundColor: '#7B1FA2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  farmerAvatarText: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#333',
    marginBottom: spacing.xs,
  },
  farmerMeta: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  farmerLocation: {
    fontSize: fontSize.sm,
    color: '#666',
  },
  farmerPhone: {
    fontSize: fontSize.sm,
    color: '#7B1FA2',
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  farmerArrow: {
    fontSize: 24,
    color: '#CCC',
  },
  removeButton: {
    backgroundColor: '#F3E5F5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    borderTopWidth: 1,
    borderTopColor: '#E1BEE7',
    alignItems: 'center',
    marginTop: -2,
  },
  removeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7B1FA2',
  },
});
