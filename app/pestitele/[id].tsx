import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Linking, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useCart } from '../utils/cartContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

export default function PestitelDetailScreen() {
  const { id } = useLocalSearchParams();
  const [pestitel, setPestitel] = useState<Pestitel | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const { addToCart, cart, currentPestitelId, itemCount } = useCart();

  useEffect(() => {
    loadData();
    checkIfFavorite();
  }, [id]);

  const loadData = async () => {
    try {
      console.log('Načítám data farmáře ID:', id);

      // Načteme reálná data ze Supabase
      const { data: pestitelData, error: pestitelError } = await supabase
        .from('pestitele')
        .select('id, nazev_farmy, jmeno, mesto, adresa, popis, telefon, gps_lat, gps_lng')
        .eq('id', id)
        .single();

      if (pestitelError) {
        console.error('Chyba při načítání dat:', pestitelError);
        throw pestitelError;
      }

      if (!pestitelData) {
        throw new Error('Farmář nebyl nalezen');
      }

      console.log('Farmář načten:', pestitelData);
      setPestitel(pestitelData);

      // Načteme produkty
      const { data: produktyData, error: produktyError } = await supabase
        .from('produkty')
        .select('id, nazev, popis, cena, jednotka, dostupnost, foto_url')
        .eq('pestitel_id', id)
        .eq('dostupnost', true)
        .order('nazev', { ascending: true });

      if (produktyError) {
        console.error('Chyba při načítání produktů:', produktyError);
        throw produktyError;
      }

      console.log('Produkty načteny, počet:', produktyData?.length || 0);
      setProdukty(produktyData || []);
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

      const { data, error } = await supabase
        .from('oblibeni_farmari')
        .select('id')
        .eq('zakaznik_telefon', zakaznikId)
        .eq('pestitel_id', id)
        .maybeSingle();

      if (error) throw error;
      setIsFavorite(!!data);
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
        const { error } = await supabase
          .from('oblibeni_farmari')
          .delete()
          .eq('zakaznik_telefon', zakaznikId)
          .eq('pestitel_id', pestitel.id);

        if (error) throw error;
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
      const { error } = await supabase
        .from('oblibeni_farmari')
        .insert({
          zakaznik_telefon: telefon,
          pestitel_id: pestitel.id,
        });

      if (error) {
        // Pokud už je v oblíbených (unique constraint), ignorujeme
        if (error.message.includes('unique')) {
          setIsFavorite(true);
          return;
        }
        throw error;
      }

      setIsFavorite(true);
      Alert.alert('⭐ Uloženo', `${pestitel.nazev_farmy} byl přidán do oblíbených!`);
    } catch (error) {
      console.error('Chyba při ukládání oblíbeného:', error);
      throw error;
    }
  };

  const handleAddToCart = async (produkt: Produkt) => {
    if (!pestitel) return;

    // Pokud už máme v košíku produkty od jiného farmáře, upozorníme uživatele
    if (currentPestitelId && currentPestitelId !== pestitel.id) {
      Alert.alert(
        'Košík obsahuje produkty jiného farmáře',
        'Předchozí farmář bude automaticky uložen do oblíbených. Chcete pokračovat?',
        [
          { text: 'Zrušit', style: 'cancel' },
          {
            text: 'Pokračovat',
            onPress: async () => {
              // Uložíme předchozího farmáře do oblíbených
              await savePreviousFarmer(currentPestitelId);

              // Košík se vyprázdní automaticky v CartContext
              addToCart({
                produkt_id: produkt.id,
                nazev: produkt.nazev,
                cena: produkt.cena,
                jednotka: produkt.jednotka,
                pestitelNazev: pestitel.nazev_farmy,
                pestitelId: pestitel.id,
              });
            },
          },
        ]
      );
      return;
    }

    addToCart({
      produkt_id: produkt.id,
      nazev: produkt.nazev,
      cena: produkt.cena,
      jednotka: produkt.jednotka,
      pestitelNazev: pestitel.nazev_farmy,
      pestitelId: pestitel.id,
    });

    Alert.alert('Přidáno do košíku', `${produkt.nazev} byl přidán do košíku`);
  };

  const savePreviousFarmer = async (farmerId: number) => {
    try {
      const zakaznikId = await getOrCreateUserId();

      // Uložíme předchozího farmáře do oblíbených
      const { error } = await supabase
        .from('oblibeni_farmari')
        .insert({
          zakaznik_telefon: zakaznikId,
          pestitel_id: farmerId,
        });

      if (error) {
        // Pokud už je v oblíbených (unique constraint), ignorujeme
        if (!error.message.includes('unique')) {
          console.error('Chyba při ukládání předchozího farmáře:', error);
        }
      } else {
        console.log('Předchozí farmář byl automaticky uložen do oblíbených');
      }
    } catch (error) {
      console.error('Chyba při ukládání předchozího farmáře:', error);
    }
  };

  const handleViewCart = () => {
    router.push('/kosik');
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
        <ActivityIndicator size="large" color="#4CAF50" />
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
          <Text style={styles.headerBackText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{pestitel.nazev_farmy}</Text>
        {itemCount > 0 && (
          <TouchableOpacity onPress={handleViewCart} style={styles.cartBadgeContainer}>
            <Text style={styles.cartIcon}>🛒</Text>
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{itemCount}</Text>
            </View>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {/* Informace o farmáři */}
        <View style={styles.farmerInfo}>
          <View style={styles.farmerIcon}>
            <Text style={styles.farmerIconText}>🌾</Text>
          </View>
          <View style={styles.farmerDetails}>
            <Text style={styles.farmerName}>{pestitel.nazev_farmy}</Text>
            <Text style={styles.farmerOwner}>👤 {pestitel.jmeno}</Text>
            <Text style={styles.farmerLocation}>📍 {pestitel.mesto}</Text>
            {pestitel.adresa && (
              <Text style={styles.farmerAddress}>{pestitel.adresa}</Text>
            )}
            {pestitel.telefon && (
              <Text style={styles.farmerPhone}>📞 {pestitel.telefon}</Text>
            )}
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
            <Text style={styles.navigateButtonIcon}>📍</Text>
            <Text style={styles.navigateButtonText}>Navigovat</Text>
          </TouchableOpacity>
        )}

        {pestitel.popis && (
          <View style={styles.descriptionContainer}>
            <Text style={styles.descriptionTitle}>O farmě</Text>
            <Text style={styles.descriptionText}>{pestitel.popis}</Text>
          </View>
        )}

        {/* Seznam produktů */}
        <View style={styles.productsContainer}>
          <Text style={styles.productsTitle}>
            🛒 Nabídka produktů ({produkty.length})
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
                  <Text style={styles.productName}>{produkt.nazev}</Text>
                  {produkt.popis && (
                    <Text style={styles.productDescription} numberOfLines={2}>
                      {produkt.popis}
                    </Text>
                  )}
                  <View style={styles.productFooter}>
                    <Text style={styles.productPrice}>
                      {produkt.cena.toFixed(0)} Kč/{produkt.jednotka}
                    </Text>
                    <TouchableOpacity
                      style={styles.addButton}
                      onPress={() => handleAddToCart(produkt)}
                    >
                      <Text style={styles.addButtonText}>+ Do košíku</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Plovoucí tlačítko košíku */}
      {itemCount > 0 && (
        <TouchableOpacity style={styles.floatingCartButton} onPress={handleViewCart}>
          <Text style={styles.floatingCartIcon}>🛒</Text>
          <Text style={styles.floatingCartText}>
            Zobrazit košík ({itemCount})
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
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#4CAF50',
  },
  headerBackButton: { marginRight: 15 },
  headerBackText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  cartBadgeContainer: { position: 'relative' },
  cartIcon: { fontSize: 28 },
  cartBadge: {
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
  cartBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: 'bold' },

  content: { flex: 1 },

  farmerInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  farmerIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#E8F5E9',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  farmerIconText: { fontSize: 40 },
  farmerDetails: { flex: 1, justifyContent: 'center' },
  farmerName: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 },
  farmerOwner: { fontSize: 15, color: '#666', marginBottom: 2 },
  farmerLocation: { fontSize: 15, color: '#666', marginBottom: 2 },
  farmerAddress: { fontSize: 14, color: '#888', marginTop: 4 },
  farmerPhone: { fontSize: 14, color: '#4CAF50', fontWeight: '600', marginTop: 4 },

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
    fontSize: 24,
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
  descriptionTitle: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 8 },
  descriptionText: { fontSize: 15, color: '#666', lineHeight: 22 },

  productsContainer: { padding: 15, paddingBottom: 100 },
  productsTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },

  emptyState: { alignItems: 'center', padding: 40, marginTop: 20 },
  emptyIcon: { fontSize: 60, marginBottom: 15 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32', marginBottom: 8 },
  emptyText: { fontSize: 15, color: '#666', textAlign: 'center' },

  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  productImage: {
    width: '100%',
    height: 150,
    backgroundColor: '#E0E0E0',
  },
  productInfo: { padding: 15 },
  productName: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 6 },
  productDescription: { fontSize: 14, color: '#666', marginBottom: 10, lineHeight: 20 },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  productPrice: { fontSize: 18, fontWeight: 'bold', color: '#FF9800' },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  addButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  floatingCartButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
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
  floatingCartIcon: { fontSize: 24, marginRight: 10 },
  floatingCartText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },

  backButton: { backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
