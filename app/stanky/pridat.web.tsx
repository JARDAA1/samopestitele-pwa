import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ActivityIndicator, ScrollView, TextInput, Switch, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/features/profil/services/imageUploadService';
import { addStanekDnes, deleteStanekDnes } from '@/features/stanky/services/stankyDnesService';
import { geocodeAddress } from '@/features/mapa/services/geocodingService';

// ── localStorage ─────────────────────────────────────────────────
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
  } catch { }
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

function formatZmizeni(iso: string): string {
  const dnes = isoDate(0);
  const zitra = isoDate(1);
  if (iso === dnes)  return 'dnes o půlnoci';
  if (iso === zitra) return 'zítra o půlnoci';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)}.${parseInt(m)}. o půlnoci`;
}

// ── Reverse geocoding ────────────────────────────────────────────
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const resp = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=cs`,
      { headers: { 'User-Agent': 'samopestitele-app/1.0' } }
    );
    const { address: a } = await resp.json();
    if (!a) return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    const suburb = a.suburb || a.quarter || a.neighbourhood || a.village;
    const city   = a.city || a.town || a.municipality;
    if (suburb && city) return `${city} – ${suburb}`;
    if (city) return city;
    if (a.county) return a.county;
  } catch { }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// ── Mini mapa ────────────────────────────────────────────────────
function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  const delta = 0.04;
  const bbox  = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src   = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  // @ts-ignore
  return <iframe src={src} title="Poloha" style={{ width: '100%', height: '100%', border: 'none' } as any} />;
}

type LocationState = { lat: number; lng: number; text: string };

const DATE_CHIPS = [
  { label: 'Dnes',        iso: () => isoDate(0) },
  { label: 'Zítra',       iso: () => isoDate(1) },
  { label: 'Tento týden', iso: () => isoDate(7) },
];

// ── Hlavní komponenta ────────────────────────────────────────────
export default function PridatStanekWeb() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  // Foto
  const [fotoUri, setFotoUri]         = useState<string | null>(null);
  // Datum
  const [datumChip, setDatumChip]     = useState<string>(isoDate(0));
  const [vlastniActive, setVlastniActive] = useState(false);
  const [vlastniInput, setVlastniInput] = useState('');
  // Poloha
  const [location, setLocation]       = useState<LocationState | null>(null);
  const [gpsLoading, setGpsLoading]   = useState(false);
  const [adresaInput, setAdresaInput] = useState('');
  const [adresaLoading, setAdresaLoading] = useState(false);
  // Kontakt
  const [kontaktOn, setKontaktOn]     = useState(false);
  const [telefon, setTelefon]         = useState('');
  // Odeslání
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState('');
  const [success, setSuccess]         = useState(false);
  const [createdId, setCreatedId]     = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [deleting, setDeleting]       = useState(false);
  // Správa existujících
  const [existingStanky, setExistingStanky] = useState<MujStanek[]>([]);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  useEffect(() => { setExistingStanky(nactiMojeStanky()); }, []);

  const activeDatum = vlastniActive ? datumChip : datumChip;

  // ── Foto ─────────────────────────────────────────────────────
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

  // ── GPS ──────────────────────────────────────────────────────
  const detectLocation = () => {
    setGpsLoading(true); setError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolokace není dostupná.'); setGpsLoading(false); return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const text = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, text }); setGpsLoading(false);
      },
      (err) => {
        setError(err.code === 1 ? 'Povolte přístup k poloze v prohlížeči.' : 'Nepodařilo se zjistit polohu.');
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Adresa ───────────────────────────────────────────────────
  const hledatAdresu = async () => {
    const text = adresaInput.trim();
    if (!text) return;
    setAdresaLoading(true); setError('');
    const result = await geocodeAddress(text, '');
    setAdresaLoading(false);
    if (result) setLocation({ lat: result.lat, lng: result.lng, text });
    else setError('Adresu se nepodařilo najít.');
  };

  // ── Vlastní datum ────────────────────────────────────────────
  const aplikovatVlastni = () => {
    const parts = vlastniInput.trim().split('.');
    if (parts.length < 2) { setError('Formát: D.M. nebo D.M.RRRR'); return; }
    const day = parseInt(parts[0]), month = parseInt(parts[1]);
    const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
    if (!day || !month || day > 31 || month > 12) { setError('Neplatné datum.'); return; }
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setDatumChip(iso); setVlastniActive(false); setError('');
  };

  // ── Odeslání ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!fotoUri || !location) return;
    setSubmitting(true); setError('');
    try {
      const uploaded = await uploadImage(fotoUri, 'stanky-dnes');
      if (!uploaded) throw new Error('Nepodařilo se nahrát fotografii.');
      const jesDnes = activeDatum === isoDate(0);
      const stanek  = await addStanekDnes(
        uploaded.url, location.lat, location.lng, location.text,
        kontaktOn && telefon.trim() ? telefon.trim() : null,
        jesDnes ? null : activeDatum
      );
      if (stanek.delete_token) {
        ulozMujStanek(stanek.id, stanek.delete_token);
        setCreatedId(stanek.id); setCreatedToken(stanek.delete_token);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Něco se pokazilo.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Smazání ──────────────────────────────────────────────────
  const handleDeleteExisting = async (stanek: MujStanek) => {
    if (!window.confirm('Smazat stánek?')) return;
    setDeletingId(stanek.id);
    try { await deleteStanekDnes(stanek.id, stanek.delete_token); }
    catch { }
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
          <Ionicons name="checkmark-circle" size={72} color="#4caf50" style={{ marginBottom: 16 }} />
          <Text style={s.successTitle}>Zveřejněno! 🎉</Text>
          <Text style={s.successDesc}>
            Zákazníci vás vidí na mapě.{'\n'}
            Nabídka zmizí {formatZmizeni(activeDatum)}.
          </Text>
          <TouchableOpacity style={s.btnGreen} onPress={() => router.replace('/')}>
            <Text style={s.btnGreenText}>Zpět na hlavní stránku</Text>
          </TouchableOpacity>
          {createdId && createdToken && (
            <TouchableOpacity style={s.btnDeleteSmall} onPress={handleDelete} disabled={deleting}>
              {deleting
                ? <ActivityIndicator size="small" color="#ef4444" />
                : <Text style={s.btnDeleteSmallText}>Smazat nabídku</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Formulář ─────────────────────────────────────────────────
  const FormPanel = () => (
    <ScrollView style={s.formScroll} contentContainerStyle={s.formContent} showsVerticalScrollIndicator={false}>

      {/* Existující stánky */}
      {existingStanky.length > 0 && (
        <View style={s.mgmtCard}>
          <Text style={s.mgmtTitle}>🏪 Váš aktivní stánek — zmizí o půlnoci</Text>
          {existingStanky.map(st => (
            <View key={st.id} style={s.mgmtRow}>
              <Text style={s.mgmtId} numberOfLines={1}>ID: {st.id.slice(0, 8)}…</Text>
              <TouchableOpacity style={s.mgmtDeleteBtn} onPress={() => handleDeleteExisting(st)} disabled={deletingId === st.id}>
                {deletingId === st.id
                  ? <ActivityIndicator size="small" color="#ef4444" />
                  : <Text style={s.mgmtDeleteText}>Smazat</Text>
                }
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* ── KROK 1: Foto ── */}
      <Text style={s.stepLabel}>1. Fotografie</Text>
      <TouchableOpacity
        style={[s.photoArea, fotoUri && s.photoAreaFilled]}
        onPress={pickPhoto}
        activeOpacity={0.85}
      >
        {fotoUri ? (
          <>
            <Image source={{ uri: fotoUri }} style={s.photoPreview} />
            <View style={s.photoChangeOverlay}>
              <Ionicons name="camera-outline" size={18} color="#ffffff" />
              <Text style={s.photoChangeText}>Změnit fotku</Text>
            </View>
          </>
        ) : (
          <View style={s.photoPlaceholder}>
            <Text style={s.photoEmoji}>📷</Text>
            <Text style={s.photoLabel}>Vyfoť svůj stánek nebo nabídku</Text>
            <Text style={s.photoSub}>Klikni pro výběr fotografie</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* ── KROK 2: Kdy ── */}
      <Text style={s.stepLabel}>2. Kdy a jak dlouho?</Text>
      <View style={s.chipRow}>
        {DATE_CHIPS.map(({ label, iso }) => {
          const val = iso();
          const active = datumChip === val && !vlastniActive;
          return (
            <TouchableOpacity
              key={label}
              style={[s.chip, active && s.chipActive]}
              onPress={() => { setDatumChip(val); setVlastniActive(false); setError(''); }}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          style={[s.chip, vlastniActive && s.chipActive]}
          onPress={() => setVlastniActive(v => !v)}
        >
          <Text style={[s.chipText, vlastniActive && s.chipTextActive]}>Vlastní datum</Text>
        </TouchableOpacity>
      </View>

      {vlastniActive && (
        <View style={s.adresaRow}>
          <TextInput
            style={s.adresaInput}
            placeholder="D.M. nebo D.M.RRRR"
            placeholderTextColor="#9ca3af"
            value={vlastniInput}
            onChangeText={setVlastniInput}
            keyboardType="numeric"
            onSubmitEditing={aplikovatVlastni}
            returnKeyType="done"
          />
          <TouchableOpacity style={s.adresaBtn} onPress={aplikovatVlastni}>
            <Text style={s.adresaBtnText}>OK</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={s.zmizeniRow}>
        <Ionicons name="time-outline" size={14} color="#6b7280" />
        <Text style={s.zmizeniText}>Nabídka zmizí: <Text style={s.zmizeniValue}>{formatZmizeni(activeDatum)}</Text></Text>
      </View>

      {/* ── KROK 3: Kde ── */}
      <Text style={s.stepLabel}>3. Kde prodáváš?</Text>

      {location && (
        <View style={s.locationBar}>
          <Ionicons name="checkmark-circle" size={18} color="#166534" />
          <Text style={s.locationBarText} numberOfLines={1}>{location.text}</Text>
          <TouchableOpacity onPress={() => setLocation(null)}>
            <Ionicons name="close-circle" size={18} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={[s.gpsBtn, gpsLoading && { opacity: 0.6 }]} onPress={detectLocation} disabled={gpsLoading} activeOpacity={0.85}>
        {gpsLoading
          ? <ActivityIndicator size="small" color="#ffffff" />
          : <><Ionicons name="locate" size={18} color="#ffffff" /><Text style={s.gpsBtnText}>  Použít moji GPS polohu</Text></>
        }
      </TouchableOpacity>

      <Text style={s.orText}>nebo zadej adresu</Text>

      <View style={s.adresaRow}>
        <TextInput
          style={s.adresaInput}
          placeholder="Náměstí Republiky, Praha…"
          placeholderTextColor="#9ca3af"
          value={adresaInput}
          onChangeText={setAdresaInput}
          onSubmitEditing={hledatAdresu}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={[s.adresaBtn, (adresaLoading || !adresaInput.trim()) && { opacity: 0.5 }]}
          onPress={hledatAdresu}
          disabled={adresaLoading || !adresaInput.trim()}
        >
          {adresaLoading
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <Ionicons name="search" size={16} color="#ffffff" />
          }
        </TouchableOpacity>
      </View>

      {/* ── KROK 4: Kontakt ── */}
      <View style={s.kontaktRow}>
        <Text style={s.kontaktLabel}>4. Chceš přidat kontakt?</Text>
        <Switch
          value={kontaktOn}
          onValueChange={setKontaktOn}
          trackColor={{ false: '#e5e7eb', true: '#6aa84f' }}
          thumbColor="#ffffff"
        />
      </View>

      {kontaktOn && (
        <TextInput
          style={s.telefonInput}
          placeholder="+420 123 456 789"
          placeholderTextColor="#9ca3af"
          value={telefon}
          onChangeText={setTelefon}
          keyboardType="phone-pad"
        />
      )}

      {/* Chyba */}
      {!!error && (
        <View style={s.errorBox}>
          <Ionicons name="warning-outline" size={15} color="#dc2626" />
          <Text style={s.errorText}> {error}</Text>
        </View>
      )}

      {/* Submit */}
      <TouchableOpacity
        style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit}
        activeOpacity={0.85}
      >
        {submitting
          ? <ActivityIndicator color="#ffffff" />
          : <Text style={s.submitBtnText}>
              {!fotoUri ? '📷 Nejprve vyber fotku' : !location ? '📍 Potřebujeme polohu' : 'Zveřejnit →'}
            </Text>
        }
      </TouchableOpacity>

      <Text style={s.disclaimer}>Automaticky smazáno · bez registrace</Text>
    </ScrollView>
  );

  // ── Pravý panel – preview ─────────────────────────────────────
  const PreviewPanel = () => (
    <View style={s.rightCol}>
      <View style={s.previewCard}>
        <Text style={s.previewTitle}>Náhled nabídky</Text>
        <Text style={s.previewSub}>Takto uvidí zákazníci tvoji nabídku</Text>
        <View style={s.previewInner}>
          <View style={s.previewPhoto}>
            {fotoUri
              ? <Image source={{ uri: fotoUri }} style={s.previewImg} />
              : <View style={s.previewPhotoEmpty}>
                  <Ionicons name="camera-outline" size={32} color="#9ca3af" />
                  <Text style={s.previewPhotoEmptyText}>Foto stánku</Text>
                </View>
            }
            <View style={s.previewBadge}>
              <Text style={s.previewBadgeText}>🏪 Dnes zde</Text>
            </View>
          </View>
          <View style={s.previewInfo}>
            <View style={s.previewRow}>
              <Ionicons name="location-outline" size={13} color="#374151" />
              <Text style={s.previewLocation}>{location ? location.text : 'Poloha bude doplněna'}</Text>
            </View>
            <View style={s.previewRow}>
              <Ionicons name="time-outline" size={13} color="#6b7280" />
              <Text style={s.previewDate}>Zmizí {formatZmizeni(activeDatum)}</Text>
            </View>
            {kontaktOn && telefon ? (
              <View style={s.previewRow}>
                <Ionicons name="call" size={13} color="#6b7280" />
                <Text style={s.previewDate}>{telefon}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      {location && (
        <View style={s.mapCard}>
          <Text style={s.previewTitle}>Poloha na mapě</Text>
          <View style={s.mapWrap}>
            <MapEmbed lat={location.lat} lng={location.lng} />
          </View>
        </View>
      )}

      <View style={s.infoCard}>
        <Text style={s.infoTitle}>Jak to funguje?</Text>
        {[
          { icon: 'camera-outline' as const,     text: 'Vyfoť stánek nebo produkty' },
          { icon: 'location-outline' as const,   text: 'Poloha pomůže zákazníkům vás najít' },
          { icon: 'time-outline' as const,       text: 'Nabídka automaticky zmizí' },
          { icon: 'lock-closed-outline' as const, text: 'Bez registrace' },
        ].map(({ icon, text }) => (
          <View key={text} style={s.infoRow}>
            <Ionicons name={icon} size={14} color="#166534" />
            <Text style={s.infoText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={18} color="#1a1a1a" />
          <Text style={s.backText}>Samopěstitelé</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Prodávám tady dnes</Text>
        <View style={{ width: 100 }} />
      </View>

      {/* Body */}
      <View style={s.body}>
        <FormPanel />
        {isDesktop && <PreviewPanel />}
      </View>
    </View>
  );
}

// ── Styly ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f1e8' },

  // Header
  header: {
    height: 56, backgroundColor: '#ffffff',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', paddingHorizontal: 20,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, width: 100 },
  backText: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  headerTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },

  // Body
  body: { flex: 1, flexDirection: 'row' },

  // Form panel
  formScroll: { flex: 1 },
  formContent: {
    padding: 24, paddingBottom: 48,
    maxWidth: 560, width: '100%' as any, alignSelf: 'center' as any,
  },

  // Steps
  stepLabel: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginTop: 20, marginBottom: 12 },

  // Foto
  photoArea: {
    height: 200, borderRadius: 14, overflow: 'hidden' as any,
    borderWidth: 2, borderColor: '#d1d5db', borderStyle: 'dashed' as any,
    backgroundColor: '#ffffff', justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer' as any,
  },
  photoAreaFilled: { borderStyle: 'solid' as any, borderColor: '#4caf50' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoChangeOverlay: {
    position: 'absolute' as any, bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', paddingVertical: 8,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  photoChangeText: { color: '#ffffff', fontSize: 13, fontWeight: '600' },
  photoPlaceholder: { alignItems: 'center', gap: 8 },
  photoEmoji: { fontSize: 40 },
  photoLabel: { fontSize: 15, fontWeight: '600', color: '#374151' },
  photoSub: { fontSize: 13, color: '#9ca3af' },

  // Date chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' as any, gap: 8, marginBottom: 10 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#ffffff',
  },
  chipActive: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
  chipText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  zmizeniRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  zmizeniText: { fontSize: 13, color: '#6b7280' },
  zmizeniValue: { fontWeight: '700', color: '#1a1a1a' },

  // Poloha
  locationBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  locationBarText: { flex: 1, fontSize: 14, color: '#166534', fontWeight: '600' },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6aa84f', borderRadius: 12, paddingVertical: 14, marginBottom: 10,
  },
  gpsBtnText: { fontSize: 14, color: '#ffffff', fontWeight: '700' },
  orText: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 10 },
  adresaRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  adresaInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1a1a1a',
    backgroundColor: '#ffffff', outlineStyle: 'none' as any,
  },
  adresaBtn: {
    backgroundColor: '#6aa84f', borderRadius: 10,
    paddingVertical: 11, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
    minWidth: 46,
  },
  adresaBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  // Kontakt
  kontaktRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: '#e5e7eb', marginTop: 20, marginBottom: 8,
  },
  kontaktLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  telefonInput: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a1a1a',
    backgroundColor: '#ffffff', outlineStyle: 'none' as any, marginBottom: 4,
  },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 12,
    marginTop: 12, borderLeftWidth: 3, borderLeftColor: '#f87171',
  },
  errorText: { fontSize: 13, color: '#dc2626', flex: 1 },

  // Submit
  submitBtn: {
    backgroundColor: '#6aa84f', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginTop: 20, marginBottom: 10,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitBtnText: { color: '#ffffff', fontSize: 17, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#9ca3af', textAlign: 'center' },

  // Správa stánků
  mgmtCard: {
    backgroundColor: '#fff7ed', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#fed7aa', marginBottom: 8,
  },
  mgmtTitle: { fontSize: 13, fontWeight: '700', color: '#c2410c', marginBottom: 8 },
  mgmtRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 8, paddingVertical: 8,
    paddingHorizontal: 10, borderWidth: 1, borderColor: '#e5e7eb', marginTop: 4,
  },
  mgmtId: { fontSize: 11, color: '#9ca3af', flex: 1 },
  mgmtDeleteBtn: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#fca5a5' },
  mgmtDeleteText: { fontSize: 12, color: '#ef4444', fontWeight: '600' },

  // Úspěch
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  successDesc: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  btnGreen: {
    backgroundColor: '#6aa84f', borderRadius: 14,
    paddingVertical: 14, paddingHorizontal: 36, marginBottom: 12,
  },
  btnGreenText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnDeleteSmall: {
    paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5',
  },
  btnDeleteSmallText: { fontSize: 13, color: '#ef4444' },

  // Pravý panel
  rightCol: { width: 360, backgroundColor: '#f5f1e8', padding: 24, gap: 16 },
  previewCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 18,
  },
  previewTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 4 },
  previewSub: { fontSize: 12, color: '#9ca3af', marginBottom: 14 },
  previewInner: { borderRadius: 12, overflow: 'hidden' as any, borderWidth: 1, borderColor: '#e5e7eb' },
  previewPhoto: { height: 160, backgroundColor: '#f3f4f6', position: 'relative' as any },
  previewImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  previewPhotoEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  previewPhotoEmptyText: { fontSize: 12, color: '#9ca3af' },
  previewBadge: {
    position: 'absolute' as any, top: 10, left: 10,
    backgroundColor: '#6aa84f', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  previewBadgeText: { fontSize: 11, color: '#ffffff', fontWeight: '700' },
  previewInfo: { padding: 12, gap: 6 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewLocation: { fontSize: 13, color: '#374151', fontWeight: '600', flex: 1 },
  previewDate: { fontSize: 12, color: '#6b7280', flex: 1 },
  mapCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 18,
  },
  mapWrap: { height: 220, borderRadius: 10, overflow: 'hidden' as any, backgroundColor: '#f3f4f6', marginTop: 10 },
  infoCard: {
    backgroundColor: '#f0fdf4', borderRadius: 16,
    borderWidth: 1, borderColor: '#bbf7d0', padding: 16,
  },
  infoTitle: { fontSize: 13, fontWeight: '700', color: '#166534', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 13, color: '#374151' },
});
