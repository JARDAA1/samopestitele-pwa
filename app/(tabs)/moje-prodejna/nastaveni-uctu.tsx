import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { useFarmarAuth } from '../../_utils/farmarAuthContext';
import { fetchFarmNumber } from '@/features/profil/services/profilService';

export default function NastaveniUctuScreen() {
  const { farmar } = useFarmarAuth();

  const [farmNumber, setFarmNumber] = useState('');

  useEffect(() => {
    loadFarmNumber();
  }, [farmar]);

  const loadFarmNumber = async () => {
    if (!farmar?.id) return;

    try {
      const farmNum = await fetchFarmNumber(farmar.id);
      setFarmNumber(farmNum || '');
    } catch (error) {
      console.error('Chyba při načítání farm_number:', error);
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
              Tento kód používáte společně s heslem pro přihlášení do Prodejny a Stánků.
            </Text>
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
              • Nikdy nesdílejte své heslo s nikým jiným{'\n'}
              • Použijte unikátní heslo, které nepoužíváte jinde{'\n'}
              • Heslo změňte v případě podezření na zneužití{'\n'}
              • Pokud zapomenete heslo nebo kód farmy, obnovte je přes "Zapomenuté údaje"
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
    backgroundColor: '#6A1B9A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6A1B9A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 6,
  },
  backIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: 12,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  infoSection: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
    marginTop: 8,
  },
  farmNumberBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  farmNumberText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 4,
  },
  hint: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  pinStatus: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  changeButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 16,
    fontSize: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 8,
    fontWeight: '700',
    color: '#ffffff',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    borderRadius: 10,
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
    color: '#ffffff',
    marginBottom: 8,
  },
  infoBold: {
    fontWeight: '700',
    color: '#FF9800',
  },
  securityBox: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 18,
  },
});
