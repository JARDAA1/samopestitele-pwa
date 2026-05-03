/**
 * StankyDnesSection
 * Zobrazuje efemérní stánky platné dnes.
 * Vlastní stánky (podle localStorage) mají tlačítko smazat.
 */
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Image, ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  fetchActiveStankyDnes, deleteStanekDnes, StanekDnes,
} from '@/features/stanky/services/stankyDnesService';

// ─── localStorage helper ───────────────────────────────────────────────────────

const STORAGE_KEY = 'samopestitele_moje_stanky';
type MujStanek = { id: string; delete_token: string };

function nactiMojeStanky(): MujStanek[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}
function odstraňMujStanek(id: string) {
  try {
    const arr = nactiMojeStanky().filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  } catch { }
}

// ─── Props ─────────────────────────────────────────────────────────────────────

interface Props { isDesktop: boolean; }

// ─── Komponenta ────────────────────────────────────────────────────────────────

export default function StankyDnesSection({ isDesktop }: Props) {
  const [stanky, setStanky] = useState<StanekDnes[]>([]);
  const [mojeStanky, setMojeStanky] = useState<MujStanek[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      setMojeStanky(nactiMojeStanky());
      fetchActiveStankyDnes().then(data => {
        if (active) { setStanky(data); setLoading(false); }
      });
      return () => { active = false; };
    }, [])
  );

  const handleDelete = async (stanek: StanekDnes) => {
    const muj = mojeStanky.find(m => m.id === stanek.id);
    if (!muj) return;

    const confirmed = typeof window !== 'undefined'
      ? window.confirm('Smazat stánek?')
      : true;
    if (!confirmed) return;

    try {
      await deleteStanekDnes(stanek.id, muj.delete_token);
      odstraňMujStanek(stanek.id);
      setStanky(prev => prev.filter(s => s.id !== stanek.id));
      setMojeStanky(prev => prev.filter(m => m.id !== stanek.id));
    } catch {
      /* tiché selhání — stánek pravděpodobně už neexistuje */
    }
  };

  return (
    <View style={[s.section, isDesktop && s.sectionDesktop]}>
      {/* Záhlaví */}
      <View style={s.sectionHeader}>
        <View style={s.titleRow}>
          <Text style={s.sectionTitle}>📍 Stánky dnes</Text>
          {stanky.length > 0 && (
            <View style={s.countBadge}>
              <Text style={s.countText}>{stanky.length}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Obsah */}
      {loading ? (
        <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" style={s.loader} />
      ) : stanky.length === 0 ? (
        <View style={s.emptyCard}>
          <Text style={s.emptyText}>Dnes zatím žádné stánky. Prodáváte? Přidejte stánek níže.</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.list}
        >
          {stanky.map(stanek => {
            const jeMuj = mojeStanky.some(m => m.id === stanek.id);
            return (
              <StanekCard
                key={stanek.id}
                stanek={stanek}
                jeMuj={jeMuj}
                onDelete={() => handleDelete(stanek)}
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Karta stánku ─────────────────────────────────────────────────────────────

function StanekCard({
  stanek, jeMuj, onDelete,
}: {
  stanek: StanekDnes;
  jeMuj: boolean;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handlePress = async () => {
    setDeleting(true);
    await onDelete();
    setDeleting(false);
  };

  const cas = new Date(stanek.created_at).toLocaleTimeString('cs-CZ', {
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[s.card, jeMuj && s.cardOwned]}>
      <Image source={{ uri: stanek.foto_url }} style={s.cardPhoto} resizeMode="cover" />

      {/* Odznak "Můj stánek" + smazat */}
      {jeMuj && (
        <View style={s.ownerRow}>
          <Text style={s.ownerBadge}>Můj stánek</Text>
          <TouchableOpacity
            style={s.deleteBtn}
            onPress={handlePress}
            disabled={deleting}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            {deleting
              ? <ActivityIndicator size="small" color="#FF6B6B" />
              : <Text style={s.deleteBtnText}>🗑️</Text>
            }
          </TouchableOpacity>
        </View>
      )}

      <View style={s.cardBody}>
        <Text style={s.cardLocation} numberOfLines={2}>
          📍 {stanek.lokace_text ?? 'Neznámá poloha'}
        </Text>
        {stanek.poznamka ? (
          <Text style={s.cardNote} numberOfLines={3}>{stanek.poznamka}</Text>
        ) : null}
        <Text style={s.cardTime}>Přidáno v {cas}</Text>
      </View>
    </View>
  );
}

// ─── Styly ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  section: { paddingHorizontal: 20, paddingBottom: 8 },
  sectionDesktop: {
    paddingHorizontal: 80, maxWidth: 1000,
    alignSelf: 'center', width: '100%',
  },

  // Záhlaví
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#fff' },
  countBadge: {
    backgroundColor: '#FF9800', borderRadius: 8,
    minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4,
  },
  countText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  loader: { paddingVertical: 20 },

  // Prázdný stav
  emptyCard: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 14,
  },
  emptyText: { fontSize: 12, color: 'rgba(255,255,255,0.45)', textAlign: 'center' },

  // Seznam
  list: { gap: 10, paddingRight: 4, paddingBottom: 4 },

  // Karta
  card: {
    width: 155, borderRadius: 12, overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)',
  },
  cardOwned: {
    borderColor: 'rgba(255,152,0,0.6)',
    borderWidth: 1.5,
  },
  cardPhoto: { width: '100%', height: 105 },

  // Vlastník
  ownerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 8, paddingTop: 6, paddingBottom: 2,
  },
  ownerBadge: {
    fontSize: 9, fontWeight: '700', color: '#FF9800',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  deleteBtn: { padding: 2 },
  deleteBtnText: { fontSize: 14 },

  cardBody: { padding: 8, paddingTop: 4 },
  cardLocation: { fontSize: 11, color: '#fff', fontWeight: '600', lineHeight: 15, marginBottom: 3 },
  cardNote: { fontSize: 11, color: 'rgba(255,255,255,0.75)', lineHeight: 15, marginBottom: 4 },
  cardTime: { fontSize: 10, color: 'rgba(255,255,255,0.45)' },
});
