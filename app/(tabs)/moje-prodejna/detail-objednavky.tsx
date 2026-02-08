import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, TextInput, Linking, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import QRCodeLib from 'qrcode';

interface Objednavka {
  id: string;
  stav: string;
  datum_vyzvednuti?: string;
  anon_customer_code?: string;
  celkova_cena?: number;
  created_at: string;
  zakaznik_telefon?: string;
  poznamka_farmare?: string;
}

interface ObjednavkaPolozka {
  id: string;
  nazev_produktu: string;
  mnozstvi: number;
  jednotka: string;
  cena?: number;
}

export default function DetailObjednavkyScreen() {
  const params = useLocalSearchParams();
  const objednavkaId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [objednavka, setObjednavka] = useState<Objednavka | null>(null);
  const [polozky, setPolozky] = useState<ObjednavkaPolozka[]>([]);
  const [poznamka, setPoznamka] = useState('');
  const [savingPoznamka, setSavingPoznamka] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    console.log('Detail objednavky - ID:', objednavkaId);
    if (objednavkaId) {
      loadObjednavka();
    } else {
      setError('Chybí ID objednávky');
      setLoading(false);
    }
  }, [objednavkaId]);

  const loadObjednavka = async () => {
    try {
      console.log('Načítám objednávku s ID:', objednavkaId);

      // Načti objednávku
      const { data: objednavkaData, error: objednavkaError } = await supabase
        .from('objednavky')
        .select('id, stav, datum_vyzvednuti, anon_customer_code, celkova_cena, created_at, zakaznik_telefon, poznamka_farmare')
        .eq('id', objednavkaId)
        .single();

      console.log('Odpověď ze Supabase:', { data: objednavkaData, error: objednavkaError });

      if (objednavkaError) {
        console.error('Chyba při načítání objednávky:', objednavkaError);
        setError(`Nepodařilo se načíst objednávku: ${objednavkaError.message}`);
        setLoading(false);
        return;
      }

      setObjednavka(objednavkaData);
      setPoznamka(objednavkaData.poznamka_farmare || '');

      // Načti položky objednávky
      const { data: polozkyData, error: polozkyError } = await supabase
        .from('objednavky_polozky')
        .select('id, nazev_produktu, mnozstvi, jednotka, cena')
        .eq('objednavka_id', objednavkaId);

      if (polozkyError) {
        console.error('Chyba při načítání položek:', polozkyError);
      } else {
        setPolozky(polozkyData || []);
      }
    } catch (error) {
      console.error('Chyba:', error);
      showAlert('Chyba', 'Nepodařilo se načíst data');
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const formatDatum = (datum?: string) => {
    if (!datum) return 'Neuvedeno';
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    });
  };

  const formatCreatedAt = (datum: string) => {
    const d = new Date(datum);
    return d.toLocaleDateString('cs-CZ', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStavBarva = (stav: string) => {
    switch (stav) {
      case 'cekajici_na_potvrzeni':
        return '#FF9800';
      case 'potvrzena':
        return '#2196F3';
      case 'odmitnuta':
        return '#F44336';
      case 'nova':
        return '#2196F3';
      case 'zpracovana':
        return '#9C27B0';
      case 'dokoncena':
        return '#4CAF50';
      case 'zrusena':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStavText = (stav: string) => {
    switch (stav) {
      case 'cekajici_na_potvrzeni':
        return 'Čeká na potvrzení';
      case 'potvrzena':
        return 'Potvrzená';
      case 'odmitnuta':
        return 'Odmítnutá';
      case 'nova':
        return 'Nová';
      case 'zpracovana':
        return 'Zpracovaná';
      case 'dokoncena':
        return 'Dokončená';
      case 'zrusena':
        return 'Zrušená';
      default:
        return stav;
    }
  };

  const zmeniStav = async (novyStav: string) => {
    try {
      const { error } = await supabase
        .from('objednavky')
        .update({ stav: novyStav, updated_at: new Date().toISOString() })
        .eq('id', objednavkaId);

      if (error) {
        showAlert('Chyba', 'Nepodařilo se změnit stav objednávky');
        return;
      }

      setObjednavka(prev => prev ? { ...prev, stav: novyStav } : null);
      showAlert('Úspěch', `Stav změněn na "${getStavText(novyStav)}"`);
    } catch (error) {
      console.error('Chyba při změně stavu:', error);
      showAlert('Chyba', 'Nepodařilo se změnit stav');
    }
  };

  const potvrditObjednavku = () => {
    zmeniStav('potvrzena');
  };

  const odmitnoutObjednavku = () => {
    if (Platform.OS === 'web') {
      if (confirm('Opravdu chcete odmítnout tuto objednávku?')) {
        zmeniStav('odmitnuta');
      }
    } else {
      Alert.alert(
        'Odmítnout objednávku',
        'Opravdu chcete odmítnout tuto objednávku?',
        [
          { text: 'Zrušit', style: 'cancel' },
          { text: 'Odmítnout', style: 'destructive', onPress: () => zmeniStav('odmitnuta') },
        ]
      );
    }
  };

  const ulozitPoznamku = async () => {
    if (!objednavka) return;

    setSavingPoznamka(true);
    try {
      const { error } = await supabase
        .from('objednavky')
        .update({ poznamka_farmare: poznamka.trim() || null })
        .eq('id', objednavkaId);

      if (error) {
        showAlert('Chyba', 'Nepodařilo se uložit poznámku');
        return;
      }

      setObjednavka(prev => prev ? { ...prev, poznamka_farmare: poznamka.trim() || undefined } : null);
      showAlert('Uloženo', 'Poznámka byla uložena');
    } catch (error) {
      console.error('Chyba při ukládání poznámky:', error);
      showAlert('Chyba', 'Nepodařilo se uložit poznámku');
    } finally {
      setSavingPoznamka(false);
    }
  };

  const zavolatZakaznika = () => {
    if (objednavka?.zakaznik_telefon) {
      const phoneUrl = `tel:${objednavka.zakaznik_telefon}`;
      Linking.openURL(phoneUrl).catch(() => {
        showAlert('Chyba', 'Nelze otevřít telefonní aplikaci');
      });
    }
  };

  const odeslstOdkazSMS = () => {
    if (objednavka?.zakaznik_telefon && objednavka?.anon_customer_code) {
      const url = `https://samopestitele.vercel.app/vyzvednuti/${objednavka.anon_customer_code}`;
      const message = `Vaše objednávka je připravena k vyzvednutí! 🌾\n\nDetail objednávky: ${url}`;
      const smsUrl = `sms:${objednavka.zakaznik_telefon}?body=${encodeURIComponent(message)}`;
      Linking.openURL(smsUrl).catch(() => {
        showAlert('Chyba', 'Nelze otevřít SMS aplikaci');
      });
    }
  };

  const generateQRData = () => {
    if (!objednavka || !objednavka.anon_customer_code) return '';
    // URL odkaz na veřejnou stránku s detailem objednávky
    return `https://samopestitele.vercel.app/vyzvednuti/${objednavka.anon_customer_code}`;
  };

  // Generování QR kódu jako data URL
  useEffect(() => {
    if (showQR && objednavka) {
      const qrData = generateQRData();
      QRCodeLib.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      })
        .then((url: string) => setQrDataUrl(url))
        .catch((err: any) => console.error('Chyba při generování QR:', err));
    }
  }, [showQR, objednavka]);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail objednávky</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Načítám...</Text>
        </View>
      </View>
    );
  }

  if (error || !objednavka) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.push('/moje-prodejna')} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Zpět</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Detail objednávky</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error || 'Objednávka nenalezena'}</Text>
          <Text style={styles.errorSubtext}>ID: {objednavkaId || 'není definováno'}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.push('/moje-prodejna')}
          >
            <Text style={styles.retryButtonText}>Zpět na prodejnu</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const isCekajici = objednavka.stav === 'cekajici_na_potvrzeni';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/moje-prodejna/objednavky')} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detail objednávky</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Banner pro čekající objednávky */}
        {isCekajici && (
          <View style={styles.urgentBanner}>
            <Text style={styles.urgentBannerText}>⚠️ Tato objednávka čeká na vaše potvrzení</Text>
          </View>
        )}

        {/* Zákazník a základní info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.customerCode}>
              {objednavka.poznamka_farmare
                ? objednavka.poznamka_farmare
                : objednavka.anon_customer_code
                  ? `Zákazník ${objednavka.anon_customer_code}`
                  : 'Zákazník'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStavBarva(objednavka.stav) + '30' }
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStavBarva(objednavka.stav) }
                ]}
              >
                {getStavText(objednavka.stav)}
              </Text>
            </View>
          </View>

          {/* Telefon zákazníka */}
          {objednavka.zakaznik_telefon && (
            <TouchableOpacity
              style={styles.phoneRow}
              onPress={zavolatZakaznika}
            >
              <Text style={styles.phoneIcon}>📱</Text>
              <Text style={styles.phoneText}>{objednavka.zakaznik_telefon}</Text>
              <Text style={styles.phoneAction}>Zavolat →</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.infoText}>
            Přijato: {formatCreatedAt(objednavka.created_at)}
          </Text>

          {objednavka.datum_vyzvednuti && (
            <Text style={styles.pickupText}>
              📅 Datum vyzvednutí: {formatDatum(objednavka.datum_vyzvednuti)}
            </Text>
          )}

          {objednavka.celkova_cena && objednavka.celkova_cena > 0 && (
            <Text style={styles.priceText}>
              Celková cena: {objednavka.celkova_cena.toFixed(0)} Kč
            </Text>
          )}
        </View>

        {/* Poznámka farmáře */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📝 Poznámka (jméno zákazníka apod.)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Např. Paní Nováková, telefon na manžela..."
            placeholderTextColor="rgba(255,255,255,0.4)"
            value={poznamka}
            onChangeText={setPoznamka}
            multiline
            numberOfLines={2}
          />
          <TouchableOpacity
            style={[styles.saveNoteButton, savingPoznamka && styles.buttonDisabled]}
            onPress={ulozitPoznamku}
            disabled={savingPoznamka}
          >
            <Text style={styles.saveNoteButtonText}>
              {savingPoznamka ? 'Ukládám...' : 'Uložit poznámku'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* QR kód pro vyzvednutí */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.qrToggle}
            onPress={() => setShowQR(!showQR)}
          >
            <Text style={styles.cardTitle}>🎫 QR kód pro vyzvednutí</Text>
            <Text style={styles.qrToggleText}>{showQR ? '▼' : '▶'}</Text>
          </TouchableOpacity>

          {showQR && (
            <View style={styles.qrContainer}>
              {qrDataUrl ? (
                <View style={styles.qrCodeWrapper}>
                  <Image
                    source={{ uri: qrDataUrl }}
                    style={{ width: 160, height: 160 }}
                  />
                </View>
              ) : (
                <ActivityIndicator size="small" color="#ffffff" />
              )}
              <Text style={styles.qrHint}>
                Zákazník naskenuje kód a uvidí detail objednávky
              </Text>

              {/* Tlačítko pro odeslání SMS */}
              {objednavka.zakaznik_telefon && (
                <TouchableOpacity
                  style={styles.sendSmsButton}
                  onPress={odeslstOdkazSMS}
                >
                  <Text style={styles.sendSmsButtonText}>
                    📩 Poslat odkaz zákazníkovi (SMS)
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Tlačítka Potvrdit / Odmítnout pro čekající objednávky */}
        {isCekajici && (
          <View style={styles.actionCard}>
            <Text style={styles.actionTitle}>Co chcete s objednávkou udělat?</Text>
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={potvrditObjednavku}
              >
                <Text style={styles.confirmButtonText}>✓ Potvrdit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={odmitnoutObjednavku}
              >
                <Text style={styles.rejectButtonText}>✗ Odmítnout</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Změna stavu pro potvrzené objednávky */}
        {!isCekajici && objednavka.stav !== 'odmitnuta' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Změnit stav</Text>
            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: '#9C27B0' }]}
                onPress={() => zmeniStav('zpracovana')}
              >
                <Text style={styles.statusButtonText}>Zpracovaná</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: '#4CAF50' }]}
                onPress={() => zmeniStav('dokoncena')}
              >
                <Text style={styles.statusButtonText}>Dokončená</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Seznam položek */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Objednané produkty ({polozky.length})</Text>

          {polozky.length === 0 ? (
            <Text style={styles.emptyText}>Žádné položky</Text>
          ) : (
            polozky.map((polozka) => (
              <View key={polozka.id} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{polozka.nazev_produktu}</Text>
                  {polozka.cena && polozka.cena > 0 && (
                    <Text style={styles.productPrice}>
                      {(polozka.cena * polozka.mnozstvi).toFixed(0)} Kč
                    </Text>
                  )}
                </View>
                <Text style={styles.productQuantity}>
                  {polozka.mnozstvi} {polozka.jednotka}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
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
    paddingBottom: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
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
  urgentBanner: {
    backgroundColor: '#FF9800',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  urgentBannerText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  customerCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700'
  },
  infoText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(79,195,247,0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.3)',
  },
  phoneIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  phoneText: {
    flex: 1,
    fontSize: 16,
    color: '#4FC3F7',
    fontWeight: '600',
  },
  phoneAction: {
    fontSize: 13,
    color: '#4FC3F7',
    fontWeight: '500',
  },
  pickupText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginTop: 8,
  },
  priceText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '700',
    marginTop: 8,
  },
  noteInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  saveNoteButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveNoteButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  qrToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrToggleText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
  },
  qrContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  qrCodeWrapper: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
  },
  qrHint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 12,
    textAlign: 'center',
  },
  sendSmsButton: {
    marginTop: 16,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  sendSmsButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  actionCard: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center'
  },
  statusButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600'
  },
  emptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    marginTop: -8,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  productPrice: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  productQuantity: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FF9800'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
