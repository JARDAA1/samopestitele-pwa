import { Redirect } from 'expo-router';

/**
 * Tab route for Nákupní seznam — redirects to the full-page implementation
 * which uses CustomerListContext and the new mobile-optimised design.
 */
export default function NakupniSeznamTab() {
  return <Redirect href="/nakupni-seznam" />;
}
