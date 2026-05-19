/**
 * Stránka: Přidat stánek dnes
 * Bez registrace — 1 foto + GPS → zveřejnit do půlnoci.
 */
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ScrollView, TextInput, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { uploadImage } from '@/features/profil/services/imageUploadService';
import { addStanekDnes, deleteStanekDnes } from '@/features/stanky/services/stankyDnesService';
import { geocodeAddress } from '@/features/mapa/services/geocodingService';

// ─── localStorage helper (web + fallback) ─────────────────────────────────────

const STORAGE_KEY = 'samopestitele_moje_stanky';

type MujStanek = { id: string; delete_token: string };

function nactiMojeStanky(): MujStanek[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch { return []; }
}

function ulozMujStanek(id: string, delete_token: string) {
  try {
    const arr = nactiMojeStanky();
    arr.push({ id, delete_token });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { /* ignoruj – safari private mode apod. */ }
}

function odstraňMujStanek(id: string) {
  try {
    const arr = nactiMojeStanky().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { }
}

// ─── Reverse geocoding ────────────────────────────────────────────────────────

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

// ─── Typy ─────────────────────────────────────────────────────────────────────

type LocationState = { lat: number; lng: number; text: string };

// ─── Hlavní komponenta ────────────────────────────────────────────────────────

// Vrátí YYYY-MM-DD pro dnešek + offset dnů
function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Formátuje YYYY-MM-DD na "Dnes", "Zítra" nebo "D.M."
function formatDatumLabel(iso: string): string {
  const dnes = isoDate(0);
  const zitra = isoDate(1);
  if (iso === dnes) return 'Dnes';
  if (iso === zitra) return 'Zítra';
  const [y, m, d] = iso.split('-');
  return `${parseInt(d)}.${parseInt(m)}.${y}`;
}

export default function PridatStanek() {
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

  // Adresa — ruční zadání
  const [adresaInput, setAdresaInput] = useState('');
  const [adresaLoading, setAdresaLoading] = useState(false);

  // Datum prodeje
  const [datumProdeje, setDatumProdeje] = useState<string>(isoDate(0)); // default dnes
  const [vlastniDatum, setVlastniDatum] = useState(''); // DD.MM.YYYY
  const [vlastniDatumActive, setVlastniDatumActive] = useState(false);

  // Načti existující stánky z localStorage při startu
  useEffect(() => {
    setExistingStanky(nactiMojeStanky());
  }, []);

  // ── Hledání adresy ───────────────────────────────────────────────────────

  const hledatAdresu = async () => {
    const text = adresaInput.trim();
    if (!text) return;
    setAdresaLoading(true);
    setError('');
    const result = await geocodeAddress(text, '');
    setAdresaLoading(false);
    if (result) {
      const label = text;
      setLocation({ lat: result.lat, lng: result.lng, text: label });
    } else {
      setError('Adresu se nepodařilo najít. Zkuste přesnější formát, např. "Náměstí Republiky, Praha".');
    }
  };

  // ── Parsování vlastního datumu DD.MM.YYYY → YYYY-MM-DD ───────────────────

  const aplikovatVlastniDatum = () => {
    const parts = vlastniDatum.trim().split('.');
    if (parts.length < 2) { setError('Zadejte datum ve formátu D.M. nebo D.M.RRRR'); return; }
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
    if (!day || !month || day > 31 || month > 12) { setError('Neplatné datum.'); return; }
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setDatumProdeje(iso);
    setVlastniDatumActive(false);
    setError('');
  };

  // ── Výběr fotografie ──────────────────────────────────────────────────────

  const pickPhoto = async () => {
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
      aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUri(result.assets[0].uri);
      if (!location) detectLocation();   // auto-detekce polohy při prvním výběru
    }
  };

  // ── Detekce GPS ───────────────────────────────────────────────────────────

  const detectLocation = () => {
    setGpsLoading(true);
    setError('');
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setError('Geolokace není v tomto prohlížeči dostupná.');
      setGpsLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const text = await reverseGeocode(lat, lng);
        setLocation({ lat, lng, text });
        setGpsLoading(false);
      },
      (err) => {
        const denied = err.code === 1;
        setError(denied
          ? 'Povolte přístup k poloze v nastavení prohlížeče.'
          : 'Nepodařilo se zjistit polohu. Zkuste to znovu.');
        setGpsLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // ── Odeslání ──────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!fotoUri || !location) return;
    setSubmitting(true);
    setError('');
    try {
      const uploaded = await uploadImage(fotoUri, 'stanky-dnes');
      if (!uploaded) throw new Error('Nepodařilo se nahrát fotografii. Zkuste to znovu.');
      const jesDnes = datumProdeje === isoDate(0);
      const stanek = await addStanekDnes(
        uploaded.url, location.lat, location.lng, location.text,
        poznamka.trim() || null,
        jesDnes ? null : datumProdeje
      );
      if (stanek.delete_token) {
        ulozMujStanek(stanek.id, stanek.delete_token);
        setCreatedId(stanek.id);
        setCreatedToken(stanek.delete_token);
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Něco se pokazilo. Zkuste to znovu.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Smazání existujícího stánku (ze sekce správy) ────────────────────────

  const handleDeleteExisting = async (stanek: MujStanek) => {
    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Smazat stánek?')
      : true;
    if (!confirmed) return;
    setDeletingId(stanek.id);
    try {
      await deleteStanekDnes(stanek.id, stanek.delete_token);
      odstraňMujStanek(stanek.id);
      setExistingStanky(prev => prev.filter(s => s.id !== stanek.id));
    } catch {
      /* stánek pravděpodobně už neexistuje – odebereme ze seznamu */
      odstraňMujStanek(stanek.id);
      setExistingStanky(prev => prev.filter(s => s.id !== stanek.id));
    } finally {
      setDeletingId(null);
    }
  };

  // ── Úspěch ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!createdId || !createdToken) return;
    setDeleting(true);
    try {
      await deleteStanekDnes(createdId, createdToken);
      odstraňMujStanek(createdId);
      router.replace('/');
    } catch {
      setDeleting(false);
    }
  };

  if (success) {
    return (
      <SafeAreaView style={s.safeArea} edges={['top', 'bottom']}>
        <View style={s.successWrap}>
          <Text style={s.successEmoji}>✅</Text>
          <Text style={s.successTitle}>Stánek zveřejněn!</Text>
          <Text style={s.successDesc}>
            Zákazníci vás vidí na hlavní stránce.{'\n'}
            Záznam automaticky zmizí o půlnoci.
          </Text>
          <TouchableOpacity style={s.homeBtn} onPress={() => router.replace('/')}>
            <Text style={s.homeBtnText}>Zpět na hlavní stránku</Text>
          </TouchableOpacity>
          {createdId && createdToken && (
            <TouchableOpacity
              style={s.deleteBtn}
              onPress={handleDelete}
              disabled={deleting}
            >
              {deleting
                ? <ActivityIndicator size="small" color="#FF6B6B" />
                : <Text style={s.deleteBtnText}>🗑️ Smazat stánek</Text>
              }
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  const canSubmit = !!fotoUri && !!location && !submitting;

  // ── Formulář ──────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Prodávám tady dnes</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          Platform.OS === 'web' && { maxWidth: 600, alignSelf: 'center' as const, width: '100%' },
        ]}
      >

        {/* Správa existujících stánků */}
        {existingStanky.length > 0 && (
          <View style={s.mgmtCard}>
            <Text style={s.mgmtTitle}>🏪 Váš aktivní stánek</Text>
            <Text style={s.mgmtDesc}>
              Dnes jste přidali {existingStanky.length === 1 ? 'stánek' : 'stánky'}.
              Zmizí automaticky o půlnoci.
            </Text>
            {existingStanky.map(stanek => (
              <View key={stanek.id} style={s.mgmtRow}>
                <Text style={s.mgmtId} numberOfLines={1}>
                  ID: {stanek.id.slice(0, 8)}…
                </Text>
                <TouchableOpacity
                  style={s.mgmtDeleteBtn}
                  onPress={() => handleDeleteExisting(stanek)}
                  disabled={deletingId === stanek.id}
                >
                  {deletingId === stanek.id
                    ? <ActivityIndicator size="small" color="#FF6B6B" />
                    : <Text style={s.mgmtDeleteText}>🗑️ Smazat</Text>
                  }
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <Text style={s.hint}>
          Vyfokuste svůj stánek — zákazníci v okolí vás uvidí.{'\n'}
          Registrace není potřeba. Záznam zmizí o půlnoci.
        </Text>

        {/* Foto oblast */}
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
            <>
              <Text style={s.cameraEmoji}>📷</Text>
              <Text style={s.photoLabel}>Vyberte fotografii stánku</Text>
              <Text style={s.photoSub}>Klepněte sem pro výběr z galerie</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Poloha */}
        <View style={s.locationCard}>
          {/* Zadaná / detekovaná poloha */}
          {location && (
            <View style={s.locationRow}>
              <Text style={s.pinEmoji}>📍</Text>
              <View style={s.locationBody}>
                <Text style={s.locationText}>{location.text}</Text>
                <TouchableOpacity onPress={detectLocation} disabled={gpsLoading}>
                  <Text style={s.relocateText}>
                    {gpsLoading ? 'Zjišťuji polohu…' : 'Změnit na GPS polohu'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Ruční zadání adresy */}
          <View style={s.adresaRow}>
            <TextInput
              style={s.adresaInput}
              placeholder="Zadejte adresu místa prodeje…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={adresaInput}
              onChangeText={setAdresaInput}
              onSubmitEditing={hledatAdresu}
              returnKeyType="search"
            />
            <TouchableOpacity
              style={[s.adresaBtn, adresaLoading && s.adresaBtnDisabled]}
              onPress={hledatAdresu}
              disabled={adresaLoading || !adresaInput.trim()}
            >
              {adresaLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.adresaBtnText}>Hledat</Text>
              }
            </TouchableOpacity>
          </View>

          {/* GPS tlačítko — pokud poloha ještě není */}
          {!location && (
            <TouchableOpacity
              style={s.gpsBtn}
              onPress={detectLocation}
              disabled={gpsLoading}
            >
              {gpsLoading
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.gpsBtnText}>📡 Použít moji GPS polohu</Text>
              }
            </TouchableOpacity>
          )}
        </View>

        {/* Datum prodeje */}
        <View style={s.datumCard}>
          <Text style={s.datumLabel}>📅 Kdy budete prodávat?</Text>
          <View style={s.datumBtns}>
            {[isoDate(0), isoDate(1), isoDate(2)].map(iso => (
              <TouchableOpacity
                key={iso}
                style={[s.datumBtn, datumProdeje === iso && !vlastniDatumActive && s.datumBtnActive]}
                onPress={() => { setDatumProdeje(iso); setVlastniDatumActive(false); setError(''); }}
              >
                <Text style={[s.datumBtnText, datumProdeje === iso && !vlastniDatumActive && s.datumBtnTextActive]}>
                  {formatDatumLabel(iso)}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.datumBtn, vlastniDatumActive && s.datumBtnActive]}
              onPress={() => setVlastniDatumActive(v => !v)}
            >
              <Text style={[s.datumBtnText, vlastniDatumActive && s.datumBtnTextActive]}>Jiný</Text>
            </TouchableOpacity>
          </View>
          {vlastniDatumActive && (
            <View style={s.adresaRow}>
              <TextInput
                style={s.adresaInput}
                placeholder="D.M. nebo D.M.RRRR"
                placeholderTextColor="rgba(255,255,255,0.35)"
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
            <Text style={s.datumValue}>{formatDatumLabel(datumProdeje)}</Text>
          )}
        </View>

        {/* Poznámka */}
        <View style={s.noteCard}>
          <Text style={s.noteLabel}>✏️ Popis stánku (nepovinné)</Text>
          <TextInput
            style={s.noteInput}
            placeholder="Co prodáváte? Zelenina, ovoce, vejce… cena, hodiny…"
            placeholderTextColor="rgba(255,255,255,0.35)"
            value={poznamka}
            onChangeText={setPoznamka}
            multiline
            numberOfLines={3}
            maxLength={200}
          />
          {poznamka.length > 0 && (
            <Text style={s.noteCount}>{poznamka.length}/200</Text>
          )}
        </View>

        {/* Chybová hláška */}
        {!!error && <Text style={s.errorText}>{error}</Text>}

        {/* Submit tlačítko */}
        <TouchableOpacity
          style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitText}>
              {!fotoUri
                ? '📷 Nejprve vyberte fotografii'
                : !location
                  ? '📍 Potřebujeme vaši polohu'
                  : '🏪 Zveřejnit stánek'}
            </Text>
          )}
        </TouchableOpacity>

        <Text style={s.disclaimer}>
          Bez registrace · pouze dnes · smaže se o půlnoci
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styly ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#1a1a1a' },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { padding: 4, marginRight: 12 },
  backArrow: { fontSize: 24, color: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  // Scroll
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingVertical: 20, gap: 16, paddingBottom: 48 },
  hint: { fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 20 },

  // Foto
  photoArea: {
    height: 220, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)',
    borderStyle: 'dashed',
    justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  photoAreaFilled: { borderStyle: 'solid', borderColor: 'rgba(255,255,255,0.4)' },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  changeOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 8, alignItems: 'center',
  },
  changeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  cameraEmoji: { fontSize: 52, marginBottom: 10 },
  photoLabel: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 4 },
  photoSub: { fontSize: 13, color: 'rgba(255,255,255,0.55)' },

  // Poloha
  locationCard: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 12,
  },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  pinEmoji: { fontSize: 22, marginRight: 12, marginTop: 1 },
  locationBody: { flex: 1 },
  locationText: { fontSize: 15, color: '#fff', fontWeight: '600', lineHeight: 20, marginBottom: 6 },
  relocateText: { fontSize: 12, color: '#FF9800' },
  noLocationText: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginBottom: 10 },
  gpsBtn: {
    backgroundColor: 'rgba(255,152,0,0.25)', borderRadius: 8, borderWidth: 1,
    borderColor: 'rgba(255,152,0,0.5)',
    paddingVertical: 8, paddingHorizontal: 14, alignSelf: 'flex-start',
    alignItems: 'center',
  },
  gpsBtnText: { color: '#FF9800', fontSize: 13, fontWeight: '700' },

  // Ruční adresa
  adresaRow: { flexDirection: 'row', gap: 8 },
  adresaInput: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#fff',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  adresaBtn: {
    backgroundColor: '#FF9800', borderRadius: 8,
    paddingVertical: 9, paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center',
    minWidth: 64,
  },
  adresaBtnDisabled: { opacity: 0.5 },
  adresaBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Datum prodeje
  datumCard: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', gap: 10,
  },
  datumLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  datumBtns: { flexDirection: 'row', gap: 8 },
  datumBtn: {
    paddingVertical: 7, paddingHorizontal: 14, borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  datumBtnActive: { backgroundColor: '#FF9800', borderColor: '#FF9800' },
  datumBtnText: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },
  datumBtnTextActive: { color: '#fff' },
  datumValue: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' },

  // Poznámka
  noteCard: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  noteLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginBottom: 8, fontWeight: '600' },
  noteInput: {
    color: '#fff', fontSize: 14, lineHeight: 20,
    minHeight: 64, textAlignVertical: 'top',
  },
  noteCount: { fontSize: 11, color: 'rgba(255,255,255,0.35)', textAlign: 'right', marginTop: 4 },

  // Error
  errorText: { fontSize: 13, color: '#FF6B6B', textAlign: 'center' },

  // Submit
  submitBtn: {
    backgroundColor: '#FF9800', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.45 },
  submitText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  disclaimer: {
    fontSize: 12, color: 'rgba(255,255,255,0.4)',
    textAlign: 'center', letterSpacing: 0.3,
  },

  // Správa existujících stánků
  mgmtCard: {
    backgroundColor: 'rgba(255,152,0,0.12)', borderRadius: 14,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,152,0,0.35)',
  },
  mgmtTitle: { fontSize: 14, fontWeight: '700', color: '#FF9800', marginBottom: 4 },
  mgmtDesc: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 12 },
  mgmtRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, marginTop: 4,
  },
  mgmtId: { fontSize: 11, color: 'rgba(255,255,255,0.45)', flex: 1 },
  mgmtDeleteBtn: {
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,107,107,0.4)',
    minWidth: 80, alignItems: 'center',
  },
  mgmtDeleteText: { fontSize: 13, color: '#FF6B6B', fontWeight: '600' },

  // Úspěch
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 36 },
  successEmoji: { fontSize: 72, marginBottom: 20 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#fff', marginBottom: 14 },
  successDesc: { fontSize: 15, color: 'rgba(255,255,255,0.8)', textAlign: 'center', lineHeight: 24, marginBottom: 36 },
  homeBtn: { backgroundColor: '#FF9800', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 36 },
  homeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    marginTop: 16, paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,107,107,0.4)',
    minWidth: 48, alignItems: 'center',
  },
  deleteBtnText: { fontSize: 13, color: '#FF6B6B' },
});
