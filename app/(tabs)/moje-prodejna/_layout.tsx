import { Stack } from 'expo-router';

export default function MojeProdejnaLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="operativa" />
      <Stack.Screen name="pridat-produkt" />
      <Stack.Screen name="upravit-produkt" />
      <Stack.Screen name="seznam-produktu" />
      <Stack.Screen name="objednavky" />
      <Stack.Screen name="detail-objednavky" />
      <Stack.Screen name="dokoncene-objednavky" />
    </Stack>
  );
}
