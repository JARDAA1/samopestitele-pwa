import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, TextInput, ActivityIndicator, Platform } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { fetchLokace, updateLokace } from '@/features/profil/services/profilService';
import type { LokaceData as FarmarData } from '@/features/profil/services/profilService';

export default function LokalitaScreen() {
  const { farmar, isAuthenticated } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [farmarData, setFarmarData] = useState<FarmarData | null>(null);

  const [mesto, setMesto] = useState('');
  const [adresa, setAdresa] = useState('');
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

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const loadFarmarData = async () => {
    try {
      if (!farmar?.id) {
        showAlert('Chyba', 'Nejste přihlášeni');
        router.back();
        return;
      }

      const data = await fetchLokace(farmar.id);

      if (data) {
        setFarmarData(data);
        setMesto(data.mesto || '');
        setAdresa(data.adresa || '');
      }
    } catch (error) {
      console.error('Chyba při načítání dat:', error);
      showAlert('Chyba', 'Nepodařilo se načíst data');
    } finally {
      setLoading(false);
    }
  };

  const getMyLocation = async () => {
    setFetchingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        showAlert(
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

      showAlert(
        'Poloha získána',
        `📍 GPS: ${location.coords.latitude.toFixed(6)}, ${location.coords.longitude.toFixed(6)}`
      );
    } catch (error) {
      console.error('Chyba při získávání polohy:', error);
      showAlert('Chyba', 'Nepodařilo se získat vaši polohu.');
    } finally {
      setFetchingGPS(false);
    }
  };

  const getGPSFromAddress = async (mesto: string, adresa: string): Promise<{ lat: number, lng: number } | null> => {
    try {
      const fullAddress = adresa ? `${adresa}, ${mesto}, Česká republika` : `${mesto}, Česká republika`;
      const encodedAddress = encodeURIComponent(fullAddress);

      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
        {
          headers: {
            'User-Agent': 'SamoPestitele App',
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
    if (!mesto.trim()) {
      showAlert('Chyba', 'Vyplňte město');
      return;
    }

    setSaving(true);
    try {
      if (!farmar?.id) {
        showAlert('Chyba', 'Nejste přihlášeni');
        setSaving(false);
        return;
      }

      let finalLat = 0;
      let finalLng = 0;

      if (useMyLocation && myLocationLat !== null && myLocationLng !== null) {
        finalLat = myLocationLat;
        finalLng = myLocationLng;
      } else if (farmarData?.gps_lat && farmarData?.gps_lng) {
        finalLat = farmarData.gps_lat;
        finalLng = farmarData.gps_lng;
      } else {
        setFetchingGPS(true);
        const gpsCoords = await getGPSFromAddress(mesto.trim(), adresa.trim());
        setFetchingGPS(false);

        if (gpsCoords) {
          finalLat = gpsCoords.lat;
          finalLng = gpsCoords.lng;
        }
      }

      await updateLokace(farmar.id, {
        mesto: mesto.trim(),
        adresa: adresa.trim() || null,
        gps_lat: finalLat,
        gps_lng: finalLng,
      });

      showAlert('Uloženo', 'Lokalita byla úspěšně aktualizována');
      router.back();
    } catch (error) {
      console.error('Chyba při ukládání:', error);
      showAlert('Chyba', 'Nepodařilo se uložit změny');
    } finally {
      setSaving(false);
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
        <Text style={styles.headerTitle}>📍 Kde mě najdete</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconCircle}>
              <Text style={styles.sectionIcon}>📍</Text>
            </View>
            <View style={styles.sectionTextContainer}>
              <Text style={styles.sectionTitle}>Lokalita prodejny</Text>
              <Text style={styles.sectionSubtitle}>Kde vás zákazníci najdou</Text>
            </View>
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

          <View style={styles.gpsSection}>
            <Text style={styles.label}>GPS souřadnice</Text>

            <TouchableOpacity
              style={[styles.gpsOption, !useMyLocation && styles.gpsOptionActive]}
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
              style={[styles.gpsOption, useMyLocation && styles.gpsOptionActive]}
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
                  💡 Ujistěte se, že se nacházíte na místě vaší prodejny.
                </Text>
              </View>
            </View>
          )}

          {!useMyLocation && farmarData && farmarData.gps_lat != null && farmarData.gps_lng != null && (farmarData.gps_lat !== 0 || farmarData.gps_lng !== 0) && (
            <View style={styles.gpsInfo}>
              <Text style={styles.gpsInfoText}>
                📍 Aktuální GPS: {farmarData.gps_lat.toFixed(6)}, {farmarData.gps_lng.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, (saving || fetchingGPS) && styles.buttonDisabled]}
            onPress={handleUlozit}
            disabled={saving || fetchingGPS}
          >
            <Text style={styles.saveButtonText}>
              {fetchingGPS ? 'Hledám GPS...' : saving ? 'Ukládám...' : 'Uložit lokalitu'}
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
    paddingBottom: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    marginRight: 16
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
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)'
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  sectionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,152,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  sectionIcon: {
    fontSize: 20,
  },
  sectionTextContainer: {
    flex: 1,
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  gpsSection: {
    marginTop: 8,
    gap: 12,
  },
  gpsOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  gpsOptionActive: {
    borderColor: '#FF9800',
    backgroundColor: 'rgba(255,152,0,0.15)',
  },
  radioButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
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
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  gpsOptionDesc: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  myLocationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  locationButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
  },
  locationButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  locationInfo: {
    backgroundColor: 'rgba(76,175,80,0.2)',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#4CAF50',
  },
  locationInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
    marginBottom: 4,
  },
  locationInfoCoords: {
    fontSize: 14,
    fontFamily: 'monospace',
    color: '#ffffff',
  },
  infoBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  gpsInfo: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    marginTop: 16,
  },
  gpsInfoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontFamily: 'monospace',
  },
  saveButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: '#FF9800',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700'
  },
  buttonDisabled: {
    opacity: 0.6
  },
});
