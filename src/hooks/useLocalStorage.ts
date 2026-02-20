import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loggingService } from '../services/LoggingService';

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => Promise<void>] {
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  useEffect(() => {
    const loadStoredValue = async () => {
      try {
        const item = await AsyncStorage.getItem(key);
        if (item) {
          const parsedValue = JSON.parse(item);
          setStoredValue(parsedValue);
          loggingService.info('Valor carregado do armazenamento local', {
            key,
            value: parsedValue,
          });
        }
      } catch (err) {
        loggingService.error('Erro ao carregar valor do armazenamento local', { key, error: err });
      }
    };

    loadStoredValue();
  }, [key]);

  const setValue = async (value: T) => {
    try {
      setStoredValue(value);
      await AsyncStorage.setItem(key, JSON.stringify(value));
      loggingService.info('Valor salvo no armazenamento local', { key, value });
    } catch (err) {
      loggingService.error('Erro ao salvar valor no armazenamento local', { key, error: err });
    }
  };

  return [storedValue, setValue];
}
