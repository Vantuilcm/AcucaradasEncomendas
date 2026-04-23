// Mock para expo-image-picker
export const MediaTypeOptions = {
  Images: 'Images',
};

export async function requestMediaLibraryPermissionsAsync() {
  return { status: 'granted' };
}

export async function launchImageLibraryAsync() {
  return {
    canceled: false,
    assets: [{ uri: 'https://example.com/mock-image.jpg' }]
  };
}