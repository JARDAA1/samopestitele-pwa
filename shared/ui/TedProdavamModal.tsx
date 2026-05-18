import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';

type LocationMode = 'farm' | 'gps';

const DURATION_OPTIONS = [
  {
    label: '+1 hod',
    getTime: () => {
      const d = new Date();
      d.setHours(d.getHours() + 1, 0, 0, 0);
      return d;
    },
  },
  {
    label: '+3 hod',
    getTime: () => {
      const d = new Date();
      d.setHours(d.getHours() + 3, 0, 0, 0);
      return d;
    },
  },
  {
    label: 'Konec dne',
    getTime: () => {
      const d = new Date();
      d.setHours(23, 59, 59, 0);
      return d;
    },
  },
];

const DEFAULT_DURATION_IDX = 2; // Konec dne

interface Props {
  visible: boolean;
  onClose: () => void;
  /** Called after GPS/farm coords are resolved. Caller handles DB write + reload. */
  onConfirm: (lat: number, lng: number, platneDo: Date, nazev: string) => Promise<void>;
  farmGpsLat?: number | null;
  farmGpsLng?: number | null;
}

export function TedProdavamModal({
  visible,
  onClose,
  onConfirm,
  farmGpsLat,
  farmGpsLng,
}: Props) {
  const hasFarmGps =
    farmGpsLat != null && farmGpsLng != null && farmGpsLat !== 0 && farmGpsLng !== 0;

  const [locationMode, setLocationMode] = useState<LocationMode>(hasFarmGps ? 'farm' : 'gps');
  const [selectedDuration, setSelectedDuration] = useState(DEFAULT_DURATION_IDX);
  const [loading, setLoading] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      let lat: number;
      let lng: number;
      let nazev: string;

      if (locationMode === 'farm') {
        if (!hasFarmGps) {
          showAlert(
            'GPS farmy není nastavena',
            'Přidejte GPS souřadnice farmy ve svém profilu (Upravit farmu).'
          );
          return;
        }
        lat = farmGpsLat!;
        lng = farmGpsLng!;
        nazev = 'Prodej z farmy';
      } else {
        // Request GPS once – no retries
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showAlert(
            'Přístup k poloze zamítnut',
            'Povolte přístup k poloze v nastavení prohlížeče nebo telefonu.'
          );
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
        if (!lat || !lng) {
          showAlert('Chyba GPS', 'Nepodařilo se získat platnou polohu. Zkuste to znovu.');
          return;
        }
        nazev = 'Dočasný stánek';
      }

      const platneDo = DURATION_OPTIONS[selectedDuration].getTime();
      await onConfirm(lat, lng, platneDo, nazev);
      onClose();
    } catch {
      showAlert('Chyba', 'Nepodařilo se spustit prodej. Zkuste to znovu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>📍 Teď prodávám</Text>

          {/* ── Location mode ── */}
          <Text style={styles.sectionLabel}>Kde prodávám?</Text>

          <TouchableOpacity
            style={[
              styles.radioRow,
              locationMode === 'farm' && styles.radioRowSelected,
              !hasFarmGps && styles.radioRowDisabled,
            ]}
            onPress={() => hasFarmGps && setLocationMode('farm')}
            activeOpacity={hasFarmGps ? 0.7 : 1}
            disabled={!hasFarmGps}
          >
            <View style={[styles.radio, locationMode === 'farm' && styles.radioSelected]}>
              {locationMode === 'farm' && <View style={styles.radioDot} />}
            </View>
            <Text style={[styles.radioText, !hasFarmGps && styles.radioTextDisabled]}>
              Moje adresa (farma)
              {!hasFarmGps ? '\nGPS farmy není nastavena' : ''}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.radioRow, locationMode === 'gps' && styles.radioRowSelected]}
            onPress={() => setLocationMode('gps')}
            activeOpacity={0.7}
          >
            <View style={[styles.radio, locationMode === 'gps' && styles.radioSelected]}>
              {locationMode === 'gps' && <View style={styles.radioDot} />}
            </View>
            <Text style={styles.radioText}>Aktuální poloha</Text>
          </TouchableOpacity>

          {/* ── Duration ── */}
          <Text style={styles.sectionLabel}>Platnost do:</Text>
          <View style={styles.durationRow}>
            {DURATION_OPTIONS.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.durationBtn,
                  selectedDuration === idx && styles.durationBtnActive,
                ]}
                onPress={() => setSelectedDuration(idx)}
              >
                <Text
                  style={[
                    styles.durationBtnText,
                    selectedDuration === idx && styles.durationBtnTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Actions ── */}
          <TouchableOpacity
            style={styles.confirmBtn}
            onPress={handleConfirm}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.confirmBtnText}>Spustit prodej</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Zrušit</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#4A148C',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 10,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Radio rows
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  radioRowSelected: {
    borderColor: '#FF9800',
    backgroundColor: 'rgba(255,152,0,0.15)',
  },
  radioRowDisabled: {
    opacity: 0.45,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    borderColor: '#FF9800',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF9800',
  },
  radioText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
  },
  radioTextDisabled: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 13,
  },

  // Duration
  durationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  durationBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  durationBtnActive: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  durationBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  durationBtnTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Action buttons
  confirmBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 54,
    justifyContent: 'center',
    marginBottom: 10,
  },
  confirmBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 15,
  },
});
