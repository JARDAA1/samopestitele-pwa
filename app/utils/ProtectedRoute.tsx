import { useEffect } from 'react';
import { router } from 'expo-router';
import { useFarmarAuth } from './farmarAuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated } = useFarmarAuth();

  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect only once when auth changes
      const timer = setTimeout(() => {
        router.replace('/prihlaseni');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

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
