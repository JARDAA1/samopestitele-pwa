import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ImageBackground } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const isWeb = width > 768;

  return (
    <View style={styles.container}>
      {/* Hero obrázek jako pozadí - celá obrazovka */}
      <ImageBackground
        source={require('../../assets/images/hero-banner.jpg')}
        style={styles.heroBackground}
        resizeMode="cover"
      >
        {/* Jemný overlay pro lepší čitelnost tlačítek */}
        <View style={styles.heroOverlay} />

        {/* Tlačítka přes obrázek - vlevo */}
        <View style={styles.buttonsOverlay}>

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
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  heroBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonsOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingLeft: 20,
    paddingRight: '50%',
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
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
    width: '100%',
    maxWidth: 280,
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  farmerButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 14,
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
});
