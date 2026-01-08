import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import * as Location from 'expo-location';
import { useFarmarAuth } from '../../utils/farmarAuthContext';

interface FarmarData {
  id: string;
  nazev_farmy: string;
  jmeno: string;
  telefon: string;
  email: string;
  mesto: string;
  adresa: string | null;
  popis: string | null;
  gps_lat: number;
  gps_lng: number;
}

export default function UpravitFarmuScreen() {
  const { farmar, isAuthenticated } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [farmarData, setFarmarData] = useState<FarmarData | null>(null);

  // Formulářové hodnoty
  const [nazevFarmy, setNazevFarmy] = useState('');
  const [jmeno, setJmeno] = useState('');
  const [email, setEmail] = useState('');
  const [mesto, setMesto] = useState('');
  const [adresa, setAdresa] = useState('');
  const [popis, setPopis] = useState('');
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [myLocationLat, setMyLocationLat] = useState<number | null>(null);
  const [myLocationLng, setMyLocationLng] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !farmar) {
      Alert.alert('Chyba', 'Nejste přihlášeni');
      router.replace('/prihlaseni');
      return;
    }
    loadFarmarData();
  }, [isAuthenticated, farmar]);

  const loadFarmarData = async () => {
    try {
      if (!farmar?.id) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        router.back();
        return;
      }

      console.log('🔑 Loading data for farmer ID:', farmar.id);

      const { data, error } = await supabase
        .from('pestitele')
        .select('*')
        .eq('id', farmar.id)
        .single();

      console.log('📥 Load farmer data response:', { data, error });

      if (error) throw error;

      if (data) {
        console.log('✅ Farmer data loaded:', data.id, data.nazev_farmy);
        setFarmarData(data);
        setNazevFarmy(data.nazev_farmy || '');
        setJmeno(data.jmeno || '');
        setEmail(data.email || '');
        setMesto(data.mesto || '');
        setAdresa(data.adresa || '');
        setPopis(data.popis || '');
      }
    } catch (error) {
      console.error('Chyba při načítání dat farmáře:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst data farmáře');
    } finally {
      setLoading(false);
    }
  };

  // Funkce pro získání aktuální polohy z telefonu
  const getMyLocation = async () => {
    setFetchingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Povolení zamítnuto',
          'Pro použití vaší polohy potřebujeme přístup k GPS. Povolte přístup v nastavení aplikace.'
        );
        setFetchingGPS(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setMyLocationLat(location.coords.latitude);
      setMyLocationLng(location.coords.longitude);
      setUseMyLocation(true);

      Alert.alert(
        'Poloha získána',
        `📍 GPS: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}\n\nTato poloha bude použita pro zobrazení na mapě.`
      );
    } catch (error) {
      console.error('Chyba při získávání polohy:', error);
      Alert.alert('Chyba', 'Nepodařilo se získat vaši polohu. Zkuste to znovu.');
    } finally {
      setFetchingGPS(false);
    }
  };

  // Funkce pro získání GPS souřadnic z adresy pomocí Nominatim (OpenStreetMap)
  const getGPSFromAddress = async (mesto: string, adresa: string): Promise<{ lat: number, lng: number } | null> => {
    try {
      const fullAddress = adresa ? `${adresa}, ${mesto}, Česká republika` : `${mesto}, Česká republika`;
      const encodedAddress = encodeURIComponent(fullAddress);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
        {
          headers: {
            'User-Agent': 'SamoPestitele App', // Nominatim vyžaduje User-Agent
          }
        }
      );

      const data = await response.json();

      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }

      return null;
    } catch (error) {
      console.error('Chyba při geokódování:', error);
      return null;
    }
  };

  const handleUlozit = async () => {
    // Validace
    if (!nazevFarmy.trim()) {
      Alert.alert('Chyba', 'Vyplňte název farmy');
      return;
    }
    if (!jmeno.trim()) {
      Alert.alert('Chyba', 'Vyplňte jméno farmáře');
      return;
    }
    if (!mesto.trim()) {
      Alert.alert('Chyba', 'Vyplňte město');
      return;
    }

    setSaving(true);
    try {
      if (!farmar?.id) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        setSaving(false);
        return;
      }

      let finalLat = 0;
      let finalLng = 0;

      // Pokud je zvolena "Moje poloha"
      if (useMyLocation && myLocationLat !== null && myLocationLng !== null) {
        finalLat = myLocationLat;
        finalLng = myLocationLng;
        console.log('✅ Using my location GPS:', { finalLat, finalLng });
      } else {
        console.log('🔍 Getting GPS from address...');
        // Automatické získání GPS z adresy
        setFetchingGPS(true);
        const gpsCoords = await getGPSFromAddress(mesto.trim(), adresa.trim());
        setFetchingGPS(false);

        if (!gpsCoords) {
          Alert.alert(
            'GPS souřadnice nenalezeny',
            'Nepodařilo se najít GPS souřadnice pro zadanou adresu. Vaše farma se nebude zobrazovat na mapě. Chcete přesto pokračovat?',
            [
              { text: 'Zrušit', style: 'cancel', onPress: () => { setSaving(false); return; } },
              {
                text: 'Pokračovat',
                onPress: async () => {
                  await saveData(farmar.id, 0, 0);
                }
              }
            ]
          );
          return;
        }

        finalLat = gpsCoords.lat;
        finalLng = gpsCoords.lng;
        console.log('✅ GPS from address:', { finalLat, finalLng });
      }

      console.log('💾 Calling saveData with:', { farmerId: farmar.id, finalLat, finalLng });
      await saveData(farmar.id, finalLat, finalLng);
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      Alert.alert('Chyba', 'Nepodařilo se uložit změny');
      setSaving(false);
    }
  };

  const saveData = async (farmerId: string, gpsLat: number, gpsLng: number) => {
    try {
      console.log('📤 saveData called with:', { farmerId, gpsLat, gpsLng });

      const updateData = {
        nazev_farmy: nazevFarmy.trim(),
        jmeno: jmeno.trim(),
        email: email.trim() || null,
        mesto: mesto.trim(),
        adresa: adresa.trim() || null,
        popis: popis.trim() || null,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
      };

      console.log('📦 Update data:', updateData);

      const { data, error } = await supabase
        .from('pestitele')
        .update(updateData)
        .eq('id', farmerId)
        .select();

      console.log('📥 Supabase response:', { data, error });

      if (error) throw error;

      if (!data || data.length === 0) {
        throw new Error('Nepodařilo se aktualizovat záznam. Možná nemáte oprávnění nebo záznam neexistuje.');
      }

      console.log('✅ Save successful!');
      Alert.alert('Uloženo', 'Informace o farmě byly úspěšně aktualizovány', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('❌ Chyba při ukládání do databáze:', error);
      Alert.alert('Chyba', 'Nepodařilo se uložit změny');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>✏️ Upravit informace o farmě</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Základní údaje</Text>

          <Text style={styles.label}>Název farmy *</Text>
          <TextInput
            style={styles.input}
            value={nazevFarmy}
            onChangeText={setNazevFarmy}
            placeholder="např. Bio Farma Svoboda"
          />

          <Text style={styles.label}>Jméno farmáře *</Text>
          <TextInput
            style={styles.input}
            value={jmeno}
            onChangeText={setJmeno}
            placeholder="např. Jan Svoboda"
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="vas.email@priklad.cz"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Telefon</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            value={farmarData?.telefon}
            editable={false}
          />
          <Text style={styles.helperText}>Telefon nelze změnit</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Lokalita</Text>

          <Text style={styles.label}>Město *</Text>
          <TextInput
            style={styles.input}
            value={mesto}
            onChangeText={setMesto}
            placeholder="např. Praha"
          />

          <Text style={styles.label}>Adresa</Text>
          <TextInput
            style={styles.input}
            value={adresa}
            onChangeText={setAdresa}
            placeholder="např. Hlavní 123"
          />

          <View style={styles.gpsOptionsContainer}>
            <Text style={styles.gpsOptionsTitle}>GPS souřadnice pro mapu:</Text>

            <TouchableOpacity
              style={styles.gpsOption}
              onPress={() => setUseMyLocation(false)}
            >
              <View style={styles.radioButton}>
                {!useMyLocation && <View style={styles.radioButtonSelected} />}
              </View>
              <View style={styles.gpsOptionText}>
                <Text style={styles.gpsOptionTitle}>🔍 Automaticky z adresy</Text>
                <Text style={styles.gpsOptionDesc}>Souřadnice se určí z města a adresy</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.gpsOption}
              onPress={() => setUseMyLocation(true)}
            >
              <View style={styles.radioButton}>
                {useMyLocation && <View style={styles.radioButtonSelected} />}
              </View>
              <View style={styles.gpsOptionText}>
                <Text style={styles.gpsOptionTitle}>📍 Použít moji polohu</Text>
                <Text style={styles.gpsOptionDesc}>Přesná poloha z GPS telefonu</Text>
              </View>
            </TouchableOpacity>
          </View>

          {useMyLocation && (
            <View style={styles.myLocationContainer}>
              <TouchableOpacity
                style={[styles.locationButton, fetchingGPS && styles.buttonDisabled]}
                onPress={getMyLocation}
                disabled={fetchingGPS}
              >
                <Text style={styles.locationButtonText}>
                  {fetchingGPS ? '📍 Získávám polohu...' : '📍 Získat moji polohu'}
                </Text>
              </TouchableOpacity>

              {myLocationLat !== null && myLocationLng !== null && (
                <View style={styles.locationInfo}>
                  <Text style={styles.locationInfoTitle}>✓ Poloha získána:</Text>
                  <Text style={styles.locationInfoCoords}>
                    {myLocationLat.toFixed(6)}, {myLocationLng.toFixed(6)}
                  </Text>
                </View>
              )}

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 Klikněte na tlačítko pro získání vaší aktuální polohy z GPS telefonu. Ujistěte se, že se nacházíte na místě vaší farmy.
                </Text>
              </View>
            </View>
          )}

          {!useMyLocation && farmarData && (farmarData.gps_lat !== 0 || farmarData.gps_lng !== 0) && (
            <View style={styles.gpsInfo}>
              <Text style={styles.gpsInfoText}>
                📍 Aktuální GPS: {farmarData.gps_lat.toFixed(6)}, {farmarData.gps_lng.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>O farmě</Text>

          <Text style={styles.label}>Popis farmy</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={popis}
            onChangeText={setPopis}
            placeholder="Napište něco o vaší farmě..."
            multiline
            numberOfLines={4}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (saving || fetchingGPS) && styles.buttonDisabled]}
          onPress={handleUlozit}
          disabled={saving || fetchingGPS}
        >
          <Text style={styles.saveButtonText}>
            {fetchingGPS ? '📍 Hledám GPS souřadnice...' : saving ? 'Ukládám...' : '💾 Uložit změny'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  backButton: { marginRight: 10 },
  backButtonText: { fontSize: 16, color: '#FFFFFF', fontWeight: '600' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', flex: 1 },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  content: { flex: 1 },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2E7D32', marginBottom: 15 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8, marginTop: 15 },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  inputDisabled: { backgroundColor: '#EEEEEE', color: '#999' },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  helperText: { fontSize: 12, color: '#999', marginTop: 5 },
  infoBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginTop: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  infoText: { fontSize: 13, color: '#2E7D32', lineHeight: 18 },
  gpsInfo: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 15,
  },
  gpsInfoText: { fontSize: 12, color: '#666', fontFamily: 'monospace' },
  gpsOptionsContainer: {
    marginTop: 20,
    gap: 10,
  },
  gpsOptionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  gpsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  gpsOptionText: {
    flex: 1,
  },
  gpsOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  gpsOptionDesc: {
    fontSize: 12,
    color: '#666',
  },
  myLocationContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  locationButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  locationInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2E7D32',
    marginBottom: 5,
  },
  locationInfoCoords: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#333',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    margin: 15,
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  buttonDisabled: { opacity: 0.5 },
});
