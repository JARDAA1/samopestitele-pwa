import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, ActivityIndicator
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
    if (window.confirm('Opravdu se chcete odhlásit?')) doLogout();
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
      <View style={[styles.pageWrapper, styles.center]}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  const displayName = farmar?.nazev_farmy || farmar?.jmeno || 'Moje farma';
  const farmNumber = farmar?.farm_number || profil?.farm_number || '';
  const locationText = profil?.mesto
    ? profil.adresa ? `${profil.adresa}, ${profil.mesto}` : profil.mesto
    : null;

  return (
    <View style={styles.pageWrapper}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInner}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Můj profil</Text>
          <View style={styles.backButton} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.contentWrapper}>

          {/* ── Content card ─────────────────────────────────────────── */}
          <View style={styles.contentCard}>

            {/* ── Identity section ──────────────────────────────────── */}
            <View style={styles.identitySection}>
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

            {/* ── Completeness bar ──────────────────────────────────── */}
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

            {/* ── Prodej ────────────────────────────────────────────── */}
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

            {/* ── Přihlášení & Bezpečnost ───────────────────────────── */}
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

            {/* ── Účet ──────────────────────────────────────────────── */}
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

          </View>

          <View style={{ height: 48 }} />
        </View>
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
  pageWrapper: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Header
  header: {
    height: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'center',
  },
  headerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  backButton: {
    padding: 6,
    width: 70,
  },
  backButtonText: {
    color: '#4caf50',
    fontSize: 14,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
  },

  // Scroll & centering
  scroll: {
    paddingTop: 32,
    paddingBottom: 32,
    paddingHorizontal: 16,
  },
  contentWrapper: {
    maxWidth: 680,
    width: '100%',
    alignSelf: 'center',
  },

  // Main content card
  contentCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    padding: 24,
  },

  // Identity section
  identitySection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  photoWrapper: {
    marginRight: 16,
  },
  photo: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: '#4caf50',
  },
  photoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f1f8f1',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#4caf50',
  },
  photoPlaceholderEmoji: {
    fontSize: 40,
  },
  identityInfo: {
    flex: 1,
  },
  farmName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 30,
  },
  farmNumberBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  farmNumberText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4caf50',
    letterSpacing: 1,
  },
  locationLine: {
    fontSize: 13,
    color: '#6b7280',
  },

  // Completeness
  completenessCard: {
    backgroundColor: '#f1f8f1',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#c8e6c9',
    padding: 16,
    marginBottom: 24,
  },
  completenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  completenessTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  completenessPercent: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4caf50',
  },
  completenessTrack: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  completenessBar: {
    height: 6,
    backgroundColor: '#4caf50',
    borderRadius: 3,
  },
  completenessHint: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 1.2,
    marginBottom: 8,
    marginTop: 4,
    marginLeft: 2,
  },

  // Section card
  sectionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
    overflow: 'hidden',
  },

  // Setting row
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  settingRowLast: {
    borderBottomWidth: 0,
  },
  settingIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#e8f5e9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  logoutIconCircle: {
    backgroundColor: '#fef2f2',
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
    color: '#1a1a1a',
  },
  settingSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  settingChevron: {
    fontSize: 22,
    color: '#d1d5db',
    marginLeft: 6,
  },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
});
