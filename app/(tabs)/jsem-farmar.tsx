import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';

export default function JsemFarmarScreen() {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Text style={styles.backIcon}>←</Text>
          <Text style={styles.backText}>Zpět</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerEmoji}>👨‍🌾</Text>
          <Text style={styles.headerTitle}>Jsem pěstitel</Text>
          <Text style={styles.headerSubtitle}>Přihlaste se nebo se zaregistrujte</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Primární karta: Profil ─────────────────────────────── */}
        <TouchableOpacity
          style={styles.primaryCard}
          onPress={() => router.push('/prihlaseni/profil')}
          activeOpacity={0.85}
        >
          <View style={styles.primaryCardInner}>
            <Image
              source={require('../../assets/images/profil-icon.png')}
              style={styles.primaryIcon}
              resizeMode="contain"
            />
            <View style={styles.primaryText}>
              <View style={styles.primaryTitleRow}>
                <Text style={styles.primaryTitle}>Profil farmáře</Text>
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>DOPORUČENO</Text>
                </View>
              </View>
              <Text style={styles.primarySubtitle}>
                Kompletní přístup — správa profilu, dostupnosti, lokality a nastavení účtu
              </Text>
            </View>
          </View>
          <Text style={styles.primaryChevron}>›</Text>
        </TouchableOpacity>

        {/* ── Sekundární karty ─────────────────────────────────── */}
        <View style={styles.secondaryRow}>
          {/* Prodejna */}
          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={() => router.push('/prihlaseni/prodejna')}
            activeOpacity={0.85}
          >
            <Image
              source={require('../../assets/images/prodejna-icon.png')}
              style={styles.secondaryIcon}
              resizeMode="contain"
            />
            <Text style={styles.secondaryTitle}>Moje prodejna</Text>
            <Text style={styles.secondarySubtitle}>Správa produktů a objednávek</Text>
          </TouchableOpacity>

          {/* Stánky */}
          <TouchableOpacity
            style={styles.secondaryCard}
            onPress={() => router.push('/prihlaseni/stanky')}
            activeOpacity={0.85}
          >
            <Image
              source={require('../../assets/images/stanek-icon.png')}
              style={styles.secondaryIcon}
              resizeMode="contain"
            />
            <Text style={styles.secondaryTitle}>Moje stánky</Text>
            <Text style={styles.secondarySubtitle}>Rychlý přístup PIN + číslo</Text>
          </TouchableOpacity>
        </View>

        {/* ── Divider ───────────────────────────────────────────── */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>NEMÁTE ÚČET?</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ── Registrace ───────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.registerButton}
          onPress={() => router.push('/registrace')}
          activeOpacity={0.85}
        >
          <Text style={styles.registerText}>📝 Zaregistrovat se zdarma</Text>
        </TouchableOpacity>

        {/* ── Pomoc ────────────────────────────────────────────── */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>Potřebujete pomoc?</Text>
          <Text style={styles.helpText}>podpora@samopestitele.cz</Text>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },

  // Header
  header: {
    backgroundColor: '#6A1B9A',
    paddingTop: 44,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  backButton: {
    position: 'absolute',
    top: 44,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 8,
    zIndex: 10,
  },
  backIcon: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  backText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  headerContent: {
    alignItems: 'center',
    paddingTop: 4,
  },
  headerEmoji: {
    fontSize: 36,
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },

  // Scroll
  scroll: {
    padding: 14,
  },

  // Primární karta
  primaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: 14,
    marginBottom: 12,
  },
  primaryCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  primaryIcon: {
    width: 64,
    height: 64,
    marginRight: 14,
    flexShrink: 0,
  },
  primaryText: {
    flex: 1,
  },
  primaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 5,
  },
  primaryTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  recommendedBadge: {
    backgroundColor: '#FF9800',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  recommendedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  primarySubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    lineHeight: 17,
  },
  primaryChevron: {
    fontSize: 26,
    color: 'rgba(255,255,255,0.35)',
    marginLeft: 8,
  },

  // Sekundární karty
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  secondaryCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    padding: 14,
    alignItems: 'center',
  },
  secondaryIcon: {
    width: 56,
    height: 56,
    marginBottom: 8,
  },
  secondaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 3,
    textAlign: 'center',
  },
  secondarySubtitle: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    lineHeight: 15,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 0.8,
  },

  // Registrace
  registerButton: {
    backgroundColor: 'rgba(255,152,0,0.2)',
    borderWidth: 1.5,
    borderColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  registerText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FF9800',
  },

  // Pomoc
  helpCard: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
  },
  helpText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.5)',
  },
});
