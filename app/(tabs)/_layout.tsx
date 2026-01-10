import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="jsem-farmar" />
      <Stack.Screen name="moje-farma" />
      <Stack.Screen name="moje-stanky" />
      <Stack.Screen name="explore" />
    </Stack>
  );
}
