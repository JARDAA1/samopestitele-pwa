import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useCart } from '../utils/cartContext';
import { supabase } from '../../lib/supabase';

export default function KosikScreen() {
  const { cart, removeFromCart, updateQuantity, clearCart, totalPrice, itemCount } = useCart();
  const [jmeno, setJmeno] = useState('');
  const [telefon, setTelefon] = useState('');
  const [poznamka, setPoznamka] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuantityChange = (produkt_id: number, change: number) => {
    const item = cart.find((i) => i.produkt_id === produkt_id);
    if (!item) return;

    const newQuantity = item.mnozstvi + change;
    if (newQuantity <= 0) {
      Alert.alert(
        'Odebrat produkt',
        'Chcete odebrat tento produkt z košíku?',
        [
          { text: 'Zrušit', style: 'cancel' },
          {
            text: 'Odebrat',
            style: 'destructive',
            onPress: () => removeFromCart(produkt_id),
          },
        ]
      );
    } else {
      updateQuantity(produkt_id, newQuantity);
    }
  };

  const handleSubmitOrder = async () => {
    // Validace
    if (!jmeno.trim()) {
      Alert.alert('Chyba', 'Vyplňte prosím vaše jméno');
      return;
    }

    if (!telefon.trim()) {
      Alert.alert('Chyba', 'Vyplňte prosím váš telefon');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Chyba', 'Košík je prázdný');
      return;
    }

    setIsSubmitting(true);

    try {
      // Získáme ID farmáře z prvního produktu v košíku
      const pestitelId = cart[0].pestitelId;

      // 1. Vytvoříme objednávku
      const { data: objednavka, error: objednavkaError } = await supabase
        .from('objednavky')
        .insert({
          pestitel_id: pestitelId,
          zakaznik_jmeno: jmeno,
          zakaznik_telefon: telefon,
          stav: 'nova',
          celkova_cena: totalPrice,
          poznamka: poznamka || null,
          zpusob_kontaktu: 'telefon',
        })
        .select()
        .single();

      if (objednavkaError) throw objednavkaError;

      // 2. Přidáme položky objednávky
      const polozky = cart.map((item) => ({
        objednavka_id: objednavka.id,
        produkt_id: item.produkt_id,
        nazev_produktu: item.nazev,
        cena: item.cena,
        mnozstvi: item.mnozstvi,
        jednotka: item.jednotka,
      }));

      const { error: polozkyError } = await supabase
        .from('objednavky_polozky')
        .insert(polozky);

      if (polozkyError) throw polozkyError;

      // 3. Přidáme farmáře do oblíbených (pokud tam ještě není)
      const { error: oblibeniError } = await supabase
        .from('oblibeni_farmari')
        .insert({
          zakaznik_telefon: telefon,
          pestitel_id: pestitelId,
        })
        .select()
        .single();

      // Ignorujeme chybu pokud farmář již je v oblíbených (unique constraint)
      if (oblibeniError && !oblibeniError.message.includes('unique')) {
        console.warn('Chyba při přidání do oblíbených:', oblibeniError);
      }

      // Úspěch!
      Alert.alert(
        '✅ Objednávka odeslána!',
        `Vaše objednávka byla úspěšně odeslána farmáři ${cart[0].pestitelNazev}.\n\nFarmář vás bude brzy kontaktovat na čísle ${telefon}.\n\nDěkujeme za nákup! 🌾`,
        [
          {
            text: 'OK',
            onPress: () => {
              clearCart();
              router.push('/(tabs)');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Chyba při vytváření objednávky:', error);
      Alert.alert('Chyba', 'Nepodařilo se vytvořit objednávku. Zkuste to prosím znovu.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🛒 Košík</Text>
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyTitle}>Košík je prázdný</Text>
          <Text style={styles.emptyText}>
            Zatím jste nepřidali žádné produkty do košíku
          </Text>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => router.push('/mapa')}
          >
            <Text style={styles.continueButtonText}>Najít farmáře</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🛒 Košík ({itemCount})</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            🌾 Nakupujete u: {cart[0].pestitelNazev}
          </Text>
        </View>

        {/* Položky v košíku */}
        <View style={styles.itemsContainer}>
          {cart.map((item) => (
            <View key={item.produkt_id} style={styles.cartItem}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>{item.nazev}</Text>
                <Text style={styles.cartItemPrice}>
                  {item.cena ? item.cena.toFixed(0) : '0'} Kč/{item.jednotka}
                </Text>
              </View>

              <View style={styles.cartItemActions}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.produkt_id, -1)}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.quantityText}>{item.mnozstvi}</Text>

                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.produkt_id, 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cartItemTotal}>
                <Text style={styles.cartItemTotalText}>
                  {(item.cena * item.mnozstvi).toFixed(0)} Kč
                </Text>
                <TouchableOpacity
                  onPress={() => removeFromCart(item.produkt_id)}
                  style={styles.removeButton}
                >
                  <Text style={styles.removeButtonText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {/* Celková cena */}
        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Celkem:</Text>
          <Text style={styles.totalPrice}>{totalPrice.toFixed(0)} Kč</Text>
        </View>

        {/* Kontaktní formulář */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>📝 Vaše kontaktní údaje</Text>

          <Text style={styles.label}>Jméno a příjmení *</Text>
          <TextInput
            style={styles.input}
            value={jmeno}
            onChangeText={setJmeno}
            placeholder="Jan Novák"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Telefon *</Text>
          <TextInput
            style={styles.input}
            value={telefon}
            onChangeText={setTelefon}
            placeholder="+420 123 456 789"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Poznámka pro farmáře (volitelné)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={poznamka}
            onChangeText={setPoznamka}
            placeholder="Např. preferovaný čas vyzvednutí..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Tlačítko Mám nakoupeno */}
      <TouchableOpacity
        style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        onPress={handleSubmitOrder}
        disabled={isSubmitting}
      >
        <Text style={styles.submitButtonText}>
          {isSubmitting ? '⏳ Odesílám...' : '✅ Mám nakoupeno!'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: '#4CAF50',
  },
  menuButton: { marginRight: 15, padding: 8 },
  menuIcon: { fontSize: 28, color: '#FFFFFF', fontWeight: '400' },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },

  content: { flex: 1 },

  infoBanner: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#DDD',
  },
  infoBannerText: { fontSize: 15, color: '#2E7D32', fontWeight: '600', textAlign: 'center' },

  itemsContainer: { padding: 15 },

  cartItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cartItemInfo: { marginBottom: 12 },
  cartItemName: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 },
  cartItemPrice: { fontSize: 14, color: '#666' },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  quantityButton: {
    backgroundColor: '#E0E0E0',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: { fontSize: 20, color: '#333', fontWeight: 'bold' },
  quantityText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginHorizontal: 20,
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  cartItemTotalText: { fontSize: 18, fontWeight: 'bold', color: '#FF9800' },
  removeButton: { padding: 8 },
  removeButtonText: { fontSize: 20 },

  totalContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 15,
    marginBottom: 20,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  totalLabel: { fontSize: 20, fontWeight: 'bold', color: '#2E7D32' },
  totalPrice: { fontSize: 24, fontWeight: 'bold', color: '#FF9800' },

  formContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginHorizontal: 15,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#2E7D32', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  submitButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  submitButtonDisabled: { backgroundColor: '#9E9E9E' },
  submitButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  continueButton: { backgroundColor: '#4CAF50', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 10 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});
