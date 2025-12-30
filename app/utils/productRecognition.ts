// ============================================
// AI PRODUCT RECOGNITION - Backend API
// ============================================

import * as FileSystem from 'expo-file-system/legacy';

export type RecognizedProduct = {
  nazev: string;
  kategorie: 'Zelenina' | 'Ovoce' | 'Bylinky' | 'Jiné';
  confidence: number;
  popis?: string;
};

// Backend API URL
// Pro development: IP adresa tvého Macu
// Pro production: https://your-api.vercel.app
const API_URL = __DEV__ 
  ? 'http://192.168.32.223:3000'  // ← Tvoje IP adresa!
  : 'https://your-api.vercel.app';

/**
 * Rozpozná produkt z fotky pomocí backend API
 * @param imageUri - Local URI fotky
 * @returns Rozpoznaný produkt
 */
export async function recognizeProductFromImage(
  imageUri: string
): Promise<RecognizedProduct | null> {
  
  try {
    console.log('🔍 Rozpoznávám produkt z fotky...');

    // 1. Načíst obrázek jako base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: 'base64',
    });

    // 2. Detekce MIME typu
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    let mediaType = 'image/jpeg';
    if (fileExt === 'png') mediaType = 'image/png';
    if (fileExt === 'webp') mediaType = 'image/webp';

    console.log('📤 Odesílám na backend API...');
    console.log('🌐 URL:', `${API_URL}/api/recognize-product`);

    // 3. Zavolat backend API
    const response = await fetch(`${API_URL}/api/recognize-product`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: base64,
        mediaType: mediaType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Backend API error:', response.status, errorData);
      throw new Error(errorData.message || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Backend odpověď:', data);

    if (!data.success || !data.result) {
      throw new Error('Neplatná odpověď ze serveru');
    }

    const result = data.result;
    console.log('✅ Rozpoznáno:', result.nazev, 'Kategorie:', result.kategorie);

    return {
      nazev: result.nazev,
      kategorie: result.kategorie,
      confidence: result.confidence || 0.8,
      popis: result.popis,
    };

  } catch (error: any) {
    console.error('❌ Chyba při rozpoznávání:', error);
    
    // Pokud je problém s připojením k backendu
    if (error.message.includes('Network request failed')) {
      console.error('💡 Ujisti se, že backend běží na:', API_URL);
      console.error('💡 Backend by měl běžet v terminálu');
      console.error('💡 Zkontroluj že vidíš: "✅ Server běží na: http://localhost:3000"');
    }
    
    return null;
  }
}

/**
 * Najde produkt v databázi podle názvu
 * @param nazev - Název produktu
 * @param produkty - Seznam všech produktů z databáze
 */
export function matchProductInDatabase(
  nazev: string,
  produkty: { id: number; nazev: string; emoji: string }[]
): { id: number; nazev: string; emoji: string } | null {
  
  const normalizedSearch = nazev.toLowerCase().trim();
  
  // Přesná shoda
  const exact = produkty.find(
    p => p.nazev.toLowerCase() === normalizedSearch
  );
  if (exact) return exact;

  // Částečná shoda
  const partial = produkty.find(
    p => p.nazev.toLowerCase().includes(normalizedSearch) ||
         normalizedSearch.includes(p.nazev.toLowerCase())
  );
  if (partial) return partial;

  return null;
}
