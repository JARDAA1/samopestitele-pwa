import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ImageBackground, Platform } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  const isWeb = Platform.OS === 'web';

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

        {/* Tlačítka přes obrázek */}
        {!isWeb && (
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
        )}

        {/* Web verze s absolutním pozicováním */}
        {isWeb && (
          <View style={styles.buttonsOverlayWeb}>
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
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  heroBackground: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  buttonsOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  buttonsOverlayWeb: {
    position: 'absolute',
    left: 80,
    bottom: '10%',
    right: undefined,
    width: 240,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonIcon: {
    fontSize: 22,
    marginRight: 10
  },
  buttonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
    maxWidth: 240,
    marginVertical: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  farmerButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: '100%',
    maxWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 8,
  },
});
