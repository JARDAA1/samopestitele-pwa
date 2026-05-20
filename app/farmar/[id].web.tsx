import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  TextInput,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { fetchFarmarDetail, fetchFarmarProdukty } from '@/features/farmari/services/farmariService';
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

export default function FarmarDetailWebScreen() {
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
      removeFromList(produkt.id);
      alert(`${produkt.nazev} odebráno ze seznamu`);
    } else {
      setSelectedProdukt(produkt);
      setMnozstvi('1');
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

    alert(`${selectedProdukt.nazev} (${mnozstviNum} ${vybranaJednotka}) přidáno do seznamu`);
  };

  const loadFarmarDetail = async () => {
    try {
      setLoading(true);

      const farmarData = await fetchFarmarDetail(id);
      if (!farmarData) {
        console.error('Chyba při načítání farmáře');
        return;
      }
      setFarmar(farmarData as unknown as Farmar);

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
      const url = `https://www.google.com/maps/search/?api=1&query=${farmar.gps_lat},${farmar.gps_lng}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4caf50" />
        <Text style={styles.loadingText}>Načítám...</Text>
      </View>
    );
  }

  if (!farmar) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Farmář nenalezen</Text>
        <TouchableOpacity style={styles.errorBackBtn} onPress={() => router.back()}>
          <Text style={styles.errorBackBtnText}>Zpět</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lat = farmar.gps_lat ?? 0;
  const lng = farmar.gps_lng ?? 0;
  const hasGps = !!farmar.gps_lat && !!farmar.gps_lng;

  return (
    <View style={styles.pageContainer}>
      {/* ───── HEADER ───── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
          <Text style={styles.headerBackText}>← Zpět</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {farmar.nazev_farmy}
        </Text>

        {items.length > 0 ? (
          <TouchableOpacity
            style={styles.headerCartBtn}
            onPress={() => router.push('/nakupni-seznam')}
          >
            <Text style={styles.headerCartText}>🛒 Seznam ({items.length})</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 120 }} />
        )}
      </View>

      {/* ───── HERO BANNER ───── */}
      <View style={styles.heroBanner}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroAvatarText}>
            {farmar.nazev_farmy.charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.heroFarmaName}>{farmar.nazev_farmy}</Text>
        <Text style={styles.heroMesto}>{farmar.mesto}</Text>

        <View style={styles.heroContactRow}>
          {farmar.telefon ? (
            <TouchableOpacity style={styles.heroContactBtn} onPress={handleCall}>
              <Text style={styles.heroContactBtnText}>📞 Zavolat</Text>
            </TouchableOpacity>
          ) : null}
          {farmar.email ? (
            <TouchableOpacity style={styles.heroContactBtn} onPress={handleEmail}>
              <Text style={styles.heroContactBtnText}>✉️ Email</Text>
            </TouchableOpacity>
          ) : null}
          {hasGps ? (
            <TouchableOpacity style={styles.heroContactBtn} onPress={handleNavigate}>
              <Text style={styles.heroContactBtnText}>🗺️ Navigovat</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ───── BODY (two-column) ───── */}
      <View style={styles.bodyRow}>
        {/* LEFT COLUMN */}
        <ScrollView style={styles.leftColumn} contentContainerStyle={styles.leftColumnContent}>
          {/* Info card */}
          <View style={styles.card}>
            {farmar.popis ? (
              <Text style={styles.farmaPopis}>{farmar.popis}</Text>
            ) : null}

            {farmar.casova_dostupnost ? (
              <View style={styles.dostupnostInfoCard}>
                <Text style={styles.dostupnostInfoLabel}>🕐 Dostupnost</Text>
                <Text style={styles.dostupnostInfoText}>{farmar.casova_dostupnost}</Text>
              </View>
            ) : null}

            {!farmar.popis && !farmar.casova_dostupnost ? (
              <Text style={styles.noInfoText}>Žádné další informace k dispozici.</Text>
            ) : null}
          </View>

          {/* Produkty card */}
          <View style={[styles.card, styles.cardTopZero]}>
            <Text style={styles.produktyTitle}>
              Nabídka produktů ({produkty.length})
            </Text>

            {produkty.length === 0 ? (
              <View style={styles.emptyProdukty}>
                <Text style={styles.emptyProduktyText}>
                  Farmář zatím nemá přidané žádné produkty.
                </Text>
              </View>
            ) : (
              <View style={styles.produktyGrid}>
                {produkty.map((produkt) => {
                  const added = hasItem(produkt.id);
                  return (
                    <View key={produkt.id} style={styles.produktCard}>
                      <Text style={styles.produktCardName}>{produkt.nazev}</Text>

                      {produkt.popis ? (
                        <Text style={styles.produktCardPopis} numberOfLines={2}>
                          {produkt.popis}
                        </Text>
                      ) : null}

                      {produkt.dostupnost ? (
                        <View style={[
                          styles.dostupnostBadge,
                          produkt.dostupnost === 'skladem' && styles.badgeSkladem,
                          produkt.dostupnost === 'na_objednavku' && styles.badgeObjednavka,
                          produkt.dostupnost === 'nedostupne' && styles.badgeNedostupne,
                        ]}>
                          <Text style={[
                            styles.dostupnostBadgeText,
                            produkt.dostupnost === 'skladem' && styles.badgeTextSkladem,
                            produkt.dostupnost === 'na_objednavku' && styles.badgeTextObjednavka,
                            produkt.dostupnost === 'nedostupne' && styles.badgeTextNedostupne,
                          ]}>
                            {produkt.dostupnost === 'skladem' ? 'Skladem' :
                             produkt.dostupnost === 'na_objednavku' ? 'Na objednávku' :
                             produkt.dostupnost === 'nedostupne' ? 'Nedostupné' : produkt.dostupnost}
                          </Text>
                        </View>
                      ) : null}

                      {produkt.cena !== null ? (
                        <Text style={styles.produktCardCena}>
                          {formatKc(produkt.cena)} Kč
                          {produkt.jednotka ? ` / ${produkt.jednotka}` : ''}
                        </Text>
                      ) : null}

                      <TouchableOpacity
                        style={[styles.addBtn, added && styles.addBtnAdded]}
                        onPress={() => openMnozstviModal(produkt)}
                        testID="add-product"
                      >
                        <Text style={styles.addBtnText}>
                          {added ? '✓ Přidáno' : '+ Přidat'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Cart summary bar */}
          {items.length > 0 ? (
            <TouchableOpacity
              style={styles.cartSummaryBar}
              onPress={() => router.push('/nakupni-seznam')}
              testID="cart-badge"
            >
              <Text style={styles.cartSummaryText}>
                🛒 Zobrazit seznam ({items.length}) →
              </Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>

        {/* RIGHT COLUMN */}
        <ScrollView style={styles.rightColumn} contentContainerStyle={styles.rightColumnContent}>
          {/* Map card */}
          <View style={styles.card}>
            <Text style={styles.sideCardTitle}>📍 Poloha farmáře</Text>
            {hasGps ? (
              // @ts-ignore
              <iframe
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.05},${lat - 0.05},${lng + 0.05},${lat + 0.05}&layer=mapnik&marker=${lat},${lng}`}
                style={{ width: '100%', height: '300px', border: 'none' }}
              />
            ) : (
              <View style={styles.noGpsContainer}>
                <Text style={styles.noGpsText}>📍 Poloha není dostupná</Text>
              </View>
            )}
          </View>

          {/* Contact card */}
          <View style={[styles.card, styles.cardTopSpacing]}>
            <Text style={styles.sideCardTitle}>Kontakt</Text>

            {farmar.telefon ? (
              <View style={styles.contactRow}>
                <Text style={styles.contactRowIcon}>📞</Text>
                <Text style={styles.contactRowText}>{farmar.telefon}</Text>
                <TouchableOpacity style={styles.contactActionBtn} onPress={handleCall}>
                  <Text style={styles.contactActionBtnText}>Zavolat</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {farmar.email ? (
              <View style={styles.contactRow}>
                <Text style={styles.contactRowIcon}>✉️</Text>
                <Text style={styles.contactRowText}>{farmar.email}</Text>
                <TouchableOpacity style={styles.contactActionBtn} onPress={handleEmail}>
                  <Text style={styles.contactActionBtnText}>Napsat</Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {!farmar.telefon && !farmar.email ? (
              <Text style={styles.noInfoText}>Kontakt není k dispozici.</Text>
            ) : null}
          </View>

          {/* Dostupnost card (right side) */}
          {farmar.casova_dostupnost ? (
            <View style={[styles.card, styles.cardTopSpacing]}>
              <Text style={styles.sideCardTitle}>🕐 Dostupnost</Text>
              <Text style={styles.dostupnostRightText}>{farmar.casova_dostupnost}</Text>
            </View>
          ) : null}
        </ScrollView>
      </View>

      {/* ───── MODAL (View-based overlay) ───── */}
      {modalVisible ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{selectedProdukt?.nazev}</Text>

            {/* Rychlé předvolby pro kg/g produkty */}
            {(selectedProdukt?.jednotka === 'kg' || selectedProdukt?.jednotka === 'g') ? (
              <View style={styles.presetsRow}>
                {[
                  { label: '100 g',  mnozstvi: '100', jednotka: 'g' },
                  { label: '250 g',  mnozstvi: '250', jednotka: 'g' },
                  { label: '500 g',  mnozstvi: '500', jednotka: 'g' },
                  { label: '1 kg',   mnozstvi: '1',   jednotka: 'kg' },
                  { label: '2 kg',   mnozstvi: '2',   jednotka: 'kg' },
                  { label: '2.5 kg', mnozstvi: '2.5', jednotka: 'kg' },
                  { label: '3 kg',   mnozstvi: '3',   jednotka: 'kg' },
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
            ) : null}

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
                  style={[styles.jednotkaBtn, vybranaJednotka === j && styles.jednotkaBtnActive]}
                  onPress={() => setVybranaJednotka(j)}
                >
                  <Text style={[styles.jednotkaBtnText, vybranaJednotka === j && styles.jednotkaBtnTextActive]}>
                    {j}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // ── Page shell ──────────────────────────────────────────────────────────────
  pageContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    flexDirection: 'column',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666666',
  },
  errorText: {
    fontSize: 16,
    color: '#1a1a1a',
    marginBottom: 16,
  },
  errorBackBtn: {
    backgroundColor: '#4caf50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  errorBackBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingHorizontal: 20,
  },
  headerBackBtn: {
    paddingVertical: 8,
    paddingRight: 16,
    width: 120,
  },
  headerBackText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4caf50',
  },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  headerCartBtn: {
    width: 120,
    alignItems: 'flex-end',
    paddingVertical: 8,
    paddingLeft: 16,
  },
  headerCartText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4caf50',
  },

  // ── Hero banner ─────────────────────────────────────────────────────────────
  heroBanner: {
    height: 180,
    backgroundColor: '#4caf50',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 6,
  },
  heroAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroAvatarText: {
    fontSize: 36,
    fontWeight: '800',
    color: '#ffffff',
  },
  heroFarmaName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
  },
  heroMesto: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.85,
    textAlign: 'center',
  },
  heroContactRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  heroContactBtn: {
    borderWidth: 1.5,
    borderColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  heroContactBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },

  // ── Body two-column ─────────────────────────────────────────────────────────
  bodyRow: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },

  // LEFT column
  leftColumn: {
    flex: 1,
    minWidth: 360,
  },
  leftColumnContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // RIGHT column
  rightColumn: {
    width: 380,
    backgroundColor: '#f5f5f5',
  },
  rightColumnContent: {
    padding: 20,
    paddingBottom: 40,
  },

  // ── Shared card ─────────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 16,
    padding: 20,
    marginBottom: 0,
  },
  cardTopZero: {
    marginTop: 16,
  },
  cardTopSpacing: {
    marginTop: 16,
  },
  noInfoText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },

  // ── Info card internals ──────────────────────────────────────────────────────
  farmaPopis: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  dostupnostInfoCard: {
    backgroundColor: '#f0fdf4',
    borderLeftWidth: 3,
    borderLeftColor: '#4caf50',
    borderRadius: 8,
    padding: 12,
  },
  dostupnostInfoLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4caf50',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  dostupnostInfoText: {
    fontSize: 13,
    color: '#374151',
    lineHeight: 20,
  },

  // ── Produkty card ────────────────────────────────────────────────────────────
  produktyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  emptyProdukty: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyProduktyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
  produktyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  produktCard: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    padding: 14,
    minWidth: 200,
    flex: 1,
    // approximate 33% - gap
    maxWidth: '33%' as any,
  },
  produktCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 6,
  },
  produktCardPopis: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
    marginBottom: 8,
  },
  dostupnostBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    marginBottom: 8,
  },
  badgeSkladem: {
    backgroundColor: '#dcfce7',
  },
  badgeObjednavka: {
    backgroundColor: '#fef9c3',
  },
  badgeNedostupne: {
    backgroundColor: '#fee2e2',
  },
  dostupnostBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  badgeTextSkladem: {
    color: '#15803d',
  },
  badgeTextObjednavka: {
    color: '#b45309',
  },
  badgeTextNedostupne: {
    color: '#b91c1c',
  },
  produktCardCena: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4caf50',
    marginBottom: 10,
  },
  addBtn: {
    backgroundColor: '#4caf50',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  addBtnAdded: {
    backgroundColor: '#2e7d32',
  },
  addBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── Cart summary bar ─────────────────────────────────────────────────────────
  cartSummaryBar: {
    backgroundColor: '#4caf50',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  cartSummaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },

  // ── Right column cards ───────────────────────────────────────────────────────
  sideCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 14,
  },
  noGpsContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  noGpsText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 10,
  },
  contactRowIcon: {
    fontSize: 18,
    width: 28,
    textAlign: 'center',
  },
  contactRowText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
  },
  contactActionBtn: {
    borderWidth: 1,
    borderColor: '#4caf50',
    borderRadius: 6,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  contactActionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4caf50',
  },
  dostupnostRightText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  presetChip: {
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 16,
    backgroundColor: '#f0fdf4',
    borderWidth: 1.5,
    borderColor: '#bbf7d0',
  },
  presetChipActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  presetChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  presetChipTextActive: {
    color: '#ffffff',
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
    backgroundColor: '#1a1a1a',
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
    borderColor: '#e5e7eb',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
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
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#f3f4f6',
  },
  jednotkaBtnActive: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50',
  },
  jednotkaBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
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
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#4caf50',
    alignItems: 'center',
  },
  modalConfirmBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
