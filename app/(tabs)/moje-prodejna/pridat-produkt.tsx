import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { fetchPredefinovaneProdukty, checkDuplicateProdukt, insertProdukt } from '@/features/produkty/services/produktyService';
import type { PredefinedProduct } from '@/features/produkty/types';

export default function PridatProduktScreen() {
  const { farmar, isAuthenticated } = useFarmarAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [predefinedProducts, setPredefinedProducts] = useState<PredefinedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<PredefinedProduct | null>(null);
  const [popis, setPopis] = useState('');
  const [cena, setCena] = useState('');
  const [jednotka, setJednotka] = useState('kg');
  const [dostupnost, setDostupnost] = useState(true);

  // Načíst předdefinované produkty z databáze
  useEffect(() => {
    loadPredefinedProducts();
  }, []);

  const loadPredefinedProducts = async () => {
    try {
      const data = await fetchPredefinovaneProdukty();
      setPredefinedProducts(data);
    } catch (error: any) {
      console.error('Chyba při načítání produktů:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst seznam produktů');
    } finally {
      setLoadingProducts(false);
    }
  };

  // Funkce pro výběr produktu ze seznamu
  const handleSelectProduct = (product: PredefinedProduct) => {
    setSelectedProduct(product);
  };

  const handlePridatProdukt = async () => {
    // Validace
    if (!selectedProduct) {
      Alert.alert('Chyba', 'Vyberte produkt ze seznamu');
      return;
    }

    if (!cena.trim() || isNaN(Number(cena))) {
      Alert.alert('Chyba', 'Zadejte platnou cenu');
      return;
    }

    setLoading(true);
    try {
      // Získej ID přihlášeného farmáře
      if (!farmar?.id) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        router.replace('/prihlaseni');
        return;
      }

      // Kontrola duplicitních názvů s normalizací
      const similarProduct = await checkDuplicateProdukt(farmar.id, selectedProduct.nazev);

      if (similarProduct) {
        Alert.alert(
          'Produkt již existuje',
          `Produkt "${similarProduct.nazev}" je již ve vaší nabídce.\n\nZkontrolujte prosím, zda nechcete upravit stávající produkt místo vytváření nového.`
        );
        setLoading(false);
        return;
      }

      // Vlož produkt do databáze
      await insertProdukt({
        pestitel_id: Number(farmar.id),
        nazev: selectedProduct.nazev,
        popis: popis.trim() || null,
        cena: jednotka === 'g' ? Number(cena) / 100 : Number(cena),
        mnozstvi: null,
        jednotka: jednotka,
        kategorie: selectedProduct.kategorie,
        dostupnost: dostupnost,
        emoji: selectedProduct.emoji,
        archivovano: false,
      });

      // Vymaž formulář pro další produkt
      setSelectedProduct(null);
      setPopis('');
      setCena('');
      setJednotka('kg');
      setDostupnost(true);
      setLoading(false);

      Alert.alert('Úspěch', 'Produkt byl přidán! Můžeš přidat další.', [
        { text: 'Přidat další', onPress: () => {} },
        { text: 'Hotovo', onPress: () => router.push('/moje-prodejna') }
      ]);
    } catch (error: any) {
      console.error('Chyba:', error);
      Alert.alert('Chyba', error.message || 'Nepodařilo se přidat produkt');
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/moje-prodejna')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Přidat produkt</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={true}
      >
        {loadingProducts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#ffffff" />
            <Text style={styles.loadingText}>Načítám produkty...</Text>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={styles.sectionTitle}>📦 Vyberte produkt</Text>
            <Text style={styles.hint}>
              Vyberte produkt ze seznamu. Název, ikona a kategorie se vyplní automaticky.
            </Text>

            {/* Vybraný produkt */}
            {selectedProduct && (
              <View style={styles.selectedProductBox}>
                <Text style={styles.selectedEmoji}>{selectedProduct.emoji}</Text>
                <View style={styles.selectedInfo}>
                  <Text style={styles.selectedName}>{selectedProduct.nazev}</Text>
                  <Text style={styles.selectedCategory}>{selectedProduct.kategorie}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setSelectedProduct(null)}
                >
                  <Text style={styles.changeButtonText}>Změnit</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Seznam produktů podle kategorií */}
            {!selectedProduct && (
              <ScrollView style={styles.productList} nestedScrollEnabled={true}>
                {['Zelenina', 'Ovoce', 'Vejce', 'Mléčné výrobky', 'Med', 'Ostatní'].map((kategorie) => {
                  const products = predefinedProducts.filter(p => p.kategorie === kategorie);
                  if (products.length === 0) return null;

                  return (
                    <View key={kategorie}>
                      <Text style={styles.categoryHeader}>{kategorie}</Text>
                      <View style={styles.productGrid}>
                        {products.map((product) => (
                          <TouchableOpacity
                            key={product.id}
                            style={styles.productCard}
                            onPress={() => handleSelectProduct(product)}
                          >
                            <Text style={styles.productEmoji}>{product.emoji}</Text>
                            <Text style={styles.productName}>{product.nazev}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            )}

            {/* Detaily produktu - zobrazit jen když je produkt vybraný */}
            {selectedProduct && (
              <>
                <Text style={styles.label}>Popis (volitelné)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Volitelný popis produktu..."
                  value={popis}
                  onChangeText={setPopis}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />

                <Text style={styles.label}>{jednotka === 'g' ? 'Cena za 100g *' : 'Cena *'}</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.inputPrice]}
                    placeholder="0"
                    value={cena}
                    onChangeText={setCena}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currency}>{jednotka === 'g' ? 'Kč / 100g' : 'Kč'}</Text>
                </View>

                <Text style={styles.label}>Jednotka</Text>
                <View style={styles.unitButtons}>
                  {['kg', 'g', 'ks', 'l', 'balení'].map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.unitButton,
                        jednotka === unit && styles.unitButtonActive
                      ]}
                      onPress={() => setJednotka(unit)}
                    >
                      <Text style={[
                        styles.unitButtonText,
                        jednotka === unit && styles.unitButtonTextActive
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.label}>Dostupnost</Text>
                <View style={styles.availabilityButtons}>
                  <TouchableOpacity
                    style={[
                      styles.availabilityButton,
                      dostupnost && styles.availabilityButtonActive
                    ]}
                    onPress={() => setDostupnost(true)}
                  >
                    <Text style={[
                      styles.availabilityButtonText,
                      dostupnost && styles.availabilityButtonTextActive
                    ]}>
                      ✓ Skladem
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.availabilityButton,
                      !dostupnost && styles.availabilityButtonUnavailable
                    ]}
                    onPress={() => setDostupnost(false)}
                  >
                    <Text style={[
                      styles.availabilityButtonText,
                      !dostupnost && styles.availabilityButtonTextUnavailable
                    ]}>
                      ✗ Vyprodáno
                    </Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handlePridatProdukt}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Přidat produkt</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33691e'
  },
  header: {
    backgroundColor: '#33691e',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
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
  scrollView: {
    flex: 1
  },
  content: {
    padding: 12,
    paddingBottom: 40
  },
  form: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8
  },
  hint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    lineHeight: 18
  },
  selectedProductBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF9800'
  },
  selectedEmoji: {
    fontSize: 40,
    marginRight: 14
  },
  selectedInfo: {
    flex: 1
  },
  selectedName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4
  },
  selectedCategory: {
    fontSize: 13,
    color: '#FF9800',
    fontWeight: '600'
  },
  changeButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  productList: {
    maxHeight: 500,
    marginBottom: 16
  },
  categoryHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FF9800',
    marginTop: 14,
    marginBottom: 10,
    paddingHorizontal: 4
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8
  },
  productCard: {
    width: '30%',
    minWidth: 90,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  productEmoji: {
    fontSize: 32,
    marginBottom: 6
  },
  productName: {
    fontSize: 12,
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: '500'
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
    marginTop: 12
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  textArea: {
    height: 100,
    paddingTop: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  inputPrice: {
    flex: 1
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff'
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  unitButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  unitButtonActive: {
    backgroundColor: 'rgba(255,152,0,0.3)',
    borderColor: '#FF9800'
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)'
  },
  unitButtonTextActive: {
    color: '#FF9800'
  },
  availabilityButtons: {
    flexDirection: 'row',
    gap: 10
  },
  availabilityButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  availabilityButtonActive: {
    backgroundColor: 'rgba(76,175,80,0.3)',
    borderColor: '#4CAF50'
  },
  availabilityButtonUnavailable: {
    backgroundColor: 'rgba(244,67,54,0.3)',
    borderColor: '#F44336'
  },
  availabilityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)'
  },
  availabilityButtonTextActive: {
    color: '#4CAF50'
  },
  availabilityButtonTextUnavailable: {
    color: '#F44336'
  },
  submitButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 24,
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  }
});
