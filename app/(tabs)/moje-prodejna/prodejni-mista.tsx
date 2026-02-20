import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, TextInput, Modal, Switch, Platform } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { useLayoutMode } from '../../components/AppLayout';
import {
  ProdejniMisto,
  getProdejniMistaFarmare,
  createProdejniMisto,
  updateProdejniMisto,
  deleteProdejniMisto,
  isProdejniMistoAktivniDnes
} from '../../utils/locationService';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function ProdejniMistaScreen() {
  const { farmar, isAuthenticated } = useFarmarAuth();
  const { mode } = useLayoutMode();
  const isWideMode = mode === 'tablet' || mode === 'desktop';

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [mista, setMista] = useState<ProdejniMisto[]>([]);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingMisto, setEditingMisto] = useState<ProdejniMisto | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [nazev, setNazev] = useState('');
  const [adresa, setAdresa] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [aktivni, setAktivni] = useState(true);
  const [platneOd, setPlatneOd] = useState<Date | null>(null);
  const [platneDo, setPlatneDo] = useState<Date | null>(null);

  // Date picker state
  const [showDatePicker, setShowDatePicker] = useState<'od' | 'do' | null>(null);

  // Web: textové vstupy pro datum (DD.MM.RRRR) - DateTimePicker na webu nefunguje
  const [webOdText, setWebOdText] = useState('');
  const [webDoText, setWebDoText] = useState('');

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated && farmar?.id) {
        loadMista();
      }
    }, [isAuthenticated, farmar])
  );

  const loadMista = async (isRefresh = false) => {
    try {
      if (!farmar?.id) {
        router.replace('/prihlaseni');
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await getProdejniMistaFarmare(farmar.id);
      setMista(data);
    } catch (error) {
      console.error('Chyba při načítání prodejních míst:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    loadMista(true);
  }, [farmar]);

  const openAddModal = () => {
    setEditingMisto(null);
    setNazev('');
    setAdresa('');
    setLat('');
    setLng('');
    setAktivni(true);
    setPlatneOd(null);
    setPlatneDo(null);
    setWebOdText('');
    setWebDoText('');
    setModalVisible(true);
  };

  const openEditModal = (misto: ProdejniMisto) => {
    setEditingMisto(misto);
    setNazev(misto.nazev);
    setAdresa(misto.adresa || '');
    setLat(misto.lat?.toString() || '');
    setLng(misto.lng?.toString() || '');
    setAktivni(misto.aktivni);
    setPlatneOd(misto.platne_od ? new Date(misto.platne_od) : null);
    setPlatneDo(misto.platne_do ? new Date(misto.platne_do) : null);
    setWebOdText(misto.platne_od ? new Date(misto.platne_od).toLocaleDateString('cs-CZ') : '');
    setWebDoText(misto.platne_do ? new Date(misto.platne_do).toLocaleDateString('cs-CZ') : '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!farmar?.id || !nazev.trim()) return;

    setSaving(true);
    try {
      const data = {
        nazev: nazev.trim(),
        adresa: adresa.trim() || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        aktivni,
        platne_od: platneOd ? platneOd.toISOString().split('T')[0] : null,
        platne_do: platneDo ? platneDo.toISOString().split('T')[0] : null,
      };

      if (editingMisto) {
        await updateProdejniMisto(editingMisto.id, data);
      } else {
        await createProdejniMisto(farmar.id, data);
      }

      setModalVisible(false);
      loadMista();
    } catch (error) {
      console.error('Chyba při ukládání:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mistoId: number) => {
    try {
      await deleteProdejniMisto(mistoId);
      loadMista();
    } catch (error) {
      console.error('Chyba při mazání:', error);
    }
  };

  const toggleAktivni = async (misto: ProdejniMisto) => {
    try {
      await updateProdejniMisto(misto.id, { aktivni: !misto.aktivni });
      setMista(prev => prev.map(m =>
        m.id === misto.id ? { ...m, aktivni: !m.aktivni } : m
      ));
    } catch (error) {
      console.error('Chyba při změně stavu:', error);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return d.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(null);
    }

    if (selectedDate) {
      if (showDatePicker === 'od') {
        setPlatneOd(selectedDate);
      } else if (showDatePicker === 'do') {
        setPlatneDo(selectedDate);
      }
    }
  };

  // Parsuje datum zadané uživatelem ve formátu DD.MM.RRRR nebo RRRR-MM-DD
  const parseWebDate = (text: string): Date | null => {
    const trimmed = text.trim();
    // Formát DD.MM.RRRR
    const czMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (czMatch) {
      const [, d, m, y] = czMatch;
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (!isNaN(date.getTime())) return date;
    }
    // Formát RRRR-MM-DD (ISO)
    const isoDate = new Date(trimmed);
    if (!isNaN(isoDate.getTime())) return isoDate;
    return null;
  };

  const getMistoStatus = (misto: ProdejniMisto) => {
    if (!misto.aktivni) {
      return { text: 'Neaktivní', color: '#9E9E9E', icon: '⏸️' };
    }

    const isActiveToday = isProdejniMistoAktivniDnes(misto);
    if (isActiveToday) {
      return { text: 'Aktivní', color: '#4CAF50', icon: '✅' };
    } else {
      return { text: 'Mimo sezónu', color: '#FF9800', icon: '📅' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moje prodejní místa</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Načítám prodejní místa...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#ffffff"
              colors={['#FF9800']}
            />
          }
        >
          {/* Info box */}
          <View style={styles.infoBox}>
            <Text style={styles.infoIcon}>ℹ️</Text>
            <Text style={styles.infoText}>
              Můžete mít více prodejních míst aktivních současně.
              Zákazníci si vyberou, kde chtějí zboží vyzvednout.
            </Text>
          </View>

          {mista.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>📍</Text>
              <Text style={styles.emptyText}>Zatím nemáte žádná prodejní místa</Text>
              <TouchableOpacity style={styles.addButtonEmpty} onPress={openAddModal}>
                <Text style={styles.addButtonEmptyText}>+ Přidat prodejní místo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={isWideMode ? styles.gridContainer : undefined}>
              {mista.map((misto) => {
                const status = getMistoStatus(misto);
                return (
                  <View
                    key={misto.id}
                    style={[
                      styles.mistoCard,
                      !misto.aktivni && styles.mistoCardInactive,
                      isWideMode && styles.mistoCardGrid
                    ]}
                  >
                    <View style={styles.mistoHeader}>
                      <View style={styles.mistoInfo}>
                        <Text style={[styles.mistoNazev, !misto.aktivni && styles.mistoNazevInactive]}>
                          {misto.nazev}
                        </Text>
                        {misto.adresa && (
                          <Text style={styles.mistoAdresa}>📍 {misto.adresa}</Text>
                        )}
                        {(misto.platne_od || misto.platne_do) && (
                          <Text style={styles.mistoPlatnost}>
                            📅 {misto.platne_od ? formatDate(misto.platne_od) : '...'}
                            {' - '}
                            {misto.platne_do ? formatDate(misto.platne_do) : '...'}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
                        <Text style={styles.statusText}>{status.icon}</Text>
                      </View>
                    </View>

                    <View style={styles.mistoActions}>
                      <View style={styles.switchContainer}>
                        <Text style={styles.switchLabel}>Aktivní</Text>
                        <Switch
                          value={misto.aktivni}
                          onValueChange={() => toggleAktivni(misto)}
                          trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(76,175,80,0.5)' }}
                          thumbColor={misto.aktivni ? '#4CAF50' : '#9E9E9E'}
                        />
                      </View>

                      <View style={styles.actionButtons}>
                        <TouchableOpacity
                          style={styles.editButton}
                          onPress={() => openEditModal(misto)}
                        >
                          <Text style={styles.editButtonText}>✏️ Upravit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => handleDelete(misto.id)}
                        >
                          <Text style={styles.deleteButtonText}>🗑️</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      {/* FAB pro přidání */}
      <TouchableOpacity style={styles.fab} onPress={openAddModal}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Modal pro přidání/úpravu */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingMisto ? 'Upravit prodejní místo' : 'Nové prodejní místo'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Název místa *</Text>
              <TextInput
                style={styles.input}
                value={nazev}
                onChangeText={setNazev}
                placeholder="např. Farmářský trh Náměstí"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <Text style={styles.inputLabel}>Adresa</Text>
              <TextInput
                style={styles.input}
                value={adresa}
                onChangeText={setAdresa}
                placeholder="např. Náměstí Míru 1, Praha"
                placeholderTextColor="rgba(255,255,255,0.4)"
              />

              <View style={styles.gpsRow}>
                <View style={styles.gpsField}>
                  <Text style={styles.inputLabel}>GPS Lat</Text>
                  <TextInput
                    style={styles.input}
                    value={lat}
                    onChangeText={setLat}
                    placeholder="50.0755"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.gpsField}>
                  <Text style={styles.inputLabel}>GPS Lng</Text>
                  <TextInput
                    style={styles.input}
                    value={lng}
                    onChangeText={setLng}
                    placeholder="14.4378"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.switchRow}>
                <Text style={styles.inputLabel}>Aktivní</Text>
                <Switch
                  value={aktivni}
                  onValueChange={setAktivni}
                  trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(76,175,80,0.5)' }}
                  thumbColor={aktivni ? '#4CAF50' : '#9E9E9E'}
                />
              </View>

              <Text style={styles.sectionLabel}>Sezónní platnost (volitelné)</Text>
              <Text style={styles.sectionHint}>
                Nastavte, pokud prodáváte pouze v určitém období
              </Text>

              {Platform.OS === 'web' ? (
                // WEB: TextInput – nativní DateTimePicker na webu nefunguje
                <View style={styles.dateRow}>
                  <View style={styles.webDateInputWrapper}>
                    <Text style={styles.dateButtonLabel}>Od:</Text>
                    <TextInput
                      style={styles.webDateInput}
                      value={webOdText}
                      onChangeText={(text) => {
                        setWebOdText(text);
                        const parsed = parseWebDate(text);
                        if (parsed) setPlatneOd(parsed);
                        else if (!text.trim()) setPlatneOd(null);
                      }}
                      placeholder="DD.MM.RRRR"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      maxLength={10}
                    />
                  </View>

                  <View style={styles.webDateInputWrapper}>
                    <Text style={styles.dateButtonLabel}>Do:</Text>
                    <TextInput
                      style={styles.webDateInput}
                      value={webDoText}
                      onChangeText={(text) => {
                        setWebDoText(text);
                        const parsed = parseWebDate(text);
                        if (parsed) setPlatneDo(parsed);
                        else if (!text.trim()) setPlatneDo(null);
                      }}
                      placeholder="DD.MM.RRRR"
                      placeholderTextColor="rgba(255,255,255,0.35)"
                      maxLength={10}
                    />
                  </View>
                </View>
              ) : (
                // NATIVNÍ (iOS / Android): původní TouchableOpacity + DateTimePicker
                <>
                  <View style={styles.dateRow}>
                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePicker('od')}
                    >
                      <Text style={styles.dateButtonLabel}>Od:</Text>
                      <Text style={styles.dateButtonValue}>
                        {platneOd ? platneOd.toLocaleDateString('cs-CZ') : 'Nenastaveno'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.dateButton}
                      onPress={() => setShowDatePicker('do')}
                    >
                      <Text style={styles.dateButtonLabel}>Do:</Text>
                      <Text style={styles.dateButtonValue}>
                        {platneDo ? platneDo.toLocaleDateString('cs-CZ') : 'Nenastaveno'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showDatePicker && (
                    <DateTimePicker
                      value={showDatePicker === 'od' ? (platneOd || new Date()) : (platneDo || new Date())}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={handleDateChange}
                      locale="cs-CZ"
                    />
                  )}

                  {Platform.OS === 'ios' && showDatePicker && (
                    <TouchableOpacity
                      style={styles.dateConfirmButton}
                      onPress={() => setShowDatePicker(null)}
                    >
                      <Text style={styles.dateConfirmText}>Potvrdit</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {(platneOd || platneDo) && (
                <TouchableOpacity
                  style={styles.clearDatesButton}
                  onPress={() => {
                    setPlatneOd(null);
                    setPlatneDo(null);
                    setWebOdText('');
                    setWebDoText('');
                  }}
                >
                  <Text style={styles.clearDatesText}>Zrušit sezónní omezení</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Zrušit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveButton, (!nazev.trim() || saving) && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={!nazev.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingMisto ? 'Uložit změny' : 'Přidat místo'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A'
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    marginBottom: 8
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600'
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)'
  },
  content: {
    flex: 1,
    padding: 12
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  infoIcon: {
    fontSize: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
    textAlign: 'center'
  },
  addButtonEmpty: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10
  },
  addButtonEmptyText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600'
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  mistoCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  mistoCardInactive: {
    opacity: 0.6,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  mistoCardGrid: {
    width: '48%',
  },
  mistoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  mistoInfo: {
    flex: 1,
    gap: 4,
  },
  mistoNazev: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  mistoNazevInactive: {
    color: 'rgba(255,255,255,0.6)',
  },
  mistoAdresa: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  mistoPlatnost: {
    fontSize: 12,
    color: '#FF9800',
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 14,
  },
  mistoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 12,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  editButtonText: {
    fontSize: 13,
    color: '#ffffff',
  },
  deleteButton: {
    backgroundColor: 'rgba(244,67,54,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 6,
  },
  deleteButtonText: {
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#FFFFFF',
    fontWeight: '300',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#6A1B9A',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  modalClose: {
    fontSize: 24,
    color: 'rgba(255,255,255,0.6)',
    padding: 4,
  },
  modalBody: {
    padding: 16,
    maxHeight: 400,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  gpsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  gpsField: {
    flex: 1,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 20,
    marginBottom: 4,
  },
  sectionHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    marginBottom: 12,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  dateButtonLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  dateButtonValue: {
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
  // Web: textové vstupy pro datum (místo nativního DateTimePicker)
  webDateInputWrapper: {
    flex: 1,
  },
  webDateInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginTop: 4,
  },
  clearDatesButton: {
    marginTop: 12,
    padding: 8,
    alignItems: 'center',
  },
  clearDatesText: {
    fontSize: 13,
    color: '#F44336',
  },
  dateConfirmButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  dateConfirmText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
});
