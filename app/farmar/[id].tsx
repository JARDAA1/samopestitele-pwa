import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

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

export default function FarmarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [farmar, setFarmar] = useState<Farmar | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadFarmarDetail();
    }
  }, [id]);

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
        <ActivityIndicator size="large" color="#222" />
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

          {/* Kontaktní tlačítka */}
          <View style={styles.contactRow}>
            {farmar.telefon && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
                <Text style={styles.contactBtnIcon}>📞</Text>
                <Text style={styles.contactBtnText}>Zavolat</Text>
              </TouchableOpacity>
            )}
            {farmar.email && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleEmail}>
                <Text style={styles.contactBtnIcon}>✉️</Text>
                <Text style={styles.contactBtnText}>Email</Text>
              </TouchableOpacity>
            )}
            {farmar.gps_lat && farmar.gps_lng && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleNavigate}>
                <Text style={styles.contactBtnIcon}>🗺️</Text>
                <Text style={styles.contactBtnText}>Navigovat</Text>
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
                        <Text style={styles.dostupnostText}>
                          {produkt.dostupnost === 'skladem' ? 'Skladem' :
                           produkt.dostupnost === 'na_objednavku' ? 'Na objednávku' :
                           produkt.dostupnost === 'nedostupne' ? 'Nedostupné' : produkt.dostupnost}
                        </Text>
                      </View>
                    )}
                  </View>
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
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eeeeee',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#222',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerBackBtn: {
    padding: 8,
  },
  headerBackIcon: {
    fontSize: 24,
    color: '#222',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginHorizontal: 8,
  },

  // Scroll
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },

  // Info karta
  infoCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  farmaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  farmaAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6A1B9A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  farmaAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  farmaInfo: {
    flex: 1,
  },
  farmaName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  farmaMesto: {
    fontSize: 14,
    color: '#666',
  },
  farmaPopis: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  contactRow: {
    flexDirection: 'row',
    gap: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  contactBtnIcon: {
    fontSize: 16,
  },
  contactBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },

  // Produkty karta
  produktyCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  produktyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
  },
  emptyProdukty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyProduktyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  produktyList: {
    gap: 0,
  },
  produktRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  produktInfo: {
    flex: 1,
    marginRight: 12,
  },
  produktName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  produktPopis: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 6,
  },
  dostupnostBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  dostupnostSkladem: {
    backgroundColor: '#e8f5e9',
  },
  dostupnostObjednavka: {
    backgroundColor: '#fff3e0',
  },
  dostupnostNedostupne: {
    backgroundColor: '#ffebee',
  },
  dostupnostText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  produktCena: {
    alignItems: 'flex-end',
  },
  produktCenaText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  produktJednotka: {
    fontSize: 12,
    color: '#666',
  },
});
