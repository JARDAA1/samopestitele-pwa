import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerList, type CustomerListItem } from '@/shared/context/CustomerListContext';
import { getOrCreateCustomerId } from '../_utils/customerIdentity';
import { createObjednavka, createObjednavkyPolozky, upsertAnonymniZakaznik } from '@/features/objednavky/services/objednavkyService';
import { fetchPestitelTelefon } from '@/features/profil/services/profilService';
import { saveMojeObjednavka } from '@/shared/utils/mojeObjednavkyStorage';
import { formatKc, formatMnozstvi, getKonverzeFaktor, formatCenaJednotka, getKrokJednotky } from '../_utils/formatKc';

export default function NakupniSeznamScreen() {
  const { items: seznam, addItem, removeItem, clearList } = useCustomerList();
  const [sentFarmarIds, setSentFarmarIds] = useState<Set<string>>(new Set());
  const [vyzvednutiPerFarmar, setVyzvednutiPerFarmar] = useState<Record<string, { datum: string; cas: string }>>({});

  const setVyzvednuti = (farmarId: string, field: 'datum' | 'cas', value: string) => {
    setVyzvednutiPerFarmar(prev => ({
      ...prev,
      [farmarId]: { datum: '', cas: '', ...prev[farmarId], [field]: value },
    }));
  };

  // ── Helpers ──────────────────────────────────────────────────────────────

  const clearAll = () => {
    if (Platform.OS === 'web') {
      if (confirm('Opravdu chcete smazat celý seznam?')) clearList();
    } else {
      Alert.alert('Smazat seznam', 'Opravdu chcete smazat celý seznam?', [
        { text: 'Zrušit', style: 'cancel' },
        { text: 'Smazat', style: 'destructive', onPress: clearList },
      ]);
    }
  };

  const updateMnozstvi = (item: CustomerListItem, direction: 1 | -1) => {
    const step = getKrokJednotky(item.mnozstviJednotka || item.jednotka || 'ks');
    const next = Math.round((item.mnozstvi + direction * step) * 1000) / 1000;
    if (next <= 0) {
      removeItem(item.produktId);
    } else {
      addItem({ ...item, mnozstvi: next });
    }
  };

  const itemTotal = (item: CustomerListItem): number => {
    if (item.cena == null) return 0;
    const f = getKonverzeFaktor(item.mnozstviJednotka || item.jednotka || 'ks', item.jednotka || 'ks');
    return item.cena * item.mnozstvi * f;
  };

  // ── Grouping ──────────────────────────────────────────────────────────────

  const groupedByFarmar = seznam.reduce((acc, item) => {
    if (!acc[item.farmarId]) acc[item.farmarId] = { farmarNazev: item.farmarNazev, items: [] };
    acc[item.farmarId].items.push(item);
    return acc;
  }, {} as Record<string, { farmarNazev: string; items: CustomerListItem[] }>);

  const totalPrice = seznam.reduce((sum, item) => sum + itemTotal(item), 0);

  // ── DB + SMS ──────────────────────────────────────────────────────────────

  const saveOrderToDatabase = async (
    farmarId: string,
    items: CustomerListItem[],
    customerId: { id: string; shortId: string },
    vyzvednuti?: { datum: string; cas: string }
  ) => {
    try {
      const celkovaCena = items.reduce((sum, item) => sum + itemTotal(item), 0);

      let datumVyzvednuti: string | null = null;
      if (vyzvednuti?.datum) {
        const p = vyzvednuti.datum.split('.');
        if (p.length === 3)
          datumVyzvednuti = `${p[2]}-${p[1].padStart(2, '0')}-${p[0].padStart(2, '0')}`;
      }

      const objednavkaId = await createObjednavka({
        pestitel_id: Number(farmarId),
        stav: 'cekajici_na_potvrzeni',
        celkova_cena: celkovaCena,
        zpusob_kontaktu: 'sms',
        datum_vyzvednuti: datumVyzvednuti,
        anon_customer_id: customerId.id,
        anon_customer_code: customerId.shortId,
      });

      await createObjednavkyPolozky(
        objednavkaId,
        items.map((item) => {
          const f = getKonverzeFaktor(item.mnozstviJednotka || item.jednotka || 'ks', item.jednotka || 'ks');
          return {
            produkt_id: Number(item.produktId),
            nazev_produktu: item.produktNazev,
            cena: item.cena || 0,
            mnozstvi: Math.round(item.mnozstvi * f * 1000) / 1000,
            jednotka: item.jednotka || 'ks',
          };
        })
      );

      saveMojeObjednavka({
        id: objednavkaId,
        pestitelId: Number(farmarId),
        pestitelNazev: items[0]?.farmarNazev ?? '',
        celkovaCena: celkovaCena,
        createdAt: new Date().toISOString(),
      });
      upsertAnonymniZakaznik(customerId.id, Number(farmarId));
      return true;
    } catch (e) {
      console.error('Chyba při ukládání objednávky:', e);
      return false;
    }
  };

  const buildSmsText = (farmarId: string, vyzvednuti?: { datum: string; cas: string }) => {
    const group = groupedByFarmar[farmarId];
    let txt = `Dobrý den,\nmám zájem o:\n\n`;
    group.items.forEach((item) => {
      txt += `• ${item.produktNazev} - ${formatMnozstvi(item.mnozstvi)} ${item.mnozstviJednotka || item.jednotka || 'ks'}\n`;
    });
    const v = [vyzvednuti?.datum, vyzvednuti?.cas].filter(Boolean).join(' ');
    if (v) txt += `\nPreferované vyzvednutí: ${v}\n`;
    txt += `\nDěkuji za odpověď.`;
    return txt;
  };

  const openSmsApp = (telefon: string, txt: string) => {
    const isIOS =
      Platform.OS === 'ios' ||
      (Platform.OS === 'web' && /iPad|iPhone|iPod/.test(navigator.userAgent));
    window.location.href = isIOS
      ? telefon ? `sms:${telefon}&body=${encodeURIComponent(txt)}` : `sms:&body=${encodeURIComponent(txt)}`
      : telefon ? `sms:${telefon}?body=${encodeURIComponent(txt)}` : `sms:?body=${encodeURIComponent(txt)}`;
  };

  // Odeslání SMS jednomu farmáři (pro případ více farmářů)
  const sendSmsToFarmar = async (farmarId: string) => {
    const customerId = await getOrCreateCustomerId();
    const vyzvednuti = vyzvednutiPerFarmar[farmarId];
    await saveOrderToDatabase(farmarId, groupedByFarmar[farmarId].items, customerId, vyzvednuti);
    const telefon = (await fetchPestitelTelefon(farmarId)) || '';
    const txt = buildSmsText(farmarId, vyzvednuti);
    setSentFarmarIds(prev => new Set([...prev, farmarId]));
    openSmsApp(telefon, txt);
  };

  // Odeslání SMS — 1 farmář (původní chování)
  const sendSms = async () => {
    const farmarIds = Object.keys(groupedByFarmar);
    const customerId = await getOrCreateCustomerId();
    const vyzvednuti = vyzvednutiPerFarmar[farmarIds[0]];
    await saveOrderToDatabase(farmarIds[0], groupedByFarmar[farmarIds[0]].items, customerId, vyzvednuti);
    const telefon = (await fetchPestitelTelefon(farmarIds[0])) || '';
    const txt = buildSmsText(farmarIds[0], vyzvednuti);
    clearList();
    openSmsApp(telefon, txt);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* ── Compact header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.headerBack}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Nákupní seznam</Text>

        {seznam.length > 0 ? (
          <TouchableOpacity
            onPress={clearAll}
            style={styles.headerBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.headerClear}>Smazat</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* ── Empty state ── */}
      {seznam.length === 0 ? (
        <View style={styles.emptyWrap} testID="order-success">
          <Text style={styles.emptyIcon}>🧺</Text>
          <Text style={styles.emptyTitle}>Seznam je prázdný</Text>
          <Text style={styles.emptyText}>
            Přidejte produkty od farmářů kliknutím na + u produktu.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/mapa')}>
            <Text style={styles.emptyBtnText}>Hledat farmáře</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {/* ── Scrollable product list (dominant) ── */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(groupedByFarmar).map(([farmarId, group]) => {
              const isSent = sentFarmarIds.has(farmarId);
              const isMulti = Object.keys(groupedByFarmar).length > 1;
              return (
              <View key={farmarId} style={styles.farmarSection}>
                {/* Section header */}
                <TouchableOpacity
                  style={styles.farmarHeader}
                  onPress={() => router.push(`/farmar/${farmarId}`)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.farmarName}>{group.farmarNazev}</Text>
                  <Text style={styles.farmarArrow}>›</Text>
                </TouchableOpacity>

                {/* Products */}
                {group.items.map((item) => {
                  const total = itemTotal(item);
                  const unitLabel = item.mnozstviJednotka || item.jednotka || 'ks';
                  return (
                    <View key={item.produktId} style={styles.produktRow}>
                      {/* Left: name + unit price */}
                      <View style={styles.produktInfo}>
                        <Text style={styles.produktName} numberOfLines={1}>
                          {item.produktNazev}
                        </Text>
                        {item.cena != null && (
                          <Text style={styles.produktUnitPrice}>
                            {item.jednotka
                              ? formatCenaJednotka(item.cena, item.jednotka)
                              : `${formatKc(item.cena)} Kč`}
                          </Text>
                        )}
                      </View>

                      {/* Right: qty controls + total */}
                      <View style={styles.produktControls}>
                        <View style={styles.qtyRow}>
                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateMnozstvi(item, -1)}
                            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          >
                            <Text style={styles.qtyBtnText}>−</Text>
                          </TouchableOpacity>

                          <Text style={styles.qtyValue}>
                            {formatMnozstvi(item.mnozstvi)}{'\u202F'}{unitLabel}
                          </Text>

                          <TouchableOpacity
                            style={styles.qtyBtn}
                            onPress={() => updateMnozstvi(item, 1)}
                            hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                          >
                            <Text style={styles.qtyBtnText}>+</Text>
                          </TouchableOpacity>
                        </View>

                        {total > 0 && (
                          <Text style={styles.produktTotal}>
                            {formatKc(total)} Kč
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Preferovaný termín vyzvednutí — jednou za celou skupinu farmáře */}
                <View style={styles.vyzvednutiBox}>
                  <Text style={styles.vyzvednutiLabel}>🕐 Preferovaný termín vyzvednutí</Text>
                  <View style={styles.vyzvednutiRow}>
                    <TextInput
                      style={styles.vyzvednutiInput}
                      placeholder="Datum (např. 15.2.2026)"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={vyzvednutiPerFarmar[farmarId]?.datum ?? ''}
                      onChangeText={(v) => setVyzvednuti(farmarId, 'datum', v)}
                    />
                    <TextInput
                      style={[styles.vyzvednutiInput, styles.vyzvednutiInputCas]}
                      placeholder="Čas (14:00)"
                      placeholderTextColor="rgba(255,255,255,0.4)"
                      value={vyzvednutiPerFarmar[farmarId]?.cas ?? ''}
                      onChangeText={(v) => setVyzvednuti(farmarId, 'cas', v)}
                    />
                  </View>
                </View>

                {/* Per-farmer SMS button (only when multiple farmers) */}
                {isMulti && (
                  <TouchableOpacity
                    style={[styles.farmarSmsBtn, isSent && styles.farmarSmsBtnSent]}
                    onPress={() => !isSent && sendSmsToFarmar(farmarId)}
                    activeOpacity={isSent ? 1 : 0.8}
                  >
                    <Ionicons
                      name={isSent ? 'checkmark-circle' : 'chatbubble'}
                      size={15}
                      color={isSent ? '#4CAF50' : '#fff'}
                    />
                    <Text style={[styles.farmarSmsBtnText, isSent && styles.farmarSmsBtnTextSent]}>
                      {isSent ? 'SMS odeslána' : `Odeslat SMS — ${group.farmarNazev}`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
              );
            })}

            {/* Info note */}
            <View style={styles.infoRow}>
              <Ionicons name="information-circle-outline" size={14} color="rgba(255,255,255,0.35)" />
              <Text style={styles.infoText}>Seznam je uložen pouze v tomto zařízení.</Text>
            </View>
          </ScrollView>

          {/* ── Sticky footer: price + SMS button ── */}
          <View style={styles.footer}>
            <View style={styles.footerPrice}>
              <Text style={styles.footerPriceLabel}>Celkem</Text>
              <Text style={styles.footerPriceValue}>≈ {formatKc(totalPrice)} Kč</Text>
            </View>

            {Object.keys(groupedByFarmar).length === 1 ? (
              <TouchableOpacity
                style={styles.smsBtn}
                onPress={sendSms}
                testID="send-order"
                activeOpacity={0.85}
              >
                <Ionicons name="chatbubble" size={16} color="#fff" />
                <Text style={styles.smsBtnText}>Odeslat SMS</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.multiHint}>
                <Text style={styles.multiHintText}>
                  Odešlete SMS každému farmáři zvlášť ↑
                </Text>
              </View>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a3a1a',
  },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBtn: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    minWidth: 60,
  },
  headerBack: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '400',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  headerClear: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    textAlign: 'right',
  },
  headerSpacer: {
    minWidth: 60,
  },

  // ── Empty state ────────────────────────────────────────────────────────────
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyIcon: { fontSize: 60, marginBottom: 14 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 8 },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 13,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // ── Scroll list ────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 8,
  },

  // ── Farmer section ─────────────────────────────────────────────────────────
  farmarSection: {
    backgroundColor: 'rgba(255,255,255,0.11)',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    overflow: 'hidden',
  },
  farmarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  farmarName: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  farmarArrow: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.35)',
  },

  // ── Product row ────────────────────────────────────────────────────────────
  produktRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.07)',
    gap: 8,
  },

  // Left column
  produktInfo: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  produktName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#fff',
  },
  produktUnitPrice: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.48)',
  },
  produktVyz: {
    fontSize: 11,
    color: '#FF9800',
    marginTop: 1,
  },

  // Right column: qty + total
  produktControls: {
    alignItems: 'flex-end',
    gap: 4,
    flexShrink: 0,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    overflow: 'hidden',
  },
  qtyBtn: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF9800',
    lineHeight: 22,
  },
  qtyValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
    minWidth: 52,
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  produktTotal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9800',
  },

  // ── Info note ──────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.35)',
  },

  // ── Sticky footer ──────────────────────────────────────────────────────────
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    backgroundColor: '#5c1785',
    gap: 10,
  },
  footerPrice: {
    flex: 1,
    gap: 1,
  },
  footerPriceLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footerPriceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FF9800',
  },
  smsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    height: 52,
    paddingHorizontal: 18,
    borderRadius: 12,
    gap: 7,
    flexShrink: 0,
  },
  smsBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // ── Pickup time per farmer ───────────────────────────────────────────────────
  vyzvednutiBox: {
    marginHorizontal: 12,
    marginTop: 4,
    marginBottom: 8,
    padding: 12,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  vyzvednutiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vyzvednutiRow: {
    flexDirection: 'row',
    gap: 8,
  },
  vyzvednutiInput: {
    flex: 2,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  vyzvednutiInputCas: {
    flex: 1,
  },

  // ── Per-farmer SMS button ───────────────────────────────────────────────────
  farmarSmsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 10,
    marginTop: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#FF9800',
  },
  farmarSmsBtnSent: {
    backgroundColor: 'rgba(76,175,80,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.4)',
  },
  farmarSmsBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  farmarSmsBtnTextSent: {
    color: '#4CAF50',
  },

  // ── Multi-farmer footer hint ────────────────────────────────────────────────
  multiHint: {
    flex: 1,
    alignItems: 'flex-end',
  },
  multiHintText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'right',
  },
});
