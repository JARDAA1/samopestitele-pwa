import { Stack } from 'expo-router';

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#f0f7ee' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="jsem-farmar" />
      <Stack.Screen name="moje-prodejna" />
      <Stack.Screen name="moje-stanky" />
      <Stack.Screen name="explore" />
    </Stack>
  );
}
