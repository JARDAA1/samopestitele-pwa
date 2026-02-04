import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, Linking } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

interface SeznamItem {
  produktId: string;
  produktNazev: string;
  farmarId: string;
  farmarNazev: string;
  cena: number | null;
  jednotka: string | null;
  mnozstvi?: number;
  mnozstviJednotka?: string;
}

export default function NakupniSeznamScreen() {
  const [seznam, setSeznam] = useState<SeznamItem[]>([]);

  useEffect(() => {
    loadSeznam();
  }, []);

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

  const removeItem = (produktId: string) => {
    const newSeznam = seznam.filter(item => item.produktId !== produktId);
    saveSeznam(newSeznam);
  };

  const clearAll = () => {
    if (Platform.OS === 'web') {
      if (confirm('Opravdu chcete smazat celý seznam?')) {
        saveSeznam([]);
      }
    } else {
      Alert.alert(
        'Smazat seznam',
        'Opravdu chcete smazat celý seznam?',
        [
          { text: 'Zrušit', style: 'cancel' },
          { text: 'Smazat', style: 'destructive', onPress: () => saveSeznam([]) },
        ]
      );
    }
  };

  // Seskupit položky podle farmáře
  const groupedByFarmar = seznam.reduce((acc, item) => {
    if (!acc[item.farmarId]) {
      acc[item.farmarId] = {
        farmarNazev: item.farmarNazev,
        items: [],
      };
    }
    acc[item.farmarId].items.push(item);
    return acc;
  }, {} as { [key: string]: { farmarNazev: string; items: SeznamItem[] } });

  const totalItems = seznam.length;
  const totalPrice = seznam.reduce((sum, item) => {
    const mnozstvi = item.mnozstvi || 1;
    return sum + (item.cena || 0) * mnozstvi;
  }, 0);

  // Vytvoření textu pro SMS
  const createSmsText = (farmarId: string) => {
    const group = groupedByFarmar[farmarId];
    if (!group) return '';

    let text = `Dobrý den,\nmám zájem o:\n\n`;

    group.items.forEach((item) => {
      const mnozstvi = item.mnozstvi || 1;
      const jednotka = item.mnozstviJednotka || item.jednotka || 'ks';
      text += `• ${item.produktNazev} - ${mnozstvi} ${jednotka}\n`;
    });

    text += `\nDěkuji za odpověď.`;

    return text;
  };

  // Odeslání SMS farmáři
  const sendSmsToFarmar = async (farmarId: string, farmarTelefon?: string) => {
    const smsText = createSmsText(farmarId);

    // Pokud nemáme telefon, načteme ho z DB
    let telefon = farmarTelefon;
    if (!telefon) {
      // Pro jednoduchost otevřeme SMS bez čísla - uživatel ho zadá sám
      const smsUrl = Platform.select({
        ios: `sms:&body=${encodeURIComponent(smsText)}`,
        android: `sms:?body=${encodeURIComponent(smsText)}`,
        default: `sms:?body=${encodeURIComponent(smsText)}`,
      });

      if (smsUrl) {
        Linking.openURL(smsUrl);
      }
      return;
    }

    const smsUrl = Platform.select({
      ios: `sms:${telefon}&body=${encodeURIComponent(smsText)}`,
      android: `sms:${telefon}?body=${encodeURIComponent(smsText)}`,
      default: `sms:${telefon}?body=${encodeURIComponent(smsText)}`,
    });

    if (smsUrl) {
      Linking.openURL(smsUrl);
    }
  };

  // Odeslání všech SMS
  const sendAllSms = () => {
    const farmarIds = Object.keys(groupedByFarmar);

    if (farmarIds.length === 1) {
      sendSmsToFarmar(farmarIds[0]);
    } else {
      // Více farmářů - vytvořit jeden dlouhý text
      let fullText = `Nákupní seznam:\n\n`;

      farmarIds.forEach((farmarId) => {
        const group = groupedByFarmar[farmarId];
        fullText += `📍 ${group.farmarNazev}:\n`;
        group.items.forEach((item) => {
          const mnozstvi = item.mnozstvi || 1;
          const jednotka = item.mnozstviJednotka || item.jednotka || 'ks';
          fullText += `  • ${item.produktNazev} - ${mnozstvi} ${jednotka}\n`;
        });
        fullText += `\n`;
      });

      const smsUrl = Platform.select({
        ios: `sms:&body=${encodeURIComponent(fullText)}`,
        android: `sms:?body=${encodeURIComponent(fullText)}`,
        default: `sms:?body=${encodeURIComponent(fullText)}`,
      });

      if (smsUrl) {
        Linking.openURL(smsUrl);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nákupní seznam</Text>
        {seznam.length > 0 && (
          <TouchableOpacity onPress={clearAll} style={styles.headerClearBtn}>
            <Text style={styles.headerClearText}>Smazat</Text>
          </TouchableOpacity>
        )}
        {seznam.length === 0 && <View style={{ width: 60 }} />}
      </View>

      {seznam.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Seznam je prázdný</Text>
          <Text style={styles.emptyText}>
            Přidejte produkty od farmářů kliknutím na tlačítko + u produktu.
          </Text>
          <TouchableOpacity
            style={styles.emptyBtn}
            onPress={() => router.push('/mapa')}
          >
            <Text style={styles.emptyBtnText}>Hledat farmáře</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
          {/* Souhrn */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Položek celkem:</Text>
              <Text style={styles.summaryValue}>{totalItems}</Text>
            </View>
            {totalPrice > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Orientační cena:</Text>
                <Text style={styles.summaryPrice}>{totalPrice.toFixed(0)} Kč</Text>
              </View>
            )}

            {/* Hlavní tlačítko odeslat SMS */}
            <TouchableOpacity
              style={styles.sendSmsBtn}
              onPress={sendAllSms}
            >
              <Ionicons name="chatbubble" size={20} color="#ffffff" />
              <Text style={styles.sendSmsBtnText}>Odeslat objednávku SMS</Text>
            </TouchableOpacity>
          </View>

          {/* Seznam podle farmářů */}
          {Object.entries(groupedByFarmar).map(([farmarId, group]) => (
            <View key={farmarId} style={styles.farmarCard}>
              <TouchableOpacity
                style={styles.farmarHeader}
                onPress={() => router.push(`/farmar/${farmarId}`)}
              >
                <Text style={styles.farmarName}>{group.farmarNazev}</Text>
                <Text style={styles.farmarArrow}>›</Text>
              </TouchableOpacity>

              {group.items.map((item) => (
                <View key={item.produktId} style={styles.produktRow}>
                  <View style={styles.produktInfo}>
                    <Text style={styles.produktName}>
                      {item.produktNazev}
                      {item.mnozstvi && (
                        <Text style={styles.produktMnozstvi}>
                          {' '}({item.mnozstvi} {item.mnozstviJednotka || item.jednotka || 'ks'})
                        </Text>
                      )}
                    </Text>
                    {item.cena !== null && (
                      <Text style={styles.produktCena}>
                        {item.cena} Kč{item.jednotka ? ` / ${item.jednotka}` : ''}
                        {item.mnozstvi && item.mnozstvi > 1 && (
                          <Text> = {(item.cena * item.mnozstvi).toFixed(0)} Kč</Text>
                        )}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeItem(item.produktId)}
                  >
                    <Text style={styles.removeBtnText}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}

              {/* Tlačítko SMS pro tohoto farmáře */}
              <TouchableOpacity
                style={styles.smsFarmarBtn}
                onPress={() => sendSmsToFarmar(farmarId)}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#ffffff" />
                <Text style={styles.smsFarmarBtnText}>Poslat SMS</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#6A1B9A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBackBtn: {
    padding: 8,
  },
  headerBackIcon: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  headerClearBtn: {
    padding: 8,
  },
  headerClearText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 10,
  },
  emptyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Scroll
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 40,
  },

  // Summary
  summaryCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  summaryPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF9800',
  },

  // Farmar card
  farmarCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  farmarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  farmarName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  farmarArrow: {
    fontSize: 20,
    color: '#FF9800',
  },

  // Produkt row
  produktRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  produktInfo: {
    flex: 1,
  },
  produktName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#ffffff',
    marginBottom: 2,
  },
  produktCena: {
    fontSize: 13,
    color: '#FF9800',
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  removeBtnText: {
    fontSize: 20,
    color: '#ef9a9a',
    fontWeight: '600',
  },
  produktMnozstvi: {
    fontSize: 13,
    fontWeight: '400',
    color: '#FF9800',
  },

  // SMS tlačítka
  sendSmsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
    gap: 8,
  },
  sendSmsBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  smsFarmarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6A1B9A',
    paddingVertical: 10,
    margin: 10,
    marginTop: 0,
    borderRadius: 8,
    gap: 6,
  },
  smsFarmarBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
});
