import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Image,
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
  const { addToList, clearAndAddToList, itemCount } = useShoppingList();
  const [pestitel, setPestitel] = useState<Pestitel | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedMsg, setAddedMsg] = useState('');

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const pestitelData = await fetchPestitelDetail(String(id));
      if (!pestitelData) throw new Error('Farmář nenalezen');
      setPestitel(pestitelData as unknown as Pestitel);

      const produktyData = await fetchPestitelProdukty(String(id));
      const sorted = (produktyData as unknown as Produkt[]).sort((a, b) => {
        return (PRODUCT_ORDER[a.nazev] || 999) - (PRODUCT_ORDER[b.nazev] || 999);
      });
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
    const url = `https://www.google.com/maps/search/?api=1&query=${pestitel.gps_lat},${pestitel.gps_lng}`;
    window.open(url, '_blank');
  };

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
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={s.root}>
      {/* Navbar */}
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.push('/')} style={s.logoBtn}>
          <Text style={s.logo}>🌿 Samopestitele</Text>
        </TouchableOpacity>
        <View style={s.navRight}>
          <TouchableOpacity onPress={() => router.push('/mapa')} style={s.navLink}>
            <Text style={s.navLinkText}>← Mapa farmářů</Text>
          </TouchableOpacity>
          {itemCount > 0 && (
            <TouchableOpacity style={s.cartBtn} onPress={() => router.push('/nakupni-seznam')}>
              <Text style={s.cartBtnText}>🧺 Seznam ({itemCount})</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero photo */}
        {pestitel.foto_url && (
          <Image source={{ uri: pestitel.foto_url }} style={s.heroPhoto} resizeMode="cover" />
        )}

        {/* Main content */}
        <View style={s.contentWrapper}>
          {/* Left column: info + products */}
          <View style={s.mainCol}>
            {/* Farmer info */}
            <View style={s.infoCard}>
              <Text style={s.farmerName}>{pestitel.nazev_farmy}</Text>
              <View style={s.farmerMetaRow}>
                <Text style={s.farmerMeta}>👤 {pestitel.jmeno}</Text>
                <Text style={s.metaSep}>•</Text>
                <Text style={s.farmerMeta}>📍 {pestitel.mesto}</Text>
                {pestitel.telefon && (
                  <>
                    <Text style={s.metaSep}>•</Text>
                    <Text style={s.farmerMeta}>📞 {pestitel.telefon}</Text>
                  </>
                )}
              </View>

              {pestitel.popis && (
                <Text style={s.farmerDesc}>{pestitel.popis}</Text>
              )}

              <View style={s.actionRow}>
                {pestitel.gps_lat && pestitel.gps_lng && (
                  <TouchableOpacity style={s.navigateBtn} onPress={handleNavigate}>
                    <Text style={s.navigateBtnText}>🧭 Navigovat</Text>
                  </TouchableOpacity>
                )}
                {pestitel.telefon && (
                  <TouchableOpacity
                    style={s.callBtn}
                    onPress={() => { window.location.href = `tel:${pestitel.telefon}`; }}
                  >
                    <Text style={s.callBtnText}>📞 Zavolat</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Added to list message */}
            {addedMsg ? (
              <View style={s.addedMsg}>
                <Text style={s.addedMsgText}>✓ {addedMsg}</Text>
              </View>
            ) : null}

            {/* Products */}
            <View style={s.productsSection}>
              <Text style={s.sectionTitle}>🧺 Nabídka produktů ({produkty.length})</Text>
              {produkty.length === 0 ? (
                <View style={s.emptyProducts}>
                  <Text style={s.emptyProductsIcon}>📦</Text>
                  <Text style={s.emptyProductsText}>Zatím žádné produkty</Text>
                </View>
              ) : (
                <View style={s.productsGrid}>
                  {produkty.map(p => (
                    <View key={p.id} style={s.productCard}>
                      {p.foto_url && (
                        <Image source={{ uri: p.foto_url }} style={s.productImg} resizeMode="cover" />
                      )}
                      <View style={s.productBody}>
                        <View style={s.productHeader}>
                          <Text style={s.productName}>{p.nazev}</Text>
                          <Text style={s.productPrice}>
                            {p.cena ? formatCenaJednotka(p.cena, p.jednotka) : `0 Kč/${p.jednotka}`}
                          </Text>
                        </View>
                        {p.popis && (
                          <Text style={s.productDesc} numberOfLines={2}>{p.popis}</Text>
                        )}
                        <TouchableOpacity style={s.addBtn} onPress={() => handleAddToList(p)}>
                          <Text style={s.addBtnText}>+ Do seznamu</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Right column: hours + map */}
          <View style={s.sideCol}>
            {/* Office hours */}
            {pestitel.office_hours && (
              <View style={s.hoursCard}>
                <Text style={s.hoursTitle}>🕐 Otevírací doba</Text>
                {OFFICE_HOURS_DAYS.map(({ key, label }) => {
                  const day = pestitel.office_hours![key];
                  if (!day) return null;
                  return (
                    <View key={key} style={s.hoursRow}>
                      <Text style={s.hoursDay}>{label}</Text>
                      {day.otevreno ? (
                        <Text style={s.hoursTime}>{day.od} – {day.do}</Text>
                      ) : (
                        <Text style={s.hoursClosed}>Zavřeno</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {!pestitel.office_hours && pestitel.casova_dostupnost && (
              <View style={s.hoursCard}>
                <Text style={s.hoursTitle}>🕐 Otevírací doba</Text>
                <Text style={s.hoursFreeText}>{pestitel.casova_dostupnost}</Text>
              </View>
            )}

            {/* Map */}
            {pestitel.gps_lat && pestitel.gps_lng &&
              pestitel.gps_lat !== 0 && pestitel.gps_lng !== 0 && (
              <View style={s.mapCard}>
                <Text style={s.mapTitle}>📍 Poloha</Text>
                {/* @ts-ignore */}
                <iframe
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${pestitel.gps_lng - 0.01},${pestitel.gps_lat - 0.008},${pestitel.gps_lng + 0.01},${pestitel.gps_lat + 0.008}&layer=mapnik&marker=${pestitel.gps_lat},${pestitel.gps_lng}`}
                  style={{ width: '100%', height: 260, border: 'none', borderRadius: 10 }}
                  title="Mapa"
                />
                <TouchableOpacity style={s.fullMapBtn} onPress={handleNavigate}>
                  <Text style={s.fullMapBtnText}>Otevřít v Google Maps →</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Floating list button */}
      {itemCount > 0 && (
        <TouchableOpacity style={s.floatingBtn} onPress={() => router.push('/nakupni-seznam')}>
          <Text style={s.floatingBtnText}>🧺 Můj seznam ({itemCount})</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb', gap: 16 },
  loadingText: { fontSize: 16, color: '#6b7280' },
  errorText: { fontSize: 18, color: '#ef4444' },
  backBtn: { backgroundColor: '#4caf50', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  backBtnText: { color: '#ffffff', fontWeight: '600', fontSize: 15 },

  navbar: {
    backgroundColor: '#4caf50', paddingHorizontal: 40, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  logoBtn: {},
  logo: { fontSize: 18, fontWeight: '800', color: '#ffffff' },
  navRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navLink: {},
  navLinkText: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  cartBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8,
  },
  cartBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  scroll: { flex: 1 },
  heroPhoto: { width: '100%' as any, height: 360 as any, backgroundColor: '#e5e7eb' },

  contentWrapper: {
    maxWidth: 1200 as any, width: '100%' as any, alignSelf: 'center' as any,
    padding: 40, flexDirection: 'row', gap: 32, alignItems: 'flex-start' as any,
  },
  mainCol: { flex: 1, gap: 24 },
  sideCol: { width: 320 as any, gap: 20 },

  infoCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  farmerName: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 10 },
  farmerMetaRow: { flexDirection: 'row', flexWrap: 'wrap' as any, alignItems: 'center', gap: 6, marginBottom: 16 },
  farmerMeta: { fontSize: 14, color: '#6b7280' },
  metaSep: { fontSize: 14, color: '#d1d5db' },
  farmerDesc: { fontSize: 15, color: '#374151', lineHeight: 24, marginBottom: 16 },
  actionRow: { flexDirection: 'row', gap: 12 },
  navigateBtn: {
    flex: 1, backgroundColor: '#3b82f6', paddingVertical: 12, borderRadius: 10, alignItems: 'center',
  },
  navigateBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  callBtn: {
    flex: 1, backgroundColor: '#f0fdf4', paddingVertical: 12, borderRadius: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#4caf50',
  },
  callBtnText: { color: '#166534', fontSize: 14, fontWeight: '600' },

  addedMsg: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#4caf50',
  },
  addedMsgText: { color: '#166534', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  productsSection: { gap: 16 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  emptyProducts: { alignItems: 'center', padding: 40 },
  emptyProductsIcon: { fontSize: 48, marginBottom: 12 },
  emptyProductsText: { fontSize: 16, color: '#9ca3af' },
  productsGrid: { gap: 16 },

  productCard: {
    backgroundColor: '#ffffff', borderRadius: 14, overflow: 'hidden',
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  productImg: { width: '100%' as any, height: 180 as any, backgroundColor: '#f3f4f6' },
  productBody: { padding: 20 },
  productHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  productName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 12 },
  productPrice: { fontSize: 16, fontWeight: '700', color: '#f59e0b' },
  productDesc: { fontSize: 14, color: '#6b7280', lineHeight: 20, marginBottom: 12 },
  addBtn: {
    backgroundColor: '#1a1a1a', paddingVertical: 10, paddingHorizontal: 20,
    borderRadius: 8, alignSelf: 'flex-start' as any,
  },
  addBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },

  hoursCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 20,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  hoursTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },
  hoursRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  hoursDay: { fontSize: 13, color: '#374151', fontWeight: '500', width: 80 as any },
  hoursTime: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  hoursClosed: { fontSize: 13, color: '#9ca3af' },
  hoursFreeText: { fontSize: 14, color: '#374151', lineHeight: 22 },

  mapCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    gap: 12,
  },
  mapTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  fullMapBtn: {
    backgroundColor: '#f0fdf4', borderRadius: 8, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  fullMapBtnText: { color: '#166534', fontSize: 13, fontWeight: '600' },

  floatingBtn: {
    position: 'absolute' as any, bottom: 24, left: '50%' as any,
    backgroundColor: '#1a1a1a', paddingHorizontal: 28, paddingVertical: 16,
    borderRadius: 14, transform: [{ translateX: -100 }],
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  floatingBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
});
