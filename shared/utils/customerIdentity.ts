import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOMER_ID_KEY = 'anon_customer_id';

/**
 * Generuje krátký unikátní identifikátor zákazníka
 * Formát: 4 znaky (velká písmena + číslice), např. "A3F2"
 */
function generateShortId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Bez O, I, 0, 1 pro čitelnost
  let result = '';
  for (let i = 0; i < 4; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars[randomIndex];
  }
  return result;
}

/**
 * Generuje UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Získá nebo vytvoří anonymní ID zákazníka
 * Ukládá se do AsyncStorage a zůstává stejné pro všechny objednávky
 */
export async function getOrCreateCustomerId(): Promise<{ id: string; shortId: string }> {
  try {
    const stored = await AsyncStorage.getItem(CUSTOMER_ID_KEY);

    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed;
    }

    // Vytvořit nové ID
    const newId = {
      id: generateUUID(),
      shortId: generateShortId(),
    };

    await AsyncStorage.setItem(CUSTOMER_ID_KEY, JSON.stringify(newId));
    return newId;
  } catch (error) {
    console.error('Chyba při získávání customer ID:', error);
    // Fallback - vždy vrátit nějaké ID
    return {
      id: generateUUID(),
      shortId: generateShortId(),
    };
  }
}

/**
 * Vrátí zkrácený kód zákazníka pro zobrazení (např. "A3F2")
 */
export function formatCustomerCode(shortId: string): string {
  return shortId.toUpperCase();
}
