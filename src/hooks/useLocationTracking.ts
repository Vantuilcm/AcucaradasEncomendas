import { useState, useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { loggingService } from '../services/LoggingService';

export function useLocationTracking(driverId: string | undefined, isActive: boolean) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const subscriptionRef = useRef<Location.LocationSubscription | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function startTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permissão de localização negada');
          return;
        }

        const driverService = DeliveryDriverService.getInstance();

        subscriptionRef.current = await Location.watchPositionAsync(
                  {
                    accuracy: Location.Accuracy.BestForNavigation,
                    timeInterval: 3000, // 3 segundos para maior fluidez no mapa
                    distanceInterval: 2, // 2 metros
                  },
                  async (newLocation) => {
            if (!isMounted) return;
            setLocation(newLocation);

            if (driverId) {
              try {
                await driverService.updateDriverLocation(
                  driverId,
                  newLocation.coords.latitude,
                  newLocation.coords.longitude
                );
              } catch (err) {
                loggingService.error('Erro ao atualizar localização no Firestore', err as Error);
              }
            }
          }
        );
      } catch (err) {
        if (isMounted) {
          setErrorMsg('Erro ao iniciar rastreamento de localização');
          loggingService.error('Erro no hook useLocationTracking', err as Error);
        }
      }
    }

    if (isActive && driverId) {
      startTracking();
    } else {
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    }

    return () => {
      isMounted = false;
      if (subscriptionRef.current) {
        subscriptionRef.current.remove();
        subscriptionRef.current = null;
      }
    };
  }, [driverId, isActive]);

  return { location, errorMsg };
}
