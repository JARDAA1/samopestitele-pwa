import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
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

      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionsContainer}>
          {/* PROFIL */}
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => router.push('/prihlaseni/profil')}
          >
            <Image
              source={require('../../assets/images/profil-icon.png')}
              style={styles.sectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.sectionTitle}>Profil</Text>
            <Text style={styles.sectionArrow}>›</Text>
          </TouchableOpacity>

          {/* MOJE PRODEJNA */}
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => router.push('/prihlaseni/prodejna')}
          >
            <Image
              source={require('../../assets/images/prodejna-icon.png')}
              style={styles.sectionIcon}
              resizeMode="contain"
            />
            <Text style={styles.sectionTitle}>Moje prodejna</Text>
            <Text style={styles.sectionArrow}>›</Text>
          </TouchableOpacity>

          {/* MOJE STÁNKY */}
          <TouchableOpacity
            style={styles.sectionCard}
            onPress={() => router.push('/prihlaseni/stanky')}
          >
            <Text style={styles.sectionEmoji}>🏕️</Text>
            <Text style={styles.sectionTitle}>Moje stánky</Text>
            <Text style={styles.sectionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>NEBO</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/registrace')}
        >
          <Text style={styles.registerButtonText}>
            Zaregistrovat se
          </Text>
        </TouchableOpacity>

        <Text style={styles.registerHint}>
          Ještě nemáte účet? Registrace je zdarma.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 44,
    paddingBottom: 8,
    paddingHorizontal: 12,
    backgroundColor: '#6A1B9A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    padding: 6,
  },
  backIcon: {
    fontSize: 22,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSpacer: {
    width: 40,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    paddingBottom: 30,
  },
  sectionsContainer: {
    gap: 10,
    marginTop: 8,
  },
  sectionCard: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  sectionEmoji: {
    fontSize: 24,
    marginRight: 14,
  },
  sectionIcon: {
    width: 112,
    height: 112,
    marginRight: 14,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionArrow: {
    fontSize: 22,
    color: '#FF9800',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#FF9800',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  registerButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  registerHint: {
    textAlign: 'center',
    marginTop: 12,
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
});
