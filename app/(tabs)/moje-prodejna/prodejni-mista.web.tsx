import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import {
  ProdejniMisto,
  getProdejniMistaFarmare,
  createProdejniMisto,
  updateProdejniMisto,
  deleteProdejniMisto,
  isProdejniMistoAktivniDnes,
} from '../../_utils/locationService';
import { ProtectedRoute } from '../../_utils/ProtectedRoute';

const NAV = [
  { icon: '📋', label: 'Objednávky', route: '/(tabs)/moje-prodejna' },
  { icon: '📦', label: 'Produkty', route: '/moje-prodejna/seznam-produktu' },
  { icon: '📍', label: 'Prodejní místa', route: '/moje-prodejna/prodejni-mista' },
  { icon: '⚡', label: 'Operativa', route: '/moje-prodejna/operativa' },
  { icon: '📚', label: 'Dokončené', route: '/moje-prodejna/dokoncene-objednavky' },
  { icon: '👤', label: 'Profil', route: '/profil' },
];

function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  const delta = 0.04;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    // @ts-ignore
    <iframe src={src} title="Mapa" style={{ width: '100%', height: '100%', border: 'none' } as any} />
  );
}

function parseWebDate(text: string): Date | null {
  const trimmed = text.trim();
  const czMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (czMatch) {
    const [, d, m, y] = czMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return date;
  }
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) return isoDate;
  return null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('cs-CZ');
}

function getMistoStatus(misto: ProdejniMisto) {
  if (!misto.aktivni) return { text: 'Neaktivní', color: '#9E9E9E', icon: '⏸️' };
  if (isProdejniMistoAktivniDnes(misto)) return { text: 'Aktivní', color: '#4caf50', icon: '✅' };
  return { text: 'Mimo sezónu', color: '#f59e0b', icon: '📅' };
}

function ProdejniMistaContent() {
  const { farmar, logout } = useFarmarAuth();

  const [loading, setLoading] = useState(true);
  const [mista, setMista] = useState<ProdejniMisto[]>([]);
  const [selectedMisto, setSelectedMisto] = useState<ProdejniMisto | null>(null);

  // Panel add/edit
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<ProdejniMisto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [nazev, setNazev] = useState('');
  const [adresa, setAdresa] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [aktivni, setAktivni] = useState(true);
  const [casOd, setCasOd] = useState('');
  const [casDo, setCasDo] = useState('');
  const [webOdText, setWebOdText] = useState('');
  const [webDoText, setWebDoText] = useState('');
  const [platneOd, setPlatneOd] = useState<Date | null>(null);
  const [platneDo, setPlatneDo] = useState<Date | null>(null);

  useFocusEffect(useCallback(() => {
    if (farmar?.id) loadMista();
  }, [farmar]));

  const loadMista = async () => {
    if (!farmar?.id) return;
    setLoading(true);
    try {
      const data = await getProdejniMistaFarmare(Number(farmar.id));
      setMista(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const openAdd = () => {
    setEditing(null);
    setNazev(''); setAdresa(''); setLat(''); setLng('');
    setAktivni(true); setCasOd(''); setCasDo('');
    setWebOdText(''); setWebDoText('');
    setPlatneOd(null); setPlatneDo(null);
    setPanelOpen(true);
  };

  const openEdit = (misto: ProdejniMisto) => {
    setEditing(misto);
    setNazev(misto.nazev);
    setAdresa(misto.adresa || '');
    setLat(misto.lat?.toString() || '');
    setLng(misto.lng?.toString() || '');
    setAktivni(misto.aktivni);
    setCasOd(misto.cas_od || '');
    setCasDo(misto.cas_do || '');
    setWebOdText(misto.platne_od ? new Date(misto.platne_od).toLocaleDateString('cs-CZ') : '');
    setWebDoText(misto.platne_do ? new Date(misto.platne_do).toLocaleDateString('cs-CZ') : '');
    setPlatneOd(misto.platne_od ? new Date(misto.platne_od) : null);
    setPlatneDo(misto.platne_do ? new Date(misto.platne_do) : null);
    setPanelOpen(true);
  };

  const handleSave = async () => {
    if (!farmar?.id || !nazev.trim()) return;
    setSaving(true);
    try {
      const data = {
        nazev: nazev.trim(),
        adresa: adresa.trim() || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        aktivni,
        cas_od: casOd.trim() || null,
        cas_do: casDo.trim() || null,
        platne_od: platneOd ? platneOd.toISOString().split('T')[0] : null,
        platne_do: platneDo ? platneDo.toISOString().split('T')[0] : null,
      };

      if (editing) {
        await updateProdejniMisto(editing.id, data);
      } else {
        await createProdejniMisto(Number(farmar.id), data);
      }

      setPanelOpen(false);
      await loadMista();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (mistoId: number) => {
    if (!window.confirm('Opravdu chcete smazat toto prodejní místo?')) return;
    deleteProdejniMisto(mistoId)
      .then(() => loadMista())
      .catch(console.error);
  };

  const toggleAktivni = async (misto: ProdejniMisto) => {
    await updateProdejniMisto(misto.id, { aktivni: !misto.aktivni });
    setMista(prev => prev.map(m => m.id === misto.id ? { ...m, aktivni: !m.aktivni } : m));
  };

  const renderSidebar = () => (
    <View style={s.sidebar}>
      <View style={s.sidebarTop}>
        <Text style={s.brand}>🌿 Samopestitele</Text>
        <View style={s.nav}>
          {NAV.map((item, i) => {
            const active = item.label === 'Prodejní místa';
            return (
              <TouchableOpacity key={i}
                style={[s.navItem, active && s.navItemActive]}
                onPress={() => router.push(item.route as any)}>
                <Text style={s.navIcon}>{item.icon}</Text>
                <Text style={[s.navLabel, active && s.navLabelActive]}>{item.label}</Text>
              </TouchableOpacity>
            );
          })}
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

  // Panel pro přidání/úpravu (slide-in z pravé strany)
  const renderPanel = () => {
    if (!panelOpen) return null;
    return (
      <View style={s.panelOverlay}>
        <TouchableOpacity style={s.panelBackdrop} onPress={() => setPanelOpen(false)} />
        <View style={s.panel}>
          <View style={s.panelHeader}>
            <Text style={s.panelTitle}>{editing ? 'Upravit místo' : 'Nové prodejní místo'}</Text>
            <TouchableOpacity onPress={() => setPanelOpen(false)}>
              <Text style={s.panelClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={s.panelBody} showsVerticalScrollIndicator={false}>
            <Text style={s.pLabel}>Název místa *</Text>
            <TextInput style={s.pInput} value={nazev} onChangeText={setNazev}
              placeholder="např. Farmářský trh Náměstí" placeholderTextColor="#9ca3af" />

            <Text style={s.pLabel}>Adresa</Text>
            <TextInput style={s.pInput} value={adresa} onChangeText={setAdresa}
              placeholder="Náměstí Míru 1, Praha" placeholderTextColor="#9ca3af" />

            <View style={s.gpsRow}>
              <View style={s.gpsField}>
                <Text style={s.pLabel}>GPS Lat</Text>
                <TextInput style={s.pInput} value={lat} onChangeText={setLat}
                  placeholder="50.0755" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" />
              </View>
              <View style={s.gpsField}>
                <Text style={s.pLabel}>GPS Lng</Text>
                <TextInput style={s.pInput} value={lng} onChangeText={setLng}
                  placeholder="14.4378" placeholderTextColor="#9ca3af" keyboardType="decimal-pad" />
              </View>
            </View>

            <View style={s.switchRow}>
              <Text style={s.pLabel}>Aktivní</Text>
              <Switch value={aktivni} onValueChange={setAktivni}
                trackColor={{ false: '#e5e7eb', true: 'rgba(76,175,80,0.5)' }}
                thumbColor={aktivni ? '#4caf50' : '#9ca3af'} />
            </View>

            <Text style={s.pSectionLabel}>Otevírací doba</Text>
            <View style={s.timeRow}>
              <View style={s.timeField}>
                <Text style={s.pLabel}>Od</Text>
                <TextInput style={s.pInput} value={casOd} onChangeText={setCasOd}
                  placeholder="09:00" placeholderTextColor="#9ca3af" maxLength={5} />
              </View>
              <View style={s.timeField}>
                <Text style={s.pLabel}>Do</Text>
                <TextInput style={s.pInput} value={casDo} onChangeText={setCasDo}
                  placeholder="17:00" placeholderTextColor="#9ca3af" maxLength={5} />
              </View>
            </View>

            <Text style={s.pSectionLabel}>Sezónní platnost</Text>
            <Text style={s.pHint}>Formát: DD.MM.RRRR (prázdné = celoroční)</Text>
            <View style={s.timeRow}>
              <View style={s.timeField}>
                <Text style={s.pLabel}>Od</Text>
                <TextInput style={s.pInput} value={webOdText}
                  onChangeText={(t) => {
                    setWebOdText(t);
                    const p = parseWebDate(t);
                    if (p) setPlatneOd(p);
                    else if (!t.trim()) setPlatneOd(null);
                  }}
                  placeholder="01.04.2025" placeholderTextColor="#9ca3af" maxLength={10} />
              </View>
              <View style={s.timeField}>
                <Text style={s.pLabel}>Do</Text>
                <TextInput style={s.pInput} value={webDoText}
                  onChangeText={(t) => {
                    setWebDoText(t);
                    const p = parseWebDate(t);
                    if (p) setPlatneDo(p);
                    else if (!t.trim()) setPlatneDo(null);
                  }}
                  placeholder="31.10.2025" placeholderTextColor="#9ca3af" maxLength={10} />
              </View>
            </View>
          </ScrollView>

          <View style={s.panelFooter}>
            <TouchableOpacity style={s.cancelBtn} onPress={() => setPanelOpen(false)}>
              <Text style={s.cancelBtnText}>Zrušit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.saveBtn, (!nazev.trim() || saving) && s.saveBtnDisabled]}
              onPress={handleSave}
              disabled={!nazev.trim() || saving}>
              {saving
                ? <ActivityIndicator size="small" color="#ffffff" />
                : <Text style={s.saveBtnText}>{editing ? 'Uložit změny' : 'Přidat místo'}</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={s.root}>
      {renderSidebar()}

      <View style={s.main}>
        {/* Header */}
        <View style={s.pageHeader}>
          <View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/moje-prodejna')} style={s.backBtn}>
              <Text style={s.backBtnText}>← Zpět</Text>
            </TouchableOpacity>
            <Text style={s.pageTitle}>Prodejní místa</Text>
          </View>
          <TouchableOpacity style={s.addBtn} onPress={openAdd}>
            <Text style={s.addBtnText}>+ Přidat místo</Text>
          </TouchableOpacity>
        </View>

        <View style={s.body}>
          {/* Left: list */}
          <ScrollView style={s.listArea} contentContainerStyle={s.listContent}
            showsVerticalScrollIndicator={false}>

            <View style={s.infoBox}>
              <Text style={s.infoText}>
                ℹ️ Můžete mít více prodejních míst aktivních současně. Zákazníci si vyberou místo vyzvednutí.
              </Text>
            </View>

            {loading ? (
              <View style={s.loadingBox}>
                <ActivityIndicator size="large" color="#4caf50" />
                <Text style={s.loadingText}>Načítám...</Text>
              </View>
            ) : mista.length === 0 ? (
              <View style={s.emptyBox}>
                <Text style={s.emptyIcon}>📍</Text>
                <Text style={s.emptyText}>Zatím nemáte žádná prodejní místa</Text>
                <TouchableOpacity style={s.addBtnEmpty} onPress={openAdd}>
                  <Text style={s.addBtnEmptyText}>+ Přidat prodejní místo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              mista.map((misto) => {
                const status = getMistoStatus(misto);
                const isSelected = selectedMisto?.id === misto.id;
                return (
                  <TouchableOpacity
                    key={misto.id}
                    style={[s.mistoCard, isSelected && s.mistoCardSelected, !misto.aktivni && s.mistoCardInactive]}
                    onPress={() => setSelectedMisto(isSelected ? null : misto)}
                    activeOpacity={0.85}>
                    <View style={s.mistoRow}>
                      <View style={s.mistoInfo}>
                        <Text style={s.mistoNazev}>{misto.nazev}</Text>
                        {misto.adresa ? <Text style={s.mistoAdresa}>📍 {misto.adresa}</Text> : null}
                        {(misto.cas_od || misto.cas_do) && (
                          <Text style={s.mistoCas}>🕐 {misto.cas_od || '?'} – {misto.cas_do || '?'}</Text>
                        )}
                        {(misto.platne_od || misto.platne_do) && (
                          <Text style={s.mistoPlatnost}>
                            📅 {formatDate(misto.platne_od)} – {formatDate(misto.platne_do)}
                          </Text>
                        )}
                      </View>
                      <View style={[s.statusBadge, { backgroundColor: status.color + '22' }]}>
                        <Text style={s.statusIcon}>{status.icon}</Text>
                      </View>
                    </View>

                    <View style={s.mistoActions}>
                      <View style={s.switchWrap}>
                        <Text style={s.switchLabel}>Aktivní</Text>
                        <Switch
                          value={misto.aktivni}
                          onValueChange={() => toggleAktivni(misto)}
                          trackColor={{ false: '#e5e7eb', true: 'rgba(76,175,80,0.5)' }}
                          thumbColor={misto.aktivni ? '#4caf50' : '#9ca3af'}
                        />
                      </View>
                      <View style={s.actionBtns}>
                        <TouchableOpacity style={s.editBtn} onPress={() => openEdit(misto)}>
                          <Text style={s.editBtnText}>✏️ Upravit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={s.deleteBtn} onPress={() => handleDelete(misto.id)}>
                          <Text style={s.deleteBtnText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Right: map */}
          <View style={s.mapArea}>
            {selectedMisto?.lat && selectedMisto?.lng ? (
              <>
                <View style={s.mapHeader}>
                  <Text style={s.mapTitle}>{selectedMisto.nazev}</Text>
                  {selectedMisto.adresa ? (
                    <Text style={s.mapSubtitle}>{selectedMisto.adresa}</Text>
                  ) : null}
                </View>
                <View style={s.mapContainer}>
                  <MapEmbed lat={selectedMisto.lat} lng={selectedMisto.lng} />
                </View>
              </>
            ) : (
              <View style={s.mapEmpty}>
                <Text style={s.mapEmptyIcon}>🗺️</Text>
                <Text style={s.mapEmptyTitle}>Vyberte prodejní místo</Text>
                <Text style={s.mapEmptyText}>
                  Klikněte na místo v seznamu a zobrazí se zde mapa.{'\n'}
                  Místo musí mít vyplněné GPS souřadnice.
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {renderPanel()}
    </View>
  );
}

export default function ProdejniMistaScreen() {
  return <ProtectedRoute><ProdejniMistaContent /></ProtectedRoute>;
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
  navItemActive: { backgroundColor: 'rgba(76,175,80,0.15)' },
  navIcon: { fontSize: 16, width: 20, textAlign: 'center' },
  navLabel: { fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },
  navLabelActive: { color: '#4caf50', fontWeight: '700' },
  farmName: { fontSize: 13, fontWeight: '600', color: '#ffffff', marginBottom: 8 },
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 8, padding: 10, alignItems: 'center' },
  logoutBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: '600' },

  // Main
  main: { flex: 1 },
  pageHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    backgroundColor: '#ffffff', paddingHorizontal: 32,
    paddingTop: 24, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 4 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },
  addBtn: { backgroundColor: '#4caf50', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 20 },
  addBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  body: { flex: 1, flexDirection: 'row' },

  // List
  listArea: { width: 420, borderRightWidth: 1, borderRightColor: '#e5e7eb' },
  listContent: { padding: 24, paddingBottom: 48, gap: 12 },

  infoBox: {
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12,
    borderLeftWidth: 3, borderLeftColor: '#4caf50',
  },
  infoText: { fontSize: 13, color: '#166534', lineHeight: 18 },

  loadingBox: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  loadingText: { fontSize: 14, color: '#6b7280' },
  emptyBox: { alignItems: 'center', paddingVertical: 60, gap: 16 },
  emptyIcon: { fontSize: 56 },
  emptyText: { fontSize: 15, color: '#6b7280', textAlign: 'center' },
  addBtnEmpty: { backgroundColor: '#4caf50', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 20 },
  addBtnEmptyText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  mistoCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  mistoCardSelected: { borderColor: '#4caf50', borderWidth: 2 },
  mistoCardInactive: { opacity: 0.6 },
  mistoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  mistoInfo: { flex: 1, gap: 3 },
  mistoNazev: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  mistoAdresa: { fontSize: 13, color: '#6b7280' },
  mistoCas: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  mistoPlatnost: { fontSize: 12, color: '#f59e0b' },
  statusBadge: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  statusIcon: { fontSize: 14 },

  mistoActions: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: '#f3f4f6', paddingTop: 12,
  },
  switchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 13, color: '#6b7280' },
  actionBtns: { flexDirection: 'row', gap: 8 },
  editBtn: {
    backgroundColor: '#f9fafb', borderRadius: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  editBtnText: { fontSize: 12, color: '#374151', fontWeight: '600' },
  deleteBtn: { backgroundColor: '#fef2f2', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6 },
  deleteBtnText: { fontSize: 14 },

  // Map area
  mapArea: { flex: 1 },
  mapHeader: {
    backgroundColor: '#ffffff', padding: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  mapTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  mapSubtitle: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  mapContainer: { flex: 1 },
  mapEmpty: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40,
  },
  mapEmptyIcon: { fontSize: 64 },
  mapEmptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  mapEmptyText: { fontSize: 14, color: '#9ca3af', textAlign: 'center', lineHeight: 22 },

  // Slide panel
  panelOverlay: {
    position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: 'row', justifyContent: 'flex-end', zIndex: 100,
  },
  panelBackdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    width: 420, backgroundColor: '#ffffff',
    shadowColor: '#000', shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.12, shadowRadius: 16,
  },
  panelHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  panelTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  panelClose: { fontSize: 22, color: '#9ca3af', padding: 4 },
  panelBody: { flex: 1, padding: 20 },

  pLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6, marginTop: 14 },
  pInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    padding: 11, fontSize: 14, color: '#1a1a1a', backgroundColor: '#ffffff',
    outlineStyle: 'none' as any,
  },
  gpsRow: { flexDirection: 'row', gap: 12 },
  gpsField: { flex: 1 },
  switchRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 16, paddingVertical: 4,
  },
  pSectionLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginTop: 20, marginBottom: 4 },
  pHint: { fontSize: 12, color: '#9ca3af', marginBottom: 8 },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },

  panelFooter: {
    flexDirection: 'row', gap: 12, padding: 16,
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  cancelBtn: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 10,
    padding: 13, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  cancelBtnText: { color: '#374151', fontSize: 14, fontWeight: '600' },
  saveBtn: { flex: 2, backgroundColor: '#4caf50', borderRadius: 10, padding: 13, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
