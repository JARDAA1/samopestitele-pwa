import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as Location from 'expo-location';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { fetchProfilFarmara, updateProfilFarmara } from '@/features/profil/services/profilService';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna' },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa' },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky' },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

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

function UpravitFarmuContent() {
  const { farmar, logout, isAuthenticated } = useFarmarAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fetchingGPS, setFetchingGPS] = useState(false);
  const [farmarData, setFarmarData] = useState<FarmarData | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [nazevFarmy, setNazevFarmy] = useState('');
  const [jmeno, setJmeno] = useState('');
  const [email, setEmail] = useState('');
  const [mesto, setMesto] = useState('');
  const [adresa, setAdresa] = useState('');
  const [popis, setPopis] = useState('');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [myLat, setMyLat] = useState<number | null>(null);
  const [myLng, setMyLng] = useState<number | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !farmar) { router.replace('/prihlaseni'); return; }
    if (!farmar.id) return;
    fetchProfilFarmara(farmar.id)
      .then((data) => {
        if (!data) return;
        setFarmarData(data as unknown as FarmarData);
        setNazevFarmy(data.nazev_farmy || '');
        setJmeno(data.jmeno || '');
        setEmail(data.email || '');
        setMesto(data.mesto || '');
        setAdresa(data.adresa || '');
        setPopis(data.popis || '');
      })
      .catch(() => setErrorMsg('Nepodařilo se načíst data farmáře'))
      .finally(() => setLoading(false));
  }, [isAuthenticated, farmar]);

  const getMyLocation = async () => {
    setFetchingGPS(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Přístup k poloze byl zamítnut.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMyLat(loc.coords.latitude);
      setMyLng(loc.coords.longitude);
      alert(`📍 Poloha získána: ${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`);
    } catch {
      alert('Nepodařilo se získat polohu.');
    } finally {
      setFetchingGPS(false);
    }
  };

  const getGPSFromAddress = async (city: string, addr: string) => {
    const q = addr ? `${addr}, ${city}, Česká republika` : `${city}, Česká republika`;
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1`,
      { headers: { 'User-Agent': 'SamoPestitele App' } }
    );
    const data = await res.json();
    if (data?.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    return null;
  };

  const handleUlozit = async () => {
    setErrorMsg('');
    if (!nazevFarmy.trim()) { setErrorMsg('Vyplňte název farmy'); return; }
    if (!jmeno.trim()) { setErrorMsg('Vyplňte jméno farmáře'); return; }
    if (!mesto.trim()) { setErrorMsg('Vyplňte město'); return; }
    if (!farmar?.id) { router.replace('/prihlaseni'); return; }

    setSaving(true);
    try {
      let gpsLat = 0, gpsLng = 0;

      if (useMyLocation && myLat !== null && myLng !== null) {
        gpsLat = myLat; gpsLng = myLng;
      } else if (farmarData?.gps_lat && farmarData?.gps_lng) {
        gpsLat = farmarData.gps_lat; gpsLng = farmarData.gps_lng;
      } else {
        setFetchingGPS(true);
        const coords = await getGPSFromAddress(mesto.trim(), adresa.trim());
        setFetchingGPS(false);
        if (coords) { gpsLat = coords.lat; gpsLng = coords.lng; }
      }

      await updateProfilFarmara(farmar.id, {
        nazev_farmy: nazevFarmy.trim(),
        jmeno: jmeno.trim(),
        email: email.trim() || null,
        mesto: mesto.trim(),
        adresa: adresa.trim() || null,
        popis: popis.trim() || null,
        gps_lat: gpsLat,
        gps_lng: gpsLng,
      });

      setSuccessMsg('Informace o farmě byly úspěšně aktualizovány.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Nepodařilo se uložit změny');
    } finally {
      setSaving(false);
    }
  };

  const renderSidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarTop}>
        <Text style={s.brand}>🌿 Samopestitele</Text>
        <View style={s.nav}>
          {NAV.map((item, i) => (
            <TouchableOpacity key={i}
              style={s.navItem}
              onPress={() => router.push(item.route as any)}>
              <Text style={s.navIcon}>{item.icon}</Text>
              <Text style={s.navLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={s.sidebarBottom}>
        {farmar && (
          <Text style={s.farmName} numberOfLines={1}>
            {farmar.nazev_farmy || farmar.jmeno || 'Moje farma'}
          </Text>
        )}
        <TouchableOpacity style={s.logoutBtn} onPress={() => logout && logout()}>
          <Text style={s.logoutBtnText}>Odhlásit se</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={s.root}>
        {renderSidebar()}
        <View style={s.loadingScreen}>
          <ActivityIndicator size="large" color="#4caf50" />
          <Text style={s.loadingText}>Načítám...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {renderSidebar()}

      <ScrollView style={s.main} contentContainerStyle={s.mainContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/moje-prodejna')} style={s.backBtn}>
            <Text style={s.backBtnText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Upravit informace o farmě</Text>
        </View>

        <View style={s.formWrap}>
          {errorMsg ? <Text style={s.errorMsg}>{errorMsg}</Text> : null}
          {successMsg ? (
            <View style={s.successBox}>
              <Text style={s.successText}>✓ {successMsg}</Text>
            </View>
          ) : null}

          {/* Základní údaje */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.iconCircle}>
                <Text style={s.iconCircleText}>👤</Text>
              </View>
              <Text style={s.cardTitle}>Základní údaje</Text>
            </View>

            <View style={s.twoCol}>
              <View style={s.colField}>
                <Text style={s.label}>Název farmy *</Text>
                <TextInput style={s.input} value={nazevFarmy} onChangeText={setNazevFarmy}
                  placeholder="Bio Farma Svoboda" placeholderTextColor="#9ca3af" />
              </View>
              <View style={s.colField}>
                <Text style={s.label}>Jméno farmáře *</Text>
                <TextInput style={s.input} value={jmeno} onChangeText={setJmeno}
                  placeholder="Jan Svoboda" placeholderTextColor="#9ca3af" />
              </View>
            </View>

            <View style={s.twoCol}>
              <View style={s.colField}>
                <Text style={s.label}>Email</Text>
                <TextInput style={s.input} value={email} onChangeText={setEmail}
                  placeholder="email@priklad.cz" placeholderTextColor="#9ca3af"
                  keyboardType="email-address" autoCapitalize="none" />
              </View>
              <View style={s.colField}>
                <Text style={s.label}>Telefon</Text>
                <View style={s.phoneRow}>
                  <TextInput style={[s.input, s.phoneInput, s.inputDisabled]}
                    value={farmarData?.telefon} editable={false} />
                  <TouchableOpacity style={s.changePhoneBtn}
                    onPress={() => router.push('/profil/zmenit-telefon')}>
                    <Text style={s.changePhoneBtnText}>Změnit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>

          {/* Lokalita */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.iconCircle, s.iconCircleBlue]}>
                <Text style={s.iconCircleText}>📍</Text>
              </View>
              <Text style={s.cardTitle}>Lokalita</Text>
            </View>

            <View style={s.twoCol}>
              <View style={s.colField}>
                <Text style={s.label}>Město *</Text>
                <TextInput style={s.input} value={mesto} onChangeText={setMesto}
                  placeholder="Praha" placeholderTextColor="#9ca3af" />
              </View>
              <View style={s.colField}>
                <Text style={s.label}>Adresa</Text>
                <TextInput style={s.input} value={adresa} onChangeText={setAdresa}
                  placeholder="Hlavní 123" placeholderTextColor="#9ca3af" />
              </View>
            </View>

            <Text style={s.label}>GPS souřadnice</Text>
            <View style={s.gpsOptions}>
              <TouchableOpacity
                style={[s.gpsOption, !useMyLocation && s.gpsOptionActive]}
                onPress={() => setUseMyLocation(false)}>
                <View style={s.radio}>
                  {!useMyLocation && <View style={s.radioFill} />}
                </View>
                <View>
                  <Text style={s.gpsOptionTitle}>🔍 Automaticky z adresy</Text>
                  <Text style={s.gpsOptionDesc}>Souřadnice se určí z města a adresy</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.gpsOption, useMyLocation && s.gpsOptionActive]}
                onPress={() => setUseMyLocation(true)}>
                <View style={s.radio}>
                  {useMyLocation && <View style={s.radioFill} />}
                </View>
                <View>
                  <Text style={s.gpsOptionTitle}>📍 Použít moji polohu</Text>
                  <Text style={s.gpsOptionDesc}>Přesná poloha z GPS prohlížeče</Text>
                </View>
              </TouchableOpacity>
            </View>

            {useMyLocation && (
              <View style={s.myLocWrap}>
                <TouchableOpacity
                  style={[s.locBtn, fetchingGPS && s.locBtnDisabled]}
                  onPress={getMyLocation}
                  disabled={fetchingGPS}>
                  <Text style={s.locBtnText}>
                    {fetchingGPS ? '📍 Získávám polohu...' : '📍 Získat moji polohu'}
                  </Text>
                </TouchableOpacity>
                {myLat !== null && myLng !== null && (
                  <View style={s.locSuccess}>
                    <Text style={s.locSuccessText}>
                      ✓ {myLat.toFixed(6)}, {myLng.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {!useMyLocation && farmarData && (farmarData.gps_lat !== 0 || farmarData.gps_lng !== 0) && (
              <View style={s.gpsInfo}>
                <Text style={s.gpsInfoText}>
                  Aktuální GPS: {farmarData.gps_lat.toFixed(6)}, {farmarData.gps_lng.toFixed(6)}
                </Text>
              </View>
            )}
          </View>

          {/* O farmě */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.iconCircle, s.iconCirclePurple]}>
                <Text style={s.iconCircleText}>📝</Text>
              </View>
              <Text style={s.cardTitle}>O farmě</Text>
            </View>
            <Text style={s.label}>Popis farmy</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={popis}
              onChangeText={setPopis}
              placeholder="Napište něco o vaší farmě..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={5}
            />
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[s.saveBtn, (saving || fetchingGPS) && s.saveBtnDisabled]}
            onPress={handleUlozit}
            disabled={saving || fetchingGPS}>
            <Text style={s.saveBtnText}>
              {fetchingGPS ? 'Hledám GPS...' : saving ? 'Ukládám...' : 'Uložit změny'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

export default function UpravitFarmuScreen() {
  return <ProtectedRoute><UpravitFarmuContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f9fafb' },

  // Sidebar
  sidebar: {
    width: 260, backgroundColor: '#1a1a1a',
    flexDirection: 'column', justifyContent: 'space-between', paddingVertical: 24,
  },
  sidebarTop: { flex: 1 },
  sidebarBottom: {
    paddingHorizontal: 16, paddingTop: 16,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)',
  },
  brand: { fontSize: 16, fontWeight: '800', color: '#ffffff', paddingHorizontal: 16, marginBottom: 24 },
  nav: { gap: 2 },
  navItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 8, marginHorizontal: 8, gap: 12,
  },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  navLabel: { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  farmName: { fontSize: 13, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, alignItems: 'center' },
  logoutBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },

  // Main
  main: { flex: 1 },
  mainContent: { paddingBottom: 48 },
  loadingScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#6b7280' },

  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 40,
    paddingTop: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },

  formWrap: { maxWidth: 900 as any, width: '100%' as any, alignSelf: 'center' as any, padding: 40, gap: 20 },

  errorMsg: {
    backgroundColor: '#fef2f2', color: '#dc2626', fontSize: 14,
    padding: 12, borderRadius: 8, borderLeftWidth: 3, borderLeftColor: '#dc2626',
  },
  successBox: {
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 14,
    borderLeftWidth: 3, borderLeftColor: '#4caf50',
  },
  successText: { fontSize: 14, color: '#166534', fontWeight: '600' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(76,175,80,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleBlue: { backgroundColor: '#dbeafe' },
  iconCirclePurple: { backgroundColor: '#f3e8ff' },
  iconCircleText: { fontSize: 20 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },

  twoCol: { flexDirection: 'row', gap: 16, marginBottom: 0 },
  colField: { flex: 1 },

  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#ffffff',
    outlineStyle: 'none' as any,
  },
  inputDisabled: { backgroundColor: '#f9fafb', color: '#9ca3af' },
  textArea: { minHeight: 120, paddingTop: 10 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  phoneInput: { flex: 1 },
  changePhoneBtn: {
    backgroundColor: '#4caf50', paddingVertical: 12, paddingHorizontal: 14, borderRadius: 10,
  },
  changePhoneBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },

  gpsOptions: { gap: 10, marginTop: 4 },
  gpsOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    padding: 12, backgroundColor: '#f9fafb', borderRadius: 10,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  gpsOptionActive: { borderColor: '#4caf50', backgroundColor: 'rgba(76,175,80,0.05)' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#4caf50',
    alignItems: 'center', justifyContent: 'center',
  },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4caf50' },
  gpsOptionTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  gpsOptionDesc: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  myLocWrap: { marginTop: 12, gap: 10 },
  locBtn: {
    backgroundColor: '#4caf50', borderRadius: 10,
    padding: 12, alignItems: 'center',
  },
  locBtnDisabled: { opacity: 0.6 },
  locBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  locSuccess: {
    backgroundColor: '#f0fdf4', borderRadius: 8, padding: 10,
    borderLeftWidth: 3, borderLeftColor: '#4caf50',
  },
  locSuccessText: { fontSize: 13, color: '#166534', fontWeight: '600' },

  gpsInfo: { marginTop: 10, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10 },
  gpsInfoText: { fontSize: 12, color: '#6b7280' },

  saveBtn: {
    backgroundColor: '#4caf50', borderRadius: 12,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
});
