import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';

export default function JsemFarmarScreen() {

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.homeButton}
          onPress={() => router.push('/')}
        >
          <Text style={styles.homeIcon}>←</Text>
          <Text style={styles.homeText}>Zpět</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>👨‍🌾</Text>
          <Text style={styles.headerTitle}>Staň se součástí komunity</Text>
          <Text style={styles.headerSubtitle}>a nabídni své produkty</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Tlačítko registrace */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/registrace')}
        >
          <Text style={styles.registerButtonText}>📝 Zaregistrovat se</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>NEBO PŘIHLÁSIT SE</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Sekce přihlášení - 3 možnosti */}
        <View style={styles.loginSectionsContainer}>
          {/* PROFIL */}
          <TouchableOpacity
            style={[styles.loginSectionCard, styles.loginSectionCardPrimary]}
            onPress={() => router.push('/prihlaseni/profil')}
          >
            <Image
              source={require('../../assets/images/profil-icon.png')}
              style={styles.loginSectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.loginSectionTitle}>Profil</Text>
            <Text style={styles.loginSectionSubtitle}>Kompletní přístup</Text>
          </TouchableOpacity>

          {/* MOJE PRODEJNA */}
          <TouchableOpacity
            style={[styles.loginSectionCard, styles.loginSectionCardSecondary]}
            onPress={() => router.push('/prihlaseni/prodejna')}
          >
            <Image
              source={require('../../assets/images/prodejna-icon.png')}
              style={styles.loginSectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.loginSectionTitle}>Moje prodejna</Text>
            <Text style={styles.loginSectionSubtitle}>Správa produktů</Text>
          </TouchableOpacity>

          {/* MOJE STÁNKY */}
          <TouchableOpacity
            style={[styles.loginSectionCard, styles.loginSectionCardTertiary]}
            onPress={() => router.push('/prihlaseni/stanky')}
          >
            <Text style={styles.loginSectionEmoji}>🎪</Text>
            <Text style={styles.loginSectionTitle}>Moje stánky</Text>
            <Text style={styles.loginSectionSubtitle}>Správa stánků</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Potřebujete pomoc?</Text>
          <Text style={styles.helpText}>
            Kontaktujte nás na email: podpora@samopestitele.cz
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A'
  },
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 12,
    paddingHorizontal: 12,
    position: 'relative',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)'
  },
  homeButton: {
    position: 'absolute',
    top: 44,
    left: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 6,
    zIndex: 10
  },
  homeIcon: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  homeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 0
  },
  headerEmoji: {
    fontSize: 36,
    marginBottom: 8
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 3
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 16
  },
  content: {
    padding: 12,
    paddingBottom: 25
  },
  registerButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600'
  },
  loginSectionsContainer: {
    gap: 10,
    marginBottom: 16
  },
  loginSectionCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderLeftWidth: 3
  },
  loginSectionCardPrimary: {
    borderLeftColor: '#FF9800'
  },
  loginSectionCardSecondary: {
    borderLeftColor: '#FF9800'
  },
  loginSectionCardTertiary: {
    borderLeftColor: '#FF9800'
  },
  loginSectionEmoji: {
    fontSize: 28,
    marginBottom: 6
  },
  loginSectionIcon: {
    width: 128,
    height: 128,
    marginBottom: 6
  },
  loginSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 2
  },
  loginSectionSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500'
  },
  helpCard: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800'
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF9800',
    marginBottom: 4
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    lineHeight: 17
  }
});
