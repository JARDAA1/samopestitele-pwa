import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../../utils/farmarAuthContext';
import { supabase } from '../../../lib/supabase';

export default function NastaveniUctuScreen() {
  const { farmar, createPin, authLevel } = useFarmarAuth();

  const [farmNumber, setFarmNumber] = useState('');
  const [showPinChange, setShowPinChange] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFarmNumber();
  }, [farmar]);

  const loadFarmNumber = async () => {
    if (!farmar?.id) return;

    try {
      const { data, error } = await supabase
        .from('pestitele')
        .select('farm_number')
        .eq('id', farmar.id)
        .single();

      if (!error && data) {
        setFarmNumber(data.farm_number || '');
      }
    } catch (error) {
      console.error('Chyba při načítání farm_number:', error);
    }
  };

  const handleChangePIN = async () => {
    // Validace PINu
    if (newPin.length < 4 || newPin.length > 6) {
      if (Platform.OS === 'web') {
        alert('PIN musí mít 4-6 číslic');
      } else {
        Alert.alert('Chyba', 'PIN musí mít 4-6 číslic');
      }
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      if (Platform.OS === 'web') {
        alert('PIN může obsahovat pouze číslice');
      } else {
        Alert.alert('Chyba', 'PIN může obsahovat pouze číslice');
      }
      return;
    }

    if (newPin !== newPinConfirm) {
      if (Platform.OS === 'web') {
        alert('PINy se neshodují');
      } else {
        Alert.alert('Chyba', 'PINy se neshodují');
      }
      return;
    }

    // Zakázané PINy
    const forbiddenPins = ['1234', '4321', '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999'];
    if (forbiddenPins.includes(newPin)) {
      if (Platform.OS === 'web') {
        alert('Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      } else {
        Alert.alert('Chyba', 'Tento PIN je příliš jednoduchý. Zvolte si jiný PIN.');
      }
      return;
    }

    // Opakující se číslice
    if (/^(.)\1+$/.test(newPin)) {
      if (Platform.OS === 'web') {
        alert('PIN nesmí obsahovat pouze stejné číslice.');
      } else {
        Alert.alert('Chyba', 'PIN nesmí obsahovat pouze stejné číslice.');
      }
      return;
    }

    setLoading(true);
    const result = await createPin(newPin);
    setLoading(false);

    if (result.success) {
      setNewPin('');
      setNewPinConfirm('');
      setShowPinChange(false);

      if (Platform.OS === 'web') {
        alert('PIN byl úspěšně změněn.\n\nMůžete se nyní přihlásit do Prodejny nebo Stánků pomocí čísla farmy a nového PINu.');
      } else {
        Alert.alert(
          'PIN změněn ✓',
          'Můžete se nyní přihlásit do Prodejny nebo Stánků pomocí čísla farmy a nového PINu.',
          [{ text: 'OK' }]
        );
      }
    } else {
      if (Platform.OS === 'web') {
        alert(result.error || 'Nepodařilo se změnit PIN');
      } else {
        Alert.alert('Chyba', result.error || 'Nepodařilo se změnit PIN');
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nastavení účtu</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🔑 Přihlašovací údaje</Text>

          <View style={styles.infoSection}>
            <Text style={styles.label}>Kód farmy</Text>
            <View style={styles.farmNumberBox}>
              <Text style={styles.farmNumberText}>{farmNumber || 'Načítání...'}</Text>
            </View>
            <Text style={styles.hint}>
              Tento kód používáte společně s PINem pro přihlášení do Prodejny a Stánků.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoSection}>
            <Text style={styles.label}>PIN kód</Text>
            {!showPinChange ? (
              <>
                <Text style={styles.pinStatus}>
                  {authLevel === 'pin' ? '✓ PIN je nastaven' : '○ PIN není nastaven'}
                </Text>
                <TouchableOpacity
                  style={styles.changeButton}
                  onPress={() => setShowPinChange(true)}
                >
                  <Text style={styles.changeButtonText}>
                    {authLevel === 'pin' ? 'Změnit PIN' : 'Nastavit PIN'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.hint}>
                  PIN slouží pro rychlé přihlášení do Prodejny a Stánků bez emailu.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.label}>Nový PIN (4-6 číslic)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••"
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                />

                <Text style={styles.label}>Potvrdit nový PIN</Text>
                <TextInput
                  style={styles.input}
                  placeholder="••••"
                  value={newPinConfirm}
                  onChangeText={setNewPinConfirm}
                  keyboardType="number-pad"
                  maxLength={6}
                  secureTextEntry
                  onSubmitEditing={handleChangePIN}
                />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowPinChange(false);
                      setNewPin('');
                      setNewPinConfirm('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Zrušit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                    onPress={handleChangePIN}
                    disabled={loading}
                  >
                    <Text style={styles.saveButtonText}>
                      {loading ? 'Ukládám...' : 'Uložit PIN'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📧 Přístup k účtu</Text>
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Email:</Text> {farmar?.email || 'Neuvedeno'}
            </Text>
            <Text style={styles.hint}>
              Email používáte pro přihlášení do Profilu (tento režim) a pro obnovení zapomenutých údajů.
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.securityBox}>
            <Text style={styles.securityTitle}>🔒 Bezpečnostní doporučení</Text>
            <Text style={styles.securityText}>
              • Nikdy nesdílejte svůj PIN s nikým jiným{'\n'}
              • Použijte unikátní PIN, který nepoužíváte jinde{'\n'}
              • PIN změňte v případě podezření na zneužití{'\n'}
              • Pokud zapomenete PIN nebo kód farmy, obnovte je přes "Zapomenuté údaje"
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#6A1B9A',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6A1B9A',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6A1B9A',
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6A1B9A',
    marginBottom: 8,
    marginTop: 8,
  },
  farmNumberBox: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#9C27B0',
  },
  farmNumberText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6A1B9A',
    letterSpacing: 4,
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  pinStatus: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  changeButton: {
    backgroundColor: '#9C27B0',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  changeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    fontSize: 24,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 8,
  },
  infoBold: {
    fontWeight: '700',
    color: '#6A1B9A',
  },
  securityBox: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E65100',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});
