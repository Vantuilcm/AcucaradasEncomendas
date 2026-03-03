export enum Accuracy {
  Balanced = 3,
}

export async function requestForegroundPermissionsAsync(): Promise<{ status: 'granted' | 'denied' }> {
  return { status: 'granted' };
}

export async function getCurrentPositionAsync(): Promise<{
  coords: { latitude: number; longitude: number };
}> {
  return { coords: { latitude: 0, longitude: 0 } };
}

export async function reverseGeocodeAsync(): Promise<
  Array<{
    street?: string;
    streetNumber?: string;
    district?: string;
    city?: string;
    region?: string;
  }>
> {
  return [{}];
}
