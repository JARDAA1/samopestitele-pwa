import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';

interface Pestitel {
  id: string;
  nazev_farmy: string;
  mesto: string;
  popis: string | null;
  telefon: string;
}

export default function MapaScreen() {
  const [pestitele, setPestitele] = useState<Pestitel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadPestitele();
  }, []);

  const loadPestitele = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pestitele')
        .select('id, nazev_farmy, mesto, popis, telefon')
        .order('nazev_farmy', { ascending: true });

      if (error) {
        console.error('Chyba při načítání pěstitelů:', error);
        return;
      }

      setPestitele(data || []);
    } catch (error) {
      console.error('Chyba:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredPestitele = pestitele.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.nazev_farmy.toLowerCase().includes(query) ||
      p.mesto.toLowerCase().includes(query) ||
      (p.popis && p.popis.toLowerCase().includes(query))
    );
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Načítám farmáře...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.homeIcon}>🏠</Text>
          <Text style={styles.homeText}>Domů</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>🗺️ Najdi farmáře/ku</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Vyhledávání */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Hledat farmáře, město nebo produkt..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Počet výsledků */}
      {searchQuery.length > 0 && (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {filteredPestitele.length === 0
              ? 'Žádní farmáři nenalezeni'
              : `Nalezeno ${filteredPestitele.length} ${filteredPestitele.length === 1 ? 'farmář' : 'farmářů'}`
            }
          </Text>
        </View>
      )}

      {/* Seznam farmářů */}
      {filteredPestitele.length === 0 && searchQuery.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌾</Text>
          <Text style={styles.emptyTitle}>Zatím žádní farmáři</Text>
          <Text style={styles.emptyText}>
            Farmáři se budou zobrazovat zde, jakmile se zaregistrují
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPestitele}
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
                  {item.popis && (
                    <Text style={styles.listItemDesc} numberOfLines={1}>
                      {item.popis}
                    </Text>
                  )}
                </View>
              </View>
              <View style={styles.listItemRight}>
                <Text style={styles.listItemArrow}>›</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  centerContent: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 10, fontSize: 16, color: '#666' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#4CAF50',
    gap: 10
  },
  homeButton: { alignItems: 'center', padding: 8, minWidth: 60 },
  homeIcon: { fontSize: 24 },
  homeText: { fontSize: 10, color: '#FFFFFF', marginTop: 2 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  headerSpacer: { minWidth: 60 },
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
  listItemLocation: { fontSize: 14, color: '#666', marginBottom: 2 },
  listItemDesc: { fontSize: 13, color: '#999', marginTop: 4 },
  listItemRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  listItemArrow: { fontSize: 28, color: '#CCC', fontWeight: '300' },
  resultsInfo: {
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  resultsText: { fontSize: 14, color: '#2E7D32', fontWeight: '600', textAlign: 'center' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 80, marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32', marginBottom: 10 },
  emptyText: { fontSize: 16, color: '#666', textAlign: 'center', lineHeight: 24 },
});
