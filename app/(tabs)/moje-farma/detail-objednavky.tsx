import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Objednavka {
  id: string;
  stav: string;
  datum_vyzvednutí?: string;
}

interface ObjednavkaPolozka {
  id: string;
  nazev_produktu: string;
  mnozstvi: number;
  jednotka: string;
}

export default function DetailObjednavkyScreen() {
  const params = useLocalSearchParams();
  const objednavkaId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [objednavka, setObjednavka] = useState<Objednavka | null>(null);
  const [polozky, setPolozky] = useState<ObjednavkaPolozka[]>([]);

  useEffect(() => {
    loadObjednavka();
  }, []);

  const loadObjednavka = async () => {
    try {
      // Načti objednávku
      const { data: objednavkaData, error: objednavkaError } = await supabase
        .from('objednavky')
        .select('id, stav, datum_vyzvednutí')
        .eq('id', objednavkaId)
        .single();

      if (objednavkaError) {
        console.error('Chyba při načítání objednávky:', objednavkaError);
        showAlert('Chyba', 'Nepodařilo se načíst objednávku');
        router.back();
        return;
      }

      setObjednavka(objednavkaData);

      // Načti položky objednávky
      const { data: polozkyData, error: polozkyError } = await supabase
        .from('objednavky_polozky')
        .select('id, nazev_produktu, mnozstvi, jednotka')
        .eq('objednavka_id', objednavkaId);

      if (polozkyError) {
        console.error('Chyba při načítání položek:', polozkyError);
      } else {
        setPolozky(polozkyData || []);
      }
    } catch (error) {
      console.error('Chyba:', error);
      showAlert('Chyba', 'Nepodařilo se načíst data');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const formatDatum = (datum?: string) => {
    if (!datum) return 'Neuvedeno';
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
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

  const zmeniStav = async (novyStav: string) => {
    try {
      const { error } = await supabase
        .from('objednavky')
        .update({ stav: novyStav, updated_at: new Date().toISOString() })
        .eq('id', objednavkaId);

      if (error) {
        showAlert('Chyba', 'Nepodařilo se změnit stav objednávky');
        return;
      }

      setObjednavka(prev => prev ? { ...prev, stav: novyStav } : null);
      showAlert('Úspěch', `Stav změněn na "${getStavText(novyStav)}"`);
    } catch (error) {
      console.error('Chyba při změně stavu:', error);
      showAlert('Chyba', 'Nepodařilo se změnit stav');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail objednávky</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Načítám...</Text>
        </View>
      </View>
    );
  }

  if (!objednavka) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Objednávka nenalezena</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/moje-farma/objednavky')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail objednávky</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Stav objednávky */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Stav objednávky</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStavBarva(objednavka.stav) + '30' }
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

          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#2196F3' }]}
              onPress={() => zmeniStav('nova')}
            >
              <Text style={styles.statusButtonText}>Nová</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#FF9800' }]}
              onPress={() => zmeniStav('zpracovana')}
            >
              <Text style={styles.statusButtonText}>Zpracovaná</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, { backgroundColor: '#4CAF50' }]}
              onPress={() => zmeniStav('dokoncena')}
            >
              <Text style={styles.statusButtonText}>Dokončená</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Datum vyzvednutí */}
        {objednavka.datum_vyzvednutí && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Datum vyzvednutí</Text>
            <Text style={styles.vyzvednutiText}>
              {formatDatum(objednavka.datum_vyzvednutí)}
            </Text>
          </View>
        )}

        {/* Seznam položek */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Objednané produkty ({polozky.length})</Text>

          {polozky.length === 0 ? (
            <Text style={styles.emptyText}>Žádné položky</Text>
          ) : (
            polozky.map((polozka) => (
              <View key={polozka.id} style={styles.productItem}>
                <Text style={styles.productName}>{polozka.nazev_produktu}</Text>
                <Text style={styles.productQuantity}>
                  {polozka.mnozstvi} {polozka.jednotka}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A'
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  backButton: {
    marginBottom: 8
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)'
  },
  content: {
    flex: 1,
    padding: 12
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700'
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  vyzvednutiText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9800',
    marginTop: -8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: -8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    flex: 1,
  },
  productQuantity: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF9800'
  }
});
