import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useFarmarAuth } from '@/features/auth/hooks/farmarAuthContext';

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
        <ActivityIndicator size="large" color="#4caf50" />
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
    backgroundColor: '#ffffff',
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
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
    color: '#1a1a1a',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonsContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#4caf50',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  secondaryButtonText: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
  },
});
