import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, TextInput, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDesktop = isMounted && width >= 768;

  const handleSearch = () => {
    router.push({
      pathname: '/mapa',
      params: searchQuery ? { lokalita: searchQuery } : {}
    });
  };

  const handleKeyPress = (e: any) => {
    if (e.nativeEvent.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Hero sekce */}
      <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
        <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
          Čerstvé produkty{'\n'}od pěstitelů
        </Text>
        <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
          Najděte lokální farmáře ve vašem okolí
        </Text>

        {/* Vyhledávací pole */}
        <View style={[styles.searchContainer, isDesktop && styles.searchContainerDesktop]}>
          <View style={styles.searchInputWrapper}>
            <Text style={styles.searchIcon}>📍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Město nebo obec..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              onKeyPress={handleKeyPress}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Hledat</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dvě cesty */}
      <View style={[styles.pathsContainer, isDesktop && styles.pathsContainerDesktop]}>
        <TouchableOpacity
          style={[styles.pathCard, isDesktop && styles.pathCardDesktop]}
          onPress={() => router.push('/mapa')}
        >
          <View style={styles.pathCardRow}>
            <Text style={styles.pathEmoji}>🍎</Text>
            <View style={styles.pathCardContent}>
              <Text style={styles.pathTitle}>Hledám produkty</Text>
              <Text style={styles.pathDescription}>Nabídka od lokálních pěstitelů</Text>
            </View>
            <Text style={styles.pathArrow}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pathCard, isDesktop && styles.pathCardDesktop]}
          onPress={() => router.push('/jsem-farmar')}
        >
          <View style={styles.pathCardRow}>
            <Text style={styles.pathEmoji}>🌾</Text>
            <View style={styles.pathCardContent}>
              <Text style={styles.pathTitle}>Nabízím produkty</Text>
              <Text style={styles.pathDescription}>Zaregistrujte se jako pěstitel</Text>
            </View>
            <Text style={styles.pathArrow}>→</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Footer info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Spojujeme pěstitele s lidmi, kteří chtějí jíst zdravě a lokálně
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    flexGrow: 1,
  },

  // Hero sekce
  hero: {
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#ffffff',
  },
  heroDesktop: {
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222222',
    lineHeight: 32,
    marginBottom: 8,
  },
  titleDesktop: {
    fontSize: 48,
    lineHeight: 56,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#666666',
    marginBottom: 20,
  },
  subtitleDesktop: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Vyhledávání
  searchContainer: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
    maxWidth: 500,
  },
  searchContainerDesktop: {
    gap: 0,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#dddddd',
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#222222',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  searchButton: {
    backgroundColor: '#222222',
    borderRadius: 10,
    height: 48,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },

  // Cesty (karty) - kompaktní horizontální layout pro mobil
  pathsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  pathsContainerDesktop: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 80,
    gap: 24,
    maxWidth: 1000,
    alignSelf: 'center',
    width: '100%',
  },
  pathCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#eeeeee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  pathCardDesktop: {
    flex: 1,
    maxWidth: 400,
    padding: 24,
  },
  pathCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pathCardContent: {
    flex: 1,
    marginLeft: 12,
  },
  pathEmoji: {
    fontSize: 32,
  },
  pathTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 2,
  },
  pathDescription: {
    fontSize: 13,
    color: '#666666',
  },
  pathArrow: {
    fontSize: 18,
    color: '#999999',
    marginLeft: 8,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
  },
});
