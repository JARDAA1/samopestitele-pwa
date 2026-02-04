import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Platform, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

interface Farmar {
  id: string;
  nazev_farmy: string;
  mesto: string;
  popis: string | null;
  telefon: string;
  email: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
}

interface Produkt {
  id: string;
  nazev: string;
  popis: string | null;
  cena: number | null;
  jednotka: string | null;
  dostupnost: string | null;
}

interface SeznamItem {
  produktId: string;
  produktNazev: string;
  farmarId: string;
  farmarNazev: string;
  cena: number | null;
  jednotka: string | null;
}

export default function FarmarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [farmar, setFarmar] = useState<Farmar | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);
  const [seznam, setSeznam] = useState<SeznamItem[]>([]);

  useEffect(() => {
    if (id) {
      loadFarmarDetail();
      loadSeznam();
    }
  }, [id]);

  const loadSeznam = async () => {
    try {
      const stored = await AsyncStorage.getItem('nakupni_seznam');
      if (stored) {
        setSeznam(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Chyba při načítání seznamu:', error);
    }
  };

  const saveSeznam = async (newSeznam: SeznamItem[]) => {
    try {
      await AsyncStorage.setItem('nakupni_seznam', JSON.stringify(newSeznam));
      setSeznam(newSeznam);
    } catch (error) {
      console.error('Chyba při ukládání seznamu:', error);
    }
  };

  const isInSeznam = (produktId: string) => {
    return seznam.some(item => item.produktId === produktId);
  };

  const toggleSeznam = (produkt: Produkt) => {
    if (!farmar) return;

    if (isInSeznam(produkt.id)) {
      // Odebrat ze seznamu
      const newSeznam = seznam.filter(item => item.produktId !== produkt.id);
      saveSeznam(newSeznam);
      if (Platform.OS === 'web') {
        alert(`${produkt.nazev} odebráno ze seznamu`);
      } else {
        Alert.alert('Odebráno', `${produkt.nazev} odebráno ze seznamu`);
      }
    } else {
      // Přidat do seznamu
      const newItem: SeznamItem = {
        produktId: produkt.id,
        produktNazev: produkt.nazev,
        farmarId: farmar.id,
        farmarNazev: farmar.nazev_farmy,
        cena: produkt.cena,
        jednotka: produkt.jednotka,
      };
      const newSeznam = [...seznam, newItem];
      saveSeznam(newSeznam);
      if (Platform.OS === 'web') {
        alert(`${produkt.nazev} přidáno do seznamu`);
      } else {
        Alert.alert('Přidáno', `${produkt.nazev} přidáno do seznamu`);
      }
    }
  };

  const loadFarmarDetail = async () => {
    try {
      setLoading(true);

      // Načíst data farmáře
      const { data: farmarData, error: farmarError } = await supabase
        .from('pestitele')
        .select('id, nazev_farmy, mesto, popis, telefon, email, gps_lat, gps_lng')
        .eq('id', id)
        .single();

      if (farmarError) {
        console.error('Chyba při načítání farmáře:', farmarError);
        return;
      }

      setFarmar(farmarData);

      // Načíst produkty farmáře
      const { data: produktyData, error: produktyError } = await supabase
        .from('produkty')
        .select('id, nazev, popis, cena, jednotka, dostupnost')
        .eq('pestitel_id', id)
        .order('nazev', { ascending: true });

      if (produktyError) {
        console.error('Chyba při načítání produktů:', produktyError);
      } else {
        setProdukty(produktyData || []);
      }
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (farmar?.telefon) {
      Linking.openURL(`tel:${farmar.telefon}`);
    }
  };

  const handleEmail = () => {
    if (farmar?.email) {
      Linking.openURL(`mailto:${farmar.email}`);
    }
  };

  const handleNavigate = () => {
    if (farmar?.gps_lat && farmar?.gps_lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${farmar.gps_lat},${farmar.gps_lng}`,
        android: `geo:0,0?q=${farmar.gps_lat},${farmar.gps_lng}`,
        default: `https://www.google.com/maps/search/?api=1&query=${farmar.gps_lat},${farmar.gps_lng}`,
      });
      if (url) {
        Linking.openURL(url);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  if (!farmar) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Farmář nenalezen</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Zpět</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{farmar.nazev_farmy}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Info karta */}
        <View style={styles.infoCard}>
          <View style={styles.farmaHeader}>
            <View style={styles.farmaAvatar}>
              <Text style={styles.farmaAvatarText}>
                {farmar.nazev_farmy.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.farmaInfo}>
              <Text style={styles.farmaName}>{farmar.nazev_farmy}</Text>
              <Text style={styles.farmaMesto}>{farmar.mesto}</Text>
            </View>
          </View>

          {farmar.popis && (
            <Text style={styles.farmaPopis}>{farmar.popis}</Text>
          )}

          {/* Kontaktní tlačítka - pouze ikony */}
          <View style={styles.contactRow}>
            {farmar.telefon && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
                <Ionicons name="call" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            {farmar.email && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleEmail}>
                <Ionicons name="mail" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
            {farmar.gps_lat && farmar.gps_lng && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleNavigate}>
                <Ionicons name="navigate" size={20} color="#ffffff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Nabídka produktů */}
        <View style={styles.produktyCard}>
          <Text style={styles.produktyTitle}>Nabídka produktů</Text>

          {produkty.length === 0 ? (
            <View style={styles.emptyProdukty}>
              <Text style={styles.emptyProduktyText}>
                Farmář zatím nemá přidané žádné produkty.
              </Text>
            </View>
          ) : (
            <View style={styles.produktyList}>
              {produkty.map((produkt) => (
                <View key={produkt.id} style={styles.produktRow}>
                  <View style={styles.produktInfo}>
                    <Text style={styles.produktName}>{produkt.nazev}</Text>
                    {produkt.popis && (
                      <Text style={styles.produktPopis} numberOfLines={2}>
                        {produkt.popis}
                      </Text>
                    )}
                    {produkt.dostupnost && (
                      <View style={[
                        styles.dostupnostBadge,
                        produkt.dostupnost === 'skladem' && styles.dostupnostSkladem,
                        produkt.dostupnost === 'na_objednavku' && styles.dostupnostObjednavka,
                        produkt.dostupnost === 'nedostupne' && styles.dostupnostNedostupne,
                      ]}>
                        <Text style={[
                          styles.dostupnostText,
                          produkt.dostupnost === 'skladem' && styles.dostupnostTextSkladem,
                          produkt.dostupnost === 'na_objednavku' && styles.dostupnostTextObjednavka,
                          produkt.dostupnost === 'nedostupne' && styles.dostupnostTextNedostupne,
                        ]}>
                          {produkt.dostupnost === 'skladem' ? 'Skladem' :
                           produkt.dostupnost === 'na_objednavku' ? 'Na objednávku' :
                           produkt.dostupnost === 'nedostupne' ? 'Nedostupné' : produkt.dostupnost}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.produktActions}>
                    {produkt.cena !== null && (
                      <View style={styles.produktCena}>
                        <Text style={styles.produktCenaText}>
                          {produkt.cena} Kč
                        </Text>
                        {produkt.jednotka && (
                          <Text style={styles.produktJednotka}>
                            / {produkt.jednotka}
                          </Text>
                        )}
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.addToListBtn,
                        isInSeznam(produkt.id) && styles.addToListBtnActive
                      ]}
                      onPress={() => toggleSeznam(produkt)}
                    >
                      <Text style={styles.addToListBtnText}>
                        {isInSeznam(produkt.id) ? '✓' : '+'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Plovoucí tlačítko - Zobrazit seznam */}
        {seznam.length > 0 && (
          <TouchableOpacity
            style={styles.floatingSeznamBtn}
            onPress={() => router.push('/nakupni-seznam')}
          >
            <Text style={styles.floatingSeznamBtnText}>
              Zobrazit seznam ({seznam.length})
            </Text>
          </TouchableOpacity>
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
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6A1B9A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBackBtn: {
    padding: 6,
  },
  headerBackIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 6,
  },

  // Scroll
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 20,
  },

  // Info karta - kompaktnější
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  farmaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  farmaAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  farmaAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  farmaInfo: {
    flex: 1,
  },
  farmaName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 1,
  },
  farmaMesto: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  farmaPopis: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
    marginBottom: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 6,
  },
  contactBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    borderRadius: 22,
  },

  // Produkty karta
  produktyCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  produktyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  emptyProdukty: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyProduktyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  produktyList: {
    gap: 0,
  },
  produktRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  produktInfo: {
    flex: 1,
    marginRight: 8,
  },
  produktName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 1,
  },
  produktPopis: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
    marginBottom: 4,
  },
  dostupnostBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dostupnostSkladem: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  dostupnostObjednavka: {
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
  },
  dostupnostNedostupne: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  dostupnostText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  dostupnostTextSkladem: {
    color: '#a5d6a7',
  },
  dostupnostTextObjednavka: {
    color: '#ffcc80',
  },
  dostupnostTextNedostupne: {
    color: '#ef9a9a',
  },
  produktActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  produktCena: {
    alignItems: 'flex-end',
  },
  produktCenaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9800',
  },
  produktJednotka: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  addToListBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToListBtnActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  addToListBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  floatingSeznamBtn: {
    backgroundColor: '#FF9800',
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  floatingSeznamBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
