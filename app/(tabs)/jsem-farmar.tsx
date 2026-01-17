import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useState } from 'react';

export default function JsemFarmarScreen() {
  const [benefitsExpanded, setBenefitsExpanded] = useState(false);

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

        {/* Rozbalovací sekce s výhodami */}
        <View style={styles.benefitsSection}>
          <TouchableOpacity
            style={styles.benefitsHeader}
            onPress={() => setBenefitsExpanded(!benefitsExpanded)}
          >
            <View style={styles.benefitsHeaderContent}>
              <Text style={styles.benefitsHeaderIcon}>🌾</Text>
              <View style={styles.benefitsHeaderText}>
                <Text style={styles.benefitsHeaderTitle}>
                  {benefitsExpanded ? '▼' : '▶'} Proč se stát farmářem?
                </Text>
                <Text style={styles.benefitsHeaderSubtitle}>
                  Zjistěte, co všechno získáte
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {benefitsExpanded && (
            <View style={styles.benefitsContent}>
              <Text style={styles.benefitsIntro}>
                Zaregistrujte se jako farmář a nabízejte své produkty tisícům zákazníků ve vašem okolí.
              </Text>

              <Text style={styles.benefitsTitle}>Co získáte:</Text>

              <View style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>Vlastní online prodejnu s produkty</Text>
              </View>

              <View style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>Zobrazení na mapě farmářů v okolí</Text>
              </View>

              <View style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>Přímý kontakt se zákazníky</Text>
              </View>

              <View style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>Správa nabídky, cen a fotek produktů</Text>
              </View>

              <View style={styles.benefitRow}>
                <Text style={styles.benefitIcon}>✓</Text>
                <Text style={styles.benefitText}>Jednoduché přihlášení přes SMS</Text>
              </View>
            </View>
          )}
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
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    position: 'relative'
  },
  homeButton: {
    position: 'absolute',
    top: 50,
    left: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    zIndex: 10
  },
  homeIcon: {
    fontSize: 18,
    color: '#FFFFFF',
    fontWeight: 'bold'
  },
  homeText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600'
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 5
  },
  headerEmoji: {
    fontSize: 48,
    marginBottom: 10
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 4
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
    lineHeight: 18
  },
  content: {
    padding: 15,
    paddingBottom: 30
  },
  benefitsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginTop: 5,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  benefitsHeader: {
    padding: 15,
    backgroundColor: '#E8F5E9'
  },
  benefitsHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  benefitsHeaderIcon: {
    fontSize: 32,
    marginRight: 12
  },
  benefitsHeaderText: {
    flex: 1
  },
  benefitsHeaderTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 3,
    lineHeight: 20
  },
  benefitsHeaderSubtitle: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16
  },
  benefitsContent: {
    padding: 15,
    backgroundColor: '#FFFFFF'
  },
  benefitsIntro: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center'
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 15
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  benefitIcon: {
    fontSize: 20,
    color: '#4CAF50',
    marginRight: 12,
    fontWeight: 'bold'
  },
  benefitText: {
    fontSize: 15,
    color: '#333',
    flex: 1
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4
  },
  registerButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold'
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#DDD'
  },
  dividerText: {
    marginHorizontal: 15,
    fontSize: 12,
    color: '#999',
    fontWeight: '600'
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    marginBottom: 20
  },
  loginButtonText: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '600'
  },
  helpCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 10,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107'
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57C00',
    marginBottom: 5
  },
  helpText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
  }
});
