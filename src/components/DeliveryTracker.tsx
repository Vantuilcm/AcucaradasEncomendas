import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, ActivityIndicator, Text } from 'react-native';
import { useTheme, Button } from 'react-native-paper';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { FontAwesome5 } from '@expo/vector-icons';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

interface DeliveryTrackerProps {
  orderId: string;
  deliveryPersonId?: string;
  deliveryAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  storeAddress: {
    latitude: number;
    longitude: number;
    address: string;
  };
  onClose?: () => void;
}

type LocationData = {
  latitude: number;
  longitude: number;
  timestamp: number;
};

const { width, height } = Dimensions.get('window');
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.0922;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

export const DeliveryTracker = ({
  orderId,
  deliveryPersonId,
  deliveryAddress,
  storeAddress,
  onClose,
}: DeliveryTrackerProps) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<LocationData | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [mapRegion, setMapRegion] = useState({
    latitude: (deliveryAddress.latitude + storeAddress.latitude) / 2,
    longitude: (deliveryAddress.longitude + storeAddress.longitude) / 2,
    latitudeDelta: LATITUDE_DELTA,
    longitudeDelta: LONGITUDE_DELTA,
  });

  const [retryCount, setRetryCount] = useState(0);

  // Calcular distância entre dois pontos utilizando a fórmula de Haversine
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Raio da Terra em km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distância em km
    return distance;
  };

  // Escutar localização real do entregador no Firestore
  useEffect(() => {
    if (!deliveryPersonId) {
      setError('ID do entregador não fornecido.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const driverRef = doc(db, 'deliveryDrivers', deliveryPersonId);

    const unsubscribe = onSnapshot(driverRef, (docSnap: any) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.location) {
          const newLoc = {
            latitude: data.location.latitude,
            longitude: data.location.longitude,
            timestamp: data.location.lastUpdate ? new Date(data.location.lastUpdate).getTime() : Date.now(),
          };
          setCurrentLocation(newLoc);

          // Calcular tempo estimado real
          const distance = calculateDistance(
            newLoc.latitude,
            newLoc.longitude,
            deliveryAddress.latitude,
            deliveryAddress.longitude
          );

          // Estimar tempo com base na distância (média de 30km/h)
          const timeInMinutes = Math.round((distance / 30) * 60);
          setEstimatedTime(timeInMinutes);
          
          // Centralizar mapa se for a primeira vez ou se o entregador se moveu muito
          // (Opcional: você pode querer que o usuário controle o zoom)
        } else {
          setError('Localização do entregador ainda não disponível.');
        }
      } else {
        setError('Entregador não encontrado.');
      }
      setLoading(false);
    }, (err: any) => {
      logger.error('Erro ao escutar localização:', err instanceof Error ? err : new Error(String(err)));
      setError('Erro ao conectar com o rastreamento.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [deliveryPersonId, deliveryAddress, retryCount]);

  return (
    <View style={styles.container}>
      {loading && !currentLocation ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Localizando entregador...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={() => setRetryCount(prev => prev + 1)} style={styles.retryButton}>
            Tentar Novamente
          </Button>
        </View>
      ) : (
        <View style={styles.content}>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={mapRegion}
            showsUserLocation={false}
            showsMyLocationButton={false}
            showsCompass={true}
            showsScale={true}
          >
            {/* Marcador da loja */}
            <Marker
              coordinate={{
                latitude: storeAddress.latitude,
                longitude: storeAddress.longitude,
              }}
              title="Loja"
              description={storeAddress.address}
            >
              <View style={[styles.markerStore, { backgroundColor: theme.colors.primary }]}>
                <FontAwesome5 name="store" size={16} color="#fff" />
              </View>
            </Marker>

            {/* Marcador do destino */}
            <Marker
              coordinate={{
                latitude: deliveryAddress.latitude,
                longitude: deliveryAddress.longitude,
              }}
              title="Destino"
              description={deliveryAddress.address}
            >
              <View style={[styles.markerDestination, { backgroundColor: theme.colors.secondary }]}>
                <FontAwesome5 name="home" size={16} color="#fff" />
              </View>
            </Marker>

            {/* Marcador do entregador */}
            {currentLocation && (
              <Marker
                coordinate={{
                  latitude: currentLocation.latitude,
                  longitude: currentLocation.longitude,
                }}
                title="Entregador"
              >
                <View style={[styles.markerDelivery, { backgroundColor: theme.colors.error }]}>
                  <FontAwesome5 name="motorcycle" size={16} color="#fff" />
                </View>
              </Marker>
            )}

            {/* Linha entre entregador e destino */}
            {currentLocation && (
              <Polyline
                coordinates={[
                  {
                    latitude: currentLocation.latitude,
                    longitude: currentLocation.longitude,
                  },
                  {
                    latitude: deliveryAddress.latitude,
                    longitude: deliveryAddress.longitude,
                  },
                ]}
                strokeColor={theme.colors.primary}
                strokeWidth={3}
                lineDashPattern={[1, 3]}
              />
            )}
          </MapView>

          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Status da Entrega</Text>

            {estimatedTime && (
              <View style={styles.infoRow}>
                <FontAwesome5 name="clock" size={16} color={theme.colors.primary} />
                <Text style={styles.infoText}>
                  Tempo estimado: {estimatedTime} {estimatedTime === 1 ? 'minuto' : 'minutos'}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <FontAwesome5 name="motorcycle" size={16} color={theme.colors.primary} />
              <Text style={styles.infoText}>O entregador está a caminho!</Text>
            </View>

            <Button
              mode="contained"
              onPress={onClose}
              style={[styles.closeButton, { backgroundColor: theme.colors.primary }]}
            >
              Fechar Mapa
            </Button>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginBottom: 16,
    fontSize: 16,
    textAlign: 'center',
    color: 'tomato',
  },
  retryButton: {
    marginTop: 16,
  },
  content: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 5,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 16,
    marginLeft: 8,
  },
  closeButton: {
    marginTop: 16,
  },
  markerStore: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDestination: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerDelivery: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
