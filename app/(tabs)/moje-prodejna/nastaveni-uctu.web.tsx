import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { fetchFarmNumber } from '@/features/profil/services/profilService';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna' },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa' },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky' },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

function NastaveniUctuContent() {
  const { farmar, logout } = useFarmarAuth();
  const [farmNumber, setFarmNumber] = useState('');

  useEffect(() => {
    if (!farmar?.id) return;
    fetchFarmNumber(farmar.id)
      .then(n => setFarmNumber(n || ''))
      .catch(console.error);
  }, [farmar]);

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

  return (
    <View style={s.root}>
      {renderSidebar()}

      <ScrollView style={s.main} contentContainerStyle={s.mainContent}
        showsVerticalScrollIndicator={false}>

        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/moje-prodejna')} style={s.backBtn}>
            <Text style={s.backBtnText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Nastavení účtu</Text>
        </View>

        <View style={s.content}>

          {/* Kód farmy */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={s.iconCircle}>
                <Text style={s.iconText}>🔑</Text>
              </View>
              <View>
                <Text style={s.cardTitle}>Přihlašovací kód farmy</Text>
                <Text style={s.cardSubtitle}>Pro přihlášení do Prodejny a Stánků</Text>
              </View>
            </View>

            <View style={s.farmCodeBox}>
              <Text style={s.farmCodeLabel}>Kód farmy</Text>
              <Text style={s.farmCode}>{farmNumber || '...'}</Text>
            </View>

            <Text style={s.hint}>
              Tento kód používáte společně s heslem pro přihlášení do Prodejny a Stánků.
              Nikdy ho nesdílejte s nikým jiným.
            </Text>
          </View>

          {/* Email přístup */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.iconCircle, s.iconCircleBlue]}>
                <Text style={s.iconText}>📧</Text>
              </View>
              <View>
                <Text style={s.cardTitle}>Přístup k účtu</Text>
                <Text style={s.cardSubtitle}>Pro přihlášení do Profilu</Text>
              </View>
            </View>

            <View style={s.infoRow}>
              <Text style={s.infoLabel}>Email</Text>
              <Text style={s.infoValue}>{farmar?.email || 'Neuvedeno'}</Text>
            </View>

            <Text style={s.hint}>
              Email používáte pro přihlášení do Profilu a pro obnovení zapomenutých přihlašovacích údajů.
            </Text>

            <View style={s.divider} />

            <View style={s.securityBox}>
              <Text style={s.securityTitle}>🔒 Bezpečnostní doporučení</Text>
              <View style={s.bulletList}>
                <Text style={s.bullet}>• Nikdy nesdílejte své heslo s nikým jiným</Text>
                <Text style={s.bullet}>• Použijte unikátní heslo, které nepoužíváte jinde</Text>
                <Text style={s.bullet}>• Heslo změňte v případě podezření na zneužití</Text>
                <Text style={s.bullet}>• Pokud zapomenete heslo nebo kód, obnovte přes "Zapomenuté údaje"</Text>
              </View>
            </View>
          </View>

          {/* Akce */}
          <View style={s.card}>
            <View style={s.cardHeader}>
              <View style={[s.iconCircle, s.iconCircleGray]}>
                <Text style={s.iconText}>⚙️</Text>
              </View>
              <View>
                <Text style={s.cardTitle}>Správa účtu</Text>
                <Text style={s.cardSubtitle}>Heslo a kontaktní údaje</Text>
              </View>
            </View>

            <View style={s.actionList}>
              <TouchableOpacity style={s.actionRow} onPress={() => router.push('/profil/zmena-hesla')}>
                <View style={s.actionLeft}>
                  <Text style={s.actionIcon}>🔐</Text>
                  <View>
                    <Text style={s.actionTitle}>Změna hesla</Text>
                    <Text style={s.actionDesc}>Aktualizujte heslo pro profil</Text>
                  </View>
                </View>
                <Text style={s.actionChevron}>›</Text>
              </TouchableOpacity>

              <View style={s.actionDivider} />

              <TouchableOpacity style={s.actionRow} onPress={() => router.push('/profil/zmenit-telefon')}>
                <View style={s.actionLeft}>
                  <Text style={s.actionIcon}>📱</Text>
                  <View>
                    <Text style={s.actionTitle}>Změna telefonního čísla</Text>
                    <Text style={s.actionDesc}>Pro přihlášení do Prodejny</Text>
                  </View>
                </View>
                <Text style={s.actionChevron}>›</Text>
              </TouchableOpacity>

              <View style={s.actionDivider} />

              <TouchableOpacity style={s.actionRow} onPress={() => router.push('/zapomenute-udaje')}>
                <View style={s.actionLeft}>
                  <Text style={s.actionIcon}>🆘</Text>
                  <View>
                    <Text style={s.actionTitle}>Zapomenuté přihlašovací údaje</Text>
                    <Text style={s.actionDesc}>Obnovit heslo nebo kód farmy</Text>
                  </View>
                </View>
                <Text style={s.actionChevron}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Nebezpečná zóna */}
          <View style={[s.card, s.cardDanger]}>
            <View style={s.cardHeader}>
              <View style={[s.iconCircle, s.iconCircleRed]}>
                <Text style={s.iconText}>⚠️</Text>
              </View>
              <View>
                <Text style={s.cardTitle}>Odhlášení</Text>
                <Text style={s.cardSubtitle}>Ukončit relaci na tomto zařízení</Text>
              </View>
            </View>
            <TouchableOpacity style={s.logoutBigBtn} onPress={() => logout && logout()}>
              <Text style={s.logoutBigBtnText}>Odhlásit se</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

export default function NastaveniUctuScreen() {
  return <ProtectedRoute><NastaveniUctuContent /></ProtectedRoute>;
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
  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 40,
    paddingTop: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },

  content: {
    maxWidth: 720 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 40, gap: 20,
  },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 28,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  cardDanger: { borderColor: '#fee2e2' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(76,175,80,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconCircleBlue: { backgroundColor: '#dbeafe' },
  iconCircleGray: { backgroundColor: '#f3f4f6' },
  iconCircleRed: { backgroundColor: '#fee2e2' },
  iconText: { fontSize: 22 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  cardSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  farmCodeBox: {
    backgroundColor: '#f0fdf4', borderRadius: 12, padding: 24,
    alignItems: 'center', borderWidth: 2, borderColor: '#4caf50', marginBottom: 12,
  },
  farmCodeLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 8, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  farmCode: { fontSize: 36, fontWeight: '800', color: '#1a1a1a', letterSpacing: 6 },

  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 12,
  },
  infoLabel: { fontSize: 14, fontWeight: '600', color: '#374151' },
  infoValue: { fontSize: 14, color: '#1a1a1a', fontWeight: '500' },

  hint: { fontSize: 13, color: '#6b7280', lineHeight: 18 },

  divider: { height: 1, backgroundColor: '#e5e7eb', marginVertical: 16 },

  securityBox: {
    backgroundColor: '#fffbeb', borderRadius: 10, padding: 16,
    borderLeftWidth: 3, borderLeftColor: '#f59e0b',
  },
  securityTitle: { fontSize: 13, fontWeight: '700', color: '#92400e', marginBottom: 10 },
  bulletList: { gap: 6 },
  bullet: { fontSize: 13, color: '#78350f', lineHeight: 20 },

  actionList: { gap: 0 },
  actionRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 14,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionIcon: { fontSize: 22 },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  actionDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  actionChevron: { fontSize: 22, color: '#d1d5db', fontWeight: '300' },
  actionDivider: { height: 1, backgroundColor: '#f3f4f6' },

  logoutBigBtn: {
    backgroundColor: '#fef2f2', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: '#fecaca',
  },
  logoutBigBtnText: { fontSize: 15, fontWeight: '700', color: '#dc2626' },
});
