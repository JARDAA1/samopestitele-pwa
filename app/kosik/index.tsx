import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { DrawerMenu } from '../_utils/DrawerMenu';
import { formatKc, formatMnozstvi, getKrokJednotky, formatCenaJednotka } from '../_utils/formatKc';
import { useDrawerMenu } from '../_utils/useDrawerMenu';
import { useState, useEffect } from 'react';
import { useCart } from '../_utils/cartContext';
import { ProdejniMisto, getAktivniProdejniMistaFarmare } from '../_utils/locationService';
import { createObjednavka, createObjednavkyPolozky, deleteObjednavka } from '@/features/objednavky/services/objednavkyService';
import * as Crypto from 'expo-crypto';
import { addOblibeny } from '@/features/farmari/services/farmariService';
import { saveMojeObjednavka } from '@/shared/utils/mojeObjednavkyStorage';

export default function KosikScreen() {
  const { cart, removeFromCart, updateQuantity, clearCart, totalPrice, itemCount } = useCart();
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();
  const [jmeno, setJmeno] = useState('');
  const [telefon, setTelefon] = useState('');
  const [poznamka, setPoznamka] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prodejní místa
  const [prodejniMista, setProdejniMista] = useState<ProdejniMisto[]>([]);
  const [selectedMistoId, setSelectedMistoId] = useState<number | null>(null);
  const [loadingMista, setLoadingMista] = useState(false);

  // Načteme prodejní místa při změně košíku
  useEffect(() => {
    if (cart.length > 0) {
      loadProdejniMista();
    }
  }, [cart.length > 0 ? cart[0].pestitelId : null]);

  const loadProdejniMista = async () => {
    if (cart.length === 0) return;

    setLoadingMista(true);
    try {
      const mista = await getAktivniProdejniMistaFarmare(cart[0].pestitelId);
      setProdejniMista(mista);

      // Auto-select pokud je jen jedno místo
      if (mista.length === 1) {
        setSelectedMistoId(mista[0].id);
      }
    } catch (error) {
      console.error('Chyba při načítání prodejních míst:', error);
    } finally {
      setLoadingMista(false);
    }
  };

  const handleQuantityChange = (produkt_id: number, direction: 1 | -1) => {
    const item = cart.find((i) => i.produkt_id === produkt_id);
    if (!item) return;

    const step = getKrokJednotky(item.jednotka);
    const newQuantity = Math.round((item.mnozstvi + direction * step) * 100) / 100;
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

    // Pokud má farmář více prodejních míst, musí být vybráno
    if (prodejniMista.length > 1 && !selectedMistoId) {
      Alert.alert('Chyba', 'Vyberte prosím místo vyzvednutí');
      return;
    }

    setIsSubmitting(true);

    try {
      // Získáme ID farmáře z prvního produktu v košíku
      const pestitelId = cart[0].pestitelId;

      // Vygenerujeme kryptograficky bezpečný 32-znakový token (128 bitů)
      const tokenBytes = await Crypto.getRandomBytesAsync(16);
      const publicToken = Array.from(tokenBytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      // 1. Vytvoříme objednávku
      const objednavkaId = await createObjednavka({
        pestitel_id: pestitelId,
        zakaznik_jmeno: jmeno,
        zakaznik_telefon: telefon,
        stav: 'nova',
        celkova_cena: totalPrice,
        poznamka: poznamka || null,
        zpusob_kontaktu: 'telefon',
        prodejni_misto_id: selectedMistoId || (prodejniMista.length === 1 ? prodejniMista[0].id : null),
        public_token: publicToken,
        phone_consent: telefon.trim().length > 0,
      });

      // 2. Přidáme položky — při selhání smažeme objednávku (kompenzační rollback)
      try {
        await createObjednavkyPolozky(objednavkaId, cart.map((item) => ({
          produkt_id: item.produkt_id,
          nazev_produktu: item.nazev,
          cena: item.cena,
          mnozstvi: item.mnozstvi,
          jednotka: item.jednotka,
        })));
      } catch (polozkyError) {
        await deleteObjednavka(objednavkaId);
        throw polozkyError;
      }

      // 3. Přidáme farmáře do oblíbených (pokud tam ještě není)
      await addOblibeny(telefon, pestitelId);

      // 4. Uložíme referenci na objednávku do localStorage
      saveMojeObjednavka({
        id: objednavkaId,
        pestitelId: cart[0]?.pestitelId,
        pestitelNazev: cart[0]?.pestitelNazev ?? '',
        celkovaCena: totalPrice,
        createdAt: new Date().toISOString(),
      });

      // Úspěch!
      Alert.alert(
        '✅ Objednávka odeslána!',
        `Vaše objednávka byla úspěšně odeslána farmáři ${cart[0].pestitelNazev}.\n\nFarmář vás bude brzy kontaktovat na čísle ${telefon}.\n\nDěkujeme za nákup! 🧺`,
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
        <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />
        <View style={styles.header}>
          <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🧺 Košík</Text>
        </View>

        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🧺</Text>
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
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />
      <View style={styles.header}>
        <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🧺 Košík ({itemCount})</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Info banner */}
        <View style={styles.infoBanner}>
          <Text style={styles.infoBannerText}>
            🧺 Nakupujete u: {cart[0].pestitelNazev}
          </Text>
        </View>

        {/* Položky v košíku */}
        <View style={styles.itemsContainer}>
          {cart.map((item) => (
            <View key={item.produkt_id} style={styles.cartItem}>
              <View style={styles.cartItemInfo}>
                <Text style={styles.cartItemName}>{item.nazev}</Text>
                <Text style={styles.cartItemPrice}>
                  {item.cena ? formatCenaJednotka(item.cena, item.jednotka) : `0 Kč / ${item.jednotka}`}
                </Text>
              </View>

              <View style={styles.cartItemActions}>
                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.produkt_id, -1)}
                >
                  <Text style={styles.quantityButtonText}>−</Text>
                </TouchableOpacity>

                <Text style={styles.quantityText}>{formatMnozstvi(item.mnozstvi)}</Text>

                <TouchableOpacity
                  style={styles.quantityButton}
                  onPress={() => handleQuantityChange(item.produkt_id, 1)}
                >
                  <Text style={styles.quantityButtonText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.cartItemTotal}>
                <Text style={styles.cartItemTotalText}>
                  {formatKc(item.cena * item.mnozstvi)} Kč
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
          <Text style={styles.totalPrice}>{formatKc(totalPrice)} Kč</Text>
        </View>

        {/* Výběr prodejního místa */}
        {loadingMista ? (
          <View style={styles.mistaContainer}>
            <ActivityIndicator size="small" color="#FF9800" />
            <Text style={styles.mistaLoadingText}>Načítám místa vyzvednutí...</Text>
          </View>
        ) : prodejniMista.length > 1 ? (
          <View style={styles.mistaContainer}>
            <Text style={styles.mistaTitle}>📍 Vyberte místo vyzvednutí *</Text>
            <Text style={styles.mistaSubtitle}>
              Farmář nabízí více prodejních míst
            </Text>
            {prodejniMista.map((misto) => (
              <TouchableOpacity
                key={misto.id}
                style={[
                  styles.mistoOption,
                  selectedMistoId === misto.id && styles.mistoOptionSelected
                ]}
                onPress={() => setSelectedMistoId(misto.id)}
              >
                <View style={styles.mistoRadio}>
                  {selectedMistoId === misto.id && (
                    <View style={styles.mistoRadioInner} />
                  )}
                </View>
                <View style={styles.mistoInfo}>
                  <Text style={[
                    styles.mistoNazev,
                    selectedMistoId === misto.id && styles.mistoNazevSelected
                  ]}>
                    {misto.nazev}
                  </Text>
                  {misto.adresa && (
                    <Text style={styles.mistoAdresa}>{misto.adresa}</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : prodejniMista.length === 1 ? (
          <View style={styles.mistaContainer}>
            <Text style={styles.mistaTitle}>📍 Místo vyzvednutí</Text>
            <View style={styles.singleMistoBox}>
              <Text style={styles.singleMistoNazev}>{prodejniMista[0].nazev}</Text>
              {prodejniMista[0].adresa && (
                <Text style={styles.singleMistoAdresa}>{prodejniMista[0].adresa}</Text>
              )}
            </View>
          </View>
        ) : null}

        {/* Kontaktní formulář */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>📝 Vaše kontaktní údaje</Text>

          <Text style={styles.label}>Jméno a příjmení *</Text>
          <TextInput
            style={styles.input}
            value={jmeno}
            onChangeText={setJmeno}
            placeholder="Jan Novák"
            placeholderTextColor="rgba(255,255,255,0.5)"
          />

          <Text style={styles.label}>Telefon *</Text>
          <TextInput
            style={styles.input}
            value={telefon}
            onChangeText={setTelefon}
            placeholder="+420 123 456 789"
            placeholderTextColor="rgba(255,255,255,0.5)"
            keyboardType="phone-pad"
            testID="customer-phone"
          />

          <Text style={styles.label}>Poznámka pro farmáře (volitelné)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={poznamka}
            onChangeText={setPoznamka}
            placeholder="Např. preferovaný čas vyzvednutí..."
            placeholderTextColor="rgba(255,255,255,0.5)"
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
  container: { flex: 1, backgroundColor: '#6A1B9A' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#6A1B9A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  menuButton: { marginRight: 12, padding: 6 },
  menuIcon: { fontSize: 24, color: '#FFFFFF', fontWeight: '400' },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  content: { flex: 1 },

  infoBanner: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  infoBannerText: { fontSize: 14, color: '#FF9800', fontWeight: '600', textAlign: 'center' },

  itemsContainer: { padding: 12 },

  cartItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cartItemInfo: { marginBottom: 10 },
  cartItemName: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  cartItemPrice: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  cartItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  quantityButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: { fontSize: 18, color: '#ffffff', fontWeight: 'bold' },
  quantityText: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#ffffff',
    marginHorizontal: 16,
    minWidth: 30,
    textAlign: 'center',
  },
  cartItemTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 10,
  },
  cartItemTotalText: { fontSize: 17, fontWeight: 'bold', color: '#FF9800' },
  removeButton: { padding: 6 },
  removeButtonText: { fontSize: 18 },

  totalContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  totalPrice: { fontSize: 22, fontWeight: 'bold', color: '#FF9800' },

  formContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    marginHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  formTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#ffffff', marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    fontSize: 15,
    color: '#ffffff',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },

  submitButton: {
    position: 'absolute',
    bottom: 20,
    left: 12,
    right: 12,
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  emptyText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  continueButton: { backgroundColor: '#FF9800', paddingVertical: 14, paddingHorizontal: 28, borderRadius: 10 },
  continueButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },

  // Prodejní místa
  mistaContainer: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    marginHorizontal: 12,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mistaLoadingText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  mistaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  mistaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 12,
  },
  mistoOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mistoOptionSelected: {
    borderColor: '#FF9800',
    backgroundColor: 'rgba(255,152,0,0.15)',
  },
  mistoRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mistoRadioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
  },
  mistoInfo: {
    flex: 1,
  },
  mistoNazev: {
    fontSize: 15,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  mistoNazevSelected: {
    color: '#FF9800',
  },
  mistoAdresa: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  singleMistoBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  singleMistoNazev: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  singleMistoAdresa: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 4,
  },
});
