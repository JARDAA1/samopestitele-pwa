import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useCart } from '../_utils/cartContext';
import {
  createObjednavka,
  createObjednavkyPolozky,
  deleteObjednavka,
} from '@/features/objednavky/services/objednavkyService';
import { getAktivniProdejniMistaFarmare, ProdejniMisto } from '../_utils/locationService';

interface CartItem {
  produkt_id: number;
  nazev: string;
  cena: number;
  jednotka: string;
  pestitelId: number;
  pestitelNazev: string;
  pestitelTelefon: string;
  mnozstvi?: number;
}

export default function KosikScreen() {
  const { items, clearCart, updateQuantity, removeItem, farmerId } = useCart() as any;
  const cartItems: CartItem[] = items || [];

  const [jmeno, setJmeno] = useState('');
  const [telefon, setTelefon] = useState('');
  const [poznamka, setPoznamka] = useState('');
  const [datumVyzvednuti, setDatumVyzvednuti] = useState('');
  const [prodejniMista, setProdejniMista] = useState<ProdejniMisto[]>([]);
  const [selectedMisto, setSelectedMisto] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMista, setLoadingMista] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const farmerItem = cartItems[0];
  const farmerName = farmerItem?.pestitelNazev || '';
  const currentFarmerId = farmerId || farmerItem?.pestitelId;

  useEffect(() => {
    if (!currentFarmerId) return;
    setLoadingMista(true);
    getAktivniProdejniMistaFarmare(Number(currentFarmerId))
      .then((data: ProdejniMisto[]) => {
        setProdejniMista(data || []);
        if (data && data.length === 1) {
          setSelectedMisto(data[0].id);
        }
      })
      .catch(console.error)
      .finally(() => setLoadingMista(false));
  }, [currentFarmerId]);

  const celkovaCena = cartItems.reduce(
    (sum, item) => sum + (item.cena || 0) * (item.mnozstvi || 1), 0
  );

  const handleSubmit = async () => {
    setErrorMsg('');
    if (cartItems.length === 0) { setErrorMsg('Košík je prázdný'); return; }
    if (!jmeno.trim()) { setErrorMsg('Zadejte jméno'); return; }
    if (!telefon.trim()) { setErrorMsg('Zadejte telefon'); return; }
    if (prodejniMista.length > 1 && selectedMisto === null) {
      setErrorMsg('Vyberte prodejní místo');
      return;
    }

    setLoading(true);
    let objednavkaId: string | null = null;
    try {
      const anonCode = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

      const mistoId = selectedMisto ?? (prodejniMista[0]?.id ?? null);

      objednavkaId = await createObjednavka({
        pestitel_id: Number(currentFarmerId),
        prodejni_misto_id: mistoId,
        zakaznik_jmeno: jmeno.trim(),
        zakaznik_telefon: telefon.trim(),
        poznamka: poznamka.trim() || null,
        datum_vyzvednuti: datumVyzvednuti || null,
        celkova_cena: celkovaCena,
        anon_customer_code: anonCode,
        stav: 'cekajici_na_potvrzeni',
      });

      await createObjednavkyPolozky(
        objednavkaId!,
        cartItems.map(item => ({
          produkt_id: item.produkt_id,
          nazev_produktu: item.nazev,
          mnozstvi: item.mnozstvi || 1,
          jednotka: item.jednotka,
          cena: item.cena,
        }))
      );

      clearCart?.();
      setSuccessMsg(`Objednávka odeslána! Kód: ${anonCode}`);
      setJmeno('');
      setTelefon('');
      setPoznamka('');
      setDatumVyzvednuti('');
    } catch (e) {
      console.error(e);
      if (objednavkaId) {
        try { await deleteObjednavka(objednavkaId); } catch { /* ignore */ }
      }
      setErrorMsg('Nepodařilo se odeslat objednávku. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  };

  if (successMsg) {
    return (
      <View style={s.root}>
        <View style={s.navbar}>
          <TouchableOpacity onPress={() => router.push('/')} style={s.logoBtn}>
            <Text style={s.logo}>🌿 Samopestitele</Text>
          </TouchableOpacity>
        </View>
        <View style={s.successContainer}>
          <View style={s.successCard}>
            <Text style={s.successIcon}>✅</Text>
            <Text style={s.successTitle}>Objednávka odeslána!</Text>
            <Text style={s.successText}>{successMsg}</Text>
            <Text style={s.successHint}>
              Farmář dostane upozornění a brzy potvrdí vaši objednávku.
            </Text>
            <TouchableOpacity style={s.continueBtn} onPress={() => router.push('/mapa')}>
              <Text style={s.continueBtnText}>Zpět na mapu →</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ordersBtn} onPress={() => router.push('/moje-objednavky')}>
              <Text style={s.ordersBtnText}>Moje objednávky</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (!cartItems.length) {
    return (
      <View style={s.root}>
        <View style={s.navbar}>
          <TouchableOpacity onPress={() => router.push('/')} style={s.logoBtn}>
            <Text style={s.logo}>🌿 Samopestitele</Text>
          </TouchableOpacity>
        </View>
        <View style={s.emptyContainer}>
          <Text style={s.emptyIcon}>🛒</Text>
          <Text style={s.emptyTitle}>Košík je prázdný</Text>
          <Text style={s.emptySubtitle}>Přidejte produkty od farmáře.</Text>
          <TouchableOpacity style={s.continueBtn} onPress={() => router.push('/mapa')}>
            <Text style={s.continueBtnText}>Najít farmáře →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.navbar}>
        <TouchableOpacity onPress={() => router.push('/')} style={s.logoBtn}>
          <Text style={s.logo}>🌿 Samopestitele</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={s.navBack}>
          <Text style={s.navBackText}>← Zpět</Text>
        </TouchableOpacity>
      </View>

      <View style={s.pageTitle}>
        <Text style={s.pageTitleText}>🛒 Košík</Text>
        <Text style={s.pageFarmer}>Objednávka od: {farmerName}</Text>
      </View>

      <View style={s.twoCol}>
        {/* Left: cart items */}
        <ScrollView style={s.leftCol} contentContainerStyle={s.leftColContent}
          showsVerticalScrollIndicator={false}>
          <Text style={s.sectionTitle}>Produkty ({cartItems.length})</Text>

          {cartItems.map((item, idx) => (
            <View key={idx} style={s.itemCard}>
              <View style={s.itemInfo}>
                <Text style={s.itemName}>{item.nazev}</Text>
                {item.cena > 0 && (
                  <Text style={s.itemPrice}>{item.cena} Kč / {item.jednotka}</Text>
                )}
              </View>
              <View style={s.itemControls}>
                <View style={s.qtyRow}>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => {
                      const newQty = (item.mnozstvi || 1) - 1;
                      if (newQty <= 0) removeItem?.(item.produkt_id);
                      else updateQuantity?.(item.produkt_id, newQty);
                    }}
                  >
                    <Text style={s.qtyBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={s.qtyValue}>{item.mnozstvi || 1}</Text>
                  <TouchableOpacity
                    style={s.qtyBtn}
                    onPress={() => updateQuantity?.(item.produkt_id, (item.mnozstvi || 1) + 1)}
                  >
                    <Text style={s.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                  <Text style={s.itemUnit}>{item.jednotka}</Text>
                </View>
                {item.cena > 0 && (
                  <Text style={s.itemSubtotal}>
                    = {(item.cena * (item.mnozstvi || 1)).toFixed(0)} Kč
                  </Text>
                )}
              </View>
            </View>
          ))}

          {/* Prodejní místa */}
          {loadingMista ? (
            <ActivityIndicator color="#4caf50" style={{ marginTop: 16 }} />
          ) : prodejniMista.length > 1 ? (
            <View style={s.mistoSection}>
              <Text style={s.sectionTitle}>Prodejní místo *</Text>
              {prodejniMista.map(misto => (
                <TouchableOpacity
                  key={misto.id}
                  style={[s.mistoOption, selectedMisto === misto.id && s.mistoOptionActive]}
                  onPress={() => setSelectedMisto(Number(misto.id))}
                >
                  <View style={s.mistoRadio}>
                    {selectedMisto === misto.id && <View style={s.mistoRadioDot} />}
                  </View>
                  <View>
                    <Text style={s.mistoName}>{misto.nazev}</Text>
                    {misto.adresa && <Text style={s.mistoAdresa}>{misto.adresa}</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : prodejniMista.length === 1 ? (
            <View style={s.mistoInfoBox}>
              <Text style={s.mistoInfoLabel}>📍 Prodejní místo</Text>
              <Text style={s.mistoInfoValue}>{prodejniMista[0].nazev}</Text>
              {prodejniMista[0].adresa && (
                <Text style={s.mistoInfoAdresa}>{prodejniMista[0].adresa}</Text>
              )}
            </View>
          ) : null}
        </ScrollView>

        {/* Right: order form + summary */}
        <View style={s.rightCol}>
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>Vaše údaje</Text>

            {errorMsg ? (
              <View style={s.errorBanner}>
                <Text style={s.errorText}>⚠️ {errorMsg}</Text>
              </View>
            ) : null}

            <View style={s.inputGroup}>
              <Text style={s.label}>Jméno *</Text>
              <TextInput
                style={s.input}
                value={jmeno}
                onChangeText={setJmeno}
                placeholder="Jan Novák"
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Telefon *</Text>
              <TextInput
                style={s.input}
                value={telefon}
                onChangeText={setTelefon}
                placeholder="+420 123 456 789"
                keyboardType="phone-pad"
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Preferovaný termín vyzvednutí</Text>
              <TextInput
                style={s.input}
                value={datumVyzvednuti}
                onChangeText={setDatumVyzvednuti}
                placeholder="Např. Pátek 16–18 hod"
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Poznámka</Text>
              <TextInput
                style={[s.input, s.inputMultiline]}
                value={poznamka}
                onChangeText={setPoznamka}
                placeholder="Speciální požadavky..."
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={s.divider} />

            {celkovaCena > 0 && (
              <View style={s.totalRow}>
                <Text style={s.totalLabel}>Odhadovaná cena</Text>
                <Text style={s.totalValue}>{celkovaCena} Kč</Text>
              </View>
            )}

            <TouchableOpacity
              style={[s.submitBtn, loading && s.btnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={s.submitBtnText}>Odeslat objednávku →</Text>
              )}
            </TouchableOpacity>

            <Text style={s.submitHint}>
              Farmář objednávku potvrdí SMS nebo telefonem.
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  navbar: {
    backgroundColor: '#ffffff', paddingHorizontal: 40, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  logoBtn: {},
  logo: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  navBack: {},
  navBackText: { fontSize: 14, color: '#4caf50', fontWeight: '600' },

  pageTitle: {
    backgroundColor: '#ffffff', paddingHorizontal: 40, paddingVertical: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  pageTitleText: { fontSize: 26, fontWeight: '800', color: '#1a1a1a' },
  pageFarmer: { fontSize: 14, color: '#6b7280', marginTop: 4 },

  twoCol: {
    flex: 1, flexDirection: 'row',
    maxWidth: 1100 as any, width: '100%' as any, alignSelf: 'center' as any,
    padding: 32, gap: 32, alignItems: 'flex-start' as any,
  },

  leftCol: { flex: 1 },
  leftColContent: { gap: 12, paddingBottom: 48 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 8, marginTop: 8 },

  itemCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  itemPrice: { fontSize: 13, color: '#9ca3af' },
  itemControls: { alignItems: 'flex-end', gap: 4 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  qtyBtnText: { fontSize: 18, color: '#374151', fontWeight: '700' },
  qtyValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', minWidth: 24 as any, textAlign: 'center' },
  itemUnit: { fontSize: 13, color: '#9ca3af' },
  itemSubtotal: { fontSize: 14, fontWeight: '700', color: '#4caf50' },

  mistoSection: { marginTop: 8, gap: 8 },
  mistoOption: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: '#ffffff', borderRadius: 10, borderWidth: 1, borderColor: '#e5e7eb',
  },
  mistoOptionActive: { borderColor: '#4caf50', backgroundColor: '#f0fdf4' },
  mistoRadio: {
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#4caf50',
    alignItems: 'center', justifyContent: 'center',
  },
  mistoRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4caf50' },
  mistoName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  mistoAdresa: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  mistoInfoBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  mistoInfoLabel: { fontSize: 12, color: '#6b7280', fontWeight: '600', marginBottom: 4 },
  mistoInfoValue: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  mistoInfoAdresa: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  rightCol: { width: 380 as any },
  summaryCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 28,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
    gap: 12,
  },
  summaryTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a', marginBottom: 4 },

  errorBanner: {
    backgroundColor: '#fee2e2', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { color: '#991b1b', fontSize: 13, fontWeight: '600', textAlign: 'center' },

  inputGroup: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151' },
  input: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb',
  },
  inputMultiline: { minHeight: 70 as any, textAlignVertical: 'top' as any },

  divider: { height: 1, backgroundColor: '#e5e7eb' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, color: '#6b7280', fontWeight: '500' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#4caf50' },

  submitBtn: {
    backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#4caf50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  submitHint: { fontSize: 12, color: '#9ca3af', textAlign: 'center', lineHeight: 18 },
  btnDisabled: { opacity: 0.6 },

  successContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  successCard: {
    backgroundColor: '#ffffff', borderRadius: 20, padding: 40, alignItems: 'center',
    maxWidth: 440 as any, width: '100%' as any,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4, gap: 12,
  },
  successIcon: { fontSize: 56 },
  successTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a', textAlign: 'center' },
  successText: { fontSize: 15, color: '#4caf50', fontWeight: '600', textAlign: 'center' },
  successHint: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },
  continueBtn: {
    backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 13,
    paddingHorizontal: 28, alignItems: 'center', width: '100%' as any,
  },
  continueBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  ordersBtn: {
    backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 13,
    paddingHorizontal: 28, alignItems: 'center', width: '100%' as any,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  ordersBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, gap: 16 },
  emptyIcon: { fontSize: 64 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  emptySubtitle: { fontSize: 15, color: '#6b7280' },
});
