/**
 * Web verze: Přidat stánek dnes — dvousloupcový layout s preview
 */
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/features/profil/services/imageUploadService';
import { addStanekDnes, deleteStanekDnes } from '@/features/stanky/services/stankyDnesService';
import { geocodeAddress } from '@/features/mapa/services/geocodingService';

// ── localStorage helper ──────────────────────────────────────────
const STORAGE_KEY = 'samopestitele_moje_stanky';
type MujStanek = { id: string; delete_token: string };

function nactiMojeStanky(): MujStanek[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function ulozMujStanek(id: string, delete_token: string) {
  try {
    const arr = nactiMojeStanky();
    arr.push({ id, delete_token });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { /* safari private mode */ }
}
function odstraňMujStanek(id: string) {
  try {
    const arr = nactiMojeStanky().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { }
}

// ── Datum helpers ────────────────────────────────────────────────
function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
function formatDatumLabel(iso: string): string {
  const dnes = isoDate(0);
  const zitra = isoDate(1);
  if (iso === dnes) return 'Dnes';
  if (iso === zitra) return 'Zítra';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)}.${parseInt(m)}.`;
}

// ── Reverse geocoding ────────────────────────────────────────────
const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=cs`,
      { headers: { 'User-Agent': 'samopestitele-app/1.0' } }
    );
    const { address: a } = await resp.json();
    if (!a) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const suburb = a.suburb || a.quarter || a.neighbourhood || a.village;
    const city = a.city || a.town || a.municipality;
    if (suburb && city) return `${city} – ${suburb}`;
    if (city) return city;
    if (a.county) return a.county;
  } catch { /* ignore */ }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

// ── Mapa embed ───────────────────────────────────────────────────
function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  const delta = 0.05;
  const bbox = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    // @ts-ignore
    <iframe src={src} title="Poloha stánku" style={{ width: '100%', height: '100%', border: 'none' } as any} />
  );
}

type LocationState = { lat: number; lng: number; text: string };

// ── Hlavní komponenta ────────────────────────────────────────────
export default function PridatStanekWeb() {
  const [fotoUri, setFotoUri] = useState<string | null>(null);
  const [poznamka, setPoznamka] = useState('');
  const [location, setLocation] = useState<LocationState | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [existingStanky, setExistingStanky] = useState<MujStanek[]>([]);
  const [error, setError] = useState('');
  const [adresaInput, setAdresaInput] = useState('');
  const [adresaLoading, setAdresaLoading] = useState(false);
  const [datumProdeje, setDatumProdeje] = useState<string>(isoDate(0));
  const [vlastniDatum, setVlastniDatum] = useState('');
  const [vlastniDatumActive, setVlastniDatumActive] = useState(false);

  useEffect(() => { setExistingStanky(nactiMojeStanky()); }, []);

  // ── Hledání adresy ──────────────────────────────────────────
  const hledatAdresu = async () => {
    const text = adresaInput.trim();
    if (!text) return;
    setAdresaLoading(true); setError('');
    const result = await geocodeAddress(text, '');
    setAdresaLoading(false);
    if (result) {
      setLocation({ lat: result.lat, lng: result.lng, text });
    } else {
      setError('Adresu se nepodařilo najít. Zkuste přesnější formát.');
    }
  };

  // ── Parsování vlastního datumu ───────────────────────────────
  const aplikovatVlastniDatum = () => {
    const parts = vlastniDatum.trim().split('.');
    if (parts.length < 2) { setError('Formát: D.M. nebo D.M.RRRR'); return; }
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
    if (!day || !month || day > 31 || month > 12) { setError('Neplatné datum.'); return; }
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setDatumProdeje(iso); setVlastniDatumActive(false); setError('');
  };

  // ── Výběr fotografie ─────────────────────────────────────────
  const pickPhoto = async () => {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
      if (!location) detectLocation();
    }
  };

  // ── GPS detekce ──────────────────────────────────────────────
  const detectLocation = () => {
    setGpsLoading(true); setError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolokace není v tomto prohlížeči dostupná.');
      setGpsLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const text = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, text }); setGpsLoading(false);
      },
      (err) => {
        setError(err.code === 1
          ? 'Povolte přístup k poloze v nastavení prohlížeče.'
          : 'Nepodařilo se zjistit polohu.');
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Odeslání ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!fotoUri || !location) return;
    setSubmitting(true); setError('');
    try {
      const uploaded = await uploadImage(fotoUri, 'stanky-dnes');
      if (!uploaded) throw new Error('Nepodařilo se nahrát fotografii.');
      const jesDnes = datumProdeje === isoDate(0);
      const stanek = await addStanekDnes(
        uploaded.url, location.lat, location.lng, location.text,
        poznamka.trim() || null,
        jesDnes ? null : datumProdeje
      );
      if (stanek.delete_token) {
        ulozMujStanek(stanek.id, stanek.delete_token);
        setCreatedId(stanek.id); setCreatedToken(stanek.delete_token);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Něco se pokazilo. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Smazání ──────────────────────────────────────────────────
  const handleDeleteExisting = async (stanek: MujStanek) => {
    if (!window.confirm('Smazat stánek?')) return;
    setDeletingId(stanek.id);
    try {
      await deleteStanekDnes(stanek.id, stanek.delete_token);
    } catch { /* already gone */ }
    finally {
      odstraňMujStanek(stanek.id);
      setExistingStanky(prev => prev.filter(s => s.id !== stanek.id));
      setDeletingId(null);
    }
  };

  const handleDelete = async () => {
    if (!createdId || !createdToken) return;
    setDeleting(true);
    try { await deleteStanekDnes(createdId, createdToken); odstraňMujStanek(createdId); router.replace('/'); }
    catch { setDeleting(false); }
  };

  const canSubmit = !!fotoUri && !!location && !submitting;

  // ── Úspěch ───────────────────────────────────────────────────
  if (success) {
    return (
      <View style={s.root}>
        <View style={s.successWrap}>
          <Text style={s.successEmoji}>✅</Text>
          <Text style={s.successTitle}>Stánek zveřejněn!</Text>
          <Text style={s.successDesc}>
            Zákazníci vás vidí na hlavní stránce.{'\n'}
            Záznam automaticky zmizí o půlnoci.
          </Text>
          <TouchableOpacity style={s.btnGreen} onPress={() => router.replace('/')}>
            <Text style={s.btnGreenText}>Zpět na hlavní stránku</Text>
          </TouchableOpacity>
          {createdId && createdToken && (
            <TouchableOpacity style={s.btnDelete} onPress={handleDelete} disabled={deleting}>
              {deleting
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Text style={s.btnDeleteText}>🗑️ Smazat stánek</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Formulář ─────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>🌿 Samopěstitelé</Text>
        <Text style={s.headerSub}>Přidat nabídku bez registrace</Text>
      </View>

      {/* BODY */}
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        <View style={s.columns}>

          {/* ── LEVÝ SLOUPEC – formulář ── */}
          <View style={s.leftCol}>

            <Text style={s.pageTitle}>Prodávám tady dnes</Text>
            <Text style={s.pageSubtitle}>Bez registrace · automaticky smazáno o půlnoci</Text>

            {/* Existující stánky */}
            {existingStanky.length > 0 && (
              <View style={s.mgmtCard}>
                <Text style={s.mgmtTitle}>🏪 Váš aktivní stánek</Text>
                <Text style={s.mgmtDesc}>Dnes jste přidali {existingStanky.length === 1 ? 'stánek' : 'stánky'}. Zmizí o půlnoci.</Text>
                {existingStanky.map(st => (
                  <View key={st.id} style={s.mgmtRow}>
                    <Text style={s.mgmtId} numberOfLines={1}>ID: {st.id.slice(0, 8)}…</Text>
                    <TouchableOpacity
                      style={s.mgmtDeleteBtn}
                      onPress={() => handleDeleteExisting(st)}
                      disabled={deletingId === st.id}
                    >
                      {deletingId === st.id
                        ? <ActivityIndicator size="small" color="#ef4444" />
                        : <Text style={s.mgmtDeleteText}>🗑️ Smazat</Text>
                      }
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* SEKCE: Foto */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>📷 Fotografie stánku</Text>
              <TouchableOpacity
                style={[s.photoArea, fotoUri && s.photoAreaFilled]}
                onPress={pickPhoto}
                activeOpacity={0.85}
              >
                {fotoUri ? (
                  <>
                    <Image source={{ uri: fotoUri }} style={s.photoPreview} />
                    <View style={s.changeOverlay}>
                      <Text style={s.changeText}>📷 Změnit fotografii</Text>
                    </View>
                  </>
                ) : (
                  <View style={s.photoPlaceholder}>
                    <Text style={s.photoEmoji}>📷</Text>
                    <Text style={s.photoLabel}>Klikněte pro výběr fotografie</Text>
                    <Text style={s.photoSub}>nebo přetáhněte soubor sem</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* SEKCE: Poloha */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>📍 Poloha stánku</Text>
              {location && (
                <View style={s.locationFound}>
                  <Text style={s.locationFoundText}>📍 {location.text}</Text>
                  <TouchableOpacity onPress={detectLocation} disabled={gpsLoading}>
                    <Text style={s.relocateLink}>
                      {gpsLoading ? 'Zjišťuji…' : 'Aktualizovat'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={s.adresaRow}>
                <TextInput
                  style={s.adresaInput}
                  placeholder="Zadejte adresu místa prodeje…"
                  placeholderTextColor="#9ca3af"
                  value={adresaInput}
                  onChangeText={setAdresaInput}
                  onSubmitEditing={hledatAdresu}
                  returnKeyType="search"
                />
                <TouchableOpacity
                  style={[s.adresaBtn, (adresaLoading || !adresaInput.trim()) && s.adresaBtnDisabled]}
                  onPress={hledatAdresu}
                  disabled={adresaLoading || !adresaInput.trim()}
                >
                  {adresaLoading
                    ? <ActivityIndicator size="small" color="#ffffff" />
                    : <Text style={s.adresaBtnText}>Hledat</Text>
                  }
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={[s.gpsBtn, gpsLoading && s.gpsBtnDisabled]}
                onPress={detectLocation}
                disabled={gpsLoading}
              >
                {gpsLoading
                  ? <ActivityIndicator size="small" color="#4caf50" />
                  : <Text style={s.gpsBtnText}>📡 Použít moji GPS polohu</Text>
                }
              </TouchableOpacity>
            </View>

            {/* SEKCE: Datum */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>📅 Kdy budete prodávat?</Text>
              <View style={s.chipRow}>
                {[isoDate(0), isoDate(1), isoDate(2)].map(iso => (
                  <TouchableOpacity
                    key={iso}
                    style={[s.chip, datumProdeje === iso && !vlastniDatumActive && s.chipActive]}
                    onPress={() => { setDatumProdeje(iso); setVlastniDatumActive(false); setError(''); }}
                  >
                    <Text style={[s.chipText, datumProdeje === iso && !vlastniDatumActive && s.chipTextActive]}>
                      {formatDatumLabel(iso)}
                    </Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={[s.chip, vlastniDatumActive && s.chipActive]}
                  onPress={() => setVlastniDatumActive(v => !v)}
                >
                  <Text style={[s.chipText, vlastniDatumActive && s.chipTextActive]}>Jiný</Text>
                </TouchableOpacity>
              </View>
              {vlastniDatumActive && (
                <View style={[s.adresaRow, { marginTop: 10 }]}>
                  <TextInput
                    style={s.adresaInput}
                    placeholder="D.M. nebo D.M.RRRR"
                    placeholderTextColor="#9ca3af"
                    value={vlastniDatum}
                    onChangeText={setVlastniDatum}
                    keyboardType="numeric"
                    onSubmitEditing={aplikovatVlastniDatum}
                    returnKeyType="done"
                  />
                  <TouchableOpacity style={s.adresaBtn} onPress={aplikovatVlastniDatum}>
                    <Text style={s.adresaBtnText}>OK</Text>
                  </TouchableOpacity>
                </View>
              )}
              {!vlastniDatumActive && (
                <Text style={s.datumValue}>Prodej: <Text style={{ fontWeight: '600', color: '#1a1a1a' }}>{formatDatumLabel(datumProdeje)}</Text></Text>
              )}
            </View>

            {/* SEKCE: Popis */}
            <View style={s.section}>
              <Text style={s.sectionLabel}>✏️ Popis stánku (nepovinné)</Text>
              <TextInput
                style={s.textarea}
                placeholder="Co prodáváte? Zelenina, ovoce, vejce… cena, hodiny…"
                placeholderTextColor="#9ca3af"
                value={poznamka}
                onChangeText={setPoznamka}
                multiline
                numberOfLines={4}
                maxLength={200}
              />
              {poznamka.length > 0 && (
                <Text style={s.charCount}>{poznamka.length}/200</Text>
              )}
            </View>

            {/* Error */}
            {!!error && (
              <View style={s.errorBox}>
                <Text style={s.errorText}>⚠️ {error}</Text>
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[s.btnSubmit, !canSubmit && s.btnSubmitDisabled]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={s.btnSubmitText}>
                  {!fotoUri
                    ? '📷 Nejprve vyberte fotografii'
                    : !location
                      ? '📍 Potřebujeme vaši polohu'
                      : '🏪 Zveřejnit nabídku'}
                </Text>
              )}
            </TouchableOpacity>

            <Text style={s.disclaimer}>
              Bez registrace · pouze dnes · smaže se o půlnoci
            </Text>

          </View>

          {/* ── PRAVÝ SLOUPEC – preview ── */}
          <View style={s.rightCol}>

            {/* Preview karta */}
            <View style={s.previewCard}>
              <Text style={s.previewHeadline}>Náhled nabídky</Text>
              <Text style={s.previewSub}>Takto uvidí zákazníci vaši nabídku</Text>

              <View style={s.previewInner}>
                {/* Foto preview */}
                <View style={s.previewPhotoWrap}>
                  {fotoUri ? (
                    <Image source={{ uri: fotoUri }} style={s.previewPhoto} />
                  ) : (
                    <View style={s.previewPhotoEmpty}>
                      <Text style={s.previewPhotoEmptyIcon}>📷</Text>
                      <Text style={s.previewPhotoEmptyText}>Foto stánku</Text>
                    </View>
                  )}
                  <View style={s.previewBadge}>
                    <Text style={s.previewBadgeText}>🏪 Dnes zde</Text>
                  </View>
                </View>

                {/* Info */}
                <View style={s.previewInfo}>
                  <Text style={s.previewLocation}>
                    {location ? `📍 ${location.text}` : '📍 Poloha bude doplněna'}
                  </Text>
                  <Text style={s.previewDate}>
                    📅 {formatDatumLabel(datumProdeje)}
                  </Text>
                  {poznamka ? (
                    <Text style={s.previewNote} numberOfLines={3}>{poznamka}</Text>
                  ) : (
                    <Text style={s.previewNotePlaceholder}>Popis stánku bude zobrazen zde…</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Mapa */}
            <View style={s.mapCard}>
              <Text style={s.mapHeadline}>📍 Poloha na mapě</Text>
              <View style={s.mapWrap}>
                {location ? (
                  <MapEmbed lat={location.lat} lng={location.lng} />
                ) : (
                  <View style={s.mapEmpty}>
                    <Text style={s.mapEmptyIcon}>🗺️</Text>
                    <Text style={s.mapEmptyText}>
                      Zadejte adresu nebo použijte GPS{'\n'}pro zobrazení polohy na mapě
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Info box */}
            <View style={s.infoCard}>
              <Text style={s.infoTitle}>ℹ️ Jak to funguje?</Text>
              <Text style={s.infoItem}>📷 Vyfokuste váš stánek nebo produkty</Text>
              <Text style={s.infoItem}>📍 Poloha pomůže zákazníkům vás najít</Text>
              <Text style={s.infoItem}>🕛 Záznam automaticky zmizí o půlnoci</Text>
              <Text style={s.infoItem}>🔒 Registrace není potřeba</Text>
            </View>

          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ── Styly ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },

  // Header
  header: {
    height: 60, backgroundColor: '#ffffff',
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 16,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { padding: 6 },
  backArrow: { fontSize: 20, color: '#1a1a1a' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', flex: 1 },
  headerSub: { fontSize: 13, color: '#6b7280' },

  // Columns
  body: { flex: 1 },
  columns: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 32, gap: 32, maxWidth: 1200, alignSelf: 'center' as any, width: '100%' as any,
  },

  // LEFT
  leftCol: { maxWidth: 560, width: '100%' as any, gap: 0 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  pageSubtitle: { fontSize: 15, color: '#6b7280', marginBottom: 24 },

  // Sections
  section: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 20, marginBottom: 16,
  },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginBottom: 12 },

  // Foto
  photoArea: {
    height: 220, borderRadius: 12, overflow: 'hidden' as any,
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed' as any,
    backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer' as any,
  },
  photoAreaFilled: { borderStyle: 'solid' as any, borderColor: '#4caf50' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeOverlay: {
    position: 'absolute' as any, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8, alignItems: 'center',
  },
  changeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  photoPlaceholder: { alignItems: 'center', gap: 8 },
  photoEmoji: { fontSize: 48 },
  photoLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  photoSub: { fontSize: 13, color: '#9ca3af' },

  // Poloha
  locationFound: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  locationFoundText: { fontSize: 14, color: '#166534', fontWeight: '600', flex: 1 },
  relocateLink: { fontSize: 13, color: '#4caf50', fontWeight: '600', marginLeft: 8 },
  adresaRow: { flexDirection: 'row', gap: 8 },
  adresaInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1a1a1a',
    backgroundColor: '#ffffff', outlineStyle: 'none' as any,
  },
  adresaBtn: {
    backgroundColor: '#4caf50', borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 18, justifyContent: 'center', alignItems: 'center',
  },
  adresaBtnDisabled: { opacity: 0.5 },
  adresaBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  gpsBtn: {
    marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#4caf50', borderRadius: 12,
    paddingVertical: 10, backgroundColor: '#f0fdf4',
  },
  gpsBtnDisabled: { opacity: 0.5 },
  gpsBtnText: { fontSize: 14, color: '#4caf50', fontWeight: '600' },

  // Datum chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 18, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  chipText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  datumValue: { fontSize: 13, color: '#6b7280', marginTop: 10 },

  // Textarea
  textarea: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#1a1a1a',
    minHeight: 100, textAlignVertical: 'top',
    outlineStyle: 'none' as any,
  },
  charCount: { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 6 },

  // Error
  errorBox: {
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 14,
    marginBottom: 16, borderLeftWidth: 3, borderLeftColor: '#f87171',
  },
  errorText: { fontSize: 13, color: '#dc2626' },

  // Submit
  btnSubmit: {
    backgroundColor: '#4caf50', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
  },
  btnSubmitDisabled: { opacity: 0.45 },
  btnSubmitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 32 },

  // Management
  mgmtCard: {
    backgroundColor: '#fff7ed', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#fed7aa', marginBottom: 16,
  },
  mgmtTitle: { fontSize: 14, fontWeight: '700', color: '#c2410c', marginBottom: 4 },
  mgmtDesc: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  mgmtRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  mgmtId: { fontSize: 11, color: '#9ca3af', flex: 1 },
  mgmtDeleteBtn: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center' },
  mgmtDeleteText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },

  // RIGHT
  rightCol: { flex: 1, minWidth: 300, gap: 16 },

  previewCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 20,
  },
  previewHeadline: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  previewSub: { fontSize: 13, color: '#6b7280', marginBottom: 16 },
  previewInner: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' as any },
  previewPhotoWrap: { height: 180, backgroundColor: '#f3f4f6', position: 'relative' as any },
  previewPhoto: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewPhotoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 8 },
  previewPhotoEmptyIcon: { fontSize: 40 },
  previewPhotoEmptyText: { fontSize: 13, color: '#9ca3af' },
  previewBadge: {
    position: 'absolute' as any, top: 12, left: 12,
    backgroundColor: '#4caf50', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  previewBadgeText: { fontSize: 12, color: '#ffffff', fontWeight: '700' },
  previewInfo: { padding: 14, gap: 6 },
  previewLocation: { fontSize: 14, color: '#374151', fontWeight: '600' },
  previewDate: { fontSize: 13, color: '#6b7280' },
  previewNote: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginTop: 4 },
  previewNotePlaceholder: { fontSize: 13, color: '#d1d5db', fontStyle: 'italic' as any },

  mapCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 20,
  },
  mapHeadline: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  mapWrap: { height: 260, borderRadius: 12, overflow: 'hidden' as any, backgroundColor: '#f3f4f6' },
  mapEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  mapEmptyIcon: { fontSize: 40 },
  mapEmptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  infoCard: {
    backgroundColor: '#f0fdf4', borderRadius: 16,
    borderWidth: 1, borderColor: '#bbf7d0', padding: 20, gap: 8,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 4 },
  infoItem: { fontSize: 13, color: '#374151', lineHeight: 22 },

  // Úspěch
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  successEmoji: { fontSize: 72, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  successDesc: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  btnGreen: { backgroundColor: '#4caf50', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 36 },
  btnGreenText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnDelete: {
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center',
  },
  btnDeleteText: { fontSize: 13, color: '#ef4444' },
});
