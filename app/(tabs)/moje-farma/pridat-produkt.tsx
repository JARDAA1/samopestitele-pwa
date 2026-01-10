import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';

type PredefinedProduct = {
  id: number;
  nazev: string;
  emoji: string;
  kategorie: string;
};

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
      const { data, error } = await supabase
        .from('predefinovane_produkty')
        .select('*')
        .order('kategorie', { ascending: true })
        .order('nazev', { ascending: true });

      if (error) throw error;
      setPredefinedProducts(data || []);
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

      // Vlož produkt do databáze
      const { data, error } = await supabase
        .from('produkty')
        .insert({
          pestitel_id: Number(farmar.id),
          nazev: selectedProduct.nazev,
          popis: popis.trim() || null,
          cena: Number(cena),
          mnozstvi: null,
          jednotka: jednotka,
          kategorie: selectedProduct.kategorie,
          dostupnost: dostupnost,
          emoji: selectedProduct.emoji,
        })
        .select()
        .single();

      if (error) {
        console.error('Chyba při přidávání produktu:', error);
        Alert.alert('Chyba', 'Nepodařilo se přidat produkt: ' + error.message);
        setLoading(false);
        return;
      }

      // Vymaž formulář pro další produkt
      setSelectedProduct(null);
      setPopis('');
      setCena('');
      setJednotka('kg');
      setDostupnost(true);
      setLoading(false);

      Alert.alert('Úspěch', 'Produkt byl přidán! Můžeš přidat další.', [
        { text: 'Přidat další', onPress: () => {} },
        { text: 'Hotovo', onPress: () => router.push('/moje-farma') }
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
        <TouchableOpacity onPress={() => router.push('/moje-farma')} style={styles.backButton}>
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
            <ActivityIndicator size="large" color="#4CAF50" />
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

                <Text style={styles.label}>Cena *</Text>
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, styles.inputPrice]}
                    placeholder="0"
                    value={cena}
                    onChangeText={setCena}
                    keyboardType="numeric"
                  />
                  <Text style={styles.currency}>Kč</Text>
                </View>

                <Text style={styles.label}>Jednotka</Text>
                <View style={styles.unitButtons}>
                  {['kg', 'ks', 'l', 'balení'].map((unit) => (
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
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20
  },
  backButton: {
    marginBottom: 10
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF'
  },
  scrollView: {
    flex: 1
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  hint: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20
  },
  selectedProductBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#4CAF50'
  },
  selectedEmoji: {
    fontSize: 48,
    marginRight: 16
  },
  selectedInfo: {
    flex: 1
  },
  selectedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  selectedCategory: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600'
  },
  changeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  productList: {
    maxHeight: 500,
    marginBottom: 20
  },
  categoryHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 4
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8
  },
  productCard: {
    width: '30%',
    minWidth: 100,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  productEmoji: {
    fontSize: 36,
    marginBottom: 8
  },
  productName: {
    fontSize: 13,
    color: '#333',
    textAlign: 'center',
    fontWeight: '500'
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  textArea: {
    height: 100,
    paddingTop: 15
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
    fontSize: 18,
    fontWeight: '600',
    color: '#666'
  },
  unitButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  unitButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  unitButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50'
  },
  unitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  unitButtonTextActive: {
    color: '#4CAF50'
  },
  availabilityButtons: {
    flexDirection: 'row',
    gap: 10
  },
  availabilityButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  availabilityButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50'
  },
  availabilityButtonUnavailable: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336'
  },
  availabilityButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  availabilityButtonTextActive: {
    color: '#4CAF50'
  },
  availabilityButtonTextUnavailable: {
    color: '#F44336'
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 30,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold'
  }
});
