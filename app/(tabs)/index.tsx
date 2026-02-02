import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, TextInput } from 'react-native';
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
    <View style={styles.container}>
      {/* Hero sekce */}
      <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
        <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
          Čerstvé produkty{'\n'}přímo od pěstitelů
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
              placeholder="Zadejte město nebo obec..."
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

      {/* Dvě cesty - jako Airbnb */}
      <View style={[styles.pathsContainer, isDesktop && styles.pathsContainerDesktop]}>
        <TouchableOpacity
          style={[styles.pathCard, isDesktop && styles.pathCardDesktop]}
          onPress={() => router.push('/mapa')}
        >
          <Text style={styles.pathEmoji}>🍎</Text>
          <Text style={styles.pathTitle}>Hledám produkty</Text>
          <Text style={styles.pathDescription}>
            Prohlédněte si nabídku lokálních pěstitelů a farmářů ve vašem okolí
          </Text>
          <Text style={styles.pathLink}>Zobrazit mapu →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pathCard, isDesktop && styles.pathCardDesktop]}
          onPress={() => router.push('/jsem-farmar')}
        >
          <Text style={styles.pathEmoji}>🌾</Text>
          <Text style={styles.pathTitle}>Nabízím produkty</Text>
          <Text style={styles.pathDescription}>
            Zaregistrujte se jako pěstitel a nabídněte své produkty zákazníkům
          </Text>
          <Text style={styles.pathLink}>Začít prodávat →</Text>
        </TouchableOpacity>
      </View>

      {/* Footer info */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Spojujeme pěstitele s lidmi, kteří chtějí jíst zdravě a lokálně
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },

  // Hero sekce
  hero: {
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: '#ffffff',
  },
  heroDesktop: {
    paddingTop: 100,
    paddingBottom: 60,
    paddingHorizontal: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#222222',
    lineHeight: 40,
    marginBottom: 12,
  },
  titleDesktop: {
    fontSize: 48,
    lineHeight: 56,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 32,
  },
  subtitleDesktop: {
    fontSize: 18,
    textAlign: 'center',
  },

  // Vyhledávání
  searchContainer: {
    flexDirection: 'column',
    gap: 12,
    width: '100%',
    maxWidth: 500,
  },
  searchContainerDesktop: {
    flexDirection: 'row',
    gap: 0,
  },
  searchInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#dddddd',
    paddingHorizontal: 16,
    height: 56,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222222',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
      },
    }),
  },
  searchButton: {
    backgroundColor: '#222222',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Cesty (karty)
  pathsContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 16,
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
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#eeeeee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pathCardDesktop: {
    flex: 1,
    maxWidth: 400,
  },
  pathEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  pathTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222222',
    marginBottom: 8,
  },
  pathDescription: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 16,
  },
  pathLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222222',
  },

  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#eeeeee',
  },
  footerText: {
    fontSize: 13,
    color: '#999999',
    textAlign: 'center',
  },
});
