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

  // PIN pro Prodejnu
  const [currentPin, setCurrentPin] = useState<string>('');
  const [showPinSection, setShowPinSection] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [savingPin, setSavingPin] = useState(false);

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
        setCurrentPin(data.heslo_hash || '');
      }
    } catch (error) {
      console.error('Chyba při načítání dat farmáře:', error);
      Alert.alert('Chyba', 'Nepodařilo se načíst data farmáře');
    } finally {
      setLoading(false);
    }
  };

  // Funkce pro změnu PINu
  const handleZmenitPin = async () => {
    // Validace
    if (newPin.length < 4 || newPin.length > 6) {
      Alert.alert('Chyba', 'PIN musí mít 4-6 číslic');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      Alert.alert('Chyba', 'PIN může obsahovat pouze číslice');
      return;
    }

    if (newPin !== confirmPin) {
      Alert.alert('Chyba', 'PINy se neshodují');
      return;
    }

    setSavingPin(true);
    try {
      if (!farmar?.id) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        return;
      }

      const { error } = await supabase
        .from('pestitele')
        .update({ heslo_hash: newPin })
        .eq('id', farmar.id);

      if (error) throw error;

      setCurrentPin(newPin);
      setNewPin('');
      setConfirmPin('');
      setShowPinSection(false);
      Alert.alert('Úspěch', 'PIN byl úspěšně změněn');
    } catch (error) {
      console.error('Chyba při změně PINu:', error);
      Alert.alert('Chyba', 'Nepodařilo se změnit PIN');
    } finally {
      setSavingPin(false);
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

      const { data, error } = await supabase
        .from('pestitele')
        .update(updateData)
        .eq('id', farmerId)
        .select();

      console.log('📥 Supabase response:', { data, error });

      if (error) {
        console.error('❌ Supabase error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('❌ No data returned from update');
        throw new Error('Nepodařilo se aktualizovat záznam. Možná nemáte oprávnění nebo záznam neexistuje.');
      }

      console.log('✅ Save successful!');
      setSaving(false);
      Alert.alert('Uloženo', 'Informace o farmě byly úspěšně aktualizovány', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('❌ Chyba při ukládání do databáze:', error);
      setSaving(false);
      Alert.alert('Chyba', error?.message || 'Nepodařilo se uložit změny');
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
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Jméno farmáře *</Text>
            <TextInput
              style={styles.input}
              value={jmeno}
              onChangeText={setJmeno}
              placeholder="Jan Svoboda"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="email@priklad.cz"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={farmarData?.telefon}
                editable={false}
              />
            </View>
          </View>
        </View>

        {/* PIN pro Prodejnu */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIconCircle, { backgroundColor: '#FFF3E0' }]}>
              <Text style={styles.sectionIcon}>🔐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>PIN pro Prodejnu</Text>
              <Text style={styles.sectionSubtitle}>
                Rychlé přihlášení telefonem
              </Text>
            </View>
          </View>

          {currentPin ? (
            <>
              <View style={styles.pinDisplayBox}>
                <View style={styles.pinValueBox}>
                  <Text style={styles.pinLabel}>Váš PIN</Text>
                  <Text style={styles.pinValue}>{currentPin}</Text>
                </View>
                {!showPinSection && (
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={() => setShowPinSection(true)}
                  >
                    <Text style={styles.changeButtonText}>Změnit</Text>
                  </TouchableOpacity>
                )}
              </View>

              {showPinSection && (
                <View style={styles.pinChangeForm}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Nový PIN (4-6 číslic)</Text>
                    <TextInput
                      style={styles.pinInput}
                      placeholder="••••"
                      placeholderTextColor="#999"
                      value={newPin}
                      onChangeText={setNewPin}
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Potvrďte nový PIN</Text>
                    <TextInput
                      style={styles.pinInput}
                      placeholder="••••"
                      placeholderTextColor="#999"
                      value={confirmPin}
                      onChangeText={setConfirmPin}
                      keyboardType="number-pad"
                      maxLength={6}
                      secureTextEntry
                    />
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowPinSection(false);
                        setNewPin('');
                        setConfirmPin('');
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Zrušit</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.primaryButton, savingPin && styles.buttonDisabled]}
                      onPress={handleZmenitPin}
                      disabled={savingPin}
                    >
                      <Text style={styles.primaryButtonText}>
                        {savingPin ? 'Ukládám...' : 'Uložit'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.alertBox}>
                <Text style={styles.alertText}>Nemáte nastavený PIN</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nový PIN (4-6 číslic)</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="••••"
                  placeholderTextColor="#999"
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Potvrďte PIN</Text>
                <TextInput
                  style={styles.pinInput}
                  placeholder="••••"
                  placeholderTextColor="#999"
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                />
              </View>

              <TouchableOpacity
                style={[styles.primaryButton, savingPin && styles.buttonDisabled]}
                onPress={handleZmenitPin}
                disabled={savingPin}
              >
                <Text style={styles.primaryButtonText}>
                  {savingPin ? 'Vytvářím...' : 'Vytvořit PIN'}
                </Text>
              </TouchableOpacity>
            </>
          )}
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
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Adresa</Text>
            <TextInput
              style={styles.input}
              value={adresa}
              onChangeText={setAdresa}
              placeholder="Hlavní 123"
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
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
    backgroundColor: '#F8F9FA'
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center'
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 12
  },
  backButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666'
  },
  content: {
    flex: 1
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A'
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },

  // Input Groups
  inputGroup: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1A1A1A',
    marginBottom: 8
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  inputDisabled: {
    backgroundColor: '#F5F5F5',
    color: '#999'
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
    paddingTop: 14,
  },
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
  saveButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.5
  },

  // PIN Section Styles
  pinDisplayBox: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pinValueBox: {
    flex: 1,
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  pinValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4CAF50',
    letterSpacing: 6,
  },
  changeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  pinChangeForm: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
  },
  pinInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    color: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#E8EAED',
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  alertBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  alertText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },

  // Buttons
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 15,
    fontWeight: '600',
  },
});
