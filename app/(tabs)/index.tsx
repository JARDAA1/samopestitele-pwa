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
          <Text style={styles.buttonTitle}>Mapa farmářů a produktů</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/explore')}
      >
        <Text style={styles.buttonIcon}>☀️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.buttonTitle}>Uložení farmáři</Text>
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
          <Text style={styles.buttonTitle}>Prodávám své produkty</Text>
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Desktop layout - fullscreen s overlay */}
      {isDesktop ? (
        Platform.OS === 'web' ? (
          <ImageBackground
            source={{ uri: '/assets/images/PC_WEB.png' }}
            style={styles.desktopFullscreenBg}
            resizeMode="cover"
          >
            <View style={styles.desktopOverlay} />

            <View style={styles.desktopContentOverlay}>
              <View style={styles.desktopContent}>
                <Text style={styles.desktopTitle}>Samopěstitelé</Text>
                <Text style={styles.desktopSubtitle}>
                  Platforma pro nákup čerstvých produktů přímo od lokálních pěstitelů
                </Text>

                <ActionButtons containerStyle={styles.desktopButtonsContainer} />
              </View>
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
          </ImageBackground>
        ) : (
          <ImageBackground
            source={require('../../assets/images/PC_WEB.png')}
            style={styles.desktopFullscreenBg}
            resizeMode="cover"
          >
            <View style={styles.desktopOverlay} />

            <View style={styles.desktopContentOverlay}>
              <View style={styles.desktopContent}>
                <Text style={styles.desktopTitle}>Samopěstitelé</Text>
                <Text style={styles.desktopSubtitle}>
                  Platforma pro nákup čerstvých produktů přímo od lokálních pěstitelů
                </Text>

                <ActionButtons containerStyle={styles.desktopButtonsContainer} />
              </View>
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
          </ImageBackground>
        )
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

  // Desktop styly - fullscreen
  desktopFullscreenBg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  desktopOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  desktopContentOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 80,
    paddingVertical: 60,
  },
  desktopContent: {
    maxWidth: 500,
    alignItems: 'center',
  },
  desktopTitle: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 10,
    textAlign: 'center',
  },
  desktopSubtitle: {
    fontSize: 20,
    color: '#FFFFFF',
    marginBottom: 40,
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 8,
    textAlign: 'center',
  },
  desktopButtonsContainer: {
    width: '100%',
    alignItems: 'center',
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  farmerButton: {
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
    maxWidth: 280,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 6,
  },
  buttonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  buttonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Oddělovač
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 280,
    marginVertical: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(106, 27, 154, 0.3)',
  },
  dividerText: {
    marginHorizontal: 10,
    fontSize: 11,
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
