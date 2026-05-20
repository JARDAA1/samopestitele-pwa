import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';
import {
  fetchObjednavkaDetail,
  fetchObjednavkaPolozky,
  zmeniStavObjednavky,
  ulozitPoznamkuFarmare,
  poslatSMSPripraveno,
} from '@/features/objednavky/services/objednavkyService';
import { formatKc, formatMnozstvi } from '../../_utils/formatKc';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna', active: true },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa' },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky' },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

interface Objednavka {
  id: string;
  stav: string;
  datum_vyzvednuti?: string;
  anon_customer_code?: string;
  celkova_cena?: number;
  created_at: string;
  zakaznik_telefon?: string;
  poznamka_farmare?: string;
  phone_consent?: boolean;
  ready_at?: string;
}

interface Polozka {
  id: string;
  nazev_produktu: string;
  mnozstvi: number;
  jednotka: string;
  cena?: number;
}

function getStavColor(stav: string): string {
  switch (stav) {
    case 'nova': case 'cekajici_na_potvrzeni': return '#f97316';
    case 'potvrzena': return '#3b82f6';
    case 'ceka_na_vyzvednuti': return '#f59e0b';
    case 'zpracovana': case 'dokoncena': return '#4caf50';
    case 'odmitnuta': case 'zrusena': return '#ef4444';
    default: return '#9ca3af';
  }
}

function getStavText(stav: string): string {
  const map: Record<string, string> = {
    nova: 'Nová',
    cekajici_na_potvrzeni: 'Čeká na potvrzení',
    potvrzena: 'Potvrzená',
    odmitnuta: 'Odmítnutá',
    ceka_na_vyzvednuti: 'Čeká na vyzvednutí',
    zpracovana: 'Zpracovaná',
    dokoncena: 'Dokončená',
    zrusena: 'Zrušená',
  };
  return map[stav] || stav;
}

function getSMSMessage(o: Objednavka): string {
  let msg = '';
  switch (o.stav) {
    case 'potvrzena': msg = 'Dobrý den, vaše objednávka byla potvrzena! ✅'; break;
    case 'ceka_na_vyzvednuti': msg = 'Dobrý den, vaše objednávka je připravena k vyzvednutí! 🧺'; break;
    case 'dokoncena': msg = 'Děkujeme za nákup! 🙏'; break;
    case 'odmitnuta': msg = 'Omlouváme se, vaši objednávku bohužel nemůžeme splnit. 🙏'; break;
    default: msg = `Informace k vaší objednávce (${getStavText(o.stav)}):`;
  }
  if (o.datum_vyzvednuti && o.stav !== 'dokoncena') {
    msg += `\nDatum vyzvednutí: ${new Date(o.datum_vyzvednuti).toLocaleDateString('cs-CZ')}`;
  }
  if (o.anon_customer_code) {
    msg += `\n\nDetail: https://samopestitele.vercel.app/vyzvednuti/${o.anon_customer_code}`;
  }
  return msg;
}

function DetailContent() {
  const { farmar, logout } = useFarmarAuth();
  const params = useLocalSearchParams();
  const objednavkaId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [objednavka, setObjednavka] = useState<Objednavka | null>(null);
  const [polozky, setPolozky] = useState<Polozka[]>([]);
  const [poznamka, setPoznamka] = useState('');
  const [savingPoznamka, setSavingPoznamka] = useState(false);
  const [showSMSModal, setShowSMSModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!objednavkaId) { setLoading(false); return; }
    load();
  }, [objednavkaId]);

  const load = async () => {
    try {
      const data = await fetchObjednavkaDetail(objednavkaId);
      setObjednavka(data as Objednavka);
      setPoznamka((data as Objednavka).poznamka_farmare || '');
      const items = await fetchObjednavkaPolozky(objednavkaId);
      setPolozky(items as Polozka[]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const zmeniStav = async (novyStav: string) => {
    try {
      await zmeniStavObjednavky(objednavkaId, novyStav);
      setObjednavka(prev => prev ? { ...prev, stav: novyStav } : null);
      setSuccessMsg(`Stav změněn na "${getStavText(novyStav)}"`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
      window.alert('Nepodařilo se změnit stav');
    }
  };

  const potvrditObjednavku = async () => {
    await zmeniStav('potvrzena');
    if (objednavka?.zakaznik_telefon && window.confirm('Chcete odeslat zákazníkovi SMS potvrzení?')) {
      const smsUrl = `sms:${objednavka.zakaznik_telefon}?body=${encodeURIComponent('Dobrý den, vaše objednávka byla potvrzena! ✅')}`;
      window.location.href = smsUrl;
    }
  };

  const odmitnoutObjednavku = async () => {
    if (!window.confirm('Opravdu chcete odmítnout tuto objednávku?')) return;
    await zmeniStav('odmitnuta');
    if (objednavka?.zakaznik_telefon && window.confirm('Chcete odeslat zákazníkovi SMS o odmítnutí?')) {
      const smsUrl = `sms:${objednavka.zakaznik_telefon}?body=${encodeURIComponent('Omlouváme se, vaši objednávku bohužel nemůžeme splnit. 🙏')}`;
      window.location.href = smsUrl;
    }
  };

  const oznacitPripraveno = async () => {
    if (!objednavka) return;
    const bylaPotvrzena = objednavka.stav === 'potvrzena';
    try {
      await zmeniStavObjednavky(objednavkaId, 'ceka_na_vyzvednuti');
      setObjednavka(prev => prev ? { ...prev, stav: 'ceka_na_vyzvednuti', ready_at: new Date().toISOString() } : null);
      if (bylaPotvrzena && objednavka.phone_consent && objednavka.zakaznik_telefon) {
        await poslatSMSPripraveno(objednavka.zakaznik_telefon);
      }
      setSuccessMsg('Objednávka označena jako připravena k vyzvednutí.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch {
      window.alert('Nepodařilo se označit objednávku jako připravenou.');
    }
  };

  const dokoncitObjednavku = async () => {
    await zmeniStav('dokoncena');
    if (objednavka?.zakaznik_telefon && window.confirm('Chcete odeslat zákazníkovi SMS s poděkováním?')) {
      const smsUrl = `sms:${objednavka.zakaznik_telefon}?body=${encodeURIComponent('Děkujeme za nákup! 🙏 Těšíme se na vaši další návštěvu. 🧺')}`;
      window.location.href = smsUrl;
    }
  };

  const ulozitPoznamku = async () => {
    if (!objednavka) return;
    setSavingPoznamka(true);
    try {
      await ulozitPoznamkuFarmare(objednavkaId, poznamka.trim() || null);
      setObjednavka(prev => prev ? { ...prev, poznamka_farmare: poznamka.trim() || undefined } : null);
      setSuccessMsg('Poznámka uložena');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      window.alert('Nepodařilo se uložit poznámku');
    } finally {
      setSavingPoznamka(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccessMsg('Zkopírováno do schránky');
      setTimeout(() => setSuccessMsg(''), 2000);
    } catch {
      window.alert('Nepodařilo se zkopírovat');
    }
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

  if (loading) {
    return (
      <View style={s.root}>
        {renderSidebar()}
        <View style={s.center}>
          <ActivityIndicator size="large" color="#4caf50" />
        </View>
      </View>
    );
  }

  if (!objednavka) {
    return (
      <View style={s.root}>
        {renderSidebar()}
        <View style={s.center}>
          <Text style={s.errorIcon}>⚠️</Text>
          <Text style={s.errorText}>Objednávka nenalezena</Text>
          <TouchableOpacity style={s.backBtn2} onPress={() => router.push('/(tabs)/moje-prodejna')}>
            <Text style={s.backBtn2Text}>← Zpět</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const stavColor = getStavColor(objednavka.stav);
  const isCekajici = objednavka.stav === 'nova' || objednavka.stav === 'cekajici_na_potvrzeni';

  return (
    <View style={s.root}>
      {renderSidebar()}

      <View style={s.main}>
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => router.push('/(tabs)/moje-prodejna')} style={s.backBtn}>
            <Text style={s.backBtnText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={s.pageTitle}>Detail objednávky</Text>
        </View>

        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {successMsg ? (
            <View style={s.successBanner}>
              <Text style={s.successText}>✓ {successMsg}</Text>
            </View>
          ) : null}

          {isCekajici && (
            <View style={s.urgentBanner}>
              <Text style={s.urgentText}>⚠️ Tato objednávka čeká na vaše potvrzení</Text>
            </View>
          )}

          {/* Zákazník */}
          <View style={s.card}>
            <View style={s.cardHeaderRow}>
              <Text style={s.customerName}>
                {objednavka.poznamka_farmare ||
                  (objednavka.anon_customer_code ? `Zákazník ${objednavka.anon_customer_code}` : 'Zákazník')}
              </Text>
              <View style={[s.stavBadge, { backgroundColor: stavColor + '20' }]}>
                <Text style={[s.stavBadgeText, { color: stavColor }]}>{getStavText(objednavka.stav)}</Text>
              </View>
            </View>

            {objednavka.zakaznik_telefon && (
              <View style={s.phoneBox}>
                <Text style={s.phoneText}>📱 {objednavka.zakaznik_telefon}</Text>
                <View style={s.phoneBtns}>
                  <TouchableOpacity style={s.callBtn}
                    onPress={() => { window.location.href = `tel:${objednavka.zakaznik_telefon}`; }}>
                    <Text style={s.callBtnText}>📞 Zavolat</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={s.smsBtnEl} onPress={() => setShowSMSModal(true)}>
                    <Text style={s.smsBtnText}>💬 SMS</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <Text style={s.infoText}>
              Přijato: {new Date(objednavka.created_at).toLocaleDateString('cs-CZ', {
                day: 'numeric', month: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </Text>
            {objednavka.datum_vyzvednuti && (
              <Text style={s.pickupText}>
                📅 Datum vyzvednutí: {new Date(objednavka.datum_vyzvednuti).toLocaleDateString('cs-CZ')}
              </Text>
            )}
            {objednavka.celkova_cena && objednavka.celkova_cena > 0 ? (
              <Text style={s.priceText}>Celková cena: {formatKc(objednavka.celkova_cena)} Kč</Text>
            ) : null}
          </View>

          {/* Produkty */}
          <View style={s.card}>
            <Text style={s.cardTitle}>🛒 Objednané produkty ({polozky.length})</Text>
            {polozky.length === 0 ? (
              <Text style={s.emptyText}>Žádné položky</Text>
            ) : polozky.map(p => (
              <View key={p.id} style={s.productRow}>
                <View style={s.productInfo}>
                  <Text style={s.productName}>{p.nazev_produktu}</Text>
                  {p.cena && p.cena > 0 ? (
                    <Text style={s.productPrice}>{formatKc(p.cena * p.mnozstvi)} Kč</Text>
                  ) : null}
                </View>
                <Text style={s.productQty}>{formatMnozstvi(p.mnozstvi)} {p.jednotka}</Text>
              </View>
            ))}
          </View>

          {/* Poznámka */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📝 Poznámka (jméno zákazníka apod.)</Text>
            <TextInput
              style={s.noteInput}
              placeholder="Např. Paní Nováková, telefon na manžela..."
              value={poznamka}
              onChangeText={setPoznamka}
              multiline
              numberOfLines={2}
            />
            <TouchableOpacity
              style={[s.saveNoteBtn, savingPoznamka && s.btnDisabled]}
              onPress={ulozitPoznamku}
              disabled={savingPoznamka}
            >
              <Text style={s.saveNoteBtnText}>{savingPoznamka ? 'Ukládám...' : 'Uložit poznámku'}</Text>
            </TouchableOpacity>
          </View>

          {/* Akce - Potvrdit / Odmítnout */}
          {isCekajici && (
            <View style={s.actionCard}>
              <Text style={s.actionTitle}>Co chcete s objednávkou udělat?</Text>
              <View style={s.actionBtns}>
                <TouchableOpacity style={s.confirmBtn} onPress={potvrditObjednavku}>
                  <Text style={s.confirmBtnText}>✓ Potvrdit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.rejectBtn} onPress={odmitnoutObjednavku}>
                  <Text style={s.rejectBtnText}>✗ Odmítnout</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(objednavka.stav === 'potvrzena' || objednavka.stav === 'nova') && (
            <TouchableOpacity style={s.pripBtn} onPress={oznacitPripraveno}>
              <Text style={s.pripBtnText}>✔ Připraveno k vyzvednutí</Text>
            </TouchableOpacity>
          )}

          {objednavka.stav === 'ceka_na_vyzvednuti' && (
            <TouchableOpacity style={[s.pripBtn, { backgroundColor: '#4caf50' }]} onPress={dokoncitObjednavku}>
              <Text style={s.pripBtnText}>📦 Uložit do archivu</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>

      {/* SMS Modal */}
      {showSMSModal && objednavka && (
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>📱 Odeslat SMS</Text>
            <Text style={s.modalSubtitle}>
              Zkopírujte telefon a zprávu a odešlete ručně přes SMS aplikaci.
            </Text>
            <View style={s.modalSection}>
              <Text style={s.modalLabel}>Telefon:</Text>
              <View style={s.modalRow}>
                <Text style={s.modalValue}>{objednavka.zakaznik_telefon}</Text>
                <TouchableOpacity style={s.copyBtn}
                  onPress={() => copyToClipboard(objednavka.zakaznik_telefon || '')}>
                  <Text style={s.copyBtnText}>📋 Kopírovat</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={s.modalSection}>
              <Text style={s.modalLabel}>Zpráva:</Text>
              <Text style={s.modalMsgText}>{getSMSMessage(objednavka)}</Text>
              <TouchableOpacity style={s.copyBtn} onPress={() => copyToClipboard(getSMSMessage(objednavka))}>
                <Text style={s.copyBtnText}>📋 Kopírovat zprávu</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={s.modalCloseBtn} onPress={() => setShowSMSModal(false)}>
              <Text style={s.modalCloseBtnText}>Zavřít</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function DetailObjednavkyScreen() {
  return <ProtectedRoute><DetailContent /></ProtectedRoute>;
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
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a1a' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  errorIcon: { fontSize: 48, marginBottom: 16 },
  errorText: { fontSize: 16, color: '#374151', marginBottom: 20 },
  backBtn2: { backgroundColor: '#4caf50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  backBtn2Text: { color: '#ffffff', fontWeight: '600' },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 760 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 32, gap: 16, paddingBottom: 48,
  },

  successBanner: {
    backgroundColor: '#dcfce7', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#4caf50',
  },
  successText: { color: '#166534', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  urgentBanner: {
    backgroundColor: '#fff7ed', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#fb923c',
  },
  urgentText: { color: '#c2410c', fontSize: 14, fontWeight: '700', textAlign: 'center' },

  card: {
    backgroundColor: '#ffffff', borderRadius: 14, padding: 24,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 12,
  },
  customerName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', flex: 1, marginRight: 12 },
  stavBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  stavBadgeText: { fontSize: 13, fontWeight: '700' },
  phoneBox: {
    backgroundColor: '#eff6ff', borderRadius: 10, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#bfdbfe',
  },
  phoneText: { fontSize: 16, color: '#1d4ed8', fontWeight: '600', marginBottom: 10 },
  phoneBtns: { flexDirection: 'row', gap: 8 },
  callBtn: {
    flex: 1, backgroundColor: '#3b82f6', paddingVertical: 10,
    borderRadius: 8, alignItems: 'center',
  },
  callBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  smsBtnEl: {
    flex: 1, backgroundColor: '#4caf50', paddingVertical: 10,
    borderRadius: 8, alignItems: 'center',
  },
  smsBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  infoText: { fontSize: 13, color: '#6b7280', marginBottom: 4 },
  pickupText: { fontSize: 14, color: '#d97706', fontWeight: '600', marginTop: 6 },
  priceText: { fontSize: 16, color: '#4caf50', fontWeight: '700', marginTop: 6 },

  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 14 },
  productRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  productPrice: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  productQty: { fontSize: 15, fontWeight: '700', color: '#f59e0b' },
  emptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },

  noteInput: {
    backgroundColor: '#f9fafb', borderRadius: 8, padding: 12,
    fontSize: 14, color: '#1a1a1a', borderWidth: 1, borderColor: '#e5e7eb',
    marginBottom: 12, minHeight: 60,
  },
  saveNoteBtn: {
    backgroundColor: '#f59e0b', paddingVertical: 12, borderRadius: 8, alignItems: 'center',
  },
  saveNoteBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },

  actionCard: {
    backgroundColor: '#fff7ed', borderRadius: 14, padding: 20,
    borderWidth: 2, borderColor: '#fb923c',
  },
  actionTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', marginBottom: 14, textAlign: 'center' },
  actionBtns: { flexDirection: 'row', gap: 12 },
  confirmBtn: {
    flex: 1, backgroundColor: '#4caf50', paddingVertical: 14,
    borderRadius: 8, alignItems: 'center',
  },
  confirmBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  rejectBtn: {
    flex: 1, backgroundColor: '#fee2e2', paddingVertical: 14,
    borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#fca5a5',
  },
  rejectBtnText: { color: '#dc2626', fontSize: 16, fontWeight: '700' },
  pripBtn: {
    backgroundColor: '#f59e0b', paddingVertical: 16, borderRadius: 10,
    alignItems: 'center', borderWidth: 2, borderColor: '#d97706',
  },
  pripBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },

  modalOverlay: {
    position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 20, zIndex: 100,
  },
  modalCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 24,
    width: '100%' as any, maxWidth: 440 as any,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', textAlign: 'center', marginBottom: 8 },
  modalSubtitle: {
    fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 20, lineHeight: 20,
  },
  modalSection: {
    backgroundColor: '#f9fafb', borderRadius: 10, padding: 14, marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12, color: '#9ca3af', marginBottom: 6, fontWeight: '600',
    textTransform: 'uppercase' as any, letterSpacing: 0.5,
  },
  modalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalValue: { fontSize: 18, color: '#1d4ed8', fontWeight: '700' },
  modalMsgText: { fontSize: 14, color: '#1a1a1a', lineHeight: 20, marginBottom: 10 },
  copyBtn: {
    backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 6, alignSelf: 'flex-start' as any, marginTop: 4,
  },
  copyBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  modalCloseBtn: {
    backgroundColor: '#f3f4f6', paddingVertical: 14, borderRadius: 10,
    alignItems: 'center', marginTop: 4,
  },
  modalCloseBtnText: { color: '#374151', fontSize: 16, fontWeight: '600' },
});
