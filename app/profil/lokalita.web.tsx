import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { ProtectedRoute } from '../_utils/ProtectedRoute';
import { fetchLokace, updateLokace } from '@/features/profil/services/profilService';
import type { LokaceData } from '@/features/profil/services/profilService';

function LokalitaContent() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [farmarData, setFarmarData] = useState<LokaceData | null>(null);
  const [mesto, setMesto] = useState('');
  const [adresa, setAdresa] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [myCoords, setMyCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!farmar?.id) return;
    loadData();
  }, [farmar?.id]);

  const loadData = async () => {
    try {
      const data = await fetchLokace(farmar!.id);
      if (data) {
        setFarmarData(data);
        setMesto(data.mesto || '');
        setAdresa(data.adresa || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getMyLocation = () => {
    setFetchingGPS(true);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setMyCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseMyLocation(true);
        setFetchingGPS(false);
      },
      () => {
        setErrorMsg('Nepodařilo se získat vaši polohu. Zkontrolujte povolení v prohlížeči.');
        setFetchingGPS(false);
      },
      { timeout: 10000 }
    );
  };

  const getGPSFromAddress = async (m: string, a: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const q = a ? `${a}, ${m}, Česká republika` : `${m}, Česká republika`;
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
        { headers: { 'User-Agent': 'SamoPestitele App' } }
      );
      const data = await resp.json();
      if (data?.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleUlozit = async () => {
    if (!mesto.trim()) { setErrorMsg('Vyplňte město'); return; }
    if (!farmar?.id) return;

    setSaving(true);
    setErrorMsg('');
    try {
      let lat = 0, lng = 0;
      if (useMyLocation && myCoords) {
        lat = myCoords.lat;
        lng = myCoords.lng;
      } else if (farmarData?.gps_lat && farmarData?.gps_lng) {
        lat = farmarData.gps_lat;
        lng = farmarData.gps_lng;
      } else {
        setFetchingGPS(true);
        const coords = await getGPSFromAddress(mesto.trim(), adresa.trim());
        setFetchingGPS(false);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }

      await updateLokace(farmar.id, {
        mesto: mesto.trim(),
        adresa: adresa.trim() || null,
        gps_lat: lat,
        gps_lng: lng,
      });

      setSuccessMsg('Lokalita byla úspěšně aktualizována');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      setErrorMsg('Nepodařilo se uložit změny');
    } finally {
      setSaving(false);
      setFetchingGPS(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={() => router.push('/profil')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>📍 Kde mě najdete</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>

        {successMsg ? (
          <View style={s.successBanner}>
            <Text style={s.successText}>✓ {successMsg}</Text>
          </View>
        ) : null}
        {errorMsg ? (
          <View style={s.errorBanner}>
            <Text style={s.errorText}>⚠️ {errorMsg}</Text>
          </View>
        ) : null}

        <View style={s.card}>
          <View style={s.cardHeader}>
            <View style={s.iconCircle}><Text style={s.iconText}>📍</Text></View>
            <View>
              <Text style={s.cardTitle}>Lokalita prodejny</Text>
              <Text style={s.cardSubtitle}>Kde vás zákazníci najdou</Text>
            </View>
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Město *</Text>
            <TextInput
              style={s.input}
              value={mesto}
              onChangeText={setMesto}
              placeholder="Praha"
            />
          </View>

          <View style={s.inputGroup}>
            <Text style={s.label}>Adresa</Text>
            <TextInput
              style={s.input}
              value={adresa}
              onChangeText={setAdresa}
              placeholder="Hlavní 123"
            />
          </View>

          <Text style={s.sectionLabel}>GPS souřadnice</Text>
          <View style={s.gpsOptions}>
            <TouchableOpacity
              style={[s.gpsOption, !useMyLocation && s.gpsOptionActive]}
              onPress={() => setUseMyLocation(false)}
            >
              <View style={s.radio}>{!useMyLocation && <View style={s.radioDot} />}</View>
              <View>
                <Text style={s.gpsOptionTitle}>🔍 Automaticky z adresy</Text>
                <Text style={s.gpsOptionDesc}>Souřadnice se určí z města a adresy</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.gpsOption, useMyLocation && s.gpsOptionActive]}
              onPress={() => setUseMyLocation(true)}
            >
              <View style={s.radio}>{useMyLocation && <View style={s.radioDot} />}</View>
              <View>
                <Text style={s.gpsOptionTitle}>📍 Použít moji polohu</Text>
                <Text style={s.gpsOptionDesc}>Přesná poloha z prohlížeče</Text>
              </View>
            </TouchableOpacity>
          </View>

          {useMyLocation && (
            <View style={s.myLocationBox}>
              <TouchableOpacity
                style={[s.gpsBtn, fetchingGPS && s.btnDisabled]}
                onPress={getMyLocation}
                disabled={fetchingGPS}
              >
                <Text style={s.gpsBtnText}>
                  {fetchingGPS ? '📍 Získávám polohu...' : '📍 Získat moji polohu'}
                </Text>
              </TouchableOpacity>
              {myCoords && (
                <View style={s.coordsBox}>
                  <Text style={s.coordsTitle}>✓ Poloha získána:</Text>
                  <Text style={s.coordsText}>{myCoords.lat.toFixed(6)}, {myCoords.lng.toFixed(6)}</Text>
                </View>
              )}
              <View style={s.infoBox}>
                <Text style={s.infoText}>💡 Ujistěte se, že se nacházíte na místě vaší prodejny.</Text>
              </View>
            </View>
          )}

          {!useMyLocation && farmarData?.gps_lat && farmarData?.gps_lng &&
            (farmarData.gps_lat !== 0 || farmarData.gps_lng !== 0) && (
            <View style={s.currentGPS}>
              <Text style={s.currentGPSText}>
                📍 Aktuální GPS: {farmarData.gps_lat.toFixed(6)}, {farmarData.gps_lng.toFixed(6)}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[s.saveBtn, (saving || fetchingGPS) && s.btnDisabled]}
          onPress={handleUlozit}
          disabled={saving || fetchingGPS}
        >
          <Text style={s.saveBtnText}>
            {fetchingGPS ? 'Hledám GPS...' : saving ? 'Ukládám...' : 'Uložit lokalitu'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

export default function LokalitaScreen() {
  return <ProtectedRoute><LokalitaContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },

  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 680 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 40, gap: 20, paddingBottom: 48,
  },

  successBanner: {
    backgroundColor: '#dcfce7', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#4caf50',
  },
  successText: { color: '#166534', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  errorBanner: {
    backgroundColor: '#fee2e2', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#991b1b', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center',
  },
  iconText: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb',
  },

  sectionLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 10, marginTop: 4 },
  gpsOptions: { gap: 10, marginBottom: 0 },
  gpsOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: '#f9fafb', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb', gap: 12,
  },
  gpsOptionActive: { borderColor: '#4caf50', backgroundColor: '#f0fdf4' },
  radio: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: '#4caf50', alignItems: 'center', justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4caf50' },
  gpsOptionTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 2 },
  gpsOptionDesc: { fontSize: 12, color: '#9ca3af' },

  myLocationBox: { marginTop: 14, gap: 10 },
  gpsBtn: {
    backgroundColor: '#4caf50', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 10, alignItems: 'center',
  },
  gpsBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  coordsBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#4caf50',
  },
  coordsTitle: { fontSize: 13, fontWeight: '600', color: '#166534', marginBottom: 4 },
  coordsText: { fontSize: 13, color: '#1a1a1a' },
  infoBox: {
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  infoText: { fontSize: 13, color: '#92400e' },
  currentGPS: {
    marginTop: 14, backgroundColor: '#f9fafb', borderRadius: 10, padding: 12,
  },
  currentGPSText: { fontSize: 13, color: '#6b7280' },

  saveBtn: {
    backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 16, alignItems: 'center',
    shadowColor: '#4caf50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },
});
