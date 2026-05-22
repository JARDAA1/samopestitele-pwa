/**
 * Web verze: Přidat stánek dnes — Ionicons, multi-foto, live preview
 */
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, ActivityIndicator, ScrollView, TextInput, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
function formatDatumLabel(iso: string): string {
  const dnes = isoDate(0);
  const zitra = isoDate(1);
  const tydne = isoDate(7);
  if (iso === dnes)  return 'Dnes';
  if (iso === zitra) return 'Zítra';
  if (iso === tydne) return 'Za týden';
  const [, m, d] = iso.split('-');
  return `${parseInt(d)}.${parseInt(m)}.`;
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
    if (city)  return city;
    if (a.county) return a.county;
  } catch { }
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

// ── Mini mapa embed ──────────────────────────────────────────────
function MapEmbed({ lat, lng }: { lat: number; lng: number }) {
  const delta = 0.04;
  const bbox  = `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`;
  const src   = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
  return (
    // @ts-ignore
    <iframe src={src} title="Poloha stánku" style={{ width: '100%', height: '100%', border: 'none' } as any} />
  );
}

type LocationState = { lat: number; lng: number; text: string };

const DATE_OPTIONS = [
  { iso: isoDate(0), label: 'Dnes' },
  { iso: isoDate(1), label: 'Zítra' },
  { iso: isoDate(7), label: 'Za týden' },
];

// ── Hlavní komponenta ────────────────────────────────────────────
export default function PridatStanekWeb() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const [fotoUris, setFotoUris]             = useState<string[]>([]);
  const [poznamka, setPoznamka]             = useState('');
  const [location, setLocation]             = useState<LocationState | null>(null);
  const [gpsLoading, setGpsLoading]         = useState(false);
  const [submitting, setSubmitting]         = useState(false);
  const [success, setSuccess]               = useState(false);
  const [createdId, setCreatedId]           = useState<string | null>(null);
  const [createdToken, setCreatedToken]     = useState<string | null>(null);
  const [deleting, setDeleting]             = useState(false);
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [existingStanky, setExistingStanky] = useState<MujStanek[]>([]);
  const [error, setError]                   = useState('');
  const [adresaInput, setAdresaInput]       = useState('');
  const [adresaLoading, setAdresaLoading]   = useState(false);
  const [datumProdeje, setDatumProdeje]     = useState<string>(isoDate(0));
  const [vlastniDatum, setVlastniDatum]     = useState('');
  const [vlastniDatumActive, setVlastniDatumActive] = useState(false);

  useEffect(() => { setExistingStanky(nactiMojeStanky()); }, []);

  // ── Fotografie ───────────────────────────────────────────────
  const pickPhoto = async () => {
    if (fotoUris.length >= 3) return;
    setError('');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [4, 3],
    });
    if (!result.canceled && result.assets[0]) {
      setFotoUris(prev => [...prev, result.assets[0].uri]);
      if (!location) detectLocation();
    }
  };
  const removePhoto = (idx: number) => setFotoUris(prev => prev.filter((_, i) => i !== idx));

  // ── GPS ──────────────────────────────────────────────────────
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

  // ── Adresa ───────────────────────────────────────────────────
  const hledatAdresu = async () => {
    const text = adresaInput.trim();
    if (!text) return;
    setAdresaLoading(true); setError('');
    const result = await geocodeAddress(text, '');
    setAdresaLoading(false);
    if (result) setLocation({ lat: result.lat, lng: result.lng, text });
    else setError('Adresu se nepodařilo najít. Zkuste přesnější formát.');
  };

  // ── Vlastní datum ────────────────────────────────────────────
  const aplikovatVlastniDatum = () => {
    const parts = vlastniDatum.trim().split('.');
    if (parts.length < 2) { setError('Formát: D.M. nebo D.M.RRRR'); return; }
    const day = parseInt(parts[0]), month = parseInt(parts[1]);
    const year = parts[2] ? parseInt(parts[2]) : new Date().getFullYear();
    if (!day || !month || day > 31 || month > 12) { setError('Neplatné datum.'); return; }
    const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setDatumProdeje(iso); setVlastniDatumActive(false); setError('');
  };

  // ── Odeslání ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!fotoUris.length || !location) return;
    setSubmitting(true); setError('');
    try {
      const uploaded = await uploadImage(fotoUris[0], 'stanky-dnes');
      if (!uploaded) throw new Error('Nepodařilo se nahrát fotografii.');
      const jesDnes = datumProdeje === isoDate(0);
      const stanek  = await addStanekDnes(
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

  const canSubmit = fotoUris.length > 0 && !!location && !submitting;

  // ── Úspěch ───────────────────────────────────────────────────
  if (success) {
    return (
      <View style={s.root}>
        <View style={s.successWrap}>
          <Ionicons name="checkmark-circle" size={80} color="#4caf50" style={{ marginBottom: 20 }} />
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
                : <><Ionicons name="trash-outline" size={14} color="#ef4444" /><Text style={s.btnDeleteText}> Smazat stánek</Text></>
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // ── Formulář (levá část) ─────────────────────────────────────
  const FormContent = () => (
    <View style={s.formWrap}>
      <Text style={s.pageTitle}>Prodávám tady dnes</Text>
      <Text style={s.pageSubtitle}>Bez registrace · automaticky smazáno za půlnoci</Text>

      {/* Existující stánky */}
      {existingStanky.length > 0 && (
        <View style={s.mgmtCard}>
          <View style={s.mgmtTitleRow}>
            <Ionicons name="storefront-outline" size={16} color="#c2410c" />
            <Text style={s.mgmtTitle}>Váš aktivní stánek</Text>
          </View>
          <Text style={s.mgmtDesc}>Zmizí automaticky o půlnoci.</Text>
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
                  : <Text style={s.mgmtDeleteText}>Smazat</Text>
                }
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* SEKCE 1: Fotografie */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Ionicons name="camera-outline" size={18} color="#374151" />
          <Text style={s.sectionLabel}>Fotografie stánku</Text>
          <Text style={s.sectionBadge}>{fotoUris.length}/3</Text>
        </View>

        {/* Grid fotek */}
        {fotoUris.length > 0 && (
          <View style={s.photoGrid}>
            {fotoUris.map((uri, idx) => (
              <View key={idx} style={s.photoThumb}>
                <Image source={{ uri }} style={s.photoThumbImg} />
                <TouchableOpacity style={s.photoRemove} onPress={() => removePhoto(idx)}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
            {fotoUris.length < 3 && (
              <TouchableOpacity style={s.photoAdd} onPress={pickPhoto} activeOpacity={0.8}>
                <Ionicons name="add" size={28} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {fotoUris.length === 0 && (
          <TouchableOpacity style={s.photoDropzone} onPress={pickPhoto} activeOpacity={0.85}>
            <Ionicons name="cloud-upload-outline" size={40} color="#9ca3af" style={{ marginBottom: 8 }} />
            <Text style={s.photoDropLabel}>Klikněte pro výběr fotografie</Text>
            <Text style={s.photoDropSub}>nebo přetáhněte soubor sem · max. 3 fotky</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* SEKCE 2: Poloha */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Ionicons name="location-outline" size={18} color="#374151" />
          <Text style={s.sectionLabel}>Poloha stánku</Text>
        </View>

        {location && (
          <View style={s.locationFound}>
            <Ionicons name="checkmark-circle" size={18} color="#166534" />
            <Text style={s.locationFoundText} numberOfLines={2}>{location.text}</Text>
            <TouchableOpacity onPress={detectLocation} disabled={gpsLoading}>
              <Text style={s.relocateLink}>{gpsLoading ? '…' : 'Změnit'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* GPS primární tlačítko */}
        <TouchableOpacity
          style={[s.gpsBtn, gpsLoading && s.gpsBtnDisabled]}
          onPress={detectLocation}
          disabled={gpsLoading}
          activeOpacity={0.85}
        >
          {gpsLoading
            ? <ActivityIndicator size="small" color="#ffffff" />
            : <><Ionicons name="locate" size={18} color="#ffffff" /><Text style={s.gpsBtnText}>  Použít moji GPS polohu</Text></>
          }
        </TouchableOpacity>

        <Text style={s.orDivider}>nebo zadejte adresu ručně</Text>

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
            style={[s.adresaBtn, (adresaLoading || !adresaInput.trim()) && s.adresaBtnDisabled]}
            onPress={hledatAdresu}
            disabled={adresaLoading || !adresaInput.trim()}
          >
            {adresaLoading
              ? <ActivityIndicator size="small" color="#ffffff" />
              : <Ionicons name="search" size={16} color="#ffffff" />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* SEKCE 3: Datum */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Ionicons name="calendar-outline" size={18} color="#374151" />
          <Text style={s.sectionLabel}>Kdy budete prodávat?</Text>
        </View>
        <View style={s.chipRow}>
          {DATE_OPTIONS.map(({ iso, label }) => {
            const active = datumProdeje === iso && !vlastniDatumActive;
            return (
              <TouchableOpacity
                key={iso}
                style={[s.chip, active && s.chipActive]}
                onPress={() => { setDatumProdeje(iso); setVlastniDatumActive(false); setError(''); }}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity
            style={[s.chip, vlastniDatumActive && s.chipActive]}
            onPress={() => setVlastniDatumActive(v => !v)}
          >
            <Text style={[s.chipText, vlastniDatumActive && s.chipTextActive]}>Jiný termín</Text>
          </TouchableOpacity>
        </View>
        {vlastniDatumActive && (
          <View style={[s.adresaRow, { marginTop: 12 }]}>
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
          <Text style={s.datumValue}>
            Prodej: <Text style={{ fontWeight: '700', color: '#1a1a1a' }}>{formatDatumLabel(datumProdeje)}</Text>
          </Text>
        )}
      </View>

      {/* Popis */}
      <View style={s.section}>
        <View style={s.sectionHead}>
          <Ionicons name="create-outline" size={18} color="#374151" />
          <Text style={s.sectionLabel}>Popis stánku <Text style={s.optional}>(nepovinné)</Text></Text>
        </View>
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

      {/* Chyba */}
      {!!error && (
        <View style={s.errorBox}>
          <Ionicons name="warning-outline" size={16} color="#dc2626" />
          <Text style={s.errorText}> {error}</Text>
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
            {!fotoUris.length
              ? '📷 Nejprve vyberte fotografii'
              : !location
                ? '📍 Potřebujeme vaši polohu'
                : 'Zveřejnit nabídku →'}
          </Text>
        )}
      </TouchableOpacity>

      <Text style={s.disclaimer}>Bez registrace · pouze dnes · smaže se o půlnoci</Text>
    </View>
  );

  // ── Pravý panel – live preview ────────────────────────────────
  const PreviewPanel = () => (
    <View style={s.rightCol}>
      {/* Preview karta */}
      <View style={s.previewCard}>
        <Text style={s.previewHeadline}>Náhled nabídky</Text>
        <Text style={s.previewSub}>Takto uvidí zákazníci vaši nabídku</Text>

        <View style={s.previewInner}>
          <View style={s.previewPhotoWrap}>
            {fotoUris.length > 0 ? (
              <Image source={{ uri: fotoUris[0] }} style={s.previewPhoto} />
            ) : (
              <View style={s.previewPhotoEmpty}>
                <Ionicons name="camera-outline" size={36} color="#9ca3af" />
                <Text style={s.previewPhotoEmptyText}>Foto stánku</Text>
              </View>
            )}
            <View style={s.previewBadge}>
              <Text style={s.previewBadgeText}>🏪 Dnes zde</Text>
            </View>
          </View>

          <View style={s.previewInfo}>
            <View style={s.previewRow}>
              <Ionicons name="location-outline" size={14} color="#374151" />
              <Text style={s.previewLocation}>
                {location ? location.text : 'Poloha bude doplněna'}
              </Text>
            </View>
            <View style={s.previewRow}>
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text style={s.previewDate}>{formatDatumLabel(datumProdeje)}</Text>
            </View>
            {poznamka ? (
              <Text style={s.previewNote} numberOfLines={3}>{poznamka}</Text>
            ) : (
              <Text style={s.previewNotePlaceholder}>Popis stánku bude zobrazen zde…</Text>
            )}
          </View>
        </View>
      </View>

      {/* Mini mapa */}
      <View style={s.mapCard}>
        <View style={s.sectionHead}>
          <Ionicons name="map-outline" size={16} color="#374151" />
          <Text style={s.mapHeadline}>Poloha na mapě</Text>
        </View>
        <View style={s.mapWrap}>
          {location ? (
            <MapEmbed lat={location.lat} lng={location.lng} />
          ) : (
            <View style={s.mapEmpty}>
              <Ionicons name="map-outline" size={36} color="#9ca3af" />
              <Text style={s.mapEmptyText}>
                Zadejte adresu nebo použijte GPS{'\n'}pro zobrazení na mapě
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Info */}
      <View style={s.infoCard}>
        <Text style={s.infoTitle}>Jak to funguje?</Text>
        {[
          { icon: 'camera-outline' as const,   text: 'Vyfokuste váš stánek nebo produkty' },
          { icon: 'location-outline' as const,  text: 'Poloha pomůže zákazníkům vás najít' },
          { icon: 'time-outline' as const,      text: 'Záznam automaticky zmizí o půlnoci' },
          { icon: 'lock-closed-outline' as const, text: 'Registrace není potřeba' },
        ].map(({ icon, text }) => (
          <View key={text} style={s.infoRow}>
            <Ionicons name={icon} size={16} color="#166534" />
            <Text style={s.infoText}>{text}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  // ── Render ───────────────────────────────────────────────────
  return (
    <View style={s.root}>

      {/* HEADER */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={20} color="#1a1a1a" />
          <Text style={s.backText}>Samopěstitelé</Text>
        </TouchableOpacity>
        <Text style={s.headerSub}>Přidat nabídku bez registrace</Text>
      </View>

      {/* BODY */}
      <ScrollView style={s.body} showsVerticalScrollIndicator={false}>
        <View style={[s.columns, !isDesktop && s.columnsMobile]}>
          <View style={[s.leftCol, !isDesktop && s.leftColMobile]}>
            <FormContent />
          </View>
          {isDesktop && <PreviewPanel />}
        </View>
      </ScrollView>

    </View>
  );
}

// ── Styly ────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f5f1e8' },

  // Header
  header: {
    height: 60, backgroundColor: '#ffffff',
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  headerSub: { fontSize: 13, color: '#6b7280' },

  // Body / columns
  body: { flex: 1 },
  columns: {
    flexDirection: 'row', alignItems: 'flex-start',
    padding: 32, gap: 32,
    maxWidth: 1200, alignSelf: 'center' as any, width: '100%' as any,
  },
  columnsMobile: { flexDirection: 'column', padding: 16, gap: 0 },
  leftCol: { flex: 1, minWidth: 0 },
  leftColMobile: { width: '100%' as any },

  // Form wrap
  formWrap: { gap: 0 },
  pageTitle: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginBottom: 6 },
  pageSubtitle: { fontSize: 14, color: '#6b7280', marginBottom: 20 },

  // Section
  section: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    padding: 20, marginBottom: 14,
  },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', flex: 1 },
  sectionBadge: { fontSize: 12, color: '#9ca3af', fontWeight: '600' },
  optional: { fontWeight: '400', color: '#9ca3af' },

  // Foto grid
  photoGrid: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' as any },
  photoThumb: { width: 100, height: 80, borderRadius: 10, overflow: 'hidden' as any, position: 'relative' as any },
  photoThumbImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoRemove: { position: 'absolute' as any, top: 4, right: 4 },
  photoAdd: {
    width: 100, height: 80, borderRadius: 10,
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed' as any,
    backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center',
  },
  photoDropzone: {
    height: 160, borderRadius: 12, overflow: 'hidden' as any,
    borderWidth: 2, borderColor: '#e5e7eb', borderStyle: 'dashed' as any,
    backgroundColor: '#f9fafb', justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer' as any,
  },
  photoDropLabel: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 4 },
  photoDropSub: { fontSize: 13, color: '#9ca3af' },

  // Poloha
  locationFound: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12,
    borderWidth: 1, borderColor: '#bbf7d0',
  },
  locationFoundText: { flex: 1, fontSize: 13, color: '#166534', fontWeight: '600' },
  relocateLink: { fontSize: 12, color: '#4caf50', fontWeight: '700' },
  gpsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#6aa84f', borderRadius: 12,
    paddingVertical: 13, marginBottom: 14,
  },
  gpsBtnDisabled: { opacity: 0.5 },
  gpsBtnText: { fontSize: 14, color: '#ffffff', fontWeight: '700' },
  orDivider: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 10 },
  adresaRow: { flexDirection: 'row', gap: 8 },
  adresaInput: {
    flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: '#1a1a1a',
    backgroundColor: '#ffffff', outlineStyle: 'none' as any,
  },
  adresaBtn: {
    backgroundColor: '#6aa84f', borderRadius: 12,
    paddingVertical: 11, paddingHorizontal: 14,
    justifyContent: 'center', alignItems: 'center', minWidth: 48,
  },
  adresaBtnDisabled: { opacity: 0.5 },
  adresaBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },

  // Datum chips
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' as any, gap: 8, marginBottom: 10 },
  chip: {
    paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20,
    borderWidth: 1, borderColor: '#e5e7eb', backgroundColor: '#f9fafb',
  },
  chipActive: { backgroundColor: '#6aa84f', borderColor: '#6aa84f' },
  chipText: { fontSize: 14, color: '#6b7280', fontWeight: '600' },
  chipTextActive: { color: '#ffffff' },
  datumValue: { fontSize: 13, color: '#6b7280', marginTop: 2 },

  // Textarea
  textarea: {
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12,
    padding: 14, fontSize: 14, color: '#1a1a1a',
    minHeight: 100, textAlignVertical: 'top' as any,
    outlineStyle: 'none' as any,
  },
  charCount: { fontSize: 12, color: '#9ca3af', textAlign: 'right', marginTop: 6 },

  // Error
  errorBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fef2f2', borderRadius: 10, padding: 14,
    marginBottom: 14, borderLeftWidth: 3, borderLeftColor: '#f87171',
  },
  errorText: { fontSize: 13, color: '#dc2626', flex: 1 },

  // Submit
  btnSubmit: {
    backgroundColor: '#6aa84f', borderRadius: 14,
    paddingVertical: 18, alignItems: 'center', marginBottom: 12,
  },
  btnSubmitDisabled: { opacity: 0.45 },
  btnSubmitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  disclaimer: { fontSize: 12, color: '#9ca3af', textAlign: 'center', marginBottom: 32 },

  // Správa stánků
  mgmtCard: {
    backgroundColor: '#fff7ed', borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: '#fed7aa', marginBottom: 14,
  },
  mgmtTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  mgmtTitle: { fontSize: 14, fontWeight: '700', color: '#c2410c' },
  mgmtDesc: { fontSize: 12, color: '#6b7280', marginBottom: 12 },
  mgmtRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#ffffff', borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12, marginTop: 4,
    borderWidth: 1, borderColor: '#e5e7eb',
  },
  mgmtId: { fontSize: 11, color: '#9ca3af', flex: 1 },
  mgmtDeleteBtn: {
    paddingVertical: 5, paddingHorizontal: 12, borderRadius: 8,
    borderWidth: 1, borderColor: '#fca5a5', alignItems: 'center',
  },
  mgmtDeleteText: { fontSize: 13, color: '#ef4444', fontWeight: '600' },

  // Pravý panel
  rightCol: { width: 380, gap: 16 },
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
  previewPhotoEmptyText: { fontSize: 13, color: '#9ca3af' },
  previewBadge: {
    position: 'absolute' as any, top: 12, left: 12,
    backgroundColor: '#6aa84f', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
  },
  previewBadgeText: { fontSize: 12, color: '#ffffff', fontWeight: '700' },
  previewInfo: { padding: 14, gap: 6 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previewLocation: { fontSize: 14, color: '#374151', fontWeight: '600', flex: 1 },
  previewDate: { fontSize: 13, color: '#6b7280', flex: 1 },
  previewNote: { fontSize: 13, color: '#6b7280', lineHeight: 20, marginTop: 4 },
  previewNotePlaceholder: { fontSize: 13, color: '#d1d5db', fontStyle: 'italic' as any },

  mapCard: {
    backgroundColor: '#ffffff', borderRadius: 16,
    borderWidth: 1, borderColor: '#e5e7eb', padding: 20,
  },
  mapHeadline: { fontSize: 14, fontWeight: '700', color: '#374151', flex: 1 },
  mapWrap: { height: 240, borderRadius: 12, overflow: 'hidden' as any, backgroundColor: '#f3f4f6', marginTop: 4 },
  mapEmpty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  mapEmptyText: { fontSize: 13, color: '#9ca3af', textAlign: 'center', lineHeight: 20 },

  infoCard: {
    backgroundColor: '#f0fdf4', borderRadius: 16,
    borderWidth: 1, borderColor: '#bbf7d0', padding: 20,
  },
  infoTitle: { fontSize: 14, fontWeight: '700', color: '#166534', marginBottom: 10 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  infoText: { fontSize: 13, color: '#374151' },

  // Úspěch
  successWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 48 },
  successTitle: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 12 },
  successDesc: { fontSize: 15, color: '#6b7280', textAlign: 'center', lineHeight: 24, marginBottom: 32 },
  btnGreen: { backgroundColor: '#6aa84f', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 36, marginBottom: 12 },
  btnGreenText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnDelete: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingHorizontal: 24,
    borderRadius: 10, borderWidth: 1, borderColor: '#fca5a5',
  },
  btnDeleteText: { fontSize: 13, color: '#ef4444' },
});
