import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';
import { DrawerMenu } from '../../_utils/DrawerMenu';
import { useDrawerMenu } from '../../_utils/useDrawerMenu';
import { TedProdavamModal } from '@/shared/ui/TedProdavamModal';
import {
  ProdejniMisto,
  fetchAktivniStanek,
  createOrActivateDocasnyStanek,
  deleteDocasneStanky,
  updateStanekPlatneDo,
} from '@/features/prodejni-mista/services/locationService';

const CHANGE_DURATION_OPTIONS = [
  { label: '+1 hod', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 1, 0, 0, 0); return d; } },
  { label: '+3 hod', getTime: () => { const d = new Date(); d.setHours(d.getHours() + 3, 0, 0, 0); return d; } },
  { label: 'Konec dne', getTime: () => { const d = new Date(); d.setHours(23, 59, 59, 0); return d; } },
];
const DEFAULT_CHANGE_IDX = 2;

function StanekScreenContent() {
  const { farmar } = useFarmarAuth();
  const { isMenuVisible, openMenu, closeMenu } = useDrawerMenu();

  const [loading, setLoading] = useState(true);
  const [aktivniStanek, setAktivniStanek] = useState<ProdejniMisto | null>(null);
  const [saving, setSaving] = useState(false);
  const [changingTime, setChangingTime] = useState(false);
  const [selectedChangeDuration, setSelectedChangeDuration] = useState(DEFAULT_CHANGE_IDX);
  const [modalVisible, setModalVisible] = useState(false);

  const formatCasDo = (isoString: string): string => {
    const d = new Date(isoString);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const loadAktivniStanek = useCallback(async () => {
    if (!farmar?.id) { setLoading(false); return; }
    const stanek = await fetchAktivniStanek(Number(farmar.id));
    setAktivniStanek(stanek);
    setLoading(false);
  }, [farmar?.id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      loadAktivniStanek();
    }, [loadAktivniStanek])
  );

  // Called by TedProdavamModal after coords are resolved
  const handleModalConfirm = async (
    lat: number,
    lng: number,
    platneDo: Date,
    nazev: string
  ) => {
    setSaving(true);
    try {
      const result = await createOrActivateDocasnyStanek(Number(farmar!.id), lat, lng, platneDo, nazev);
      if (result) {
        await loadAktivniStanek();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleUkoncit = async () => {
    if (!farmar?.id) return;
    setSaving(true);
    await deleteDocasneStanky(Number(farmar.id));
    await loadAktivniStanek();
    setSaving(false);
  };

  const handleZmenitCas = async () => {
    if (!aktivniStanek) return;
    setSaving(true);
    const platneDo = CHANGE_DURATION_OPTIONS[selectedChangeDuration].getTime();
    await updateStanekPlatneDo(aktivniStanek.id, platneDo);
    await loadAktivniStanek();
    setChangingTime(false);
    setSaving(false);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF9800" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <DrawerMenu visible={isMenuVisible} onClose={closeMenu} />

      <TedProdavamModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onConfirm={handleModalConfirm}
        farmGpsLat={farmar?.gps_lat}
        farmGpsLng={farmar?.gps_lng}
      />

      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton} onPress={openMenu}>
            <Text style={styles.menuIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>📍 Stánek</Text>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {aktivniStanek ? (
          <>
            {/* ── Active state ── */}
            <View style={styles.aktivniCard}>
              <Text style={styles.aktivniTitle}>🟢 Právě prodávám</Text>
              <Text style={styles.aktivniLokace}>
                📍{' '}
                {aktivniStanek.adresa
                  ? aktivniStanek.adresa
                  : aktivniStanek.lat != null && aktivniStanek.lng != null
                  ? `${aktivniStanek.lat.toFixed(5)}, ${aktivniStanek.lng.toFixed(5)}`
                  : 'Poloha neznámá'}
              </Text>
              <Text style={styles.aktivniDetail}>
                Aktivní do:{' '}
                {aktivniStanek.platne_do ? formatCasDo(aktivniStanek.platne_do) : '?'}
              </Text>
            </View>

            {changingTime ? (
              <>
                <View style={styles.durationContainer}>
                  <Text style={styles.durationLabel}>Nový čas ukončení:</Text>
                  <View style={styles.durationRow}>
                    {CHANGE_DURATION_OPTIONS.map((opt, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[
                          styles.durationBtn,
                          selectedChangeDuration === idx && styles.durationBtnSelected,
                        ]}
                        onPress={() => setSelectedChangeDuration(idx)}
                      >
                        <Text
                          style={[
                            styles.durationBtnText,
                            selectedChangeDuration === idx && styles.durationBtnTextSelected,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.confirmChangeBtn}
                  onPress={handleZmenitCas}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmChangeBtnText}>Potvrdit nový čas</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setChangingTime(false)}
                  disabled={saving}
                >
                  <Text style={styles.cancelBtnText}>Zrušit</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.changeTimeBtn}
                onPress={() => setChangingTime(true)}
                disabled={saving}
              >
                <Text style={styles.changeTimeBtnText}>Změnit čas ukončení</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.ukoncitBtn}
              onPress={handleUkoncit}
              disabled={saving}
            >
              {saving && !changingTime ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.ukoncitText}>Ukončit prodej</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            {/* ── Inactive state ── */}
            <TouchableOpacity
              style={styles.mainBtn}
              onPress={() => setModalVisible(true)}
              disabled={saving}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Text style={styles.mainBtnText}>📍 Teď prodávám</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.ctaHint}>
              Vytvoří dočasný stánek na zvolené poloze.
            </Text>
          </>
        )}
      </ScrollView>
    </View>
  );
}

export default function MojeStankyScreen() {
  return (
    <ProtectedRoute>
      <StanekScreenContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6A1B9A' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: 'rgba(255,255,255,0.7)' },

  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center' },
  menuButton: { padding: 8, minWidth: 44 },
  menuIcon: { fontSize: 26, color: '#fff' },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: { minWidth: 44 },

  scrollContent: { flexGrow: 1, padding: 24 },

  // Duration picker (change-time only)
  durationContainer: { marginBottom: 20 },
  durationLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '500',
    marginBottom: 10,
  },
  durationRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  durationBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  durationBtnSelected: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  durationBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  durationBtnTextSelected: { color: '#fff', fontWeight: '700' },

  // Main action button
  mainBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 40,
    alignItems: 'center',
    minHeight: 70,
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mainBtnText: { color: '#fff', fontSize: 20, fontWeight: '700' },

  // Active state card
  aktivniCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 16,
  },
  aktivniTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  aktivniLokace: { fontSize: 15, color: 'rgba(255,255,255,0.85)', marginBottom: 6 },
  aktivniDetail: { fontSize: 17, color: 'rgba(255,255,255,0.9)', marginBottom: 4 },

  ctaHint: {
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Change time
  changeTimeBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  changeTimeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  confirmChangeBtn: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 50,
    justifyContent: 'center',
    marginBottom: 8,
  },
  confirmChangeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginBottom: 12 },
  cancelBtnText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },

  // Stop button
  ukoncitBtn: {
    backgroundColor: '#C62828',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  ukoncitText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
