import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { fetchObjednavkaByKod, fetchPolozkyVyzvednuti } from '@/features/objednavky/services/objednavkyService';
import { fetchPestitelVyzvednuti } from '@/features/profil/services/profilService';
import { formatKc, formatMnozstvi } from '../_utils/formatKc';

interface Objednavka {
  id: string;
  stav: string;
  datum_vyzvednuti?: string;
  anon_customer_code?: string;
  celkova_cena?: number;
  created_at: string;
  pestitel_id: string;
}

interface Pestitel {
  id: string;
  nazev_farmy?: string;
  jmeno?: string;
  prijmeni?: string;
  telefon?: string;
  email?: string;
  mesto?: string;
  adresa?: string;
  gps_lat?: number;
  gps_lng?: number;
}

interface ObjednavkaPolozka {
  id: string;
  nazev_produktu: string;
  mnozstvi: number;
  jednotka: string;
  cena?: number;
}

export default function VyzvednutiScreen() {
  const params = useLocalSearchParams();
  const kod = params.kod as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objednavka, setObjednavka] = useState<Objednavka | null>(null);
  const [pestitel, setPestitel] = useState<Pestitel | null>(null);
  const [polozky, setPolozky] = useState<ObjednavkaPolozka[]>([]);

  useEffect(() => {
    if (kod) {
      loadData();
    } else {
      setError('Chybí kód objednávky');
      setLoading(false);
    }
  }, [kod]);

  const loadData = async () => {
    try {
      // Najdi objednávku podle anon_customer_code
      const objednavkaData = await fetchObjednavkaByKod(kod).catch(() => null) as Objednavka | null;

      if (!objednavkaData) {
        setError('Objednávka nenalezena');
        setLoading(false);
        return;
      }

      setObjednavka(objednavkaData);

      // Načti info o pěstiteli
      const pestitelData = await fetchPestitelVyzvednuti(objednavkaData.pestitel_id);
      if (pestitelData) {
        setPestitel(pestitelData as unknown as Pestitel);
      }

      // Načti položky
      const polozkyData = await fetchPolozkyVyzvednuti(objednavkaData.id);
      setPolozky(polozkyData);
    } catch (err) {
      console.error('Chyba:', err);
      setError('Nepodařilo se načíst objednávku');
    } finally {
      setLoading(false);
    }
  };

  const formatDatum = (datum?: string) => {
    if (!datum) return 'Neuvedeno';
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const getStavText = (stav: string) => {
    switch (stav) {
      case 'cekajici_na_potvrzeni':
        return 'Čeká na potvrzení';
      case 'potvrzena':
        return 'Potvrzená';
      case 'nova':
        return 'Nová';
      case 'zpracovana':
        return 'Připraveno k vyzvednutí';
      case 'dokoncena':
        return 'Vyzvednuto';
      case 'odmitnuta':
        return 'Odmítnuta';
      case 'zrusena':
        return 'Zrušena';
      default:
        return stav;
    }
  };

  const getStavBarva = (stav: string) => {
    switch (stav) {
      case 'cekajici_na_potvrzeni':
        return '#FF9800';
      case 'potvrzena':
      case 'nova':
        return '#2196F3';
      case 'zpracovana':
        return '#2d6b0a';
      case 'dokoncena':
        return '#4CAF50';
      case 'odmitnuta':
      case 'zrusena':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const zavolatFarmare = () => {
    if (pestitel?.telefon) {
      Linking.openURL(`tel:${pestitel.telefon}`);
    }
  };

  const otevritMapu = () => {
    if (pestitel?.gps_lat && pestitel?.gps_lng) {
      const url = `https://maps.google.com/?q=${pestitel.gps_lat},${pestitel.gps_lng}`;
      Linking.openURL(url);
    } else if (pestitel?.adresa && pestitel?.mesto) {
      const address = encodeURIComponent(`${pestitel.adresa}, ${pestitel.mesto}`);
      Linking.openURL(`https://maps.google.com/?q=${address}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1a3a1a" />
          <Text style={styles.loadingText}>Načítám objednávku...</Text>
        </View>
      </View>
    );
  }

  if (error || !objednavka) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorTitle}>Objednávka nenalezena</Text>
          <Text style={styles.errorText}>
            Zkontrolujte prosím kód objednávky nebo kontaktujte farmáře.
          </Text>
        </View>
      </View>
    );
  }

  const nazevFarmáre = pestitel?.nazev_farmy ||
    (pestitel?.jmeno && pestitel?.prijmeni ? `${pestitel.jmeno} ${pestitel.prijmeni}` : 'Farmář');

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logo}>🧺 Samopěstitelé</Text>
        <Text style={styles.headerTitle}>Vaše objednávka</Text>
        <Text style={styles.orderCode}>#{objednavka.anon_customer_code}</Text>
      </View>

      {/* Stav objednávky */}
      <View style={[styles.statusCard, { borderColor: getStavBarva(objednavka.stav) }]}>
        <View style={[styles.statusBadge, { backgroundColor: getStavBarva(objednavka.stav) }]}>
          <Text style={styles.statusText}>{getStavText(objednavka.stav)}</Text>
        </View>
        {objednavka.stav === 'zpracovana' && (
          <Text style={styles.statusHint}>✅ Vaše objednávka je připravena k vyzvednutí!</Text>
        )}
        {objednavka.stav === 'cekajici_na_potvrzeni' && (
          <Text style={styles.statusHint}>⏳ Čekáme na potvrzení od farmáře</Text>
        )}
        {objednavka.stav === 'dokoncena' && (
          <Text style={styles.statusHint}>🎉 Děkujeme za nákup!</Text>
        )}
      </View>

      {/* Datum vyzvednutí */}
      {objednavka.datum_vyzvednuti && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Kdy vyzvednout</Text>
          <Text style={styles.pickupDate}>{formatDatum(objednavka.datum_vyzvednuti)}</Text>
        </View>
      )}

      {/* Info o farmáři */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>👨‍🌾 Kde vyzvednout</Text>
        <Text style={styles.farmerName}>{nazevFarmáre}</Text>

        {pestitel?.adresa && (
          <Text style={styles.address}>
            📍 {pestitel.adresa}{pestitel.mesto ? `, ${pestitel.mesto}` : ''}
          </Text>
        )}

        <View style={styles.actionButtons}>
          {pestitel?.telefon && (
            <TouchableOpacity style={styles.callButton} onPress={zavolatFarmare}>
              <Text style={styles.callButtonText}>📞 Zavolat</Text>
            </TouchableOpacity>
          )}

          {(pestitel?.gps_lat || pestitel?.adresa) && (
            <TouchableOpacity style={styles.mapButton} onPress={otevritMapu}>
              <Text style={styles.mapButtonText}>🗺️ Navigovat</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Položky objednávky */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🛒 Vaše objednávka</Text>

        {polozky.map((polozka) => (
          <View key={polozka.id} style={styles.productItem}>
            <View style={styles.productInfo}>
              <Text style={styles.productName}>{polozka.nazev_produktu}</Text>
              <Text style={styles.productQuantity}>
                {formatMnozstvi(polozka.mnozstvi)} {polozka.jednotka}
              </Text>
            </View>
            {polozka.cena && polozka.cena > 0 && (
              <Text style={styles.productPrice}>
                {formatKc(polozka.cena * polozka.mnozstvi)} Kč
              </Text>
            )}
          </View>
        ))}

        {objednavka.celkova_cena && objednavka.celkova_cena > 0 && (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Celkem:</Text>
            <Text style={styles.totalPrice}>{formatKc(objednavka.celkova_cena)} Kč</Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Děkujeme, že nakupujete lokálně! 🍎🥬
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    paddingTop: 100,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },

  // Header
  header: {
    backgroundColor: '#1a3a1a',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logo: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  orderCode: {
    fontSize: 18,
    color: '#FF9800',
    fontWeight: '600',
  },

  // Status card
  statusCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -12,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },

  // Cards
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pickupDate: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  farmerName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  address: {
    fontSize: 15,
    color: '#666',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  callButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  callButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  mapButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  mapButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Products
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  productQuantity: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: '#1a3a1a',
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a3a1a',
  },

  // Footer
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#999',
  },
});
