import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../_utils/farmarAuthContext';
import { ProtectedRoute } from '../_utils/ProtectedRoute';
import { supabase } from '@/lib/supabaseClient';

interface DaySchedule { otevreno: boolean; od: string; do: string; }
interface OfficeHours { po: DaySchedule; ut: DaySchedule; st: DaySchedule; ct: DaySchedule; pa: DaySchedule; so: DaySchedule; ne: DaySchedule; }
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
  po: { otevreno: true, od: '08:00', do: '17:00' },
  ut: { otevreno: true, od: '08:00', do: '17:00' },
  st: { otevreno: true, od: '08:00', do: '17:00' },
  ct: { otevreno: true, od: '08:00', do: '17:00' },
  pa: { otevreno: true, od: '08:00', do: '17:00' },
  so: { otevreno: false, od: '09:00', do: '13:00' },
  ne: { otevreno: false, od: '09:00', do: '13:00' },
};

const TIME_OPTIONS = ['06:00','07:00','08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00'];

function officeHoursToText(hours: OfficeHours): string {
  return DAY_LABELS.map(({ key, label }) => {
    const day = hours[key];
    return day.otevreno ? `${label}: ${day.od} – ${day.do}` : `${label}: Zavřeno`;
  }).join('\n');
}

function CasovaDostupnostContent() {
  const { farmar } = useFarmarAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hours, setHours] = useState<OfficeHours>(DEFAULT_HOURS);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [picker, setPicker] = useState<{ day: DayKey; field: 'od' | 'do' } | null>(null);

  useEffect(() => { loadHours(); }, []);

  const loadHours = async () => {
    try {
      if (!farmar?.id) return;
      const { data } = await supabase
        .from('pestitele')
        .select('office_hours')
        .eq('id', farmar.id)
        .single();
      if (data?.office_hours) setHours({ ...DEFAULT_HOURS, ...data.office_hours });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const updateDay = (day: DayKey, field: keyof DaySchedule, value: boolean | string) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (!farmar?.id) return;
      const text = officeHoursToText(hours);
      const { error } = await supabase
        .from('pestitele')
        .update({ office_hours: hours, casova_dostupnost: text })
        .eq('id', farmar.id);
      if (error) throw error;
      const now = new Date();
      setSavedMsg(`Uloženo ${now.toLocaleDateString('cs-CZ')} v ${now.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}`);
      setTimeout(() => setSavedMsg(null), 5000);
    } catch (e: any) {
      window.alert('Nepodařilo se uložit: ' + (e?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
      </View>
    );
  }

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <TouchableOpacity onPress={() => router.push('/profil')} style={s.backBtn}>
          <Text style={s.backBtnText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={s.pageTitle}>Otevírací doba</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        {savedMsg && (
          <View style={s.successBanner}>
            <Text style={s.successText}>✓ {savedMsg}</Text>
          </View>
        )}

        <Text style={s.hint}>
          Nastavte, kdy jste dostupní pro zákazníky. Tato informace se zobrazí na vašem profilu.
        </Text>

        {DAY_LABELS.map(({ key, label }) => {
          const day = hours[key];
          return (
            <View key={key} style={s.dayCard}>
              <View style={s.dayHeader}>
                <Text style={[s.dayLabel, !day.otevreno && s.dayLabelClosed]}>{label}</Text>
                <View style={s.switchRow}>
                  <Text style={s.switchLabel}>{day.otevreno ? 'Otevřeno' : 'Zavřeno'}</Text>
                  <Switch
                    value={day.otevreno}
                    onValueChange={val => updateDay(key, 'otevreno', val)}
                    trackColor={{ false: '#e5e7eb', true: '#4caf50' }}
                    thumbColor="#ffffff"
                  />
                </View>
              </View>
              {day.otevreno && (
                <View style={s.timeRow}>
                  <TouchableOpacity
                    style={s.timeBtn}
                    onPress={() => setPicker({ day: key, field: 'od' })}
                  >
                    <Text style={s.timeBtnLabel}>Od</Text>
                    <Text style={s.timeBtnValue}>{day.od}</Text>
                  </TouchableOpacity>
                  <Text style={s.timeSep}>–</Text>
                  <TouchableOpacity
                    style={s.timeBtn}
                    onPress={() => setPicker({ day: key, field: 'do' })}
                  >
                    <Text style={s.timeBtnLabel}>Do</Text>
                    <Text style={s.timeBtnValue}>{day.do}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        <View style={s.btnRow}>
          <TouchableOpacity style={s.cancelBtn} onPress={() => router.push('/profil')}>
            <Text style={s.cancelBtnText}>Zrušit</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.saveBtn, saving && s.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <Text style={s.saveBtnText}>{saving ? 'Ukládám...' : 'Uložit'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Time picker overlay */}
      {picker && (
        <View style={s.pickerOverlay}>
          <View style={s.pickerCard}>
            <Text style={s.pickerTitle}>
              {picker.field === 'od' ? 'Čas otevření' : 'Čas zavření'}
            </Text>
            <ScrollView style={s.pickerScroll}>
              {TIME_OPTIONS.map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.timeOption, hours[picker.day][picker.field] === t && s.timeOptionActive]}
                  onPress={() => { updateDay(picker.day, picker.field, t); setPicker(null); }}
                >
                  <Text style={[s.timeOptionText, hours[picker.day][picker.field] === t && s.timeOptionTextActive]}>
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.pickerClose} onPress={() => setPicker(null)}>
              <Text style={s.pickerCloseText}>Zavřít</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export default function CasovaDostupnostScreen() {
  return <ProtectedRoute><CasovaDostupnostContent /></ProtectedRoute>;
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f9fafb' },

  pageHeader: {
    backgroundColor: '#ffffff', paddingHorizontal: 32, paddingTop: 24, paddingBottom: 20,
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  backBtn: { marginBottom: 6 },
  backBtnText: { fontSize: 13, color: '#4caf50', fontWeight: '600' },
  pageTitle: { fontSize: 24, fontWeight: '800', color: '#1a1a1a' },

  scroll: { flex: 1 },
  scrollContent: {
    maxWidth: 680 as any, width: '100%' as any,
    alignSelf: 'center' as any, padding: 40, gap: 12, paddingBottom: 48,
  },

  successBanner: {
    backgroundColor: '#dcfce7', borderRadius: 10, padding: 14,
    borderWidth: 1, borderColor: '#4caf50',
  },
  successText: { color: '#166534', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  hint: { fontSize: 14, color: '#6b7280', lineHeight: 20 },

  dayCard: {
    backgroundColor: '#ffffff', borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: '#e5e7eb',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  dayLabelClosed: { color: '#d1d5db' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  switchLabel: { fontSize: 13, color: '#9ca3af' },

  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  timeBtn: {
    flex: 1, backgroundColor: '#f9fafb', borderRadius: 8, padding: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  timeBtnLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 2 },
  timeBtnValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  timeSep: { fontSize: 18, color: '#d1d5db' },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1, backgroundColor: '#f3f4f6', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb',
  },
  cancelBtnText: { color: '#374151', fontSize: 15, fontWeight: '600' },
  saveBtn: {
    flex: 1, backgroundColor: '#4caf50', borderRadius: 12, paddingVertical: 14, alignItems: 'center',
  },
  saveBtnText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.6 },

  pickerOverlay: {
    position: 'absolute' as any, top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', zIndex: 100,
  },
  pickerCard: {
    backgroundColor: '#ffffff', borderRadius: 16, padding: 16,
    width: 200 as any, maxHeight: 400 as any,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2, shadowRadius: 20, elevation: 10,
  },
  pickerTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', textAlign: 'center', marginBottom: 12 },
  pickerScroll: { maxHeight: 300 as any },
  timeOption: { padding: 10, borderRadius: 8, marginBottom: 4, alignItems: 'center' },
  timeOptionActive: { backgroundColor: '#4caf50' },
  timeOptionText: { color: '#374151', fontSize: 15 },
  timeOptionTextActive: { color: '#ffffff', fontWeight: '700' },
  pickerClose: {
    marginTop: 8, padding: 10, backgroundColor: '#f3f4f6',
    borderRadius: 8, alignItems: 'center',
  },
  pickerCloseText: { color: '#374151', fontSize: 14, fontWeight: '600' },
});
