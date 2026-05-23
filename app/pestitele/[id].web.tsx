import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Image, useWindowDimensions, Linking,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  fetchPestitelDetail,
  fetchPestitelProdukty,
} from '@/features/farmari/services/farmariService';
import { formatCenaJednotka } from '../_utils/formatKc';
import { useShoppingList } from '../_utils/cartContext';

interface DaySchedule { otevreno: boolean; od: string; do: string; }
interface OfficeHours { po?: DaySchedule; ut?: DaySchedule; st?: DaySchedule; ct?: DaySchedule; pa?: DaySchedule; so?: DaySchedule; ne?: DaySchedule; }
interface Pestitel {
  id: number;
  nazev_farmy: string;
  jmeno: string;
  mesto: string;
  adresa: string | null;
  popis: string | null;
  telefon: string;
  email?: string | null;
  gps_lat?: number;
  gps_lng?: number;
  foto_url?: string | null;
  office_hours?: OfficeHours | null;
  casova_dostupnost?: string | null;
}
interface Produkt {
  id: number;
  nazev: string;
  popis: string | null;
  cena: number;
  jednotka: string;
  dostupnost: boolean;
  foto_url: string | null;
}

const OFFICE_HOURS_DAYS: { key: keyof OfficeHours; label: string }[] = [
  { key: 'po', label: 'Pondělí' },
  { key: 'ut', label: 'Úterý' },
  { key: 'st', label: 'Středa' },
  { key: 'ct', label: 'Čtvrtek' },
  { key: 'pa', label: 'Pátek' },
  { key: 'so', label: 'Sobota' },
  { key: 'ne', label: 'Neděle' },
];

const PRODUCT_ORDER: Record<string, number> = {
  Brambory: 1, Cibule: 2, Rajčata: 4, Paprika: 5, Okurky: 6, Česnek: 7,
  Saláty: 8, Cuketa: 9, Dýně: 10, Jablka: 11, Jahody: 12,
};

export default function PestitelDetailScreen() {
  const { id } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const { addToList, clearAndAddToList, itemCount } = useShoppingList();
  const [pestitel, setPestitel] = useState<Pestitel | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedMsg, setAddedMsg] = useState('');

  const isMobile = width < 768;

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const pestitelData = await fetchPestitelDetail(String(id));
      if (!pestitelData) throw new Error('Farmář nenalezen');
      setPestitel(pestitelData as unknown as Pestitel);
      const produktyData = await fetchPestitelProdukty(String(id));
      const sorted = (produktyData as unknown as Produkt[]).sort((a, b) =>
        (PRODUCT_ORDER[a.nazev] || 999) - (PRODUCT_ORDER[b.nazev] || 999)
      );
      setProdukty(sorted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToList = (produkt: Produkt) => {
    if (!pestitel) return;
    const item = {
      produkt_id: produkt.id,
      nazev: produkt.nazev,
      cena: produkt.cena,
      jednotka: produkt.jednotka,
      pestitelNazev: pestitel.nazev_farmy,
      pestitelId: pestitel.id,
      pestitelTelefon: pestitel.telefon,
      pestitelMesto: pestitel.mesto,
      mnozstvi: 1,
    };
    const result = addToList(item);
    if (result.blocked) {
      if (window.confirm(`Máte produkty od ${result.existingFarmerNazev}. Vymazat a přidat produkty od ${pestitel.nazev_farmy}?`)) {
        clearAndAddToList(item);
        setAddedMsg(`${produkt.nazev} přidán do seznamu`);
      }
    } else {
      setAddedMsg(`${produkt.nazev} přidán do seznamu`);
    }
    setTimeout(() => setAddedMsg(''), 2500);
  };

  const handleNavigate = () => {
    if (!pestitel?.gps_lat || !pestitel?.gps_lng) return;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${pestitel.gps_lat},${pestitel.gps_lng}`, '_blank');
  };

  const initials = pestitel
    ? (pestitel.nazev_farmy || pestitel.jmeno || '?')[0].toUpperCase()
    : '?';

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={s.loadingText}>Načítám farmáře...</Text>
      </View>
    );
  }

  if (!pestitel) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Farmář nebyl nalezen</Text>
        <TouchableOpacity style={s.backBtnErr} onPress={() => router.back()}>
          <Text style={s.backBtnErrText}>← Zpět</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasGps = !!(pestitel.gps_lat && pestitel.gps_lng && pestitel.gps_lat !== 0 && pestitel.gps_lng !== 0);

  /* ─────────── MOBILE LAYOUT ─────────── */
  if (isMobile) {
    return (
      <View style={s.root}>
        {/* 1. Header */}
        <View style={s.mHeader}>
          <TouchableOpacity onPress={() => router.back()} style={s.mBackBtn}>
            <Text style={s.mBackBtnText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={s.mHeaderTitle} numberOfLines={1}>{pestitel.nazev_farmy}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

          {/* 2. Profil sekce */}
          <View style={s.mProfileSection}>
            <View style={s.mAvatar}>
              <Text style={s.mAvatarText}>{initials}</Text>
            </View>
            <Text style={s.mFarmName}>{pestitel.nazev_farmy}</Text>
            {pestitel.mesto ? <Text style={s.mFarmCity}>📍 {pestitel.mesto}</Text> : null}

            {/* 3 tlačítka */}
            <View style={s.mBtnRow}>
              {pestitel.telefon ? (
                <TouchableOpacity
                  style={s.mBtnGreen}
                  onPress={() => Linking.openURL(`tel:${pestitel.telefon}`)}
                >
                  <Text style={s.mBtnGreenText}>📞 Zavolat</Text>
                </TouchableOpacity>
              ) : null}
              {pestitel.email ? (
                <TouchableOpacity
                  style={s.mBtnWhite}
                  onPress={() => Linking.openURL(`mailto:${pestitel.email}`)}
                >
                  <Text style={s.mBtnWhiteText}>✉️ Email</Text>
                </TouchableOpacity>
              ) : null}
              {hasGps ? (
                <TouchableOpacity style={s.mBtnWhite} onPress={handleNavigate}>
                  <Text style={s.mBtnWhiteText}>🧭 Navigovat</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {/* 3. Popis */}
          {pestitel.popis ? (
            <View style={s.mCard}>
              <Text style={s.mCardText}>{pestitel.popis}</Text>
            </View>
          ) : null}

          {/* 4. Kontakt */}
          <View style={s.mCard}>
            <Text style={s.mCardTitle}>Kontakt</Text>
            {pestitel.telefon ? (
              <TouchableOpacity onPress={() => Linking.openURL(`tel:${pestitel.telefon}`)}>
                <Text style={s.mContactRow}>📞 {pestitel.telefon}</Text>
              </TouchableOpacity>
            ) : null}
            {pestitel.email ? (
              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${pestitel.email}`)}>
                <Text style={s.mContactRow}>✉️ {pestitel.email}</Text>
              </TouchableOpacity>
            ) : null}
            {(pestitel.adresa || pestitel.mesto) ? (
              <Text style={s.mContactRow}>📍 {[pestitel.adresa, pestitel.mesto].filter(Boolean).join(', ')}</Text>
            ) : null}
          </View>

          {/* 5. Mapa + trasa */}
          {hasGps ? (
            <View style={s.mCard}>
              <Text style={s.mCardTitle}>📍 Poloha</Text>
              {/* @ts-ignore */}
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${pestitel.gps_lng! - 0.01},${pestitel.gps_lat! - 0.008},${pestitel.gps_lng! + 0.01},${pestitel.gps_lat! + 0.008}&layer=mapnik&marker=${pestitel.gps_lat},${pestitel.gps_lng}`}
                style={{ width: '100%', height: 200, border: 'none', borderRadius: 8, display: 'block' }}
                title="Mapa"
              />
              <TouchableOpacity style={s.mNavBtn} onPress={handleNavigate}>
                <Text style={s.mNavBtnText}>🗺️ Zobrazit cestu</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {/* Produkty */}
          {produkty.length > 0 && (
            <View style={[s.mCard, { marginBottom: 32 }]}>
              <Text style={s.mCardTitle}>🧺 Nabídka ({produkty.length})</Text>
              {addedMsg ? (
                <View style={s.addedMsg}><Text style={s.addedMsgText}>✓ {addedMsg}</Text></View>
              ) : null}
              {produkty.map(p => (
                <View key={p.id} style={s.mProductRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.mProductName}>{p.nazev}</Text>
                    {p.popis ? <Text style={s.mProductDesc} numberOfLines={1}>{p.popis}</Text> : null}
                  </View>
                  <Text style={s.mProductPrice}>
                    {p.cena ? formatCenaJednotka(p.cena, p.jednotka) : `0 Kč/${p.jednotka}`}
                  </Text>
                  <TouchableOpacity style={s.mAddBtn} onPress={() => handleAddToList(p)}>
                    <Text style={s.mAddBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

        </ScrollView>
      </View>
    );
  }

  /* ─────────── DESKTOP LAYOUT ─────────── */
  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.dHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.dBackBtn}>
          <Text style={s.dBackBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.dHeaderTitle}>{pestitel.nazev_farmy}</Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.dContent}>

          {/* LEVÝ SLOUPEC */}
          <View style={s.dLeftCol}>

            {/* Profilová karta */}
            <View style={s.dCard}>
              <View style={s.dAvatar}>
                <Text style={s.dAvatarText}>{initials}</Text>
              </View>
              <Text style={s.dFarmName}>{pestitel.nazev_farmy}</Text>
              {pestitel.mesto ? <Text style={s.dFarmCity}>{pestitel.mesto}</Text> : null}

              <View style={s.dBtnRow}>
                {pestitel.telefon ? (
                  <TouchableOpacity style={s.dBtnGreen} onPress={() => Linking.openURL(`tel:${pestitel.telefon}`)}>
                    <Text style={s.dBtnGreenText}>📞 Zavolat</Text>
                  </TouchableOpacity>
                ) : null}
                {pestitel.email ? (
                  <TouchableOpacity style={s.dBtnWhite} onPress={() => Linking.openURL(`mailto:${pestitel.email}`)}>
                    <Text style={s.dBtnWhiteText}>✉️ Email</Text>
                  </TouchableOpacity>
                ) : null}
                {hasGps ? (
                  <TouchableOpacity style={s.dBtnWhite} onPress={handleNavigate}>
                    <Text style={s.dBtnWhiteText}>🗺️ Navigovat</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>

            {/* Kontaktní karta */}
            <View style={[s.dCard, { marginTop: 16 }]}>
              <Text style={s.dCardTitle}>Kontakt</Text>
              {pestitel.telefon ? (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${pestitel.telefon}`)}>
                  <Text style={s.dContactRow}>📞 {pestitel.telefon}</Text>
                </TouchableOpacity>
              ) : null}
              {pestitel.email ? (
                <TouchableOpacity onPress={() => Linking.openURL(`mailto:${pestitel.email}`)}>
                  <Text style={s.dContactRow}>✉️ {pestitel.email}</Text>
                </TouchableOpacity>
              ) : null}
              {(pestitel.adresa || pestitel.mesto) ? (
                <Text style={s.dContactRow}>
                  📍 {[pestitel.adresa, pestitel.mesto].filter(Boolean).join(', ')}
                </Text>
              ) : null}
            </View>

            {/* Popis karta */}
            {pestitel.popis ? (
              <View style={[s.dCard, { marginTop: 16 }]}>
                <Text style={s.dCardTitle}>O farmě</Text>
                <Text style={s.dDescText}>{pestitel.popis}</Text>
              </View>
            ) : null}

          </View>

          {/* PRAVÝ SLOUPEC */}
          <View style={s.dRightCol}>

            {/* Mapa */}
            {hasGps ? (
              <View style={s.dCard}>
                {/* @ts-ignore */}
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${pestitel.gps_lng! - 0.012},${pestitel.gps_lat! - 0.009},${pestitel.gps_lng! + 0.012},${pestitel.gps_lat! + 0.009}&layer=mapnik&marker=${pestitel.gps_lat},${pestitel.gps_lng}`}
                  style={{ width: '100%', height: 320, border: 'none', borderRadius: 12, display: 'block' }}
                  title="Mapa"
                />
                <TouchableOpacity style={s.dNavBtn} onPress={handleNavigate}>
                  <Text style={s.dNavBtnText}>🗺️ Zobrazit cestu v Google Maps</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Produkty */}
            {produkty.length > 0 ? (
              <View style={[s.dCard, { marginTop: 16 }]}>
                <Text style={s.dCardTitle}>🧺 Nabídka ({produkty.length})</Text>
                {addedMsg ? (
                  <View style={s.addedMsg}><Text style={s.addedMsgText}>✓ {addedMsg}</Text></View>
                ) : null}
                <View style={s.dProductGrid}>
                  {produkty.map(p => (
                    <TouchableOpacity key={p.id} style={s.dProductCard} onPress={() => handleAddToList(p)} activeOpacity={0.85}>
                      <Text style={s.dProductEmoji}>🌿</Text>
                      <Text style={s.dProductName}>{p.nazev}</Text>
                      <Text style={s.dProductPrice}>
                        {p.cena ? formatCenaJednotka(p.cena, p.jednotka) : `0 Kč/${p.jednotka}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

          </View>
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f5f5' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', gap: 16 },
  loadingText: { fontSize: 16, color: '#6b7280' },
  errorText: { fontSize: 18, color: '#ef4444' },
  backBtnErr: { backgroundColor: '#4caf50', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backBtnErrText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },

  /* ── Mobile ── */
  mHeader: {
    backgroundColor: '#4caf50', paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  mBackBtn: { paddingHorizontal: 4, paddingVertical: 4, minWidth: 60 },
  mBackBtnText: { fontSize: 15, color: '#ffffff', fontWeight: '600' },
  mHeaderTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff', flex: 1, textAlign: 'center', marginHorizontal: 8 },

  mProfileSection: {
    backgroundColor: '#ffffff', padding: 20, alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  mAvatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#4caf50',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  mAvatarText: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  mFarmName: { fontSize: 22, fontWeight: '800', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  mFarmCity: { fontSize: 14, color: '#6b7280', marginBottom: 16 },

  mBtnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' as any, justifyContent: 'center' },
  mBtnGreen: {
    backgroundColor: '#4caf50', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 18,
  },
  mBtnGreenText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  mBtnWhite: {
    backgroundColor: '#ffffff', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 18,
    borderWidth: 1, borderColor: '#d1d5db',
  },
  mBtnWhiteText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  mCard: {
    backgroundColor: '#ffffff', marginHorizontal: 12, marginTop: 12,
    borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    overflow: 'hidden' as any,
  },
  mCardTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  mCardText: { fontSize: 14, color: '#374151', lineHeight: 22 },
  mContactRow: { fontSize: 14, color: '#374151', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6' },

  mNavBtn: {
    backgroundColor: '#4caf50', borderRadius: 10,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  mNavBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  mProductRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
  },
  mProductName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  mProductDesc: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  mProductPrice: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },
  mAddBtn: {
    backgroundColor: '#1a1a1a', width: 32, height: 32,
    borderRadius: 8, alignItems: 'center', justifyContent: 'center',
  },
  mAddBtnText: { color: '#ffffff', fontSize: 18, fontWeight: '700' },

  /* ── Desktop ── */
  scroll: { flex: 1 },

  dHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  dBackBtn: { paddingVertical: 4, paddingHorizontal: 4, minWidth: 80 },
  dBackBtnText: { fontSize: 15, color: '#4caf50', fontWeight: '600' },
  dHeaderTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', flex: 1 },

  dContent: {
    maxWidth: 1100 as any, width: '100%' as any, alignSelf: 'center' as any,
    flexDirection: 'row', gap: 24, padding: 32, alignItems: 'flex-start' as any,
  },
  dLeftCol: { width: 400, flexShrink: 0 },
  dRightCol: { flex: 1, minWidth: 0 },

  dCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    overflow: 'hidden' as any,
  },
  dCardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },

  dAvatar: {
    width: 80, height: 80, borderRadius: 40, backgroundColor: '#4caf50',
    alignItems: 'center', justifyContent: 'center', marginBottom: 14, alignSelf: 'center' as any,
  },
  dAvatarText: { fontSize: 32, fontWeight: '700', color: '#ffffff' },
  dFarmName: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  dFarmCity: { fontSize: 16, color: '#6b7280', textAlign: 'center', marginBottom: 18 },

  dBtnRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' as any, justifyContent: 'center' },
  dBtnGreen: {
    backgroundColor: '#4caf50', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
  },
  dBtnGreenText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  dBtnWhite: {
    backgroundColor: '#ffffff', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#d1d5db',
  },
  dBtnWhiteText: { fontSize: 14, fontWeight: '600', color: '#374151' },

  dContactRow: {
    fontSize: 14, color: '#374151', paddingVertical: 8,
    borderBottomWidth: 0.5, borderBottomColor: '#f3f4f6',
  },
  dDescText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  dNavBtn: {
    backgroundColor: '#4caf50', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center', marginTop: 12,
  },
  dNavBtnText: { fontSize: 15, fontWeight: '700', color: '#ffffff' },

  dProductGrid: {
    flexDirection: 'row', flexWrap: 'wrap' as any, gap: 12, marginTop: 4,
  },
  dProductCard: {
    backgroundColor: '#f9fafb', borderRadius: 12, padding: 14,
    borderWidth: 0.5, borderColor: '#e5e7eb',
    alignItems: 'center', minWidth: 120, flex: 1,
  },
  dProductEmoji: { fontSize: 28, marginBottom: 6 },
  dProductName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: 4 },
  dProductPrice: { fontSize: 13, fontWeight: '700', color: '#f59e0b' },

  addedMsg: { backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#4caf50', marginBottom: 12 },
  addedMsgText: { color: '#166534', fontSize: 14, fontWeight: '600', textAlign: 'center' },
});
