import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ScrollView } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWeb = width > 768; // Považujeme za web, pokud je šířka větší než 768px

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Hero sekce s designem */}
        <View style={[styles.heroSection, isWeb && styles.heroSectionWeb]}>
          {/* Levá část - Logo a text */}
          <View style={[styles.heroLeft, isWeb && styles.heroLeftWeb]}>
            {/* Logo placeholder - zde přidáš obrázek logo-vegetables.png */}
            <View style={styles.logoContainer}>
              <Text style={styles.logoEmoji}>🥕🍎🥬</Text>
              <View style={styles.logoCircle}>
                <Text style={styles.logoIcon}>🌾</Text>
              </View>
            </View>
            <Text style={styles.heroTitle}>Ze zahrádky</Text>
            <Text style={styles.heroSubtitle}>Propojujeme pěstitele se zákazníky</Text>
          </View>

          {/* Pravá část - Fotky farmářů */}
          <View style={[styles.heroRight, isWeb && styles.heroRightWeb]}>
            {/* Farmer 1 placeholder - zde přidáš farmer-man.jpg */}
            <View style={[styles.farmerCard, isWeb && styles.farmerCardWeb]}>
              <View style={styles.farmerPlaceholder}>
                <Text style={styles.farmerIcon}>👨‍🌾</Text>
              </View>
            </View>

            {/* Farmer 2 placeholder - zde přidáš farmer-woman.jpg */}
            <View style={[styles.farmerCard, isWeb && styles.farmerCardWeb]}>
              <View style={styles.farmerPlaceholder}>
                <Text style={styles.farmerIcon}>👩‍🌾</Text>
              </View>
            </View>
          </View>
        </View>

      {/* Hlavní navigace */}

      {/* TLAČÍTKO 1 - NAJDI FARMÁŘE (MAPA S FILTREM) */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/mapa')}
      >
        <Text style={styles.buttonIcon}>🗺️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.buttonTitle}>Najdi farmáře/ku</Text>
        </View>
      </TouchableOpacity>

      {/* TLAČÍTKO 2 - MOJI FARMÁŘI */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/explore')}
      >
        <Text style={styles.buttonIcon}>📋</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.buttonTitle}>Moji farmáři/ky</Text>
        </View>
      </TouchableOpacity>

      {/* Oddělovač */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Jste pěstitel?</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* TLAČÍTKO 3 - JSEM SAMOPĚSTITEL/KA */}
      <TouchableOpacity
        style={styles.farmerButton}
        onPress={() => router.push('/jsem-farmar')}
      >
        <Text style={styles.buttonIcon}>🌾</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.buttonTitle}>Jsem samopěstitel/ka</Text>
        </View>
      </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#E8F5E9',
  },
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
  },
  heroSection: {
    width: '100%',
    maxWidth: 1200,
    marginBottom: 32,
    alignItems: 'center',
  },
  heroSectionWeb: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 40,
    paddingHorizontal: 20,
  },
  heroLeft: {
    alignItems: 'center',
    marginBottom: 20,
  },
  heroLeftWeb: {
    flex: 1,
    marginBottom: 0,
  },
  logoContainer: {
    position: 'relative',
    width: 180,
    height: 180,
    marginBottom: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 80,
    textAlign: 'center',
  },
  logoCircle: {
    position: 'absolute',
    bottom: 0,
    right: 10,
    backgroundColor: '#4CAF50',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  logoIcon: {
    fontSize: 30,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  heroRight: {
    flexDirection: 'row',
    gap: 15,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  heroRightWeb: {
    flex: 1,
    flexDirection: 'row',
    gap: 20,
  },
  farmerCard: {
    width: 150,
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  farmerCardWeb: {
    flex: 1,
    width: 'auto',
    height: 350,
  },
  farmerPlaceholder: {
    flex: 1,
    backgroundColor: '#C8E6C9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  farmerIcon: {
    fontSize: 80,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonIcon: {
    fontSize: 26,
    marginRight: 14
  },
  buttonTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  buttonSubtitle: {
    fontSize: 9,
    color: '#FFFFFF',
    opacity: 0.9
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#999',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 10,
    color: '#666',
    fontWeight: '600',
  },
  farmerButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
