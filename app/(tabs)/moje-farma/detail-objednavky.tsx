import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';

interface Objednavka {
  id: string;
  zakaznik_jmeno: string;
  zakaznik_telefon: string;
  celkova_cena: number;
  stav: string;
  created_at: string;
  poznamka: string | null;
  zpusob_kontaktu: string;
}

interface ObjednavkaPolozka {
  id: string;
  nazev_produktu: string;
  cena: number;
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
        .select('*')
        .eq('id', objednavkaId)
        .single();

      if (objednavkaError) {
        console.error('Chyba při načítání objednávky:', objednavkaError);
        Alert.alert('Chyba', 'Nepodařilo se načíst objednávku');
        router.back();
        return;
      }

      setObjednavka(objednavkaData);

      // Načti položky objednávky
      const { data: polozkyData, error: polozkyError } = await supabase
        .from('objednavky_polozky')
        .select('*')
        .eq('objednavka_id', objednavkaId);

      if (polozkyError) {
        console.error('Chyba při načítání položek:', polozkyError);
      } else {
        setPolozky(polozkyData || []);
      }
    } catch (error) {
      console.error('Chyba:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst data');
    } finally {
      setLoading(false);
    }
  };

  const formatDatum = (datum: string) => {
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStavBarva = (stav: string) => {
    switch (stav) {
      case 'nova':
        return '#2196F3';
      case 'zpracovana':
        return '#FF9800';
      case 'dokoncena':
        return '#7B1FA2';
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
        Alert.alert('Chyba', 'Nepodařilo se změnit stav objednávky');
        return;
      }

      setObjednavka(prev => prev ? { ...prev, stav: novyStav } : null);
      Alert.alert('Úspěch', `Stav změněn na "${getStavText(novyStav)}"`);
    } catch (error) {
      console.error('Chyba při změně stavu:', error);
      Alert.alert('Chyba', 'Nepodařilo se změnit stav');
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
      {/* Header s informacemi o zákazníkovi - VŽDY VIDITELNÝ */}
      <View style={styles.stickyHeader}>
        <TouchableOpacity onPress={() => router.push('/moje-farma/objednavky')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <View style={styles.customerHeader}>
          <Text style={styles.customerHeaderName}>👤 {objednavka.zakaznik_jmeno}</Text>
          <Text style={styles.customerHeaderPhone}>📱 {objednavka.zakaznik_telefon}</Text>
        </View>
      </View>

      <ScrollView style={styles.content}>
        {/* Stav objednávky */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📋 Stav objednávky</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStavBarva(objednavka.stav) + '20' }
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
              style={[styles.statusButton, { backgroundColor: '#7B1FA2' }]}
              onPress={() => zmeniStav('dokoncena')}
            >
              <Text style={styles.statusButtonText}>Dokončená</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informace o objednávce */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>ℹ️ Informace</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Vytvořeno:</Text>
            <Text style={styles.infoValue}>{formatDatum(objednavka.created_at)}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Způsob kontaktu:</Text>
            <Text style={styles.infoValue}>{objednavka.zpusob_kontaktu}</Text>
          </View>
          {objednavka.poznamka && (
            <View style={styles.noteBox}>
              <Text style={styles.noteLabel}>💬 Poznámka:</Text>
              <Text style={styles.noteText}>{objednavka.poznamka}</Text>
            </View>
          )}
        </View>

        {/* Objednané produkty */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛒 Objednané produkty ({polozky.length})</Text>

          {polozky.map((polozka) => (
            <View key={polozka.id} style={styles.productItem}>
              <View style={styles.productInfo}>
                <Text style={styles.productName}>{polozka.nazev_produktu}</Text>
                <Text style={styles.productQuantity}>
                  {polozka.mnozstvi} {polozka.jednotka} × {polozka.cena} Kč
                </Text>
              </View>
              <Text style={styles.productTotal}>
                {(polozka.mnozstvi * polozka.cena).toFixed(2)} Kč
              </Text>
            </View>
          ))}

          <View style={styles.totalBox}>
            <Text style={styles.totalLabel}>Celková cena:</Text>
            <Text style={styles.totalPrice}>{objednavka.celkova_cena} Kč</Text>
          </View>
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
  stickyHeader: {
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
  customerHeader: {
    gap: 4
  },
  customerHeaderName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  customerHeaderPhone: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)'
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
    flex: 1
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    margin: 12,
    padding: 16,
    borderRadius: 12,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600'
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  statusButton: {
    flex: 1,
    minWidth: 90,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600'
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  infoLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)'
  },
  infoValue: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500'
  },
  noteBox: {
    marginTop: 10,
    padding: 12,
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800'
  },
  noteLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 4
  },
  noteText: {
    fontSize: 13,
    color: '#ffffff',
    lineHeight: 18
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  productInfo: {
    flex: 1,
    gap: 4
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff'
  },
  productQuantity: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)'
  },
  productTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800'
  },
  totalBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)'
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9800'
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  }
});
