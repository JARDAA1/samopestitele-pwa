import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useShoppingList } from '../_utils/cartContext';

function buildSmsText(
  farmarNazev: string,
  items: { nazev: string; mnozstvi: number; jednotka: string }[],
  pickupTime: string
): string {
  let text = `Dobrý den,\nrád/a bych si objednal/a od ${farmarNazev}:\n`;
  items.forEach(i => { text += `• ${i.nazev}: ${i.mnozstvi} ${i.jednotka}\n`; });
  if (pickupTime) text += `\nVyzvednutí: ${pickupTime}`;
  text += '\n\nDěkuji!';
  return text;
}

export default function NakupniSeznamScreen() {
  const { shoppingList, clearList, itemCount, updateQuantity, removeFromList } = useShoppingList() as any;
  const [pickupTimes, setPickupTimes] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);
  const [sentFarmers, setSentFarmers] = useState<string[]>([]);

  if (!shoppingList || itemCount === 0) {
    return (
      <View style={s.root}>
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => router.push('/mapa')} style={s.backBtn}>
            <Text style={s.backBtnText}>← Mapa farmářů</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Nákupní seznam</Text>
        </View>
        <View style={s.emptyContainer}>
          <Text style={s.emptyIcon}>🧺</Text>
          <Text style={s.emptyTitle}>Váš seznam je prázdný</Text>
          <Text style={s.emptySubtitle}>Přidejte produkty od farmářů na mapě.</Text>
          <TouchableOpacity style={s.ctaBtn} onPress={() => router.push('/mapa')}>
            <Text style={s.ctaBtnText}>Najít farmáře →</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Group by farmer
  const byFarmer: Record<string, {
    farmarNazev: string;
    farmarTelefon: string;
    farmarId: number;
    farmarMesto: string;
    items: any[];
  }> = {};

  (shoppingList || []).forEach((item: any) => {
    const key = String(item.pestitelId);
    if (!byFarmer[key]) {
      byFarmer[key] = {
        farmarNazev: item.pestitelNazev,
        farmarTelefon: item.pestitelTelefon,
        farmarId: item.pestitelId,
        farmarMesto: item.pestitelMesto || '',
        items: [],
      };
    }
    byFarmer[key].items.push(item);
  });

  const farmerGroups = Object.entries(byFarmer);

  const handleSendSMS = (farmarId: string) => {
    const group = byFarmer[farmarId];
    if (!group) return;
    setSending(farmarId);
    const pickup = pickupTimes[farmarId] || '';
    const text = buildSmsText(
      group.farmarNazev,
      group.items.map(i => ({ nazev: i.nazev, mnozstvi: i.mnozstvi || 1, jednotka: i.jednotka })),
      pickup
    );
    const smsUrl = `sms:${group.farmarTelefon}?body=${encodeURIComponent(text)}`;
    window.location.href = smsUrl;
    setTimeout(() => {
      setSentFarmers(prev => [...prev, farmarId]);
      setSending(null);
    }, 500);
  };

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>🧺 Nákupní seznam</Text>
        <TouchableOpacity onPress={() => { if (window.confirm('Vymazat celý seznam?')) clearList?.(); }}>
          <Text style={s.clearBtnText}>Vymazat vše</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.countLabel}>{itemCount} {itemCount === 1 ? 'položka' : itemCount < 5 ? 'položky' : 'položek'}</Text>

        {farmerGroups.map(([farmarId, group]) => {
          const isSent = sentFarmers.includes(farmarId);
          return (
            <View key={farmarId} style={s.farmerCard}>
              {/* Farmer header */}
              <View style={s.farmerHeader}>
                <View style={s.farmerIconCircle}>
                  <Text style={s.farmerIconText}>🌿</Text>
                </View>
                <View style={s.farmerInfo}>
                  <Text style={s.farmerName}>{group.farmarNazev}</Text>
                  {group.farmarMesto ? (
                    <Text style={s.farmerMesto}>📍 {group.farmarMesto}</Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  onPress={() => router.push(`/pestitele/${group.farmarId}` as any)}
                  style={s.profileLink}
                >
                  <Text style={s.profileLinkText}>Profil →</Text>
                </TouchableOpacity>
              </View>

              {/* Items */}
              {group.items.map((item: any, idx: number) => (
                <View key={idx} style={s.itemRow}>
                  <Text style={s.itemName}>{item.nazev}</Text>
                  <View style={s.itemRight}>
                    {item.cena > 0 && (
                      <Text style={s.itemPrice}>{item.cena} Kč/{item.jednotka}</Text>
                    )}
                    <View style={s.qtyRow}>
                      <TouchableOpacity
                        style={s.qtyBtn}
                        onPress={() => {
                          const newQty = (item.mnozstvi || 1) - 1;
                          if (newQty <= 0) removeFromList?.(item.produkt_id);
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
                  </View>
                </View>
              ))}

              {/* Pickup time */}
              <View style={s.pickupRow}>
                <Text style={s.pickupLabel}>📅 Preferovaný čas vyzvednutí:</Text>
                <TextInput
                  style={s.pickupInput}
                  placeholder="Např. Pátek 16:00 - 18:00"
                  value={pickupTimes[farmarId] || ''}
                  onChangeText={val => setPickupTimes(prev => ({ ...prev, [farmarId]: val }))}
                />
              </View>

              {/* SMS Button */}
              {isSent ? (
                <View style={s.sentBox}>
                  <Text style={s.sentText}>✓ SMS připravena — zkontrolujte svou SMS aplikaci</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[s.smsBtn, sending === farmarId && s.btnDisabled]}
                  onPress={() => handleSendSMS(farmarId)}
                  disabled={sending === farmarId}
                >
                  {sending === farmarId ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <>
                      <Text style={s.smsBtnIcon}>💬</Text>
                      <Text style={s.smsBtnText}>Odeslat SMS farmáři</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <View style={s.infoBox}>
          <Text style={s.infoText}>
            ℹ️ Tlačítko otevře SMS aplikaci s předvyplněnou zprávou. Zprávu si před odesláním můžete upravit.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  backBtn: {},
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 20, fontWeight: '800', color: '#1a1a1a' },
  clearBtnText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  emptySubtitle: { fontSize: 15, color: '#6b7280', textAlign: 'center', marginBottom: 28 },
  ctaBtn: {
    backgroundColor: '#4caf50', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12,
  },
  ctaBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 680 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 32, gap: 20, paddingBottom: 48,
  },
  countLabel: { fontSize: 14, color: '#9ca3af', fontWeight: '500', marginBottom: 4 },

  farmerCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  farmerHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 16, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  farmerIconCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center',
  },
  farmerIconText: { fontSize: 20 },
  farmerInfo: { flex: 1 },
  farmerName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  farmerMesto: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  profileLink: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#f0fdf4', borderRadius: 8 },
  profileLinkText: { fontSize: 13, color: '#166534', fontWeight: '600' },

  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  itemPrice: { fontSize: 12, color: '#9ca3af' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  qtyBtnText: { fontSize: 16, color: '#374151', fontWeight: '700' },
  qtyValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', minWidth: 24 as any, textAlign: 'center' },
  itemUnit: { fontSize: 13, color: '#9ca3af' },

  pickupRow: { marginTop: 16, gap: 8 },
  pickupLabel: { fontSize: 13, fontWeight: '600', color: '#374151' },
  pickupInput: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 12,
    fontSize: 14, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb',
  },

  smsBtn: {
    backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginTop: 16,
    shadowColor: '#4caf50', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  smsBtnIcon: { fontSize: 20 },
  smsBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  sentBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 14, marginTop: 16,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  sentText: { color: '#166534', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  btnDisabled: { opacity: 0.6 },

  infoBox: {
    backgroundColor: '#fffbeb', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#fde68a',
  },
  infoText: { fontSize: 13, color: '#92400e', lineHeight: 20 },
});
