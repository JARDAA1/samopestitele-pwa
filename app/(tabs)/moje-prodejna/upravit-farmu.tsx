import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { fetchProfilFarmara, updateProfilFarmara } from '@/features/profil/services/profilService';

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

      const data = await fetchProfilFarmara(farmar.id);

      if (data) {
        console.log('✅ Farmer data loaded:', data.id, data.nazev_farmy);
        setFarmarData(data as unknown as FarmarData);
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
      } else if (farmarData?.gps_lat && farmarData?.gps_lng) {
        // Použijeme existující GPS souřadnice z databáze
        finalLat = farmarData.gps_lat;
        finalLng = farmarData.gps_lng;
        console.log('✅ Using existing GPS from database:', { finalLat, finalLng });
      } else {
        console.log('🔍 Getting GPS from address...');
        // Automatické získání GPS z adresy pouze pokud ještě žádné nemáme
        setFetchingGPS(true);
        const gpsCoords = await getGPSFromAddress(mesto.trim(), adresa.trim());
        setFetchingGPS(false);

        if (!gpsCoords) {
          setSaving(false); // Reset button state first
          Alert.alert(
            'GPS souřadnice nenalezeny',
            'Nepodařilo se najít GPS souřadnice pro zadanou adresu. Vaše farma se nebude zobrazovat na mapě. Chcete přesto pokračovat?',
            [
              { text: 'Zrušit', style: 'cancel' },
              {
                text: 'Pokračovat',
                onPress: async () => {
                  setSaving(true);
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

      await updateProfilFarmara(farmerId, updateData);

      console.log('✅ Save successful!');

      // Zobrazit "Uloženo" na tlačítku na chvíli
      Alert.alert('Uloženo', 'Informace o farmě byly úspěšně aktualizovány', [
        { text: 'OK', onPress: () => {
          setSaving(false);
          router.back();
        }}
      ]);

      // Pro případ, že uživatel zavře alert - reset po 2 sekundách
      setTimeout(() => {
        setSaving(false);
      }, 2000);
    } catch (error: any) {
      console.error('❌ Chyba při ukládání do databáze:', error);
      setSaving(false);
      Alert.alert('Chyba', error?.message || 'Nepodařilo se uložit změny');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#ffffff" />
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Základní údaje - kompaktní */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconCircle}>
              <Text style={styles.sectionIcon}>👤</Text>
            </View>
            <Text style={styles.sectionTitle}>Základní údaje</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Název farmy *</Text>
            <TextInput
              style={styles.input}
              value={nazevFarmy}
              onChangeText={setNazevFarmy}
              placeholder="Bio Farma Svoboda"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Jméno farmáře *</Text>
            <TextInput
              style={styles.input}
              value={jmeno}
              onChangeText={setJmeno}
              placeholder="Jan Svoboda"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@priklad.cz"
              placeholderTextColor="rgba(255,255,255,0.5)"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Telefon</Text>
            <View style={styles.phoneRow}>
              <TextInput
                style={[styles.input, styles.inputDisabled, styles.phoneInput]}
                value={farmarData?.telefon}
                editable={false}
              />
              <TouchableOpacity
                style={styles.changePhoneButton}
                onPress={() => router.push('/profil/zmenit-telefon')}
              >
                <Text style={styles.changePhoneButtonText}>Změnit</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.phoneHint}>
              Klikněte na "Změnit" pro úpravu telefonního čísla
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: '#E3F2FD' }]}>
              <Text style={styles.sectionIcon}>📍</Text>
            </View>
            <Text style={styles.sectionTitle}>Lokalita</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Město *</Text>
            <TextInput
              style={styles.input}
              value={mesto}
              onChangeText={setMesto}
              placeholder="Praha"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresa</Text>
            <TextInput
              style={styles.input}
              value={adresa}
              onChangeText={setAdresa}
              placeholder="Hlavní 123"
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
          </View>

          <View style={styles.gpsOptionsContainer}>
            <Text style={styles.label}>GPS souřadnice</Text>

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
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: '#F3E5F5' }]}>
              <Text style={styles.sectionIcon}>📝</Text>
            </View>
            <Text style={styles.sectionTitle}>O farmě</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Popis farmy</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={popis}
              onChangeText={setPopis}
              placeholder="Napište něco o vaší farmě..."
              placeholderTextColor="rgba(255,255,255,0.5)"
              multiline
              numberOfLines={4}
            />
          </View>
        </View>

        {/* Sticky Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, (saving || fetchingGPS) && styles.buttonDisabled]}
            onPress={handleUlozit}
            disabled={saving || fetchingGPS}
          >
            <Text style={styles.saveButtonText}>
              {fetchingGPS ? 'Hledám GPS...' : saving ? 'Ukládám...' : 'Uložit změny'}
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
    backgroundColor: '#1a3a1a'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#1a3a1a',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    marginRight: 12
  },
  backButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)'
  },
  content: {
    flex: 1
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,152,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff'
  },
  sectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 2,
  },

  // Input Groups
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 6
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  inputDisabled: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: 'rgba(255,255,255,0.5)'
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  phoneInput: {
    flex: 1,
  },
  changePhoneButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  changePhoneButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  phoneHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 6,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  infoBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  infoText: { fontSize: 12, color: 'rgba(255,255,255,0.8)', lineHeight: 18 },
  gpsInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  gpsInfoText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: 'monospace' },
  gpsOptionsContainer: {
    marginTop: 16,
    gap: 10,
  },
  gpsOptionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 10,
  },
  gpsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  radioButtonSelected: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF9800',
  },
  gpsOptionText: {
    flex: 1,
  },
  gpsOptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  gpsOptionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  myLocationContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  locationButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  locationInfoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  locationInfoCoords: {
    fontSize: 13,
    fontFamily: 'monospace',
    color: '#ffffff',
  },
  saveButton: {
    backgroundColor: '#FF9800',
    margin: 12,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonContainer: {
    padding: 12,
    paddingBottom: 32,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  buttonDisabled: {
    opacity: 0.6
  },
});
