/**
 * Ponte compatível com LocationService — delega para expo-location (GPS real).
 * Mantém o mesmo contrato usado por src/services/LocationService.ts.
 */
export {
  Accuracy,
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
  reverseGeocodeAsync,
} from 'expo-location';
