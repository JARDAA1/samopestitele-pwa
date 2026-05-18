import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Switch } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { ProtectedRoute } from '../_utils/ProtectedRoute';
import { supabase } from '@/lib/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';

interface DaySchedule {
  otevreno: boolean;
  od: string;
  do: string;
}

interface OfficeHours {
  po: DaySchedule;
  ut: DaySchedule;
  st: DaySchedule;
  ct: DaySchedule;
  pa: DaySchedule;
  so: DaySchedule;
  ne: DaySchedule;
}

type DayKey = keyof OfficeHours;

const DAY_LABELS: { key: DayKey; label: string }[] = [
  { key: 'po', label: 'Pondělí' },
  { key: 'ut', label: 'Úterý' },
  { key: 'st', label: 'Středa' },
  { key: 'ct', label: 'Čtvrtek' },
  { key: 'pa', label: 'Pátek' },
  { key: 'so', label: 'Sobota' },
  { key: 'ne', label: 'Neděle' },
];

const DEFAULT_HOURS: OfficeHours = {
  po: { otevreno: true,  od: '08:00', do: '17:00' },
  ut: { otevreno: true,  od: '08:00', do: '17:00' },
  st: { otevreno: true,  od: '08:00', do: '17:00' },
  ct: { otevreno: true,  od: '08:00', do: '17:00' },
  pa: { otevreno: true,  od: '08:00', do: '17:00' },
  so: { otevreno: false, od: '09:00', do: '13:00' },
  ne: { otevreno: false, od: '09:00', do: '13:00' },
};

function parseTime(timeStr: string): Date {
  const [h, m] = (timeStr || '08:00').split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function officeHoursToText(hours: OfficeHours): string {
  return DAY_LABELS.map(({ key, label }) => {
    const day = hours[key];
    if (!day.otevreno) return `${label}: Zavřeno`;
    return `${label}: ${day.od} – ${day.do}`;
  }).join('\n');
}

function CasovaDostupnostContent() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<OfficeHours>(DEFAULT_HOURS);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  // Time picker state
  const [pickerVisible, setPickerVisible] = useState<{ day: DayKey; field: 'od' | 'do' } | null>(null);

  useEffect(() => {
    loadHours();
  }, []);

  const loadHours = async () => {
    try {
      if (!farmar?.id) return;

      const { data, error } = await supabase
        .from('pestitele')
        .select('office_hours, casova_dostupnost')
        .eq('id', farmar.id)
        .single();

      if (error) throw error;

      if (data?.office_hours) {
        setHours({ ...DEFAULT_HOURS, ...data.office_hours });
      }
    } catch (error) {
      console.error('Chyba při načítání dostupnosti:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateDay = (day: DayKey, field: keyof DaySchedule, value: boolean | string) => {
    setHours(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const handleTimeChange = (_: any, selectedDate?: Date) => {
    if (!pickerVisible) return;

    if (Platform.OS === 'android') {
      setPickerVisible(null);
    }

    if (selectedDate) {
      const { day, field } = pickerVisible;
      updateDay(day, field, formatTime(selectedDate));
    }

    if (Platform.OS === 'ios') {
      // On iOS picker stays visible until dismissed
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!farmar?.id) {
        Alert.alert('Chyba', 'Nejste přihlášeni');
        return;
      }

      const text = officeHoursToText(hours);

      const { error } = await supabase
        .from('pestitele')
        .update({ office_hours: hours, casova_dostupnost: text })
        .eq('id', farmar.id);

      if (error) throw error;

      const now = new Date();
      const datum = now.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const cas = now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
      setSavedMessage(`Uloženo ${datum} v ${cas}`);
      setTimeout(() => setSavedMessage(null), 5000);
    } catch (error: any) {
      console.error('Chyba při ukládání:', error);
      Alert.alert('Chyba', error?.message || 'Nepodařilo se uložit změny');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  const pickerValue = pickerVisible
    ? parseTime(hours[pickerVisible.day][pickerVisible.field] as string)
    : new Date();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Otevírací doba</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentPadding}>
        {savedMessage && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ {savedMessage}</Text>
          </View>
        )}

        <Text style={styles.sectionHint}>
          Nastavte, kdy jste dostupní pro zákazníky. Tato informace se zobrazí na vašem profilu.
        </Text>

        {DAY_LABELS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <View key={key} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={[styles.dayLabel, !day.otevreno && styles.dayLabelClosed]}>
                  {label}
                </Text>
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>
                    {day.otevreno ? 'Otevřeno' : 'Zavřeno'}
                  </Text>
                  <Switch
                    value={day.otevreno}
                    onValueChange={(val) => updateDay(key, 'otevreno', val)}
                    trackColor={{ false: 'rgba(255,255,255,0.2)', true: '#FF9800' }}
                    thumbColor={day.otevreno ? '#ffffff' : 'rgba(255,255,255,0.6)'}
                  />
                </View>
              </View>

              {day.otevreno && (
                <View style={styles.timeRow}>
                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setPickerVisible({ day: key, field: 'od' })}
                  >
                    <Text style={styles.timeLabel}>Od</Text>
                    <Text style={styles.timeValue}>{day.od}</Text>
                  </TouchableOpacity>

                  <Text style={styles.timeSeparator}>–</Text>

                  <TouchableOpacity
                    style={styles.timeButton}
                    onPress={() => setPickerVisible({ day: key, field: 'do' })}
                  >
                    <Text style={styles.timeLabel}>Do</Text>
                    <Text style={styles.timeValue}>{day.do}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Zrušit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={styles.saveButtonText}>{saving ? 'Ukládám...' : 'Uložit'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time picker */}
      {pickerVisible && (
        <>
          {Platform.OS === 'ios' && (
            <View style={styles.iosPickerOverlay}>
              <View style={styles.iosPickerContainer}>
                <View style={styles.iosPickerHeader}>
                  <TouchableOpacity onPress={() => setPickerVisible(null)}>
                    <Text style={styles.iosPickerDone}>Hotovo</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={pickerValue}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={handleTimeChange}
                  style={styles.iosPicker}
                />
              </View>
            </View>
          )}
          {Platform.OS === 'android' && (
            <DateTimePicker
              value={pickerValue}
              mode="time"
              is24Hour
              display="default"
              onChange={handleTimeChange}
            />
          )}
          {Platform.OS === 'web' && (
            <View style={styles.webPickerOverlay}>
              <View style={styles.webPickerCard}>
                <Text style={styles.webPickerTitle}>
                  {pickerVisible.field === 'od' ? 'Čas otevření' : 'Čas zavření'}
                </Text>
                {['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'].map(t => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.webTimeOption,
                      hours[pickerVisible.day][pickerVisible.field] === t && styles.webTimeOptionActive
                    ]}
                    onPress={() => {
                      updateDay(pickerVisible.day, pickerVisible.field, t);
                      setPickerVisible(null);
                    }}
                  >
                    <Text style={[
                      styles.webTimeOptionText,
                      hours[pickerVisible.day][pickerVisible.field] === t && styles.webTimeOptionTextActive
                    ]}>{t}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.webPickerClose} onPress={() => setPickerVisible(null)}>
                  <Text style={styles.webPickerCloseText}>Zavřít</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}
    </View>
  );
}

export default function CasovaDostupnostScreen() {
  return (
    <ProtectedRoute>
      <CasovaDostupnostContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6A1B9A' },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { padding: 6, width: 70 },
  backButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  content: { flex: 1 },
  contentPadding: { padding: 12, paddingBottom: 40 },
  sectionHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  successBanner: {
    backgroundColor: 'rgba(76,175,80,0.3)',
    marginBottom: 12,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(76,175,80,0.5)',
  },
  successText: { color: '#a5d6a7', fontSize: 14, fontWeight: '600', textAlign: 'center' },

  dayCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 14,
    marginBottom: 10,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayLabel: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  dayLabelClosed: { color: 'rgba(255,255,255,0.45)' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)' },

  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  timeButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  timeLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)', marginBottom: 2 },
  timeValue: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  timeSeparator: { fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: '300' },

  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '600' },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },

  // iOS picker
  iosPickerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    top: 0,
    justifyContent: 'flex-end',
  },
  iosPickerContainer: {
    backgroundColor: '#3a0a6e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  iosPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },
  iosPickerDone: { color: '#FF9800', fontSize: 16, fontWeight: '600' },
  iosPicker: { backgroundColor: 'transparent' },

  // Web picker
  webPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  webPickerCard: {
    backgroundColor: '#3a0a6e',
    borderRadius: 16,
    padding: 16,
    width: 200,
    maxHeight: 500,
  },
  webPickerTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  webTimeOption: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 4,
    alignItems: 'center',
  },
  webTimeOptionActive: { backgroundColor: '#FF9800' },
  webTimeOptionText: { color: 'rgba(255,255,255,0.8)', fontSize: 15 },
  webTimeOptionTextActive: { color: '#ffffff', fontWeight: '700' },
  webPickerClose: {
    marginTop: 8,
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    alignItems: 'center',
  },
  webPickerCloseText: { color: '#ffffff', fontSize: 14 },
});
