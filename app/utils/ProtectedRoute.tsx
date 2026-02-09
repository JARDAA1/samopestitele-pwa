import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useFarmarAuth } from './farmarAuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isSessionChecked } = useFarmarAuth();

  // Zobrazit loading, dokud se kontroluje session
  if (!isSessionChecked) {
    console.log('⏳ Waiting for session check to complete...');
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#7B1FA2" />
      </View>
    );
  }

  // Pokud není přihlášen, zobrazit obrazovku se dvěma tlačítky
  if (!isAuthenticated) {
    console.log('🚫 Not authenticated, showing login options...');
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🧺</Text>
          <Text style={styles.title}>Moje prodejna</Text>
          <Text style={styles.subtitle}>
            Pro přístup k prodejně se prosím přihlaste nebo si založte nový účet
          </Text>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.push('/prihlaseni')}
            >
              <Text style={styles.primaryButtonText}>Přihlásit se</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/registrace')}
            >
              <Text style={styles.secondaryButtonText}>Založit si prodejnu</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  console.log('✅ Authenticated, rendering protected content');
  return <>{children}</>;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#6A1B9A',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
