import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';
import {
  ProdejniMisto,
  fetchAktivniStanek,
  createOrActivateDocasnyStanek,
  deleteDocasneStanky,
  updateStanekPlatneDo,
} from '@/features/prodejni-mista/services/locationService';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna' },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa' },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky' },
  { icon: '📡', label: 'Stánek', route: '/(tabs)/moje-stanky', active: true },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

const DURATION_OPTIONS = [
  { label: '+1 hodina', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d; } },
  { label: '+3 hodiny', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 3, 0, 0, 0); return d; } },
  { label: 'Konec dne', getTime: () => { const d = new Date(); d.setHours(23, 59, 59, 0); return d; } },
];

function formatCasDo(iso: string): string {
  const d = new Date(iso);
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function StanekContent() {
  const { farmar, logout } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aktivniStanek, setAktivniStanek] = useState<ProdejniMisto | null>(null);

  // New stánek form
  const [showForm, setShowForm] = useState(false);
  const [nazev, setNazev] = useState('');
  const [selectedDuration, setSelectedDuration] = useState(2);
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Change time
  const [changingTime, setChangingTime] = useState(false);
  const [selectedChangeDuration, setSelectedChangeDuration] = useState(2);

  const loadStanek = useCallback(async () => {
    if (!farmar?.id) { setLoading(false); return; }
    const stanek = await fetchAktivniStanek(Number(farmar.id));
    setAktivniStanek(stanek);
    setLoading(false);
  }, [farmar?.id]);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    loadStanek();
  }, [loadStanek]));

  const getGPS = () => {
    setGpsStatus('loading');
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsStatus('ok');
      },
      () => setGpsStatus('error'),
      { timeout: 10000 }
    );
  };

  const handleStart = async () => {
    if (!farmar?.id || !nazev.trim()) {
      window.alert('Zadejte název prodejního místa.');
      return;
    }
    let lat = farmar.gps_lat || 0;
    let lng = farmar.gps_lng || 0;
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
    const platneDo = DURATION_OPTIONS[selectedDuration].getTime();
    setSaving(true);
    try {
      await createOrActivateDocasnyStanek(Number(farmar.id), lat, lng, platneDo, nazev.trim());
      setShowForm(false);
      setNazev('');
      setCoords(null);
      setGpsStatus('idle');
      await loadStanek();
    } finally {
      setSaving(false);
    }
  };

  const handleUkoncit = async () => {
    if (!farmar?.id || !window.confirm('Opravdu chcete ukončit prodej?')) return;
    setSaving(true);
    await deleteDocasneStanky(Number(farmar.id));
    await loadStanek();
    setSaving(false);
  };

  const handleZmenitCas = async () => {
    if (!aktivniStanek) return;
    setSaving(true);
    const platneDo = DURATION_OPTIONS[selectedChangeDuration].getTime();
    await updateStanekPlatneDo(aktivniStanek.id, platneDo);
    await loadStanek();
    setChangingTime(false);
    setSaving(false);
  };

  const renderSidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarTop}>
        <Text style={s.brand}>🌿 Samopestitele</Text>
        <View style={s.nav}>
          {NAV.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[s.navItem, item.active && s.navItemActive]}
              onPress={() => router.push(item.route as any)}
            >
              <Text style={s.navIcon}>{item.icon}</Text>
              <Text style={[s.navLabel, item.active && s.navLabelActive]}>{item.label}</Text>
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

  return (
    <View style={s.root}>
      {renderSidebar()}
      <View style={s.main}>
        <View style={s.pageHeader}>
          <Text style={s.pageTitle}>📡 Stánek</Text>
          <Text style={s.pageSubtitle}>Dočasný prodejní bod — aktivní dokud ho neukončíte</Text>
        </View>

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color="#4caf50" />
          </View>
        ) : (
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}>

            {aktivniStanek ? (
              <>
                {/* Aktivní stánek */}
                <View style={s.aktivniCard}>
                  <Text style={s.aktivniTitle}>🟢 Právě prodávám</Text>
                  <Text style={s.aktivniLokace}>
                    📍 {aktivniStanek.adresa ||
                      (aktivniStanek.lat != null && aktivniStanek.lng != null
                        ? `${aktivniStanek.lat.toFixed(5)}, ${aktivniStanek.lng.toFixed(5)}`
                        : 'Poloha neznámá')}
                  </Text>
                  {aktivniStanek.platne_do && (
                    <Text style={s.aktivniDetail}>
                      Aktivní do: {formatCasDo(aktivniStanek.platne_do)}
                    </Text>
                  )}
                </View>

                {changingTime ? (
                  <View style={s.card}>
                    <Text style={s.cardTitle}>Nový čas ukončení</Text>
                    <View style={s.durationRow}>
                      {DURATION_OPTIONS.map((opt, idx) => (
                        <TouchableOpacity
                          key={idx}
                          style={[s.durationBtn, selectedChangeDuration === idx && s.durationBtnActive]}
                          onPress={() => setSelectedChangeDuration(idx)}
                        >
                          <Text style={[s.durationBtnText, selectedChangeDuration === idx && s.durationBtnTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <View style={s.actionRow}>
                      <TouchableOpacity
                        style={[s.confirmBtn, saving && s.btnDisabled]}
                        onPress={handleZmenitCas}
                        disabled={saving}
                      >
                        <Text style={s.confirmBtnText}>{saving ? 'Ukládám...' : 'Potvrdit nový čas'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.cancelBtn} onPress={() => setChangingTime(false)}>
                        <Text style={s.cancelBtnText}>Zrušit</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={s.changeTimeBtn}
                    onPress={() => setChangingTime(true)}
                    disabled={saving}
                  >
                    <Text style={s.changeTimeBtnText}>🕐 Změnit čas ukončení</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[s.ukoncitBtn, saving && s.btnDisabled]}
                  onPress={handleUkoncit}
                  disabled={saving}
                >
                  <Text style={s.ukoncitBtnText}>{saving ? 'Ukončuji...' : 'Ukončit prodej'}</Text>
                </TouchableOpacity>
              </>
            ) : showForm ? (
              <View style={s.card}>
                <Text style={s.cardTitle}>📍 Nový dočasný stánek</Text>

                <Text style={s.label}>Název místa *</Text>
                <TextInput
                  style={s.input}
                  placeholder="Např. U obchodu, Náměstí..."
                  value={nazev}
                  onChangeText={setNazev}
                />

                <Text style={s.label}>Jak dlouho budete prodávat?</Text>
                <View style={s.durationRow}>
                  {DURATION_OPTIONS.map((opt, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={[s.durationBtn, selectedDuration === idx && s.durationBtnActive]}
                      onPress={() => setSelectedDuration(idx)}
                    >
                      <Text style={[s.durationBtnText, selectedDuration === idx && s.durationBtnTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={s.label}>GPS poloha</Text>
                <TouchableOpacity style={s.gpsBtn} onPress={getGPS} disabled={gpsStatus === 'loading'}>
                  <Text style={s.gpsBtnText}>
                    {gpsStatus === 'loading' ? '📍 Získávám polohu...' :
                      gpsStatus === 'ok' ? `✓ GPS: ${coords?.lat.toFixed(5)}, ${coords?.lng.toFixed(5)}` :
                        gpsStatus === 'error' ? '⚠️ Nelze získat GPS — použije se adresa farmy' :
                          '📍 Použít moji aktuální polohu'}
                  </Text>
                </TouchableOpacity>
                {!coords && (
                  <Text style={s.gpsHint}>Pokud GPS nepovolíte, použijí se souřadnice vaší farmy.</Text>
                )}

                <View style={s.actionRow}>
                  <TouchableOpacity
                    style={[s.startBtn, saving && s.btnDisabled]}
                    onPress={handleStart}
                    disabled={saving}
                  >
                    <Text style={s.startBtnText}>{saving ? 'Spouštím...' : '🟢 Zahájit prodej'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setShowForm(false)}>
                    <Text style={s.cancelBtnText}>Zrušit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <>
                <TouchableOpacity style={s.mainBtn} onPress={() => setShowForm(true)}>
                  <Text style={s.mainBtnText}>📍 Teď prodávám</Text>
                </TouchableOpacity>
                <Text style={s.hint}>Vytvoří dočasný stánek na zvolené poloze.</Text>
              </>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

export default function MojeStankyScreen() {
  return <ProtectedRoute><StanekContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, flexDirection: 'row', backgroundColor: '#f9fafb' },

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
  navItemActive: { backgroundColor: 'rgba(76,175,80,0.15)' },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  navLabel: { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  navLabelActive: { color: '#4caf50', fontWeight: '700' },
  farmName: { fontSize: 13, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, alignItems: 'center' },
  logoutBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },

  main: { flex: 1 },
  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },
  pageSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 4 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 640 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 40, gap: 16, paddingBottom: 48,
  },

  aktivniCard: {
    backgroundColor: '#f0fdf4', borderRadius: 16, padding: 24,
    borderWidth: 2, borderColor: '#4caf50', marginBottom: 4,
  },
  aktivniTitle: { fontSize: 20, fontWeight: '700', color: '#166534', marginBottom: 8 },
  aktivniLokace: { fontSize: 15, color: '#374151', marginBottom: 6 },
  aktivniDetail: { fontSize: 17, color: '#1a1a1a', fontWeight: '600' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 24,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },

  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14,
    fontSize: 15, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb',
    marginBottom: 16,
  },

  durationRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  durationBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: '#e5e7eb', alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  durationBtnActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  durationBtnText: { fontSize: 13, fontWeight: '600', color: '#374151' },
  durationBtnTextActive: { color: '#ffffff' },

  gpsBtn: {
    backgroundColor: '#eff6ff', borderRadius: 10, paddingVertical: 12,
    paddingHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderColor: '#bfdbfe',
  },
  gpsBtnText: { fontSize: 14, color: '#1d4ed8', fontWeight: '600', textAlign: 'center' },
  gpsHint: { fontSize: 12, color: '#9ca3af', marginBottom: 16 },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  startBtn: {
    flex: 1, backgroundColor: '#4caf50', paddingVertical: 14,
    borderRadius: 10, alignItems: 'center',
  },
  startBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  confirmBtn: {
    flex: 1, backgroundColor: '#4caf50', paddingVertical: 14,
    borderRadius: 10, alignItems: 'center',
  },
  confirmBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  cancelBtn: {
    flex: 1, backgroundColor: '#f3f4f6', paddingVertical: 14,
    borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  cancelBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },

  changeTimeBtn: {
    backgroundColor: '#ffffff', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  changeTimeBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },

  ukoncitBtn: {
    backgroundColor: '#fee2e2', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5',
  },
  ukoncitBtnText: { color: '#dc2626', fontSize: 17, fontWeight: '700' },

  mainBtn: {
    backgroundColor: '#4caf50', borderRadius: 16, paddingVertical: 24,
    alignItems: 'center',
    shadowColor: '#4caf50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  mainBtnText: { color: '#ffffff', fontSize: 22, fontWeight: '700' },
  hint: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },

  btnDisabled: { opacity: 0.6 },
});
