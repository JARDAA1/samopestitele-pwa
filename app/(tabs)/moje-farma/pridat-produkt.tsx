import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../../lib/supabase';

// Sada ikon pro produkty
const PRODUCT_ICONS = [
  '🍅', '🥕', '🥒', '🌶️', '🫑', '🥔', '🧅', '🧄', '🥬', '🥦',
  '🍄', '🌽', '🥗', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍',
  '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🥥',
  '🥚', '🥛', '🧀', '🧈', '🥩', '🍗', '🥓', '🍖', '🐟', '🍯',
  '🍞', '🥖', '🥨', '🥐', '🥯', '🫓', '🥞', '🧇', '🥔', '🌾'
];

export default function PridatProduktScreen() {
  const [loading, setLoading] = useState(false);
  const [nazev, setNazev] = useState('');
  const [popis, setPopis] = useState('');
  const [cena, setCena] = useState('');
  // const [mnozstvi, setMnozstvi] = useState(''); // ZAKOMENTOVÁNO - nepoužíváme
  const [jednotka, setJednotka] = useState('kg');
  const [kategorie, setKategorie] = useState('Zelenina');
  const [dostupnost, setDostupnost] = useState(true);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('📦');

  const handlePridatProdukt = async () => {
    // Validace
    if (!nazev.trim()) {
      Alert.alert('Chyba', 'Zadejte název produktu');
      return;
    }

    if (!cena.trim() || isNaN(Number(cena))) {
      Alert.alert('Chyba', 'Zadejte platnou cenu');
      return;
    }

    setLoading(true);
    try {
      // Získej ID přihlášeného farmáře
      const pestitelId = await AsyncStorage.getItem('pestitelId');
      if (!pestitelId) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        router.replace('/moje-farma');
        return;
      }

      // Vlož produkt do databáze
      const { data, error } = await supabase
        .from('produkty')
        .insert({
          pestitel_id: Number(pestitelId),
          nazev: nazev.trim(),
          popis: popis.trim() || null,
          cena: Number(cena),
          mnozstvi: null, // ZAKOMENTOVÁNO - nepoužíváme
          jednotka: jednotka,
          kategorie: kategorie,
          dostupnost: dostupnost,
          emoji: selectedEmoji, // Použij emoji místo fotky
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
      setNazev('');
      setPopis('');
      setCena('');
      // setMnozstvi(''); // ZAKOMENTOVÁNO
      setJednotka('kg');
      setKategorie('Zelenina');
      setDostupnost(true);
      setSelectedEmoji('📦');
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
        <View style={styles.form}>
          <Text style={styles.label}>🎨 Ikona produktu</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.emojiScroll}
            contentContainerStyle={styles.emojiScrollContent}
          >
            {PRODUCT_ICONS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiButton,
                  selectedEmoji === emoji && styles.emojiButtonSelected
                ]}
                onPress={() => setSelectedEmoji(emoji)}
              >
                <Text style={styles.emojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={styles.label}>Název produktu *</Text>
          <TextInput
            style={styles.input}
            placeholder="např. Rajčata cherry"
            value={nazev}
            onChangeText={setNazev}
            autoCapitalize="sentences"
          />

          <Text style={styles.label}>Popis</Text>
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

          {/* ZAKOMENTOVÁNO - Množství na skladě
          <Text style={styles.label}>Množství na skladě</Text>
          <TextInput
            style={styles.input}
            placeholder="např. 10"
            value={mnozstvi}
            onChangeText={setMnozstvi}
            keyboardType="numeric"
          />
          */}

          <Text style={styles.label}>Kategorie *</Text>
          <View style={styles.categoryButtons}>
            {['Zelenina', 'Ovoce', 'Vejce', 'Mléčné výrobky', 'Med', 'Ostatní'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryButton,
                  kategorie === cat && styles.categoryButtonActive
                ]}
                onPress={() => setKategorie(cat)}
              >
                <Text style={[
                  styles.categoryButtonText,
                  kategorie === cat && styles.categoryButtonTextActive
                ]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
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
        </View>
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
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15
  },
  emojiScroll: {
    maxHeight: 100,
    marginBottom: 10
  },
  emojiScrollContent: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10
  },
  emojiButton: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  emojiButtonSelected: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
    borderWidth: 3
  },
  emojiText: {
    fontSize: 32
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
  categoryButtons: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap'
  },
  categoryButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0'
  },
  categoryButtonActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50'
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  categoryButtonTextActive: {
    color: '#4CAF50'
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
