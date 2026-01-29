import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, ImageBackground, Platform, Animated } from 'react-native';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HomeScreen() {
  const isWeb = Platform.OS === 'web';
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const [showBee, setShowBee] = useState(false);
  const beePosition = useRef(new Animated.ValueXY({ x: -50, y: -50 })).current;
  const beeOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    checkAndShowBee();
  }, []);

  const checkAndShowBee = async () => {
    try {
      const lastBeeDate = await AsyncStorage.getItem('lastBeeVisit');
      const today = new Date().toDateString();

      if (lastBeeDate !== today) {
        await AsyncStorage.setItem('lastBeeVisit', today);
        setShowBee(true);
        animateBee();
      }
    } catch (error) {
      console.error('Chyba při kontrole včelky:', error);
    }
  };

  const animateBee = () => {
    // Křivolaká cesta - začíná mimo obrazovku vlevo nahoře
    Animated.sequence([
      // Fade in
      Animated.timing(beeOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      // Bod 1: Vlevo dole -> nahoru doprava
      Animated.timing(beePosition, {
        toValue: { x: 80, y: 150 },
        duration: 800,
        useNativeDriver: true,
      }),
      // Bod 2: Nahoru doleva (křivka)
      Animated.timing(beePosition, {
        toValue: { x: 40, y: 100 },
        duration: 700,
        useNativeDriver: true,
      }),
      // Bod 3: Doprava nahoru (další křivka)
      Animated.timing(beePosition, {
        toValue: { x: 100, y: 70 },
        duration: 700,
        useNativeDriver: true,
      }),
      // Bod 4: Finální pozice - levý horní roh
      Animated.timing(beePosition, {
        toValue: { x: 20, y: 60 },
        duration: 800,
        useNativeDriver: true,
      }),
      // Čekání 10 sekund
      Animated.delay(10000),
      // Fade out
      Animated.timing(beeOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowBee(false);
    });
  };

  // Komponenta s tlačítky pro opakované použití
  const ActionButtons = ({ containerStyle }: { containerStyle?: any }) => (
    <View style={containerStyle}>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/mapa')}
      >
        <Text style={styles.buttonIcon}>🍎</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.buttonTitle}>Najdi něco ze zahrádky</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/explore')}
      >
        <Text style={styles.buttonIcon}>🐻‍❄️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.buttonTitle}>Oblíbené</Text>
        </View>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Jste pěstitel/ka?</Text>
        <View style={styles.dividerLine} />
      </View>

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
  );

  return (
    <View style={styles.container}>
      {/* Desktop layout - dvousloupcový */}
      {isDesktop ? (
        <View style={styles.desktopContainer}>
          {/* Levý sloupec - obsah */}
          <View style={styles.desktopLeftColumn}>
            <View style={styles.desktopContent}>
              <Text style={styles.desktopTitle}>Samopěstitelé</Text>
              <Text style={styles.desktopSubtitle}>
                Najděte čerstvé produkty přímo od pěstitelů ve vašem okolí
              </Text>

              <ActionButtons containerStyle={styles.desktopButtonsContainer} />
            </View>
          </View>

          {/* Pravý sloupec - hero obrázek */}
          <View style={styles.desktopRightColumn}>
            <ImageBackground
              source={require('../../assets/images/hero-banner.jpg')}
              style={styles.desktopHeroImage}
              resizeMode="cover"
            />
          </View>

          {/* Animovaná včelka */}
          {showBee && (
            <Animated.View
              style={[
                styles.bee,
                {
                  transform: [
                    { translateX: beePosition.x },
                    { translateY: beePosition.y },
                  ],
                  opacity: beeOpacity,
                },
              ]}
            >
              <Text style={styles.beeEmoji}>🐝</Text>
            </Animated.View>
          )}
        </View>
      ) : (
        /* Mobilní layout - původní */
        <ImageBackground
          source={require('../../assets/images/hero-banner.jpg')}
          style={styles.heroBackground}
          resizeMode="contain"
        >
          <View style={styles.heroOverlay} />

          {/* Animovaná včelka */}
          {showBee && (
            <Animated.View
              style={[
                styles.bee,
                {
                  transform: [
                    { translateX: beePosition.x },
                    { translateY: beePosition.y },
                  ],
                  opacity: beeOpacity,
                },
              ]}
            >
              <Text style={styles.beeEmoji}>🐝</Text>
            </Animated.View>
          )}

          {/* Tlačítka přes obrázek */}
          {isWeb ? (
            <ActionButtons containerStyle={styles.buttonsOverlayWeb} />
          ) : (
            <ActionButtons containerStyle={styles.buttonsOverlay} />
          )}
        </ImageBackground>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },

  // Desktop styly
  desktopContainer: {
    flex: 1,
    flexDirection: 'row',
    maxWidth: 1320,
    marginHorizontal: 'auto',
    width: '100%',
  },
  desktopLeftColumn: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 60,
    paddingVertical: 40,
    backgroundColor: '#F5F5F5',
  },
  desktopContent: {
    maxWidth: 400,
  },
  desktopTitle: {
    fontSize: 48,
    fontWeight: '700',
    color: '#6A1B9A',
    marginBottom: 20,
  },
  desktopSubtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    lineHeight: 26,
  },
  desktopButtonsContainer: {
    width: '100%',
  },
  desktopRightColumn: {
    flex: 1,
    minHeight: '70vh',
    maxHeight: '80vh',
  },
  desktopHeroImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },

  // Mobilní styly
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
    left: '8%',
    bottom: '8%',
    right: undefined,
    width: 240,
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    zIndex: 1,
  },

  // Tlačítka
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 360,
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
    borderRadius: 12,
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  farmerButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    maxWidth: 360,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  buttonIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Oddělovač
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(106, 27, 154, 0.3)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#6A1B9A',
    fontWeight: '600',
  },

  // Včelka
  bee: {
    position: 'absolute',
    zIndex: 999,
  },
  beeEmoji: {
    fontSize: 32,
  },
});
