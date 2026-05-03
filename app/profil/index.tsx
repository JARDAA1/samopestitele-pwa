import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, Alert, Platform
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { ProtectedRoute } from '../_utils/ProtectedRoute';
import { fetchProfilFarmara, type ProfilFarmara } from '@/features/profil/services/profilService';

// ─── Pomocné komponenty ────────────────────────────────────────────────────────

function SettingRow({ icon, title, subtitle, onPress, isLast }: {
  icon: string;
  title: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.settingRow, isLast && styles.settingRowLast]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingIconCircle}>
        <Text style={styles.settingIcon}>{icon}</Text>
      </View>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {subtitle ? (
          <Text style={styles.settingSubtitle} numberOfLines={1}>{subtitle}</Text>
        ) : null}
      </View>
      <Text style={styles.settingChevron}>›</Text>
    </TouchableOpacity>
  );
}

// ─── Hlavní obsah ──────────────────────────────────────────────────────────────

function ProfilContent() {
  const { farmar, logout } = useFarmarAuth();
  const [profil, setProfil] = useState<ProfilFarmara | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (farmar?.id) loadProfil();
  }, [farmar?.id]);

  const loadProfil = async () => {
    try {
      const data = await fetchProfilFarmara(farmar!.id);
      setProfil(data);
    } catch (e) {
      console.error('Chyba při načítání profilu:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const doLogout = async () => {
      await logout();
      router.replace('/');
    };
    if (Platform.OS === 'web') {
      if (window.confirm('Opravdu se chcete odhlásit?')) doLogout();
    } else {
      Alert.alert('Odhlásit se', 'Opravdu se chcete odhlásit?', [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Odhlásit', style: 'destructive', onPress: doLogout },
      ]);
    }
  };

  // Completeness
  const completenessItems = [
    { label: 'Fotografie', done: !!profil?.foto_url },
    { label: 'Lokalita', done: !!profil?.mesto },
    { label: 'Dostupnost', done: !!profil?.casova_dostupnost },
    { label: 'Telefon', done: !!(profil?.telefon || farmar?.telefon) },
    { label: 'Heslo/PIN', done: !!(profil?.heslo_hash) },
  ];
  const doneCount = completenessItems.filter(i => i.done).length;
  const completeness = doneCount / completenessItems.length;
  const missingItems = completenessItems.filter(i => !i.done).map(i => i.label);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  const displayName = farmar?.nazev_farmy || farmar?.jmeno || 'Moje farma';
  const farmNumber = farmar?.farm_number || profil?.farm_number || '';
  const locationText = profil?.mesto
    ? profil.adresa ? `${profil.adresa}, ${profil.mesto}` : profil.mesto
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Můj profil</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Identity card ────────────────────────────────────────── */}
        <View style={styles.identityCard}>
          <View style={styles.photoWrapper}>
            {profil?.foto_url ? (
              <Image source={{ uri: profil.foto_url }} style={styles.photo} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Text style={styles.photoPlaceholderEmoji}>👨‍🌾</Text>
              </View>
            )}
          </View>

          <View style={styles.identityInfo}>
            <Text style={styles.farmName} numberOfLines={2}>{displayName}</Text>
            {farmNumber ? (
              <View style={styles.farmNumberBadge}>
                <Text style={styles.farmNumberText}>#{farmNumber}</Text>
              </View>
            ) : null}
            {locationText ? (
              <Text style={styles.locationLine} numberOfLines={1}>📍 {locationText}</Text>
            ) : null}
          </View>
        </View>

        {/* ── Completeness bar ─────────────────────────────────────── */}
        {completeness < 1 && (
          <View style={styles.completenessCard}>
            <View style={styles.completenessHeader}>
              <Text style={styles.completenessTitle}>Dokončenost profilu</Text>
              <Text style={styles.completenessPercent}>{Math.round(completeness * 100)} %</Text>
            </View>
            <View style={styles.completenessTrack}>
              <View style={[styles.completenessBar, { width: `${completeness * 100}%` as any }]} />
            </View>
            {missingItems.length > 0 && (
              <Text style={styles.completenessHint}>
                💡 Chybí: {missingItems.join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* ── Prodej ───────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PRODEJ</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="📍"
            title="Prodejní lokalita"
            subtitle={locationText ?? 'Nenastaveno'}
            onPress={() => router.push('/profil/lokalita')}
          />
          <SettingRow
            icon="🕐"
            title="Dostupnost a kontakt"
            subtitle={
              profil?.casova_dostupnost
                ? profil.casova_dostupnost.substring(0, 50) +
                  (profil.casova_dostupnost.length > 50 ? '…' : '')
                : 'Nenastaveno'
            }
            onPress={() => router.push('/profil/casova-dostupnost')}
          />
          <SettingRow
            icon="📷"
            title="Fotografie farmy"
            subtitle={profil?.foto_url ? '✓ Nahrána' : 'Žádná fotografie'}
            onPress={() => router.push('/profil/foto-farmy')}
            isLast
          />
        </View>

        {/* ── Přihlášení & Bezpečnost ───────────────────────────────── */}
        <Text style={styles.sectionLabel}>PŘIHLÁŠENÍ & BEZPEČNOST</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="🔑"
            title="Změnit heslo"
            subtitle="Heslo pro přihlášení emailem"
            onPress={() => router.push('/profil/zmena-hesla')}
          />
          <SettingRow
            icon="🔢"
            title="Změnit PIN"
            subtitle="PIN pro rychlý přístup ze stánku"
            onPress={() => router.push('/profil/zmenit-pin')}
          />
          <SettingRow
            icon="📱"
            title="Změnit telefon"
            subtitle={profil?.telefon || farmar?.telefon || 'Nenastaveno'}
            onPress={() => router.push('/profil/zmenit-telefon')}
            isLast
          />
        </View>

        {/* ── Účet ─────────────────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>ÚČET</Text>
        <View style={styles.sectionCard}>
          <TouchableOpacity
            style={[styles.settingRow, styles.settingRowLast]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <View style={[styles.settingIconCircle, styles.logoutIconCircle]}>
              <Text style={styles.settingIcon}>🚪</Text>
            </View>
            <Text style={styles.logoutText}>Odhlásit se</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

// ─── Export ────────────────────────────────────────────────────────────────────

export default function ProfilScreen() {
  return (
    <ProtectedRoute>
      <ProfilContent />
    </ProtectedRoute>
  );
}

// ─── Styly ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 6,
    width: 70,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },

  // Scroll
  scroll: {
    paddingHorizontal: 14,
    paddingTop: 16,
  },

  // Identity card
  identityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    padding: 16,
    marginBottom: 14,
  },
  photoWrapper: {
    marginRight: 14,
  },
  photo: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  photoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,152,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,152,0,0.5)',
  },
  photoPlaceholderEmoji: {
    fontSize: 32,
  },
  identityInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    lineHeight: 22,
  },
  farmNumberBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,152,0,0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.5)',
  },
  farmNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FF9800',
    letterSpacing: 1,
  },
  locationLine: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
  },

  // Completeness
  completenessCard: {
    backgroundColor: 'rgba(255,152,0,0.15)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.3)',
    padding: 14,
    marginBottom: 20,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  completenessTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  completenessPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9800',
  },
  completenessTrack: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  completenessBar: {
    height: 6,
    backgroundColor: '#FF9800',
    borderRadius: 3,
  },
  completenessHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1.2,
    marginBottom: 6,
    marginLeft: 4,
  },

  // Section card
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 20,
    overflow: 'hidden',
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,152,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  logoutIconCircle: {
    backgroundColor: 'rgba(244,67,54,0.2)',
  },
  settingIcon: {
    fontSize: 17,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  settingSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 2,
  },
  settingChevron: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.3)',
    marginLeft: 6,
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#ef9a9a',
  },
});
