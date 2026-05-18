import FontAwesome from '@expo/vector-icons/FontAwesome';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useColorScheme } from '@/components/useColorScheme';
import { ShoppingListProvider } from './_utils/cartContext';
import { FarmarAuthProvider } from './_utils/farmarAuthContext';
import { CustomerListProvider } from '@/shared/context/CustomerListContext';
import { AppLayout } from './_components/AppLayout';
import { Sentry, initMonitoring } from '@/lib/monitoring';

// Inicializace monitoringu (no-op v development, aktivní v produkci)
initMonitoring();

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

const GreenLightTheme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: '#f4fae8' },
};

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  // Globální nastavení - všechny screeny mají headerShown: false
  // Každý screen má vlastní custom header
  // AppLayout zajišťuje responzivní centrování na tabletech (>=768px)
  return (
    <Sentry.ErrorBoundary>
      <FarmarAuthProvider>
        <ShoppingListProvider>
          <CustomerListProvider>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : GreenLightTheme}>
            <AppLayout>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
                <Stack.Screen name="mapa/index" />
                <Stack.Screen name="pestitele/[id]" />
                <Stack.Screen name="kosik/index" />
                <Stack.Screen name="registrace/index" />
                <Stack.Screen name="prihlaseni/index" />
                <Stack.Screen name="zapomenute-heslo/index" />
                <Stack.Screen name="muj-profil" />
                <Stack.Screen name="o/[token]" />
              </Stack>
            </AppLayout>
          </ThemeProvider>
          </CustomerListProvider>
        </ShoppingListProvider>
      </FarmarAuthProvider>
    </Sentry.ErrorBoundary>
  );
}
