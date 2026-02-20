import { useState, useCallback, useEffect } from 'react';
import * as Location from 'expo-location';
import { loggingService } from '../services/LoggingService';

interface GeolocationState {
  location: Location.LocationObject | null;
  address: Location.LocationGeocodedAddress | null;
  loading: boolean;
  error: Error | null;
}

interface GeolocationHandlers {
  getCurrentLocation: () => Promise<void>;
  getAddressFromLocation: (location: Location.LocationObject) => Promise<void>;
  watchLocation: () => Promise<void>;
  stopWatchingLocation: () => void;
}

export function useGeolocation(): [GeolocationState, GeolocationHandlers] {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    address: null,
    loading: false,
    error: null,
  });

  const [watchSubscription, setWatchSubscription] = useState<Location.LocationSubscription | null>(
    null
  );

  const getCurrentLocation = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permissão de localização negada');
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setState(prev => ({
        ...prev,
        location,
        loading: false,
      }));

      loggingService.info('Localização atual obtida', {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao obter localização atual', { error: err });
    }
  }, []);

  const getAddressFromLocation = useCallback(async (location: Location.LocationObject) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const [address] = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });

      setState(prev => ({
        ...prev,
        address,
        loading: false,
      }));

      loggingService.info('Endereço obtido da localização', { address });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao obter endereço da localização', { error: err });
    }
  }, []);

  const watchLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permissão de localização negada');
      }

      const subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 10000,
          distanceInterval: 100,
        },
        location => {
          setState(prev => ({
            ...prev,
            location,
            loading: false,
            error: null,
          }));
          loggingService.debug('Localização atualizada', {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          });
        }
      );

      setWatchSubscription(subscription);
      loggingService.info('Monitoramento de localização iniciado');
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err as Error,
      }));
      loggingService.error('Erro ao iniciar monitoramento de localização', { error: err });
    }
  }, []);

  const stopWatchingLocation = useCallback(() => {
    if (watchSubscription) {
      watchSubscription.remove();
      setWatchSubscription(null);
      loggingService.info('Monitoramento de localização interrompido');
    }
  }, [watchSubscription]);

  useEffect(() => {
    return () => {
      stopWatchingLocation();
    };
  }, [stopWatchingLocation]);

  return [
    state,
    {
      getCurrentLocation,
      getAddressFromLocation,
      watchLocation,
      stopWatchingLocation,
    },
  ];
}
