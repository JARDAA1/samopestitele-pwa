// ============================================
// HYBRID CITY SEARCH - Database + API Fallback
// ============================================

import { supabase } from '@/lib/supabaseClient';
import { searchCities, CityResult } from '@/features/mapa/services/citySearchService';

export type HybridCityResult = {
  id: string | number;
  nazev: string;
  psc?: string;
  okres?: string;
  kraj?: string;
  gps_lat: number;
  gps_lng: number;
  typ: string;
  source: 'database' | 'api'; // Odkud pochází
};

/**
 * HYBRID SEARCH - Database + API
 * 1. Zkusí najít v databázi (rychlé)
 * 2. Pokud nic nenajde → zavolá API (kompletní)
 */
export async function searchCitiesHybrid(
  query: string,
  limit: number = 10
): Promise<HybridCityResult[]> {

  if (query.length < 2) {
    return [];
  }

  console.log(`🔍 Hybrid search: "${query}"`);

  // =============================================
  // KROK 1: Zkus najít v databázi
  // =============================================

  try {
    const { data: dbResults, error } = await supabase
      .from('mesta')
      .select('*')
      .ilike('nazev', `%${query}%`) // Case-insensitive LIKE
      .order('pocet_obyvatel', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('⚠️ Database search failed:', error);
      // Pokračujeme na API
    }

    // Máme výsledky z databáze?
    if (dbResults && dbResults.length > 0) {
      console.log(`✅ Nalezeno ${dbResults.length} obcí v databázi`);

      return dbResults.map(city => ({
        id: city.id,
        nazev: city.nazev,
        psc: city.psc,
        okres: city.okres,
        kraj: city.kraj,
        gps_lat: city.gps_lat,
        gps_lng: city.gps_lng,
        typ: city.typ || 'obec',
        source: 'database' as const,
      }));
    }

    console.log('⚠️ Nic v databázi, zkouším API...');

  } catch (dbError) {
    console.error('❌ Database error:', dbError);
  }

  // =============================================
  // KROK 2: Nenašli jsme nic? → API fallback
  // =============================================

  try {
    console.log('🌍 Volám Nominatim API...');

    const apiResults = await searchCities(query, limit);

    if (apiResults.length > 0) {
      console.log(`✅ Nalezeno ${apiResults.length} obcí v API`);

      return apiResults.map(city => ({
        id: city.id,
        nazev: city.nazev,
        psc: city.psc,
        okres: city.okres,
        kraj: city.kraj,
        gps_lat: city.gps_lat,
        gps_lng: city.gps_lng,
        typ: city.typ,
        source: 'api' as const,
      }));
    }

  } catch (apiError) {
    console.error('❌ API error:', apiError);
  }

  // Nic nenalezeno
  console.log('😞 Žádné výsledky');
  return [];
}

/**
 * Uloží město z API do databáze (učící se cache)
 * Volitelné - použij pokud chceš ukládat API výsledky
 */
export async function saveCityToCache(city: HybridCityResult): Promise<boolean> {

  if (city.source === 'database') {
    return true; // Už je v DB
  }

  try {
    const { error } = await supabase
      .from('mesta')
      .insert([{
        nazev: city.nazev,
        psc: city.psc || null,
        okres: city.okres || null,
        kraj: city.kraj || null,
        gps_lat: city.gps_lat,
        gps_lng: city.gps_lng,
        typ: city.typ,
        pocet_obyvatel: null,
      }]);

    if (error) {
      // Ignorujeme duplicity
      if (error.code === '23505') {
        return true;
      }
      throw error;
    }

    console.log('💾 Město uloženo do cache:', city.nazev);
    return true;

  } catch (error) {
    console.error('❌ Chyba při ukládání do cache:', error);
    return false;
  }
}

/**
 * Debounced verze pro real-time search
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
