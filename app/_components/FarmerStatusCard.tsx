import { Text, StyleSheet, TouchableOpacity } from 'react-native';

type ProdejniMisto = { id: number; nazev: string | null; adresa: string | null };

interface Props {
  isActive: boolean;
  activeMisto: ProdejniMisto | null;
  isDesktop: boolean;
  defaultAdresa?: string | null;
  onPress: () => void;
}

export default function FarmerStatusCard({ isActive, activeMisto, isDesktop, defaultAdresa, onPress }: Props) {
  return (
    <TouchableOpacity
      style={[s.card, isActive ? s.cardActive : s.cardInactive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {isActive ? (
        <>
          <Text style={s.title}>🟢 Teď prodávám tady</Text>
          <Text style={s.location}>
            📍 {activeMisto?.adresa || activeMisto?.nazev || 'Aktuální místo'}
          </Text>
          <Text style={s.subtext}>Zákazníci vás teď najdou podle tohoto místa.</Text>
        </>
      ) : (
        <>
          <Text style={s.title}>📍 Zvol místo prodeje</Text>
          <Text style={s.subtext}>Nyní je kontaktní místo</Text>
          {defaultAdresa ? (
            <Text style={s.location}>{defaultAdresa}</Text>
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 12, padding: 16, borderWidth: 1 },
  cardActive: { backgroundColor: '#2ECC71', borderColor: 'rgba(255,255,255,0.3)' },
  cardInactive: { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)', borderLeftWidth: 3, borderLeftColor: '#CE93D8' },
  title: { fontSize: 16, fontWeight: '700', color: '#fff', marginBottom: 4 },
  location: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginBottom: 4 },
  subtext: { fontSize: 12, color: 'rgba(255,255,255,0.65)' },
});
