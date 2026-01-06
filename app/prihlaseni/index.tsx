import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function PrihlaseniScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Přihlášení</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Vyberte sekci</Text>
        <Text style={styles.subtitle}>
          Každá sekce má jiný způsob přihlášení podle úrovně zabezpečení
        </Text>

        <View style={styles.sectionsContainer}>
          {/* PROFIL - Nejvyšší bezpečnost */}
          <TouchableOpacity
            style={[styles.sectionCard, styles.sectionCardPrimary]}
            onPress={() => router.push('/prihlaseni/profil')}
          >
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>👤</Text>
            </View>
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionTitle}>Profil</Text>
              <Text style={styles.sectionDescription}>
                Osobní údaje, nastavení, platby
              </Text>
              <View style={styles.securityBadge}>
                <Text style={styles.securityText}>🔒🔒🔒 Email Magic Link</Text>
              </View>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* PRODEJNA - Střední bezpečnost */}
          <TouchableOpacity
            style={[styles.sectionCard, styles.sectionCardSecondary]}
            onPress={() => router.push('/prihlaseni/prodejna')}
          >
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>🏪</Text>
            </View>
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionTitle}>Prodejna</Text>
              <Text style={styles.sectionDescription}>
                Produkty, objednávky, zákazníci
              </Text>
              <View style={styles.securityBadge}>
                <Text style={styles.securityText}>🔒🔒 PIN kód</Text>
              </View>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>

          {/* STÁNKY - Nízká bezpečnost */}
          <TouchableOpacity
            style={[styles.sectionCard, styles.sectionCardTertiary]}
            onPress={() => router.push('/prihlaseni/stanky')}
          >
            <View style={styles.sectionIcon}>
              <Text style={styles.sectionIconText}>🎪</Text>
            </View>
            <View style={styles.sectionInfo}>
              <Text style={styles.sectionTitle}>Stánky</Text>
              <Text style={styles.sectionDescription}>
                Rychlá aktualizace zásob na trhu
              </Text>
              <View style={styles.securityBadge}>
                <Text style={styles.securityText}>🔒 QR kód / 6místný kód</Text>
              </View>
            </View>
            <Text style={styles.arrow}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>NEBO</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.registerLink}
          onPress={() => router.push('/registrace')}
        >
          <Text style={styles.registerLinkText}>
            Ještě nemám účet - Zaregistrovat se
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 12,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backIcon: {
    fontSize: 24,
    color: '#2E7D32',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2E7D32',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  sectionsContainer: {
    gap: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderLeftWidth: 4,
  },
  sectionCardPrimary: {
    borderLeftColor: '#1976D2',
  },
  sectionCardSecondary: {
    borderLeftColor: '#4CAF50',
  },
  sectionCardTertiary: {
    borderLeftColor: '#FF9800',
  },
  sectionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  sectionIconText: {
    fontSize: 32,
  },
  sectionInfo: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2E7D32',
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#666',
    marginBottom: 8,
    lineHeight: 18,
  },
  securityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#E8F5E9',
  },
  securityText: {
    fontSize: 11,
    color: '#2E7D32',
    fontWeight: '600',
  },
  arrow: {
    fontSize: 24,
    color: '#4CAF50',
    fontWeight: '600',
    marginLeft: 8,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  registerLink: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  registerLinkText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
  },
});
