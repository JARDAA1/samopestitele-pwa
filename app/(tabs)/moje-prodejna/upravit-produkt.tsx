import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { fetchProduktById, checkDuplicateExcluding, updateProdukt, archivujProdukt } from '@/features/produkty/services/produktyService';

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
  const [originalNazev, setOriginalNazev] = useState('');

  useEffect(() => {
    if (produktId) {
      setLoading(true);
      loadProdukt();
    }
  }, [produktId]);

  const loadProdukt = async () => {
    try {
      console.log('🔍 Loading product with ID:', produktId);
      const data = await fetchProduktById(produktId);

      console.log('📦 Product data:', data);

      // Předvyplň formulář
      setNazev(data.nazev);
      setOriginalNazev(data.nazev);
      setPopis(data.popis || '');
      setCena(data.jednotka === 'g' ? String(Math.round(data.cena * 100 * 100) / 100) : String(data.cena));
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
      router.push('/moje-prodejna');
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

      // Kontrola duplicitních názvů – pouze pokud uživatel název změnil
      const nazevZmenen = nazev.trim() !== originalNazev;
      const similarProduct = nazevZmenen
        ? await checkDuplicateExcluding(farmar.id, nazev.trim(), produktId)
        : null;

      if (similarProduct) {
        Alert.alert(
          'Produkt již existuje',
          `Produkt "${similarProduct.nazev}" je již ve vaší nabídce.\n\nZvolte prosím jiný název nebo upravte stávající produkt.`
        );
        setSaving(false);
        return;
      }

      // Aktualizuj produkt v databázi
      await updateProdukt(produktId, {
        nazev: nazev.trim(),
        popis: popis.trim() || null,
        cena: jednotka === 'g' ? Number(cena) / 100 : Number(cena),
        mnozstvi: null,
        jednotka: jednotka,
        kategorie: kategorie,
        dostupnost: dostupnost,
        emoji: selectedEmoji,
        archivovano: archivovano,
      });

      setOriginalNazev(nazev.trim());
      router.push('/moje-prodejna');
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
        novyStav,
        puvodniStav: archivovano,
      });

      await archivujProdukt(produktId, novyStav);

      // Aktualizuj lokální state
      setArchivovano(novyStav);

      console.log(`✅ Produkt úspěšně ${archivovano ? 'obnoven' : 'archivován'}`);
      alert(archivovano ? 'Produkt byl obnoven z archivu' : 'Produkt byl přesunut do archivu');
      router.push('/moje-prodejna');
    } catch (error: any) {
      console.error(`❌ Chyba při ${akce}:`, error);
      alert(`Nepodařilo se ${akce} produkt.\n\nDetail: ${error?.message || 'Neznámá chyba'}`);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/moje-prodejna')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upravit produkt</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Načítám...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/moje-prodejna')} style={styles.backButton}>
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
    backgroundColor: '#1a1a1a'
  },
  header: {
    backgroundColor: '#1a1a1a',
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
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6,
    marginTop: 12
  },
  emojiScroll: {
    maxHeight: 80,
    marginBottom: 8
  },
  emojiScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8
  },
  emojiButton: {
    width: 52,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  emojiButtonSelected: {
    backgroundColor: 'rgba(255,152,0,0.3)',
    borderColor: '#FF9800',
    borderWidth: 2
  },
  emojiText: {
    fontSize: 28
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
  categoryButtons: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap'
  },
  categoryButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)'
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(255,152,0,0.3)',
    borderColor: '#FF9800'
  },
  categoryButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)'
  },
  categoryButtonTextActive: {
    color: '#FF9800'
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
  },
  deleteButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)'
  },
  deleteButtonText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '600'
  },
  restoreButton: {
    backgroundColor: 'rgba(33,150,243,0.3)',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2196F3'
  },
  restoreButtonText: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600'
  }
});
