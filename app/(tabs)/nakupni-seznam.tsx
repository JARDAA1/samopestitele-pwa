import { View, Text, StyleSheet, FlatList, TouchableOpacity, Linking, Alert } from 'react-native';
import { useShoppingList } from '../utils/cartContext';
import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';

interface GroupedByFarmer {
  pestitelId: number;
  pestitelNazev: string;
  pestitelTelefon?: string;
  pestitelMesto?: string;
  produkty: Array<{
    produkt_id: number;
    nazev: string;
    cena: number;
    jednotka: string;
    mnozstvi: number;
  }>;
  celkovaCena: number;
}

export default function NakupniSeznamScreen() {
  const { shoppingList, removeFromList, updateQuantity, clearList, itemCount } = useShoppingList();

  // Seskupení produktů podle farmářů
  const groupedByFarmer = useMemo(() => {
    const groups: { [key: number]: GroupedByFarmer } = {};

    shoppingList.forEach((item) => {
      if (!groups[item.pestitelId]) {
        groups[item.pestitelId] = {
          pestitelId: item.pestitelId,
          pestitelNazev: item.pestitelNazev,
          pestitelTelefon: item.pestitelTelefon,
          pestitelMesto: item.pestitelMesto,
          produkty: [],
          celkovaCena: 0,
        };
      }

      groups[item.pestitelId].produkty.push({
        produkt_id: item.produkt_id,
        nazev: item.nazev,
        cena: item.cena,
        jednotka: item.jednotka,
        mnozstvi: item.mnozstvi,
      });

      groups[item.pestitelId].celkovaCena += item.cena * item.mnozstvi;
    });

    return Object.values(groups);
  }, [shoppingList]);

  const handleCall = (telefon?: string) => {
    if (!telefon) {
      Alert.alert('Chyba', 'Telefon není k dispozici');
      return;
    }

    Linking.openURL(`tel:${telefon}`);
  };

  const handleSendSMS = (farmer: GroupedByFarmer) => {
    if (!farmer.pestitelTelefon) {
      Alert.alert('Chyba', 'Telefon není k dispozici');
      return;
    }

    // Vytvoříme text SMS zprávy se seznamem produktů
    let message = `Dobrý den,\nrád bych objednal:\n\n`;

    farmer.produkty.forEach((produkt) => {
      message += `${produkt.nazev} - ${produkt.mnozstvi} ${produkt.jednotka}\n`;
    });

    message += `\nCelkem: ${farmer.celkovaCena.toFixed(0)} Kč\n\nDěkuji`;

    // Otevřeme SMS aplikaci s předvyplněným textem
    const smsUrl = `sms:${farmer.pestitelTelefon}?body=${encodeURIComponent(message)}`;

    Linking.openURL(smsUrl).catch(() => {
      Alert.alert('Chyba', 'Nepodařilo se otevřít aplikaci pro SMS');
    });
  };

  const handleClearAll = () => {
    Alert.alert(
      'Smazat seznam',
      'Opravdu chcete smazat celý nákupní seznam?',
      [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Smazat', style: 'destructive', onPress: clearList },
      ]
    );
  };

  if (groupedByFarmer.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Můj nákupní seznam</Text>
        </View>
        <View style={styles.emptyContainer}>
          <Ionicons name="list-outline" size={80} color="#ccc" />
          <Text style={styles.emptyText}>Váš nákupní seznam je prázdný</Text>
          <Text style={styles.emptySubtext}>
            Přidejte produkty od farmářů, které chcete koupit
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Můj nákupní seznam</Text>
        <TouchableOpacity onPress={handleClearAll} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Smazat vše</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={groupedByFarmer}
        keyExtractor={(item) => item.pestitelId.toString()}
        renderItem={({ item: farmer }) => (
          <View style={styles.farmerCard}>
            <View style={styles.farmerHeader}>
              <View style={styles.farmerInfo}>
                <Text style={styles.farmerName}>{farmer.pestitelNazev}</Text>
                {farmer.pestitelMesto && (
                  <Text style={styles.farmerCity}>{farmer.pestitelMesto}</Text>
                )}
              </View>
              {farmer.pestitelTelefon && (
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={styles.smsButton}
                    onPress={() => handleSendSMS(farmer)}
                  >
                    <Ionicons name="chatbubble" size={20} color="#fff" />
                    <Text style={styles.smsButtonText}>SMS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.callButton}
                    onPress={() => handleCall(farmer.pestitelTelefon)}
                  >
                    <Ionicons name="call" size={20} color="#fff" />
                    <Text style={styles.callButtonText}>Zavolat</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {farmer.pestitelTelefon && (
              <Text style={styles.phoneNumber}>{farmer.pestitelTelefon}</Text>
            )}

            <View style={styles.productsContainer}>
              {farmer.produkty.map((produkt) => (
                <View key={produkt.produkt_id} style={styles.productRow}>
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{produkt.nazev}</Text>
                    <Text style={styles.productPrice}>
                      {produkt.cena} Kč/{produkt.jednotka}
                    </Text>
                  </View>

                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => updateQuantity(produkt.produkt_id, produkt.mnozstvi - 1)}
                      style={styles.quantityButton}
                    >
                      <Ionicons name="remove" size={20} color="#4CAF50" />
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>
                      {produkt.mnozstvi} {produkt.jednotka}
                    </Text>

                    <TouchableOpacity
                      onPress={() => updateQuantity(produkt.produkt_id, produkt.mnozstvi + 1)}
                      style={styles.quantityButton}
                    >
                      <Ionicons name="add" size={20} color="#4CAF50" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => removeFromList(produkt.produkt_id)}
                      style={styles.removeButton}
                    >
                      <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.farmerTotal}>
              <Text style={styles.farmerTotalText}>
                Celkem u tohoto farmáře: {farmer.celkovaCena.toFixed(2)} Kč
              </Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 5,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  listContent: {
    padding: 15,
  },
  farmerCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  farmerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  farmerInfo: {
    flex: 1,
  },
  farmerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  farmerCity: {
    fontSize: 14,
    color: '#666',
  },
  phoneNumber: {
    fontSize: 14,
    color: '#4CAF50',
    marginBottom: 15,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  smsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  smsButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 5,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  productsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    color: '#666',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    minWidth: 60,
    textAlign: 'center',
  },
  removeButton: {
    marginLeft: 8,
    padding: 5,
  },
  farmerTotal: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  farmerTotalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    textAlign: 'right',
  },
});
