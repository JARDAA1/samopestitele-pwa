import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';
import { useProdukty } from '@/features/produkty/hooks/useProdukty';
import { useLayoutMode } from '../../_components/AppLayout';
import { formatCenaJednotka } from '../../_utils/formatKc';

export default function SeznamProduktScreen() {
  const { mode } = useLayoutMode();
  const isWideMode = mode === 'tablet' || mode === 'desktop';

  const { loading, refreshing, produkty, archivovaneProdukty, refresh } =
    useProdukty();

  const [activeTab, setActiveTab] = useState<'aktivni' | 'archivovane'>(
    'aktivni'
  );

  const displayedProdukty =
    activeTab === 'aktivni' ? produkty : archivovaneProdukty;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.push('/moje-prodejna')}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>← Zpět</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Moje produkty</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'aktivni' && styles.activeTab]}
          onPress={() => setActiveTab('aktivni')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'aktivni' && styles.activeTabText,
            ]}
          >
            Aktivní ({produkty.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'archivovane' && styles.activeTab]}
          onPress={() => setActiveTab('archivovane')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'archivovane' && styles.activeTabText,
            ]}
          >
            Archiv ({archivovaneProdukty.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Načítám produkty...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor="#ffffff"
              colors={['#FF9800']}
            />
          }
        >
          {displayedProdukty.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>
                {activeTab === 'aktivni' ? '📦' : '🗃️'}
              </Text>
              <Text style={styles.emptyText}>
                {activeTab === 'aktivni'
                  ? 'Zatím nemáte žádné aktivní produkty'
                  : 'Žádné archivované produkty'}
              </Text>
              {activeTab === 'aktivni' && (
                <TouchableOpacity
                  style={styles.addButtonEmpty}
                  onPress={() =>
                    router.push('/moje-prodejna/pridat-produkt')
                  }
                >
                  <Text style={styles.addButtonEmptyText}>+ Přidat produkt</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={isWideMode ? styles.gridContainer : undefined}>
              {displayedProdukty.map((produkt) => (
                <TouchableOpacity
                  key={produkt.id}
                  style={[
                    styles.productItem,
                    activeTab === 'archivovane' && styles.productItemArchived,
                    isWideMode && styles.productItemGrid,
                  ]}
                  onPress={() =>
                    router.push(
                      `/moje-prodejna/upravit-produkt?id=${produkt.id}`
                    )
                  }
                >
                  <View style={styles.productLeft}>
                    <Text style={styles.productEmoji}>
                      {produkt.emoji || '📦'}
                    </Text>
                    <View style={styles.productInfo}>
                      <Text
                        style={[
                          styles.productName,
                          activeTab === 'archivovane' &&
                            styles.productNameArchived,
                        ]}
                      >
                        {produkt.nazev}
                      </Text>
                      <Text
                        style={[
                          styles.productPrice,
                          activeTab === 'archivovane' &&
                            styles.productPriceArchived,
                        ]}
                      >
                        {formatCenaJednotka(produkt.cena, produkt.jednotka)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.productRight}>
                    <View
                      style={[
                        styles.availabilityBadge,
                        activeTab === 'archivovane'
                          ? styles.archivedBadge
                          : produkt.dostupnost
                          ? styles.availableBadge
                          : styles.unavailableBadge,
                      ]}
                    >
                      <Text style={styles.availabilityText}>
                        {activeTab === 'archivovane'
                          ? '📦'
                          : produkt.dostupnost
                          ? '✓'
                          : '✗'}
                      </Text>
                    </View>
                    <Text style={styles.editHint}>✏️</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/moje-prodejna/pridat-produkt')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a3a1a' },
  header: {
    backgroundColor: '#1a3a1a',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: { marginBottom: 8 },
  backButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  tabsContainer: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 6, alignItems: 'center' },
  activeTab: { backgroundColor: 'rgba(255,255,255,0.2)' },
  tabText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },
  activeTabText: { color: '#ffffff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  content: { flex: 1, padding: 12 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 24,
    textAlign: 'center',
  },
  addButtonEmpty: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  addButtonEmptyText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  productItem: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  productItemArchived: { backgroundColor: 'rgba(255,255,255,0.08)', opacity: 0.7 },
  productLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  productEmoji: { fontSize: 32, minWidth: 44, textAlign: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#ffffff', marginBottom: 4 },
  productNameArchived: { color: 'rgba(255,255,255,0.6)' },
  productPrice: { fontSize: 13, color: '#FF9800', fontWeight: '500' },
  productPriceArchived: { color: 'rgba(255,255,255,0.4)' },
  productRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  availabilityBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  availableBadge: { backgroundColor: 'rgba(76,175,80,0.3)' },
  unavailableBadge: { backgroundColor: 'rgba(244,67,54,0.3)' },
  archivedBadge: { backgroundColor: 'rgba(255,255,255,0.1)' },
  availabilityText: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  editHint: { fontSize: 16, opacity: 0.6 },
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
  fabText: { fontSize: 28, color: '#FFFFFF', fontWeight: '300' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  productItemGrid: { width: '48.5%' },
});
