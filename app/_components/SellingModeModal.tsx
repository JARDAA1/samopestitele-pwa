import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';

type ProdejniMisto = { id: number; nazev: string | null; adresa: string | null };

interface Props {
  visible: boolean;
  mistoLoading: boolean;
  modalLoading: boolean;
  locationLoading: boolean;
  geoError: string;
  farmerMista: ProdejniMisto[];
  onSelectStale: (misto: ProdejniMisto) => void;
  onActivateMobilni: () => void;
  onClose: () => void;
}

const mistoLabel = (m: ProdejniMisto) => m.nazev || m.adresa || '';

export default function SellingModeModal({
  visible, mistoLoading, modalLoading, locationLoading,
  geoError, farmerMista, onSelectStale, onActivateMobilni, onClose,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <Text style={s.title}>Jak prodáváte?</Text>

          <Text style={s.sectionLabel}>🏪 Stálé místo</Text>
          {mistoLoading ? (
            <ActivityIndicator size="small" color="#FF9800" style={{ marginVertical: 12 }} />
          ) : farmerMista.length === 0 ? (
            <Text style={s.emptyText}>
              Nemáte žádná prodejní místa.{'\n'}Přidejte je v sekci Moje prodejna.
            </Text>
          ) : (
            farmerMista.map(m => (
              <TouchableOpacity
                key={m.id}
                style={s.mistoRow}
                onPress={() => onSelectStale(m)}
                activeOpacity={0.8}
                disabled={modalLoading}
              >
                <Text style={s.mistoRowText}>{mistoLabel(m)}</Text>
                <Text style={s.mistoRowArrow}>→</Text>
              </TouchableOpacity>
            ))
          )}

          <View style={s.divider} />

          <Text style={s.sectionLabel}>📍 Mobilní dnes (GPS)</Text>
          {geoError ? <Text style={s.geoError}>{geoError}</Text> : null}
          <TouchableOpacity
            style={[s.gpsBtn, locationLoading && s.gpsBtnLoading]}
            onPress={onActivateMobilni}
            activeOpacity={0.85}
            disabled={locationLoading}
          >
            <Text style={s.gpsBtnText}>
              {locationLoading ? '⏳ Načítám polohu…' : '📍 Použít aktuální polohu'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={s.cancelBtn} onPress={onClose}>
            <Text style={s.cancelText}>Zrušit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: '#0f2d0f',
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
    borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignSelf: 'center', marginBottom: 20,
  },
  title: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 16, textAlign: 'center' },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)',
    marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  mistoRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10, padding: 13, marginBottom: 8,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  mistoRowText: { flex: 1, fontSize: 15, color: '#fff' },
  mistoRowArrow: { fontSize: 16, color: '#FF9800', marginLeft: 8 },
  emptyText: { fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 12, lineHeight: 20 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginVertical: 16 },
  geoError: { fontSize: 13, color: '#FFD54F', marginBottom: 10 },
  gpsBtn: { backgroundColor: '#FF9800', borderRadius: 10, paddingVertical: 13, alignItems: 'center', marginBottom: 8 },
  gpsBtnLoading: { opacity: 0.6 },
  gpsBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 4 },
  cancelText: { fontSize: 14, color: 'rgba(255,255,255,0.45)' },
});
