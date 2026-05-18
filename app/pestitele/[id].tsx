import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Linking, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  fetchPestitelDetail,
  fetchPestitelProdukty,
  checkOblibeny,
  addOblibeny,
  removeOblibeny,
} from '@/features/farmari/services/farmariService';
import { formatKc, formatCenaJednotka } from '../_utils/formatKc';
import { useShoppingList } from '../_utils/cartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerMenu } from '../_utils/DrawerMenu';
import { useDrawerMenu } from '../_utils/useDrawerMenu';
import { responsive, spacing, fontSize, borderRadius } from '../_utils/responsive';
import { Ionicons } from '@expo/vector-icons';

interface DaySchedule {
  otevreno: boolean;
  od: string;
  do: string;
}

interface OfficeHours {
  po?: DaySchedule;
  ut?: DaySchedule;
  st?: DaySchedule;
  ct?: DaySchedule;
  pa?: DaySchedule;
  so?: DaySchedule;
  ne?: DaySchedule;
}

interface Pestitel {
  id: number;
  nazev_farmy: string;
  jmeno: string;
  mesto: string;
  adresa: string | null;
  popis: string | null;
  telefon: string;
  gps_lat?: number;
  gps_lng?: number;
  foto_url?: string | null;
  office_hours?: OfficeHours | null;
  casova_dostupnost?: string | null;
}

interface Produkt {
  id: number;
  nazev: string;
  popis: string | null;
  cena: number;
  jednotka: string;
  dostupnost: boolean;
  foto_url: string | null;
}

const OFFICE_HOURS_DAYS: { key: keyof OfficeHours; label: string }[] = [
  { key: 'po', label: 'Pondělí' },
  { key: 'ut', label: 'Úterý' },
  { key: 'st', label: 'Středa' },
  { key: 'ct', label: 'Čtvrtek' },
  { key: 'pa', label: 'Pátek' },
  { key: 'so', label: 'Sobota' },
  { key: 'ne', label: 'Neděle' },
];

export default function PestitelDetailScreen() {
  const { id } = useLocalSearchParams();
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();
  const [pestitel, setPestitel] = useState<Pestitel | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToList, clearAndAddToList, shoppingList, itemCount } = useShoppingList();

  // Pevné pořadí produktů
  const productOrder: { [key: string]: number } = {
    'Brambory': 1,
    'Cibule': 2,
    'Rajčata': 4,
    'Paprika': 5,
    'Okurky': 6,
    'Česnek': 7,
    'Saláty': 8,
    'Cuketa': 9,
    'Dýně': 10,
    'Jablka': 11,
    'Jahody': 12,
    'Třešně': 13,
    'Švestky': 14,
    'Hrušky': 15,
    'Maliny': 16,
    'Borůvky': 17,
    'Rybíz': 18,
    'Angrešt': 19,
  };

  useEffect(() => {
    loadData();
    checkIfFavorite();
  }, [id]);

  const loadData = async () => {
    try {
      console.log('Načítám data farmáře ID:', id);

      const pestitelData = await fetchPestitelDetail(String(id));

      if (!pestitelData) {
        throw new Error('Farmář nebyl nalezen');
      }

      console.log('Farmář načten:', pestitelData);
      setPestitel(pestitelData as unknown as Pestitel);

      // Načteme dostupné produkty
      const produktyData = await fetchPestitelProdukty(String(id));

      // Seřadíme produkty podle pevného pořadí
      const sortedProdukty = (produktyData as unknown as Produkt[]).sort((a, b) => {
        const orderA = productOrder[a.nazev] || 999;
        const orderB = productOrder[b.nazev] || 999;
        return orderA - orderB;
      });

      console.log('Produkty načteny, počet:', sortedProdukty.length);
      setProdukty(sortedProdukty);
    } catch (error: any) {
      console.error('Chyba při načítání dat:', error);
      Alert.alert('Chyba', error.message || 'Nepodařilo se načíst data farmáře');
    } finally {
      setLoading(false);
    }
  };

  const checkIfFavorite = async () => {
    try {
      // Na webu nefungují oblíbení (Supabase není dostupný)
      if (Platform.OS === 'web' || String(id).startsWith('mock-')) {
        setIsFavorite(false);
        return;
      }

      const zakaznikId = await getOrCreateUserId();
      const zaznamId = await checkOblibeny(zakaznikId, String(id));
      setIsFavorite(zaznamId !== null);
    } catch (error) {
      console.error('Chyba při kontrole oblíbených:', error);
    }
  };

  const getOrCreateUserId = async (): Promise<string> => {
    let userId = await AsyncStorage.getItem('zakaznik_id');
    if (!userId) {
      // Vytvoříme náhodný unikátní identifikátor
      userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await AsyncStorage.setItem('zakaznik_id', userId);
    }
    return userId;
  };

  const handleToggleFavorite = async () => {
    if (!pestitel) return;

    try {
      const zakaznikId = await getOrCreateUserId();

      if (isFavorite) {
        // Odebrat z oblíbených
        await removeOblibeny(zakaznikId, pestitel.id);
        setIsFavorite(false);
        Alert.alert('✓ Odebráno', `${pestitel.nazev_farmy} byl odebrán z oblíbených`);
      } else {
        await saveFavorite(zakaznikId);
      }
    } catch (error) {
      console.error('Chyba při změně oblíbených:', error);
      Alert.alert('Chyba', 'Nepodařilo se změnit oblíbené farmáře');
    }
  };

  const saveFavorite = async (telefon: string) => {
    if (!pestitel) return;

    try {
      await addOblibeny(telefon, pestitel.id);
      setIsFavorite(true);
      Alert.alert('⭐ Uloženo', `${pestitel.nazev_farmy} byl přidán do oblíbených!`);
    } catch (error) {
      console.error('Chyba při ukládání oblíbeného:', error);
      throw error;
    }
  };

  const handleAddToList = (produkt: Produkt) => {
    if (!pestitel) return;

    const item = {
      produkt_id: produkt.id,
      nazev: produkt.nazev,
      cena: produkt.cena,
      jednotka: produkt.jednotka,
      pestitelNazev: pestitel.nazev_farmy,
      pestitelId: pestitel.id,
      pestitelTelefon: pestitel.telefon,
      pestitelMesto: pestitel.mesto,
    };

    const result = addToList(item);

    if (result.blocked) {
      Alert.alert(
        'Košík obsahuje produkty jiného farmáře',
        `Máte v košíku produkty od ${result.existingFarmerNazev}. Chcete košík vymazat a přidat produkty od ${pestitel.nazev_farmy}?`,
        [
          { text: 'Ne, zachovat', style: 'cancel' },
          {
            text: 'Vymazat a přidat',
            style: 'destructive',
            onPress: () => {
              clearAndAddToList(item);
              Alert.alert('Přidáno do seznamu', `${produkt.nazev} byl přidán do nákupního seznamu`);
            },
          },
        ]
      );
    } else {
      Alert.alert('Přidáno do seznamu', `${produkt.nazev} byl přidán do nákupního seznamu`);
    }
  };

  const savePreviousFarmer = async (farmerId: number) => {
    try {
      const zakaznikId = await getOrCreateUserId();
      await addOblibeny(zakaznikId, farmerId);
      console.log('Předchozí farmář byl automaticky uložen do oblíbených');
    } catch (error) {
      console.error('Chyba při ukládání předchozího farmáře:', error);
    }
  };

  const handleViewList = () => {
    router.push('/nakupni-seznam');
  };

  const handleNavigate = () => {
    if (!pestitel || !pestitel.gps_lat || !pestitel.gps_lng) {
      Alert.alert('Navigace nedostupná', 'GPS souřadnice nejsou k dispozici');
      return;
    }

    const lat = pestitel.gps_lat;
    const lng = pestitel.gps_lng;
    const label = encodeURIComponent(pestitel.nazev_farmy);

    // URL pro různé mapy
    const urls = {
      apple: `maps://maps.apple.com/?q=${label}&ll=${lat},${lng}`,
      google: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      general: `geo:${lat},${lng}?q=${lat},${lng}(${label})`,
    };

    // Web: vždy použijeme Google Maps (funguje ve všech prohlížečích)
    if (Platform.OS === 'web') {
      window.open(urls.google, '_blank');
      return;
    }

    // iOS: pokusíme se otevřít Apple Maps, pokud selže, použijeme Google Maps
    if (Platform.OS === 'ios') {
      Linking.canOpenURL(urls.apple).then((supported) => {
        if (supported) {
          Linking.openURL(urls.apple);
        } else {
          Linking.openURL(urls.google);
        }
      });
    } else {
      // Android: použijeme geo: URL, který otevře výběr map
      Linking.openURL(urls.general).catch(() => {
        // Fallback na Google Maps
        Linking.openURL(urls.google);
      });
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#1a3a1a" />
        <Text style={styles.loadingText}>Načítám farmáře...</Text>
      </View>
    );
  }

  if (!pestitel) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Farmář nebyl nalezen</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        {itemCount > 0 && (
          <TouchableOpacity onPress={handleViewList} style={styles.listBadgeContainer}>
            <Text style={styles.listIcon}>📝</Text>
            <View style={styles.listBadge}>
              <Text style={styles.listBadgeText}>{itemCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Foto farmy - pokud existuje */}
        {pestitel.foto_url && (
          <Image
            source={{ uri: pestitel.foto_url }}
            style={styles.farmerPhoto}
            resizeMode="cover"
          />
        )}

        {/* Informace o farmáři */}
        <View style={styles.farmerInfo}>
          <View style={styles.farmerDetails}>
            <Text style={styles.farmerName}>{pestitel.nazev_farmy}</Text>
            <View style={styles.farmerRow}>
              <Text style={styles.farmerMeta}>👤 {pestitel.jmeno}</Text>
              <Text style={styles.farmerMetaSeparator}>•</Text>
              <Text style={styles.farmerMeta}>📍 {pestitel.mesto}</Text>
              {pestitel.telefon && (
                <>
                  <Text style={styles.farmerMetaSeparator}>•</Text>
                  <Text style={styles.farmerMeta}>📞 {pestitel.telefon}</Text>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Tlačítko Uložit farmáře */}
        <TouchableOpacity
          style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
          onPress={handleToggleFavorite}
        >
          <Text style={styles.favoriteButtonIcon}>
            {isFavorite ? '⭐' : '☆'}
          </Text>
          <Text style={[styles.favoriteButtonText, isFavorite && styles.favoriteButtonTextActive]}>
            {isFavorite ? 'Uloženo v oblíbených' : 'Uložit farmáře'}
          </Text>
        </TouchableOpacity>

        {/* Tlačítko Navigovat */}
        {pestitel.gps_lat && pestitel.gps_lng && pestitel.gps_lat !== 0 && pestitel.gps_lng !== 0 && (
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={handleNavigate}
          >
            <Ionicons name="navigate" size={24} color="#ffffff" style={styles.navigateButtonIcon} />
            <Text style={styles.navigateButtonText}>Navigovat</Text>
          </TouchableOpacity>
        )}

        {pestitel.popis && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>O farmě</Text>
            <Text style={styles.descriptionText}>{pestitel.popis}</Text>
          </View>
        )}

        {/* Otevírací doba */}
        {pestitel.office_hours && (
          <View style={styles.officeHoursContainer}>
            <Text style={styles.officeHoursTitle}>🕐 Otevírací doba</Text>
            {OFFICE_HOURS_DAYS.map(({ key, label }) => {
              const day = pestitel.office_hours![key];
              if (!day) return null;
              return (
                <View key={key} style={styles.officeHoursRow}>
                  <Text style={styles.officeHoursDayLabel}>{label}</Text>
                  {day.otevreno ? (
                    <Text style={styles.officeHoursTime}>{day.od} – {day.do}</Text>
                  ) : (
                    <Text style={styles.officeHoursClosed}>Zavřeno</Text>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Fallback: free-text availability when no structured hours */}
        {!pestitel.office_hours && pestitel.casova_dostupnost && (
          <View style={styles.officeHoursContainer}>
            <Text style={styles.officeHoursTitle}>🕐 Otevírací doba</Text>
            <Text style={styles.officeHoursFreeText}>{pestitel.casova_dostupnost}</Text>
          </View>
        )}

        {/* Seznam produktů */}
        <View style={styles.productsContainer}>
          <Text style={styles.productsTitle}>
            🧺 Nabídka produktů ({produkty.length})
          </Text>

          {produkty.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📦</Text>
              <Text style={styles.emptyTitle}>Žádné produkty</Text>
              <Text style={styles.emptyText}>
                Tento farmář zatím nepřidal žádné produkty
              </Text>
            </View>
          ) : (
            produkty.map((produkt) => (
              <View key={produkt.id} style={styles.productCard}>
                {produkt.foto_url && (
                  <Image
                    source={{ uri: produkt.foto_url }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                )}
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text style={styles.productName}>{produkt.nazev}</Text>
                    <Text style={styles.productPrice}>
                      {produkt.cena ? formatCenaJednotka(produkt.cena, produkt.jednotka) : `0 Kč / ${produkt.jednotka}`}
                    </Text>
                  </View>
                  {produkt.popis && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {produkt.popis}
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddToList(produkt)}
                  >
                    <Text style={styles.addButtonText}>+ Do seznamu</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Plovoucí tlačítko nákupního seznamu */}
      {itemCount > 0 && (
        <TouchableOpacity style={styles.floatingListButton} onPress={handleViewList}>
          <Text style={styles.floatingListIcon}>📝</Text>
          <Text style={styles.floatingListText}>
            Můj seznam ({itemCount})
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  errorText: { fontSize: 18, color: '#F44336', marginBottom: 20 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingHorizontal: 12,
    paddingBottom: 2,
    backgroundColor: '#2d6b0a',
  },
  menuButton: { padding: 8 },
  menuIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '400' },
  listBadgeContainer: { position: 'relative' },
  listIcon: { fontSize: 28 },
  listBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF5722',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  content: { flex: 1 },

  farmerPhoto: {
    width: '100%',
    height: responsive({ mobile: 250, tablet: 350, desktop: 450 }),
    backgroundColor: '#E0E0E0',
  },

  farmerInfo: {
    backgroundColor: '#FFFFFF',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  farmerDetails: { flex: 1 },
  farmerName: {
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    color: '#1a3a1a',
    marginBottom: spacing.sm
  },
  farmerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  farmerMeta: { fontSize: 14, color: '#666' },
  farmerMetaSeparator: { fontSize: 14, color: '#CCC', marginHorizontal: 4 },

  favoriteButton: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 15,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFB300',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  favoriteButtonActive: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FF9800',
  },
  favoriteButtonIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  favoriteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
  },
  favoriteButtonTextActive: {
    color: '#F57C00',
  },

  navigateButton: {
    backgroundColor: '#2196F3',
    marginHorizontal: 15,
    marginTop: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  navigateButtonIcon: {
    marginRight: 8,
  },
  navigateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  descriptionContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  descriptionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a3a1a', marginBottom: 8 },
  descriptionText: { fontSize: 15, color: '#666', lineHeight: 22 },

  officeHoursContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginTop: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  officeHoursTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a3a1a', marginBottom: 12 },
  officeHoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  officeHoursDayLabel: { fontSize: 14, color: '#333', fontWeight: '500', width: 90 },
  officeHoursTime: { fontSize: 14, color: '#388E3C', fontWeight: '600' },
  officeHoursClosed: { fontSize: 14, color: '#999', fontStyle: 'italic' },
  officeHoursFreeText: { fontSize: 14, color: '#555', lineHeight: 22 },

  productsContainer: { padding: 15, paddingBottom: 100 },
  productsTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a3a1a', marginBottom: 15 },

  emptyState: { alignItems: 'center', padding: 40, marginTop: 20 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a3a1a', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#666', textAlign: 'center' },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: '100%',
    height: responsive({ mobile: 150, tablet: 200, desktop: 250 }),
    backgroundColor: '#E0E0E0',
  },
  productInfo: { padding: spacing.lg },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  productName: {
    fontSize: fontSize.lg,
    fontWeight: 'bold',
    color: '#1a3a1a',
    flex: 1,
    marginRight: spacing.md,
  },
  productDescription: {
    fontSize: fontSize.base,
    color: '#666',
    marginBottom: spacing.md,
    lineHeight: responsive({ mobile: 20, tablet: 24, desktop: 28 })
  },
  productPrice: {
    fontSize: fontSize.md,
    fontWeight: 'bold',
    color: '#FF9800',
    flexShrink: 0,
  },
  addButton: {
    backgroundColor: '#1a3a1a',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  floatingListButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#1a3a1a',
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  floatingListIcon: { fontSize: 24, marginRight: 10 },
  floatingListText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

  backButton: { backgroundColor: '#1a3a1a', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
