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
        <View style={styles.sectionsContainer}>
          {/* PROFIL */}
          <TouchableOpacity
            style={[styles.sectionCard, styles.sectionCardPrimary]}
            onPress={() => router.push('/prihlaseni/profil')}
          >
            <Text style={styles.sectionTitle}>Profil</Text>
          </TouchableOpacity>

          {/* MOJE PRODEJNA */}
          <TouchableOpacity
            style={[styles.sectionCard, styles.sectionCardSecondary]}
            onPress={() => router.push('/prihlaseni/prodejna')}
          >
            <Text style={styles.sectionTitle}>Moje prodejna</Text>
          </TouchableOpacity>

          {/* MOJE STÁNKY */}
          <TouchableOpacity
            style={[styles.sectionCard, styles.sectionCardTertiary]}
            onPress={() => router.push('/prihlaseni/stanky')}
          >
            <Text style={styles.sectionTitle}>Moje stánky</Text>
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
  sectionsContainer: {
    gap: 16,
    marginTop: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2E7D32',
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
