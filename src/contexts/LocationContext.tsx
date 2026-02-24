import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
  LocationService,
  GeoCoordinates,
  Store,
  MAX_PROXIMITY_RADIUS,
} from '../services/LocationService';
import { useAuth } from './AuthContext';
import { secureLoggingService } from '../services/SecureLoggingService';

interface LocationContextProps {
  currentLocation: GeoCoordinates | null;
  currentAddress: string | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  nearbyStores: Store[];
  isLoadingStores: boolean;
  isProximityEnabled: boolean;
  updateLocation: () => Promise<void>;
  setProximityEnabled: (enabled: boolean) => void;
  findNearbyStores: (radius?: number) => Promise<Store[]>;
  findStoresWithProduct: (productId: string, radius?: number) => Promise<Store[]>;
}

const LocationContext = createContext<LocationContextProps>({} as LocationContextProps);

export const useLocation = () => useContext(LocationContext);

interface LocationProviderProps {
  children: ReactNode;
}

export const LocationProvider: React.FC<LocationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const locationService = new LocationService();

  const [currentLocation, setCurrentLocation] = useState<GeoCoordinates | null>(null);
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isProximityEnabled, setProximityEnabled] = useState<boolean>(true);
  const [nearbyStores, setNearbyStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState<boolean>(false);

  // Atualiza a localização atual
  const updateLocation = async (): Promise<void> => {
    try {
      setIsLoadingLocation(true);
      setLocationError(null);

      const hasPermission = await locationService.requestLocationPermission();
      if (!hasPermission) {
        setLocationError('Permissão de localização não concedida');
        return;
      }

      const location = await locationService.getCurrentLocation();
      if (!location) {
        setLocationError('Não foi possível obter sua localização');
        return;
      }

      setCurrentLocation(location);

      // Obter endereço a partir das coordenadas
      const address = await locationService.getAddressFromCoordinates(location);
      setCurrentAddress(address);

      // Salvar a localização do usuário se estiver autenticado
      if (user) {
        await locationService.saveUserLocation(user.id, location);
      }

      // Buscar lojas próximas automaticamente
      if (isProximityEnabled) {
        await findNearbyStores();
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro ao atualizar localização';
      setLocationError(errorMsg);
      loggingService.error('Erro ao atualizar localização', { error });

      Alert.alert(
        'Erro de localização',
        'Não foi possível obter sua localização atual. Verifique se o GPS está ativo e se o app tem permissão para acessar sua localização.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Busca lojas próximas à localização atual
  const findNearbyStores = async (radius?: number): Promise<Store[]> => {
    if (!currentLocation) {
      return [];
    }

    try {
      setIsLoadingStores(true);
      const stores = await locationService.getNearbyStores(
        currentLocation,
        radius || MAX_PROXIMITY_RADIUS
      );
      setNearbyStores(stores);
      return stores;
    } catch (error) {
      loggingService.error('Erro ao buscar lojas próximas', { error });
      return [];
    } finally {
      setIsLoadingStores(false);
    }
  };

  // Busca lojas próximas que têm o produto disponível
  const findStoresWithProduct = async (productId: string, radius?: number): Promise<Store[]> => {
    if (!currentLocation) {
      return [];
    }

    try {
      setIsLoadingStores(true);
      return await locationService.getStoresWithProduct(
        currentLocation,
        productId,
        radius || MAX_PROXIMITY_RADIUS
      );
    } catch (error) {
      loggingService.error('Erro ao buscar lojas com produto', { productId, error });
      return [];
    } finally {
      setIsLoadingStores(false);
    }
  };

  // Atualiza a localização quando o componente é montado
  useEffect(() => {
    updateLocation();
  }, []);

  // Atualiza as lojas próximas quando a configuração de proximidade muda
  useEffect(() => {
    if (currentLocation && isProximityEnabled) {
      findNearbyStores();
    } else if (!isProximityEnabled) {
      setNearbyStores([]);
    }
  }, [isProximityEnabled, currentLocation]);

  return (
    <LocationContext.Provider
      value={{
        currentLocation,
        currentAddress,
        isLoadingLocation,
        locationError,
        nearbyStores,
        isLoadingStores,
        isProximityEnabled,
        updateLocation,
        setProximityEnabled,
        findNearbyStores,
        findStoresWithProduct,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
