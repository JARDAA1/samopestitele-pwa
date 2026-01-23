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
        {/* Tlačítka nahoře - vždy viditelné */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/registrace')}
        >
          <Text style={styles.registerButtonText}>📝 Zaregistrovat se</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>NEBO</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.loginButton}
          onPress={() => router.push('/prihlaseni')}
        >
          <Text style={styles.loginButtonText}>🔑 Už mám účet - Přihlásit se</Text>
        </TouchableOpacity>

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
    backgroundColor: '#4CAF50',
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
    backgroundColor: '#4CAF50',
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
  loginButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 16
  },
  loginButtonText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600'
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
