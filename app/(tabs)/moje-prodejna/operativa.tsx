import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  ActivityIndicator, RefreshControl, Alert, Platform, Linking,
} from 'react-native';
import { router } from 'expo-router';
import { ProtectedRoute } from '../../utils/ProtectedRoute';
import { useNoveObjednavky } from '@/features/objednavky/hooks/useNoveObjednavky';
import { poslatSMSPotvrzeni } from '@/features/objednavky/services/objednavkyService';
import type { NoveObjednavky } from '@/features/objednavky/types';
import { useState } from 'react';

function OperativaContent() {
  const {
    loading,
    refreshing,
    noveObjednavky,
    potvrdit,
    odmitnout,
    refresh,
  } = useNoveObjednavky();

  const [processingId, setProcessingId] = useState<string | null>(null);

  const showAlert = (title: string, message: string, buttons?: any[]) => {
    if (Platform.OS === 'web') {
      if (buttons && buttons.length > 1) {
        const confirmed = confirm(`${title}\n\n${message}`);
        if (confirmed && buttons[1]?.onPress) buttons[1].onPress();
      } else {
        alert(`${title}: ${message}`);
      }
    } else {
      Alert.alert(title, message, buttons);
    }
  };

  const handlePotvrdit = async (item: NoveObjednavky) => {
    setProcessingId(item.id);
    try {
      await potvrdit(item.id);

      if (item.zakaznik_telefon) {
        // Odešle SMS přes API; fallback na sms: link
        const odeslatSMS = async () => {
          const sent = await poslatSMSPotvrzeni(
            item.zakaznik_telefon!,
            item.anon_customer_code
          );
          if (sent) {
            showAlert('Hotovo', 'Objednávka potvrzena, zákazník informován SMS ✓');
          } else {
            // API selhalo nebo chybí credentials – otevřeme nativní SMS
            const msg = `Dobrý den, vaše objednávka byla potvrzena! ✅${
              item.anon_customer_code
                ? `\n\nStav: https://samopestitele.cz/vyzvednuti/${item.anon_customer_code}`
                : ''
            }`;
            Linking.openURL(
              `sms:${item.zakaznik_telefon}?body=${encodeURIComponent(msg)}`
            ).catch(() => {});
          }
        };

        showAlert(
          'Objednávka potvrzena ✓',
          'Odeslat zákazníkovi SMS s potvrzením?',
          [
            { text: 'Ne', style: 'cancel' },
            { text: 'Odeslat SMS', onPress: odeslatSMS },
          ]
        );
      } else {
        showAlert('Hotovo', 'Objednávka byla potvrzena ✓');
      }
    } catch {
      showAlert('Chyba', 'Nepodařilo se potvrdit objednávku');
    } finally {
      setProcessingId(null);
    }
  };

  const handleOdmitnout = (id: string) => {
    showAlert(
      'Odmítnout objednávku',
      'Opravdu chcete odmítnout tuto objednávku?',
      [
        { text: 'Zrušit', style: 'cancel' },
        {
          text: 'Odmítnout',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(id);
            try {
              await odmitnout(id);
            } catch {
              showAlert('Chyba', 'Nepodařilo se odmítnout objednávku');
            } finally {
              setProcessingId(null);
            }
          },
        },
      ]
    );
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Právě teď';
    if (diffMins < 60) return `Před ${diffMins} min`;
    if (diffHours < 24) return `Před ${diffHours} hod`;
    if (diffDays === 1) return 'Včera';
    return date.toLocaleDateString('cs-CZ');
  };

  const renderOrderCard = ({ item }: { item: (typeof noveObjednavky)[0] }) => {
    const isProcessing = processingId === item.id;
    const customerName =
      item.poznamka_farmare || item.anon_customer_code || 'Zákazník';

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() =>
          router.push(`/moje-prodejna/detail-objednavky?id=${item.id}`)
        }
        disabled={isProcessing}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderInfo}>
            <Text style={styles.customerName}>{customerName}</Text>
            <Text style={styles.orderTime}>{formatTime(item.created_at)}</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>NOVÁ</Text>
          </View>
        </View>

        <View style={styles.orderMeta}>
          <Text style={styles.metaText}>📦 {item.pocet_polozek} položek</Text>
          {item.zakaznik_telefon && (
            <Text style={styles.metaText}>📱 {item.zakaznik_telefon}</Text>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.confirmButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handlePotvrdit(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.confirmButtonText}>✓ Potvrdit</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rejectButton, isProcessing && styles.buttonDisabled]}
            onPress={() => handleOdmitnout(item.id)}
            disabled={isProcessing}
          >
            <Text style={styles.rejectButtonText}>✗ Odmítnout</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Načítám objednávky...</Text>
        </View>
      </View>
    );
  }

  if (noveObjednavky.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✅</Text>
          <Text style={styles.emptyTitle}>Vše vyřízeno!</Text>
          <Text style={styles.emptySubtitle}>
            Nemáte žádné nové objednávky k vyřízení.
          </Text>
          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={() => router.push('/(tabs)/moje-prodejna')}
          >
            <Text style={styles.dashboardButtonText}>📊 Přejít do správy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.refreshButton} onPress={refresh}>
            <Text style={styles.refreshButtonText}>🔄 Obnovit</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          🔔 {noveObjednavky.length}{' '}
          {noveObjednavky.length === 1
            ? 'nová objednávka'
            : noveObjednavky.length < 5
            ? 'nové objednávky'
            : 'nových objednávek'}
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => router.push('/(tabs)/moje-prodejna')}
        >
          <Text style={styles.headerButtonText}>Správa →</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={noveObjednavky}
        renderItem={renderOrderCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#ffffff"
            colors={['#FF9800']}
          />
        }
      />
    </View>
  );
}

export default function OperativaScreen() {
  return (
    <ProtectedRoute>
      <OperativaContent />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#6A1B9A' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: 'rgba(255,255,255,0.7)', marginTop: 12, fontSize: 14 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  headerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
  },
  headerButtonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  listContent: { padding: 12 },
  orderCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#F44336',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderInfo: { flex: 1 },
  customerName: { fontSize: 18, fontWeight: '700', color: '#ffffff', marginBottom: 4 },
  orderTime: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  badge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: { color: '#ffffff', fontSize: 12, fontWeight: '700' },
  orderMeta: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  metaText: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  actionButtons: { flexDirection: 'row', gap: 10 },
  confirmButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  confirmButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  rejectButton: {
    flex: 1,
    backgroundColor: 'rgba(244,67,54,0.3)',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F44336',
  },
  rejectButtonText: { color: '#F44336', fontSize: 16, fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 24, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginBottom: 32,
  },
  dashboardButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  dashboardButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  refreshButton: { paddingHorizontal: 20, paddingVertical: 10 },
  refreshButtonText: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
});
