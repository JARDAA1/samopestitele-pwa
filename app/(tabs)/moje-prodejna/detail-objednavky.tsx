import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, TextInput, Linking, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, useEffect } from 'react';
import {
  fetchObjednavkaDetail,
  fetchObjednavkaPolozky,
  zmeniStavObjednavky,
  ulozitPoznamkuFarmare,
  oznacitObjednavkuJakoPripravena,
  poslatSMSPripraveno,
} from '@/features/objednavky/services/objednavkyService';
import { formatKc, formatMnozstvi } from '../../_utils/formatKc';

interface Objednavka {
  id: string;
  stav: string;
  datum_vyzvednuti?: string;
  anon_customer_code?: string;
  celkova_cena?: number;
  created_at: string;
  zakaznik_telefon?: string;
  poznamka_farmare?: string;
  phone_consent?: boolean;
  ready_at?: string;
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
  const [showSMSModal, setShowSMSModal] = useState(false);

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
      const objednavkaData = await fetchObjednavkaDetail(objednavkaId);

      setObjednavka(objednavkaData);
      setPoznamka(objednavkaData.poznamka_farmare || '');

      // Načti položky objednávky
      const polozkyData = await fetchObjednavkaPolozky(objednavkaId);
      setPolozky(polozkyData);
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
      case 'ceka_na_vyzvednuti':
        return '#FF9800';
      case 'zpracovana':
        return '#558b2f';
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
      case 'ceka_na_vyzvednuti':
        return 'Čeká na vyzvednutí';
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
      await zmeniStavObjednavky(objednavkaId, novyStav);
      setObjednavka(prev => prev ? { ...prev, stav: novyStav } : null);
      showAlert('Úspěch', `Stav změněn na "${getStavText(novyStav)}"`);
    } catch (error) {
      console.error('Chyba při změně stavu:', error);
      showAlert('Chyba', 'Nepodařilo se změnit stav');
    }
  };

  const potvrditObjednavku = async () => {
    await zmeniStav('potvrzena');

    // Nabídnout odeslání SMS
    if (objednavka?.zakaznik_telefon) {
      if (Platform.OS === 'web') {
        if (confirm('Chcete odeslat zákazníkovi SMS s potvrzením?')) {
          odeslstPotvrzeniSMS();
        }
      } else {
        Alert.alert(
          'Odeslat SMS?',
          'Chcete odeslat zákazníkovi SMS s potvrzením objednávky?',
          [
            { text: 'Ne', style: 'cancel' },
            { text: 'Ano, odeslat', onPress: () => odeslstPotvrzeniSMS() },
          ]
        );
      }
    }
  };

  const odeslstPotvrzeniSMS = () => {
    if (objednavka?.zakaznik_telefon) {
      let message = `Dobrý den, vaše objednávka byla potvrzena! ✅`;

      if (objednavka.datum_vyzvednuti) {
        const datum = new Date(objednavka.datum_vyzvednuti).toLocaleDateString('cs-CZ');
        message += `\nDatum vyzvednutí: ${datum}`;
      }

      if (objednavka.anon_customer_code) {
        message += `\n\nDetail: https://samopestitele.vercel.app/vyzvednuti/${objednavka.anon_customer_code}`;
      }

      const smsUrl = `sms:${objednavka.zakaznik_telefon}?body=${encodeURIComponent(message)}`;
      Linking.openURL(smsUrl).catch(() => {
        showAlert('Chyba', 'Nelze otevřít SMS aplikaci');
      });
    }
  };

  const odeslstOdmitnutiSMS = () => {
    if (!objednavka?.zakaznik_telefon) return;
    const message = `Omlouváme se, vaši objednávku bohužel nemůžeme splnit. 🙏`;
    const smsUrl = `sms:${objednavka.zakaznik_telefon}?body=${encodeURIComponent(message)}`;
    Linking.openURL(smsUrl).catch(() => showAlert('Chyba', 'Nelze otevřít SMS aplikaci'));
  };

  const odmitnoutObjednavku = () => {
    const provest = async () => {
      await zmeniStav('odmitnuta');
      if (objednavka?.zakaznik_telefon) {
        if (Platform.OS === 'web') {
          if (confirm('Chcete odeslat zákazníkovi SMS o odmítnutí?')) {
            odeslstOdmitnutiSMS();
          }
        } else {
          Alert.alert(
            'Odeslat SMS?',
            'Chcete zákazníkovi odeslat SMS o odmítnutí objednávky?',
            [
              { text: 'Ne', style: 'cancel' },
              { text: 'Ano, odeslat', onPress: odeslstOdmitnutiSMS },
            ]
          );
        }
      }
    };

    if (Platform.OS === 'web') {
      if (confirm('Opravdu chcete odmítnout tuto objednávku?')) {
        provest();
      }
    } else {
      Alert.alert(
        'Odmítnout objednávku',
        'Opravdu chcete odmítnout tuto objednávku?',
        [
          { text: 'Zrušit', style: 'cancel' },
          { text: 'Odmítnout', style: 'destructive', onPress: provest },
        ]
      );
    }
  };

  const dokoncitObjednavku = async () => {
    // Nejprve změnit stav
    await zmeniStav('dokoncena');

    // Pak nabídnout odeslání SMS
    if (objednavka?.zakaznik_telefon) {
      if (Platform.OS === 'web') {
        if (confirm('Chcete odeslat zákazníkovi SMS s poděkováním?')) {
          odeslstDekujemeSMS();
        }
      } else {
        Alert.alert(
          'Odeslat SMS?',
          'Chcete odeslat zákazníkovi SMS s poděkováním za nákup?',
          [
            { text: 'Ne', style: 'cancel' },
            { text: 'Ano, odeslat', onPress: () => odeslstDekujemeSMS() },
          ]
        );
      }
    }
  };

  const odeslstDekujemeSMS = () => {
    if (objednavka?.zakaznik_telefon) {
      const message = `Děkujeme za nákup! 🙏 Těšíme se na vaši další návštěvu. 🧺`;
      const smsUrl = `sms:${objednavka.zakaznik_telefon}?body=${encodeURIComponent(message)}`;
      Linking.openURL(smsUrl).catch(() => {
        showAlert('Chyba', 'Nelze otevřít SMS aplikaci');
      });
    }
  };

  const ulozitPoznamku = async () => {
    if (!objednavka) return;

    setSavingPoznamka(true);
    try {
      await ulozitPoznamkuFarmare(objednavkaId, poznamka.trim() || null);
      setObjednavka(prev => prev ? { ...prev, poznamka_farmare: poznamka.trim() || undefined } : null);
      showAlert('Uloženo', 'Poznámka byla uložena');
    } catch (error) {
      console.error('Chyba při ukládání poznámky:', error);
      showAlert('Chyba', 'Nepodařilo se uložit poznámku');
    } finally {
      setSavingPoznamka(false);
    }
  };

  const oznacitPripraveno = async () => {
    if (!objednavka) return;

    const bylaPotvrzena = objednavka.stav === 'potvrzena';

    try {
      await zmeniStavObjednavky(objednavkaId, 'ceka_na_vyzvednuti');
      setObjednavka(prev =>
        prev ? { ...prev, stav: 'ceka_na_vyzvednuti', ready_at: new Date().toISOString() } : null
      );

      // Send SMS only when transitioning from confirmed → ready and consent given
      if (bylaPotvrzena && objednavka.phone_consent && objednavka.zakaznik_telefon) {
        await poslatSMSPripraveno(objednavka.zakaznik_telefon);
      }

      showAlert('Hotovo', 'Objednávka označena jako připravena k vyzvednutí.');
    } catch {
      showAlert('Chyba', 'Nepodařilo se označit objednávku jako připravenou.');
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

  const getSMSMessage = () => {
    if (!objednavka) return '';

    let message = '';
    const stavText = getStavText(objednavka.stav);

    switch (objednavka.stav) {
      case 'potvrzena':
        message = `Dobrý den, vaše objednávka byla potvrzena! ✅`;
        break;
      case 'ceka_na_vyzvednuti':
        message = `Dobrý den, vaše objednávka je připravena k vyzvednutí! 🧺`;
        break;
      case 'zpracovana':
        message = `Dobrý den, vaše objednávka je připravena k vyzvednutí! 🧺`;
        break;
      case 'dokoncena':
        message = `Děkujeme za nákup! 🙏`;
        break;
      case 'odmitnuta':
        message = `Omlouváme se, vaši objednávku bohužel nemůžeme splnit.`;
        break;
      default:
        message = `Informace k vaší objednávce (${stavText}):`;
    }

    // Přidat datum vyzvednutí pokud existuje
    if (objednavka.datum_vyzvednuti && objednavka.stav !== 'dokoncena') {
      const datum = new Date(objednavka.datum_vyzvednuti).toLocaleDateString('cs-CZ');
      message += `\nDatum vyzvednutí: ${datum}`;
    }

    // Přidat odkaz na detail
    if (objednavka.anon_customer_code) {
      message += `\n\nDetail: https://samopestitele.vercel.app/vyzvednuti/${objednavka.anon_customer_code}`;
    }

    return message;
  };

  const odeslstSMSoStavu = () => {
    if (objednavka?.zakaznik_telefon) {
      const message = getSMSMessage();

      // Na webu zobrazit modal s textem ke zkopírování
      if (Platform.OS === 'web') {
        setShowSMSModal(true);
        return;
      }

      // Na mobilu otevřít SMS aplikaci
      const smsUrl = `sms:${objednavka.zakaznik_telefon}?body=${encodeURIComponent(message)}`;
      Linking.openURL(smsUrl).catch(() => {
        showAlert('Chyba', 'Nelze otevřít SMS aplikaci');
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    if (Platform.OS === 'web') {
      try {
        await navigator.clipboard.writeText(text);
        showAlert('Zkopírováno', 'Text byl zkopírován do schránky');
      } catch {
        showAlert('Chyba', 'Nepodařilo se zkopírovat text');
      }
    }
  };

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
        <TouchableOpacity onPress={() => router.push('/moje-prodejna')} style={styles.backButton}>
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

          {/* Telefon zákazníka s akcemi */}
          {objednavka.zakaznik_telefon && (
            <View style={styles.phoneSection}>
              <View style={styles.phoneInfo}>
                <Text style={styles.phoneIcon}>📱</Text>
                <Text style={styles.phoneText}>{objednavka.zakaznik_telefon}</Text>
              </View>
              <View style={styles.phoneActions}>
                <TouchableOpacity
                  style={styles.phoneActionButton}
                  onPress={zavolatZakaznika}
                >
                  <Text style={styles.phoneActionButtonText}>📞 Zavolat</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.phoneActionButton, styles.smsButton]}
                  onPress={odeslstSMSoStavu}
                >
                  <Text style={styles.phoneActionButtonText}>💬 SMS</Text>
                </TouchableOpacity>
              </View>
            </View>
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
              Celková cena: {formatKc(objednavka.celkova_cena)} Kč
            </Text>
          )}
        </View>

        {/* Seznam položek - hned za zákazníkem */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🛒 Objednané produkty ({polozky.length})</Text>

          {polozky.length === 0 ? (
            <Text style={styles.emptyText}>Žádné položky</Text>
          ) : (
            polozky.map((polozka) => (
              <View key={polozka.id} style={styles.productItem}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{polozka.nazev_produktu}</Text>
                  {polozka.cena && polozka.cena > 0 && (
                    <Text style={styles.productPrice}>
                      {formatKc(polozka.cena * polozka.mnozstvi)} Kč
                    </Text>
                  )}
                </View>
                <Text style={styles.productQuantity}>
                  {formatMnozstvi(polozka.mnozstvi)} {polozka.jednotka}
                </Text>
              </View>
            ))
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

        {/* Tlačítko "Připraveno k vyzvednutí" – pro nové a potvrzené objednávky */}
        {(objednavka.stav === 'potvrzena' || objednavka.stav === 'nova') && (
          <TouchableOpacity
            style={styles.pripravenoBtnPrimary}
            onPress={oznacitPripraveno}
          >
            <Text style={styles.pripravenoBtnText}>✔ Připraveno k vyzvednutí</Text>
          </TouchableOpacity>
        )}

        {/* Tlačítko "Uložit do archivu" – objednávka vyzvednuta */}
        {objednavka.stav === 'ceka_na_vyzvednuti' && (
          <TouchableOpacity
            style={[styles.pripravenoBtnPrimary, { backgroundColor: '#4CAF50', borderColor: '#2E7D32' }]}
            onPress={dokoncitObjednavku}
          >
            <Text style={styles.pripravenoBtnText}>📦 Uložit do archivu</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* SMS Modal pro web */}
      <Modal
        visible={showSMSModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSMSModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>📱 Odeslat SMS</Text>
            <Text style={styles.modalSubtitle}>
              SMS nelze odeslat přímo z webu. Zkopírujte údaje a odešlete ručně:
            </Text>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Telefon:</Text>
              <View style={styles.modalCopyRow}>
                <Text style={styles.modalValue}>{objednavka?.zakaznik_telefon}</Text>
                <TouchableOpacity
                  style={styles.copyButton}
                  onPress={() => copyToClipboard(objednavka?.zakaznik_telefon || '')}
                >
                  <Text style={styles.copyButtonText}>📋 Kopírovat</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalSection}>
              <Text style={styles.modalLabel}>Text zprávy:</Text>
              <Text style={styles.modalMessageText}>{getSMSMessage()}</Text>
              <TouchableOpacity
                style={styles.copyButton}
                onPress={() => copyToClipboard(getSMSMessage())}
              >
                <Text style={styles.copyButtonText}>📋 Kopírovat zprávu</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowSMSModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Zavřít</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#33691e'
  },
  header: {
    backgroundColor: '#33691e',
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
  phoneSection: {
    backgroundColor: 'rgba(79,195,247,0.15)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(79,195,247,0.3)',
  },
  phoneInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  phoneIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  phoneText: {
    fontSize: 16,
    color: '#4FC3F7',
    fontWeight: '600',
  },
  phoneActions: {
    flexDirection: 'row',
    gap: 8,
  },
  phoneActionButton: {
    flex: 1,
    backgroundColor: '#4FC3F7',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  phoneActionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  smsButton: {
    backgroundColor: '#4CAF50',
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
  pripravenoBtnPrimary: {
    backgroundColor: '#4CAF50',
    marginHorizontal: 0,
    marginBottom: 12,
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  pripravenoBtnText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
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
  // SMS Modal styly
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#33691e',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalSection: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  modalLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 6,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  modalCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalValue: {
    fontSize: 18,
    color: '#4FC3F7',
    fontWeight: '700',
  },
  modalMessageText: {
    fontSize: 14,
    color: '#ffffff',
    lineHeight: 20,
    marginBottom: 10,
  },
  copyButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCloseButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
