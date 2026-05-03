import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Platform, Alert, Modal, TextInput, KeyboardAvoidingView } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { fetchFarmarDetail, fetchFarmarProdukty } from '@/features/farmari/services/farmariService';
import { Ionicons } from '@expo/vector-icons';
import { useCustomerList, type CustomerListItem } from '@/shared/context/CustomerListContext';
import { formatKc, getKrokJednotky } from '../_utils/formatKc';

interface Farmar {
  id: string;
  nazev_farmy: string;
  mesto: string;
  popis: string | null;
  telefon: string;
  email: string | null;
  gps_lat: number | null;
  gps_lng: number | null;
  casova_dostupnost: string | null;
}

interface Produkt {
  id: string;
  nazev: string;
  popis: string | null;
  cena: number | null;
  jednotka: string | null;
  dostupnost: string | null;
}

const JEDNOTKY = ['ks', 'kg', 'l', 'g', 'ml'];

// Helper pro formátování data
const formatDate = (date: Date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Helper pro formátování času
const formatTime = (date: Date) => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function FarmarDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { items, addItem, removeItem: removeFromList, hasItem } = useCustomerList();

  const [farmar, setFarmar] = useState<Farmar | null>(null);
  const [produkty, setProdukty] = useState<Produkt[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal pro výběr množství
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProdukt, setSelectedProdukt] = useState<Produkt | null>(null);
  const [mnozstvi, setMnozstvi] = useState('1');
  const [vybranaJednotka, setVybranaJednotka] = useState('ks');


  useEffect(() => {
    if (id) {
      loadFarmarDetail();
    }
  }, [id]);


  const openMnozstviModal = (produkt: Produkt) => {
    if (hasItem(produkt.id)) {
      // Odebrat ze seznamu
      removeFromList(produkt.id);
      if (Platform.OS === 'web') {
        alert(`${produkt.nazev} odebráno ze seznamu`);
      } else {
        Alert.alert('Odebráno', `${produkt.nazev} odebráno ze seznamu`);
      }
    } else {
      // Otevřít modal pro výběr množství
      setSelectedProdukt(produkt);
      setMnozstvi('1');
      // Nastavit výchozí jednotku podle produktu
      if (produkt.jednotka) {
        setVybranaJednotka(produkt.jednotka);
      } else {
        setVybranaJednotka('ks');
      }
      setModalVisible(true);
    }
  };

  const pridatDoSeznamu = () => {
    if (!farmar || !selectedProdukt) return;

    const mnozstviNum = parseFloat(mnozstvi.replace(',', '.')) || 1;

    const newItem: CustomerListItem = {
      produktId: selectedProdukt.id,
      produktNazev: selectedProdukt.nazev,
      farmarId: farmar.id,
      farmarNazev: farmar.nazev_farmy,
      farmarTelefon: farmar.telefon || '',
      cena: selectedProdukt.cena,
      jednotka: selectedProdukt.jednotka,
      mnozstvi: mnozstviNum,
      mnozstviJednotka: vybranaJednotka,
      pridanoV: new Date().toISOString(),
    };

    addItem(newItem);

    setModalVisible(false);
    setSelectedProdukt(null);

    if (Platform.OS === 'web') {
      alert(`${selectedProdukt.nazev} (${mnozstviNum} ${vybranaJednotka}) přidáno do seznamu`);
    } else {
      Alert.alert('Přidáno', `${selectedProdukt.nazev} (${mnozstviNum} ${vybranaJednotka}) přidáno do seznamu`);
    }
  };

  const loadFarmarDetail = async () => {
    try {
      setLoading(true);

      // Načíst data farmáře
      const farmarData = await fetchFarmarDetail(id);
      if (!farmarData) {
        console.error('Chyba při načítání farmáře');
        return;
      }
      setFarmar(farmarData as unknown as Farmar);

      // Načíst produkty farmáře
      const produktyData = await fetchFarmarProdukty(id);
      {
        setProdukty(produktyData as unknown as Produkt[]);
      }
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCall = () => {
    if (farmar?.telefon) {
      Linking.openURL(`tel:${farmar.telefon}`);
    }
  };

  const handleEmail = () => {
    if (farmar?.email) {
      Linking.openURL(`mailto:${farmar.email}`);
    }
  };

  const handleNavigate = () => {
    if (farmar?.gps_lat && farmar?.gps_lng) {
      const url = Platform.select({
        ios: `maps:0,0?q=${farmar.gps_lat},${farmar.gps_lng}`,
        android: `geo:0,0?q=${farmar.gps_lat},${farmar.gps_lng}`,
        default: `https://www.google.com/maps/search/?api=1&query=${farmar.gps_lat},${farmar.gps_lng}`,
      });
      if (url) {
        Linking.openURL(url);
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  if (!farmar) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Farmář nenalezen</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Zpět</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBackBtn}>
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{farmar.nazev_farmy}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Info karta */}
        <View style={styles.infoCard}>
          <View style={styles.farmaHeader}>
            <View style={styles.farmaAvatar}>
              <Text style={styles.farmaAvatarText}>
                {farmar.nazev_farmy.charAt(0).toUpperCase()}
              </Text>
            </View>
            <View style={styles.farmaInfo}>
              <Text style={styles.farmaName}>{farmar.nazev_farmy}</Text>
              <Text style={styles.farmaMesto}>{farmar.mesto}</Text>
            </View>
          </View>

          {farmar.popis && (
            <Text style={styles.farmaPopis}>{farmar.popis}</Text>
          )}

          {farmar.casova_dostupnost && (
            <View style={styles.dostupnostCard}>
              <Text style={styles.dostupnostLabel}>🕐 Dostupnost</Text>
              <Text style={styles.dostupnostText}>{farmar.casova_dostupnost}</Text>
            </View>
          )}

          {/* Kontaktní tlačítka */}
          <View style={styles.contactRow}>
            {farmar.telefon && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
                <Ionicons name="call" size={14} color="#ffffff" />
                <Text style={styles.contactBtnText}>Zavolat</Text>
              </TouchableOpacity>
            )}
            {farmar.email && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleEmail}>
                <Ionicons name="mail" size={14} color="#ffffff" />
                <Text style={styles.contactBtnText}>Email</Text>
              </TouchableOpacity>
            )}
            {farmar.gps_lat && farmar.gps_lng && (
              <TouchableOpacity style={styles.contactBtn} onPress={handleNavigate}>
                <Ionicons name="navigate" size={14} color="#ffffff" />
                <Text style={styles.contactBtnText}>Navigovat</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Nabídka produktů */}
        <View style={styles.produktyCard}>
          <Text style={styles.produktyTitle}>Nabídka produktů</Text>

          {produkty.length === 0 ? (
            <View style={styles.emptyProdukty}>
              <Text style={styles.emptyProduktyText}>
                Farmář zatím nemá přidané žádné produkty.
              </Text>
            </View>
          ) : (
            <View style={styles.produktyList}>
              {produkty.map((produkt) => (
                <View key={produkt.id} style={styles.produktRow}>
                  <View style={styles.produktInfo}>
                    <Text style={styles.produktName}>{produkt.nazev}</Text>
                    {produkt.popis && (
                      <Text style={styles.produktPopis} numberOfLines={2}>
                        {produkt.popis}
                      </Text>
                    )}
                    {produkt.dostupnost && (
                      <View style={[
                        styles.dostupnostBadge,
                        produkt.dostupnost === 'skladem' && styles.dostupnostSkladem,
                        produkt.dostupnost === 'na_objednavku' && styles.dostupnostObjednavka,
                        produkt.dostupnost === 'nedostupne' && styles.dostupnostNedostupne,
                      ]}>
                        <Text style={[
                          styles.dostupnostText,
                          produkt.dostupnost === 'skladem' && styles.dostupnostTextSkladem,
                          produkt.dostupnost === 'na_objednavku' && styles.dostupnostTextObjednavka,
                          produkt.dostupnost === 'nedostupne' && styles.dostupnostTextNedostupne,
                        ]}>
                          {produkt.dostupnost === 'skladem' ? 'Skladem' :
                           produkt.dostupnost === 'na_objednavku' ? 'Na objednávku' :
                           produkt.dostupnost === 'nedostupne' ? 'Nedostupné' : produkt.dostupnost}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.produktActions}>
                    {produkt.cena !== null && (
                      <View style={styles.produktCena}>
                        <Text style={styles.produktCenaText}>
                          {formatKc(produkt.cena)} Kč
                        </Text>
                        {produkt.jednotka && (
                          <Text style={styles.produktJednotka}>
                            / {produkt.jednotka}
                          </Text>
                        )}
                      </View>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.addToListBtn,
                        hasItem(produkt.id) && styles.addToListBtnActive
                      ]}
                      onPress={() => openMnozstviModal(produkt)}
                      testID="add-product"
                    >
                      <Text style={styles.addToListBtnText}>
                        {hasItem(produkt.id) ? '✓' : '+'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Plovoucí tlačítko - Zobrazit seznam */}
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.floatingSeznamBtn}
            onPress={() => router.push('/nakupni-seznam')}
            testID="cart-badge"
          >
            <Text style={styles.floatingSeznamBtnText}>
              Zobrazit seznam ({items.length})
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Modal pro výběr množství */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {selectedProdukt?.nazev}
              </Text>

              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                bounces={false}
              >
                {/* Rychlé předvolby pro kg/g produkty */}
                {(selectedProdukt?.jednotka === 'kg' || selectedProdukt?.jednotka === 'g') && (
                  <View style={styles.presetsRow}>
                    {[
                      { label: '100 g', mnozstvi: '100', jednotka: 'g' },
                      { label: '250 g', mnozstvi: '250', jednotka: 'g' },
                      { label: '500 g', mnozstvi: '500', jednotka: 'g' },
                      { label: '1 kg',  mnozstvi: '1',   jednotka: 'kg' },
                      { label: '2 kg',  mnozstvi: '2',   jednotka: 'kg' },
                      { label: '2.5 kg',mnozstvi: '2.5', jednotka: 'kg' },
                      { label: '3 kg',  mnozstvi: '3',   jednotka: 'kg' },
                    ].map((p) => {
                      const active = mnozstvi === p.mnozstvi && vybranaJednotka === p.jednotka;
                      return (
                        <TouchableOpacity
                          key={p.label}
                          style={[styles.presetChip, active && styles.presetChipActive]}
                          onPress={() => { setMnozstvi(p.mnozstvi); setVybranaJednotka(p.jednotka); }}
                        >
                          <Text style={[styles.presetChipText, active && styles.presetChipTextActive]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                <Text style={styles.modalLabel}>Množství:</Text>
                <View style={styles.mnozstviRow}>
                  <TouchableOpacity
                    style={styles.mnozstviBtn}
                    onPress={() => {
                      const krok = getKrokJednotky(vybranaJednotka);
                      const num = parseFloat(mnozstvi) || krok;
                      if (num > krok) setMnozstvi(String(Math.round((num - krok) * 100) / 100));
                    }}
                  >
                    <Text style={styles.mnozstviBtnText}>-</Text>
                  </TouchableOpacity>

                  <TextInput
                    style={styles.mnozstviInput}
                    value={mnozstvi}
                    onChangeText={(t) => setMnozstvi(t.replace(',', '.'))}
                    keyboardType="decimal-pad"
                    selectTextOnFocus
                    testID="quantity-input"
                  />

                  <TouchableOpacity
                    style={styles.mnozstviBtn}
                    onPress={() => {
                      const krok = getKrokJednotky(vybranaJednotka);
                      const num = parseFloat(mnozstvi) || 0;
                      setMnozstvi(String(Math.round((num + krok) * 100) / 100));
                    }}
                  >
                    <Text style={styles.mnozstviBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.modalLabel}>Jednotka:</Text>
                <View style={styles.jednotkyRow}>
                  {JEDNOTKY.map((j) => (
                    <TouchableOpacity
                      key={j}
                      style={[
                        styles.jednotkaBtn,
                        vybranaJednotka === j && styles.jednotkaBtnActive
                      ]}
                      onPress={() => setVybranaJednotka(j)}
                    >
                      <Text style={[
                        styles.jednotkaBtnText,
                        vybranaJednotka === j && styles.jednotkaBtnTextActive
                      ]}>
                        {j}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={{ height: 8 }} />
              </ScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Zrušit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmBtn}
                  onPress={pridatDoSeznamu}
                  testID="confirm-add-product"
                >
                  <Text style={styles.modalConfirmBtnText}>Přidat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  errorText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6A1B9A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerBackBtn: {
    padding: 6,
  },
  headerBackIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginHorizontal: 6,
  },

  // Scroll
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 8,
    paddingBottom: 20,
  },

  // Info karta - kompaktnější
  infoCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  farmaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  farmaAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  farmaAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  farmaInfo: {
    flex: 1,
  },
  farmaName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 1,
  },
  farmaMesto: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
  },
  farmaPopis: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 16,
    marginBottom: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  dostupnostCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  dostupnostLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FF9800',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dostupnostText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    lineHeight: 18,
  },
  contactRow: {
    flexDirection: 'row',
    gap: 6,
  },
  contactBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
    gap: 3,
  },
  contactBtnText: {
    fontSize: 8,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Produkty karta
  produktyCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  produktyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 6,
  },
  emptyProdukty: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyProduktyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },
  produktyList: {
    gap: 0,
  },
  produktRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  produktInfo: {
    flex: 1,
    marginRight: 8,
  },
  produktName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 1,
  },
  produktPopis: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 16,
    marginBottom: 4,
  },
  dostupnostBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dostupnostSkladem: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
  },
  dostupnostObjednavka: {
    backgroundColor: 'rgba(255, 152, 0, 0.3)',
  },
  dostupnostNedostupne: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
  },
  dostupnostText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  dostupnostTextSkladem: {
    color: '#a5d6a7',
  },
  dostupnostTextObjednavka: {
    color: '#ffcc80',
  },
  dostupnostTextNedostupne: {
    color: '#ef9a9a',
  },
  produktActions: {
    alignItems: 'flex-end',
    gap: 4,
  },
  produktCena: {
    alignItems: 'flex-end',
  },
  produktCenaText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FF9800',
  },
  produktJednotka: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
  },
  addToListBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF9800',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addToListBtnActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
  },
  addToListBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  floatingSeznamBtn: {
    backgroundColor: '#FF9800',
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 12,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  floatingSeznamBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Modal styly
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 340,
    maxHeight: '88%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6A1B9A',
    textAlign: 'center',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  mnozstviRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    gap: 12,
  },
  mnozstviBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6A1B9A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mnozstviBtnText: {
    fontSize: 24,
    fontWeight: '600',
    color: '#ffffff',
  },
  mnozstviInput: {
    width: 80,
    height: 44,
    borderWidth: 2,
    borderColor: '#6A1B9A',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  jednotkyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  jednotkaBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#f0f0f0',
  },
  jednotkaBtnActive: {
    backgroundColor: '#6A1B9A',
    borderColor: '#6A1B9A',
  },
  jednotkaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  jednotkaBtnTextActive: {
    color: '#ffffff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#e0e0e0',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },

  // Rychlé předvolby
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: '#f0e8f8',
    borderWidth: 1.5,
    borderColor: '#d0b8e8',
  },
  presetChipActive: {
    backgroundColor: '#6A1B9A',
    borderColor: '#6A1B9A',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6A1B9A',
  },
  presetChipTextActive: {
    color: '#ffffff',
  },

});
