import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>🌱</Text>
        <Text style={styles.title}>Samopěstitelé</Text>
        <Text style={styles.subtitle}>Propojujeme pěstitele se zákazníky</Text>
      </View>

      {/* TLAČÍTKO 1 - NAJDI FARMÁŘE (MAPA S FILTREM) */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => router.push('/mapa')}
      >
        <Text style={styles.buttonIcon}>🗺️</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.buttonTitle}>Najdi farmáře/ku</Text>
        </View>
      </TouchableOpacity>

      {/* TLAČÍTKO 2 - MOJI FARMÁŘI */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => router.push('/explore')}
      >
        <Text style={styles.buttonIcon}>📋</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.buttonTitle}>Moji farmáři/ky</Text>
        </View>
      </TouchableOpacity>

      {/* Oddělovač */}
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>Jste pěstitel?</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* TLAČÍTKO 3 - JSEM SAMOPĚSTITEL/KA */}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  header: {
    alignItems: 'center',
    marginBottom: 24
  },
  logo: {
    fontSize: 44,
    marginBottom: 6
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#2E7D32',
    textAlign: 'center',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  primaryButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
  buttonIcon: {
    fontSize: 32,
    marginRight: 14
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2
  },
  buttonSubtitle: {
    fontSize: 11,
    color: '#FFFFFF',
    opacity: 0.9
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    maxWidth: 400,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#999',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
  farmerButton: {
    backgroundColor: '#8B4513',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    width: '90%',
    maxWidth: 400,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },
});
