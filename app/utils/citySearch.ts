// ============================================
// CITY SEARCH API - NOMINATIM (OpenStreetMap)
// ============================================

export type CityResult = {
  id: string;
  nazev: string;
  psc?: string;
  okres?: string;
  kraj?: string;
  gps_lat: number;
  gps_lng: number;
  typ: string;
  full_display: string; // Pro zobrazení
};

/**
 * Vyhledá města/obce v Česku pomocí Nominatim API
 * @param query - Vyhledávací dotaz (min. 2 znaky)
 * @param limit - Max počet výsledků (default 10)
 * @returns Promise s polem měst
 */
export async function searchCities(
  query: string,
  limit: number = 10
): Promise<CityResult[]> {
  
  if (query.length < 2) {
    return [];
  }

  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    
    url.searchParams.append('q', query);
    url.searchParams.append('countrycodes', 'cz'); // Jen Česko!
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('featuretype', 'settlement'); // Jen města/obce

    console.log('🔍 Hledám obce:', query);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Samopestitele-App/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    console.log(`✅ Nalezeno ${data.length} obcí`);

    // Mapování na naši strukturu
    const cities: CityResult[] = data
      .filter((item: any) => {
        // Filtrujeme jen města, vesnice, obce
        const type = item.type;
        return ['city', 'town', 'village', 'municipality', 'administrative'].includes(type);
      })
      .map((item: any) => {
        const address = item.address || {};
        
        // Získání názvu obce
        const nazev = address.city || 
                      address.town || 
                      address.village || 
                      address.municipality || 
                      item.display_name.split(',')[0];

        // Typ osídlení
        let typ = 'obec';
        if (item.type === 'city') typ = 'město';
        if (item.type === 'town') typ = 'město';
        if (item.type === 'village') typ = 'obec';

        // Display string
        const okres = address.county || '';
        const psc = address.postcode || '';
        
        let display = nazev;
        if (psc) display += ` (${psc})`;
        if (okres) display += ` - ${okres}`;

        return {
          id: item.place_id.toString(),
          nazev: nazev,
          psc: psc || undefined,
          okres: okres || undefined,
          kraj: address.state || undefined,
          gps_lat: parseFloat(item.lat),
          gps_lng: parseFloat(item.lon),
          typ: typ,
          full_display: display,
        };
      })
      .filter((city: CityResult) => {
        // Odfiltrujeme prázdné/divné výsledky
        return city.nazev && city.nazev.length > 0;
      });

    return cities;

  } catch (error: any) {
    console.error('❌ Chyba při vyhledávání obcí:', error);
    return [];
  }
}

/**
 * Vyhledá konkrétní město podle PSČ
 * @param psc - PSČ
 */
export async function searchCityByPostcode(psc: string): Promise<CityResult | null> {
  try {
    const url = new URL('https://nominatim.openstreetmap.org/search');
    
    url.searchParams.append('postalcode', psc);
    url.searchParams.append('countrycodes', 'cz');
    url.searchParams.append('format', 'json');
    url.searchParams.append('addressdetails', '1');
    url.searchParams.append('limit', '1');

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Samopestitele-App/1.0',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    
    if (data.length === 0) return null;

    const item = data[0];
    const address = item.address || {};

    return {
      id: item.place_id.toString(),
      nazev: address.city || address.town || address.village || item.display_name.split(',')[0],
      psc: psc,
      okres: address.county,
      kraj: address.state,
      gps_lat: parseFloat(item.lat),
      gps_lng: parseFloat(item.lon),
      typ: item.type === 'city' ? 'město' : 'obec',
      full_display: `${address.city || address.town || address.village} (${psc})`,
    };

  } catch (error) {
    console.error('Chyba při vyhledávání PSČ:', error);
    return null;
  }
}

// ============================================
// RATE LIMITING - Nominatim má limit 1 req/s
// ============================================

let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 sekunda

/**
 * Rate-limited verze searchCities
 */
export async function searchCitiesThrottled(
  query: string,
  limit: number = 10
): Promise<CityResult[]> {
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  
  return searchCities(query, limit);
}

// ============================================
// DEBOUNCE HELPER - pro real-time search
// ============================================

/**
 * Debounce funkce - zavolá funkci až po X ms nečinnosti
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

// ============================================
// PŘÍKLAD POUŽITÍ
// ============================================

/*
import { searchCities, debounce } from './citySearch';

// V komponentě:
const [query, setQuery] = useState('');
const [cities, setCities] = useState<CityResult[]>([]);
const [loading, setLoading] = useState(false);

// Debounced search
const debouncedSearch = useCallback(
  debounce(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setCities([]);
      return;
    }
    
    setLoading(true);
    const results = await searchCities(searchQuery);
    setCities(results);
    setLoading(false);
  }, 500), // 500ms prodleva
  []
);

// V TextInput:
<TextInput
  value={query}
  onChangeText={(text) => {
    setQuery(text);
    debouncedSearch(text);
  }}
/>

// Zobrazení výsledků:
{cities.map(city => (
  <TouchableOpacity key={city.id} onPress={() => handleSelect(city)}>
    <Text>{city.full_display}</Text>
  </TouchableOpacity>
))}
*/
