/**
 * Fetches current weather for a given lat/lng using Open-Meteo (Free, no API key required).
 */
export async function fetchWeather(lat: number, lng: number) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.current_weather) {
      return {
        temp: Math.round(data.current_weather.temperature),
        conditionCode: data.current_weather.weathercode,
        // Open-Meteo weather codes: https://open-meteo.com/en/docs
        conditionText: getWeatherConditionText(data.current_weather.weathercode),
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

function getWeatherConditionText(code: number): string {
  if (code === 0) return 'Clear';
  if (code >= 1 && code <= 3) return 'Partly Cloudy';
  if (code >= 45 && code <= 48) return 'Foggy';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code >= 61 && code <= 65) return 'Rainy';
  if (code >= 71 && code <= 77) return 'Snowy';
  if (code >= 80 && code <= 82) return 'Showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Cloudy';
}

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

/**
 * Reverse geocodes lat/lng to a city name using Google Maps Geocoding API.
 */
export async function fetchCityName(lat: number, lng: number) {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API Key missing for Geocoding');
      return 'Unknown';
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.results && data.results.length > 0) {
      // Find the city/locality in the address components
      const addressComponents = data.results[0].address_components;
      const cityComponent = addressComponents.find((c: any) => 
        c.types.includes('locality') || 
        c.types.includes('administrative_area_level_2') ||
        c.types.includes('administrative_area_level_1')
      );
      
      return cityComponent ? cityComponent.long_name : 'Unknown';
    }
    return 'Unknown';
  } catch (error) {
    console.error('Error reverse geocoding with Google:', error);
    return 'Unknown';
  }
}
