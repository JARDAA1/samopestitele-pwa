import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
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
            <Text style={styles.loginSectionEmoji}>👤</Text>
            <Text style={styles.loginSectionTitle}>Profil</Text>
            <Text style={styles.loginSectionSubtitle}>Kompletní přístup</Text>
          </TouchableOpacity>

          {/* MOJE PRODEJNA */}
          <TouchableOpacity
            style={[styles.loginSectionCard, styles.loginSectionCardSecondary]}
            onPress={() => router.push('/prihlaseni/prodejna')}
          >
            <Text style={styles.loginSectionEmoji}>🏪</Text>
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
    backgroundColor: '#F5F5F5'
  },
  header: {
    backgroundColor: '#7B1FA2',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 16,
    position: 'relative'
  },
  homeButton: {
    position: 'absolute',
    top: 50,
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
    fontSize: 40,
    marginBottom: 8
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 3
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 16
  },
  content: {
    padding: 16,
    paddingBottom: 25
  },
  registerButton: {
    backgroundColor: '#7B1FA2',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 12
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD'
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    color: '#999',
    fontWeight: '600'
  },
  loginSectionsContainer: {
    gap: 12,
    marginBottom: 16
  },
  loginSectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    borderLeftWidth: 4
  },
  loginSectionCardPrimary: {
    borderLeftColor: '#1976D2'
  },
  loginSectionCardSecondary: {
    borderLeftColor: '#7B1FA2'
  },
  loginSectionCardTertiary: {
    borderLeftColor: '#FF9800'
  },
  loginSectionEmoji: {
    fontSize: 32,
    marginBottom: 8
  },
  loginSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6A1B9A',
    marginBottom: 2
  },
  loginSectionSubtitle: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500'
  },
  helpCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 4
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 17
  }
});
