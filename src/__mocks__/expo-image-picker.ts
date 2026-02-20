// Mock para expo-image-picker
export const MediaTypeOptions = {
  Images: 'Images',
};

export async function requestMediaLibraryPermissionsAsync() {
  return { status: 'granted' };
}

// Accept optional options to match real API signature
export async function launchImageLibraryAsync(_options?: {
  mediaTypes?: string;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
}) {
  return {
    canceled: false,
    assets: [{ uri: 'https://example.com/mock-image.jpg' }]
  };
}