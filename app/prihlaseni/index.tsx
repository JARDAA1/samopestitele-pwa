import { Redirect } from 'expo-router';

export default function PrihlaseniScreen() {
  // Rovnou přesměrovat na přihlášení do prodejny
  return <Redirect href="/prihlaseni/prodejna" />;
}
