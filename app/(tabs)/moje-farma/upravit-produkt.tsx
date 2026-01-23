import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useFarmarAuth } from '../../utils/farmarAuthContext';

// Sada ikon pro produkty
const PRODUCT_ICONS = [
  '🍅', '🥕', '🥒', '🌶️', '🫑', '🥔', '🧅', '🧄', '🥬', '🥦',
  '🍄', '🌽', '🥗', '🍇', '🍈', '🍉', '🍊', '🍋', '🍌', '🍍',
  '🥭', '🍎', '🍏', '🍐', '🍑', '🍒', '🍓', '🫐', '🥝', '🥥',
  '🥚', '🥛', '🧀', '🧈', '🥩', '🍗', '🥓', '🍖', '🐟', '🍯',
  '🍞', '🥖', '🥨', '🥐', '🥯', '🫓', '🥞', '🧇', '🥔', '🌾'
];

export default function UpravitProduktScreen() {
  const { farmar, isAuthenticated } = useFarmarAuth();
  const params = useLocalSearchParams();
  const produktId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nazev, setNazev] = useState('');
  const [popis, setPopis] = useState('');
  const [cena, setCena] = useState('');
  // const [mnozstvi, setMnozstvi] = useState(''); // ZAKOMENTOVÁNO
  const [jednotka, setJednotka] = useState('kg');
  const [kategorie, setKategorie] = useState('Zelenina');
  const [dostupnost, setDostupnost] = useState(true);
  const [selectedEmoji, setSelectedEmoji] = useState<string>('📦');
  const [archivovano, setArchivovano] = useState(false);

  useEffect(() => {
    if (produktId) {
      setLoading(true);
      loadProdukt();
    }
  }, [produktId]);

  const loadProdukt = async () => {
    try {
      console.log('🔍 Loading product with ID:', produktId);
      const { data, error } = await supabase
        .from('produkty')
        .select('*')
        .eq('id', produktId)
        .single();

      console.log('📦 Product data:', data);
      console.log('❌ Error:', error);

      if (error) {
        console.error('Chyba při načítání produktu:', error);
        Alert.alert('Chyba', 'Nepodařilo se načíst produkt');
        router.push('/moje-farma');
        return;
      }

      // Předvyplň formulář
      setNazev(data.nazev);
      setPopis(data.popis || '');
      setCena(String(data.cena));
      // setMnozstvi(data.mnozstvi ? String(data.mnozstvi) : ''); // ZAKOMENTOVÁNO
      setJednotka(data.jednotka);
      setKategorie(data.kategorie || 'Zelenina');
      setDostupnost(data.dostupnost);
      setSelectedEmoji(data.emoji || '📦');

      console.log('🗃️ Archivovano field exists?', 'archivovano' in data);
      console.log('🗃️ Archivovano value:', data.archivovano);
      setArchivovano(data.archivovano || false);
    } catch (error) {
      console.error('Chyba:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst produkt');
      router.push('/moje-farma');
    } finally {
      setLoading(false);
    }
  };


  const handleUlozitZmeny = async () => {
    // Validace
    if (!nazev.trim()) {
      Alert.alert('Chyba', 'Zadejte název produktu');
      return;
    }

    if (!cena.trim() || isNaN(Number(cena))) {
      Alert.alert('Chyba', 'Zadejte platnou cenu');
      return;
    }

    setSaving(true);
    try {
      if (!farmar?.id) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        router.replace('/prihlaseni');
        return;
      }

      // Kontrola duplicitních názvů (pokud se název změnil)
      const { data: existingProducts, error: checkError } = await supabase
        .from('produkty')
        .select('id, nazev')
        .eq('pestitel_id', Number(farmar.id))
        .eq('nazev', nazev.trim())
        .neq('id', produktId);

      if (checkError) {
        console.error('Chyba při kontrole duplicitních produktů:', checkError);
        Alert.alert('Chyba', 'Nepodařilo se zkontrolovat existující produkty');
        setSaving(false);
        return;
      }

      if (existingProducts && existingProducts.length > 0) {
        Alert.alert(
          'Produkt již existuje',
          `Produkt s názvem "${nazev.trim()}" již máte ve své nabídce. Zvolte jiný název.`
        );
        setSaving(false);
        return;
      }

      // Aktualizuj produkt v databázi
      const { error } = await supabase
        .from('produkty')
        .update({
          nazev: nazev.trim(),
          popis: popis.trim() || null,
          cena: Number(cena),
          mnozstvi: null, // ZAKOMENTOVÁNO - nepoužíváme
          jednotka: jednotka,
          kategorie: kategorie,
          dostupnost: dostupnost,
          emoji: selectedEmoji,
          archivovano: archivovano
        })
        .eq('id', produktId);

      if (error) {
        console.error('Chyba při aktualizaci produktu:', error);
        Alert.alert('Chyba', 'Nepodařilo se uložit změny: ' + error.message);
        setSaving(false);
        return;
      }

      Alert.alert('Úspěch', 'Změny byly uloženy', [
        { text: 'OK', onPress: () => router.push('/moje-farma') }
      ]);
    } catch (error: any) {
      console.error('Chyba:', error);
      Alert.alert('Chyba', error.message || 'Nepodařilo se uložit změny');
      setSaving(false);
    }
  };

  const handleArchivovat = async () => {
    console.log('🎯 handleArchivovat CALLED! archivovano:', archivovano);
    const akce = archivovano ? 'obnovit z archivu' : 'dát do archivu';
    const zprava = archivovano
      ? 'Opravdu chcete obnovit tento produkt z archivu? Produkt se znovu zobrazí ve vaší nabídce.'
      : 'Opravdu chcete dát tento produkt do archivu? Produkt se skryje z nabídky, ale zůstane v historii objednávek.';

    console.log('📢 Showing confirmation dialog');
    const confirmed = window.confirm(zprava);

    if (!confirmed) {
      console.log('❌ User cancelled');
      return;
    }

    console.log('✅ User confirmed, proceeding...');

    try {
      console.log(`📦 Attempting to ${akce} product with ID:`, produktId);
      console.log('👤 Farmer ID:', farmar?.id);

      // Zkontrolovat, jestli máme oprávnění
      if (!farmar?.id) {
        alert(`Nejste přihlášeni. Nelze ${akce} produkt.`);
        return;
      }

      // Aktualizuj archivační stav
      const novyStav = !archivovano;
      console.log('🔍 Debug archivace:', {
        produktId,
        farmarId: farmar.id,
        farmarIdType: typeof farmar.id,
        novyStav,
        puvodniStav: archivovano
      });

      const { data, error } = await supabase
        .from('produkty')
        .update({ archivovano: novyStav })
        .eq('id', produktId)
        .select();

      console.log('📊 Supabase response:', { data, error });

      if (error) {
        console.error(`❌ Chyba při ${akce}:`, error);
        alert(`Nepodařilo se ${akce} produkt.\n\nDetail: ${error.message}`);
        return;
      }

      if (!data || data.length === 0) {
        console.error('❌ Produkt nebyl nalezen nebo nemáte oprávnění');
        alert('Produkt nebyl nalezen nebo nemáte oprávnění k této akci');
        return;
      }

      // Aktualizuj lokální state
      setArchivovano(novyStav);

      console.log(`✅ Produkt úspěšně ${archivovano ? 'obnoven' : 'archivován'}`);
      alert(archivovano ? 'Produkt byl obnoven z archivu' : 'Produkt byl přesunut do archivu');
      router.push('/moje-farma');
    } catch (error: any) {
      console.error(`❌ Chyba při ${akce}:`, error);
      alert(`Nepodařilo se ${akce} produkt.\n\nDetail: ${error?.message || 'Neznámá chyba'}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/moje-farma')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upravit produkt</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Načítám...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/moje-farma')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upravit produkt</Text>
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
            style={[styles.submitButton, saving && styles.submitButtonDisabled]}
            onPress={handleUlozitZmeny}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Uložit změny</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={archivovano ? styles.restoreButton : styles.deleteButton}
            onPress={() => {
              console.log('🖱️ BUTTON CLICKED!');
              handleArchivovat();
            }}
            activeOpacity={0.7}
          >
            <Text style={archivovano ? styles.restoreButtonText : styles.deleteButtonText}>
              {archivovano ? '📤 Obnovit z archivu' : '📦 Dej do archivu'}
            </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
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
  },
  deleteButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#9E9E9E'
  },
  deleteButtonText: {
    color: '#757575',
    fontSize: 16,
    fontWeight: 'bold'
  },
  restoreButton: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 2,
    borderColor: '#2196F3'
  },
  restoreButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
