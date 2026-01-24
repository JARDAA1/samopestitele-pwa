import { useEffect } from 'react';
import { router } from 'expo-router';
import { useFarmarAuth } from './farmarAuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isSessionChecked } = useFarmarAuth();

  useEffect(() => {
    // Počkat, než se dokončí kontrola session
    if (isSessionChecked && !isAuthenticated) {
      console.log('🚫 Not authenticated after session check, redirecting to /prihlaseni');
      const timer = setTimeout(() => {
        router.replace('/prihlaseni');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, isSessionChecked]);

  // Zobrazit loading, dokud se kontroluje session
  if (!isSessionChecked) {
    console.log('⏳ Waiting for session check to complete...');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Pokud není přihlášen po dokončení kontroly, zobrazit loading (přesměrování probíhá)
  if (!isAuthenticated) {
    console.log('🚫 Not authenticated, showing loading while redirecting...');
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  console.log('✅ Authenticated, rendering protected content');
  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
});
