import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useState, useEffect } from 'react';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isDesktop = isMounted && width >= 768;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {/* Hero sekce */}
        <View style={[styles.hero, isDesktop && styles.heroDesktop]}>
        <Text style={[styles.title, isDesktop && styles.titleDesktop]}>
          Čerstvé produkty přímo od pěstitelů v okolí
        </Text>
        <Text style={[styles.subtitle, isDesktop && styles.subtitleDesktop]}>
          Najděte lokální nabídku tam, kde právě jste.{'\n'}
          Nejde o e-shop ani doručení domů.{'\n'}
          Produkty si vyzvednete přímo u pěstitele.
        </Text>
        <Text style={[styles.subtitleSecondary, isDesktop && styles.subtitleSecondaryDesktop]}>
          Ideální pro návštěvníky regionu, chalupáře i místní.
        </Text>
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
              <Text style={styles.pathTitle}>Hledám produkty v okolí</Text>
              <Text style={styles.pathDescription}>Najít pěstitele na mapě</Text>
            </View>
            <Text style={styles.pathArrow}>→</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.pathCard, isDesktop && styles.pathCardDesktop]}
          onPress={() => router.push('/moje-prodejna')}
        >
          <View style={styles.pathCardRow}>
            <Text style={styles.pathEmoji}>🧺</Text>
            <View style={styles.pathCardContent}>
              <Text style={styles.pathTitle}>Chci nabízet své produkty</Text>
              <Text style={styles.pathDescription}>Založit prodejnu</Text>
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
          <Text style={styles.footerEmail}>info@samopestitele.cz</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  contentContainer: {
    flexGrow: 1,
  },

  // Hero sekce
  hero: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  heroDesktop: {
    paddingTop: 40,
    paddingBottom: 32,
    paddingHorizontal: 80,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#ffffff',
    lineHeight: 32,
    marginBottom: 8,
  },
  titleDesktop: {
    fontSize: 48,
    lineHeight: 56,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 22,
    marginBottom: 8,
  },
  subtitleDesktop: {
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 12,
  },
  subtitleSecondary: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  subtitleSecondaryDesktop: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Cesty (karty) - kompaktní horizontální layout pro mobil
  pathsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
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
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
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
    color: '#ffffff',
    marginBottom: 2,
  },
  pathDescription: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  pathArrow: {
    fontSize: 18,
    color: '#FF9800',
    marginLeft: 8,
  },

  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  footerEmail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
    textAlign: 'center',
    marginTop: 8,
  },
});
