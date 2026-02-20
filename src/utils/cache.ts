import AsyncStorage from '@react-native-async-storage/async-storage';

export class CacheManager {
  static async setData(key: string, data: any, expirationMinutes: number = 60) {
    const item = {
      data,
      timestamp: Date.now(),
      expirationMinutes,
    };
    await AsyncStorage.setItem(key, JSON.stringify(item));
  }

  static async getData(key: string) {
    const item = await AsyncStorage.getItem(key);
    if (!item) return null;

    const parsedItem = JSON.parse(item);
    const now = Date.now();
    const expirationTime = parsedItem.timestamp + parsedItem.expirationMinutes * 60 * 1000;

    if (now > expirationTime) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return parsedItem.data;
  }
}
