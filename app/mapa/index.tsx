import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

interface Pestitel {
  id: string;
  nazev_farmy: string;
  mesto: string;
  distance?: number;
}

export default function MapaScreen() {
  const [pestitele] = useState<Pestitel[]>([
    {
      id: 'mock-1',
      nazev_farmy: 'Farma U Nováků',
      mesto: 'Praha',
      distance: 25.5
    },
    {
      id: 'mock-2',
      nazev_farmy: 'BIO Farma Svoboda',
      mesto: 'Brno',
      distance: 120.3
    },
    {
      id: 'mock-3',
      nazev_farmy: 'Farma Včelař',
      mesto: 'Olomouc',
      distance: 85.7
    }
  ]);

  const [searchQuery, setSearchQuery] = useState('');

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mapa</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Vyhledávání */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Hledat produkt..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Seznam farmářů */}
      <FlatList
        data={pestitele}
        keyExtractor={(item) => item.id}
        style={styles.listContainer}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => router.push(`/pestitele/${item.id}`)}
          >
            <View style={styles.listItemLeft}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>{index + 1}</Text>
              </View>
              <View style={styles.listItemInfo}>
                <Text style={styles.listItemName}>{item.nazev_farmy}</Text>
                <Text style={styles.listItemLocation}>📍 {item.mesto}</Text>
              </View>
            </View>
            <View style={styles.listItemRight}>
              <Text style={styles.listItemDistance}>{item.distance?.toFixed(1)} km</Text>
              <Text style={styles.listItemArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
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
  backButton: { padding: 8 },
  backIcon: { fontSize: 24, color: '#2E7D32', fontWeight: '600' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#2E7D32' },
  headerSpacer: { width: 40 },
  searchContainer: {
    backgroundColor: '#FFFFFF',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  listContainer: { flex: 1, backgroundColor: '#F5F5F5' },
  listItem: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    minHeight: 72,
  },
  listItemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  numberBadgeText: { fontSize: 14, fontWeight: 'bold', color: '#2E7D32' },
  listItemInfo: { flex: 1 },
  listItemName: { fontSize: 17, fontWeight: '600', color: '#2E7D32', marginBottom: 4 },
  listItemLocation: { fontSize: 14, color: '#666' },
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listItemDistance: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 50,
  },
  listItemArrow: { fontSize: 28, color: '#CCC', fontWeight: '300' },
});
