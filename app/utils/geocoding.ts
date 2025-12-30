export type GeocodingResult = {
  lat: number;
  lng: number;
  display_name: string;
} | null;

export async function geocodeAddress(
  ulice: string,
  mesto: string,
  psc?: string
): Promise<GeocodingResult> {
  try {
    const addressParts = [ulice, mesto, psc, 'Česká republika'].filter(Boolean);
    const address = addressParts.join(', ');
    console.log('🔍 Geocoding:', address);
    const url = 'https://nominatim.openstreetmap.org/search?q=' + encodeURIComponent(address) + '&format=json&limit=1&countrycodes=cz&addressdetails=1';
    const response = await fetch(url, { headers: { 'User-Agent': 'Samopestitele-App/1.0' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!data || data.length === 0) return null;
    const result = data[0];
    return { lat: parseFloat(result.lat), lng: parseFloat(result.lon), display_name: result.display_name };
  } catch (error) {
    console.error('Geocoding chyba:', error);
    return null;
  }
}

export function isInCzechRepublic(lat: number, lng: number): boolean {
  return lat >= 48.5 && lat <= 51.1 && lng >= 12.0 && lng <= 18.9;
}
