import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import {
  Text,
  Card,
  Avatar,
  IconButton,
  Button,
  Portal,
  Modal,
  List,
  useTheme,
  Divider,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver, DriverDailyRoute } from '../types/DeliveryDriver';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

const { width, height } = Dimensions.get('window');

export default function AdminDeliveryMonitoringScreen() {
  const theme = useTheme();
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<DeliveryDriver | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<DriverDailyRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const service = DeliveryDriverService.getInstance();
    const unsub = service.subscribeToActiveDrivers((updatedDrivers) => {
      setDrivers(updatedDrivers);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSelectDriver = async (driver: DeliveryDriver) => {
    setSelectedDriver(driver);
    setLoadingRoute(true);
    
    try {
      const service = DeliveryDriverService.getInstance();
      const today = new Date().toISOString().split('T')[0];
      const route = await service.getDriverRoute(driver.id, today);
      setSelectedRoute(route);

      if (driver.location) {
        mapRef.current?.animateToRegion({
          latitude: driver.location.latitude,
          longitude: driver.location.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    } catch (error) {
      logger.error('Erro ao carregar rota:', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoadingRoute(false);
    }
  };

  const renderDriverMarker = (driver: DeliveryDriver) => {
    if (!driver.location) return null;

    return (
      <Marker
        key={driver.id}
        coordinate={{
          latitude: driver.location.latitude,
          longitude: driver.location.longitude,
        }}
        title={driver.name}
        description={driver.availability.isAvailable ? 'Disponível' : 'Em Entrega'}
        onPress={() => handleSelectDriver(driver)}
      >
        <View style={[
          styles.markerContainer, 
          { backgroundColor: driver.availability.isAvailable ? '#4CAF50' : '#FF9800' }
        ]}>
          <MaterialCommunityIcons 
            name={driver.vehicle.type === 'motorcycle' ? 'bike' : 'car'} 
            size={20} 
            color="white" 
          />
        </View>
      </Marker>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando entregadores ativos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          initialRegion={{
            latitude: -23.55052,
            longitude: -46.633309,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        >
          {drivers.map(renderDriverMarker)}
          
          {selectedRoute && selectedRoute.points.length > 1 && (
            <Polyline
              coordinates={selectedRoute.points.map(p => ({
                latitude: p.latitude,
                longitude: p.longitude,
              }))}
              strokeColor={theme.colors.primary}
              strokeWidth={3}
            />
          )}
        </MapView>

        {/* Driver List Overlay */}
        <View style={styles.listOverlay}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {drivers.map(driver => (
              <TouchableOpacity
                key={driver.id}
                onPress={() => handleSelectDriver(driver)}
              >
                <Card style={[
                  styles.driverCard,
                  selectedDriver?.id === driver.id && { borderColor: theme.colors.primary, borderWidth: 2 }
                ]}>
                  <Card.Content style={styles.driverCardContent}>
                    <Avatar.Text 
                      size={40} 
                      label={driver.name.substring(0, 2).toUpperCase()} 
                    />
                    <View style={styles.driverCardInfo}>
                      <Text variant="labelLarge" numberOfLines={1}>{driver.name}</Text>
                      <View style={styles.statusBadge}>
                        <View style={[
                          styles.statusDot, 
                          { backgroundColor: driver.availability.isAvailable ? '#4CAF50' : '#FF9800' }
                        ]} />
                        <Text variant="labelSmall">
                          {driver.availability.isAvailable ? 'Disponível' : 'Ocupado'}
                        </Text>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Selected Driver Info Overlay */}
        {selectedDriver && (
          <View style={styles.driverDetailsOverlay}>
            <Card style={styles.detailsCard}>
              <Card.Content>
                <View style={styles.detailsHeader}>
                  <View>
                    <Text variant="titleLarge">{selectedDriver.name}</Text>
                    <Text variant="bodySmall">{selectedDriver.vehicle.brand} {selectedDriver.vehicle.model} - {selectedDriver.vehicle.plate}</Text>
                  </View>
                  <IconButton 
                    icon="close" 
                    onPress={() => {
                      setSelectedDriver(null);
                      setSelectedRoute(null);
                    }} 
                  />
                </View>
                
                <Divider style={styles.divider} />
                
                <View style={styles.detailsStats}>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="map-marker-distance" size={20} color="#666" />
                    <Text variant="bodyMedium"> {selectedRoute?.totalDistanceKm.toFixed(2) || '0.00'} km hoje</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <MaterialCommunityIcons name="clock-outline" size={20} color="#666" />
                    <Text variant="bodyMedium"> Última att: {selectedDriver.location ? new Date(selectedDriver.location.lastUpdate).toLocaleTimeString() : '--:--'}</Text>
                  </View>
                </View>

                {loadingRoute && (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginTop: 8 }} />
                )}

                <Button 
                  mode="contained" 
                  onPress={() => {/* No futuro: Abrir chat ou ligar */}}
                  style={styles.actionButton}
                >
                  Contactar Entregador
                </Button>
              </Card.Content>
            </Card>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

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
    marginTop: 16,
    color: '#666',
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    width: width,
    height: height,
  },
  markerContainer: {
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'white',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  listOverlay: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
  },
  driverCard: {
    width: 160,
    marginRight: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  driverCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  driverCardInfo: {
    marginLeft: 10,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  driverDetailsOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
  },
  detailsCard: {
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    elevation: 8,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: {
    marginVertical: 12,
  },
  detailsStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    borderRadius: 8,
  },
});
