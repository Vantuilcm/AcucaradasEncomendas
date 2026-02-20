import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Text, Card, Avatar, useTheme, IconButton, Chip, List, Button, Divider } from 'react-native-paper';
import MapView, { Marker, Polyline, Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { Order } from '../types/Order';
import { DemandHotspot } from '../types/DemandHotspot';
import { useNavigation } from '@react-navigation/native';
import { RouteService } from '../services/RouteService';
import { GeoCoordinates } from '../services/LocationService';
import { OrderService } from '../services/OrderService';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  QuerySnapshot,
  DocumentData,
  DocumentSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';

const { width, height } = Dimensions.get('window');

const STORE_LOCATION = {
  latitude: -23.55052,
  longitude: -46.633309,
  address: 'Sede Açucaradas'
};

export default function AdminRealTimeMonitoringScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [hotspots, setHotspots] = useState<DemandHotspot[]>([]);
  const [selectedItem, setSelectedItem] = useState<{ type: 'driver' | 'order' | 'hotspot'; data: any } | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [isFollowing, setIsFollowing] = useState(true);
  const [showRoute, setShowRoute] = useState(true);
  const [focusedRoutePoints, setFocusedRoutePoints] = useState<GeoCoordinates[]>([]);
  const mapRef = useRef<MapView>(null);
  
  const routeService = new RouteService();
  const orderService = new OrderService();
  const driverService = DeliveryDriverService.getInstance();

  const fitMap = (forceCoordinates?: { latitude: number; longitude: number }[]) => {
    const coordsToFit = forceCoordinates || [
      STORE_LOCATION,
      ...drivers.filter(d => d.location).map(d => ({
        latitude: d.location!.latitude,
        longitude: d.location!.longitude,
      })),
      ...activeOrders.filter(o => o.deliveryAddress?.coordinates).map(o => ({
        latitude: o.deliveryAddress!.coordinates!.latitude,
        longitude: o.deliveryAddress!.coordinates!.longitude,
      })),
    ];

    if (coordsToFit.length > 1 && mapRef.current) {
      mapRef.current.fitToCoordinates(coordsToFit, {
        edgePadding: { top: 80, right: 50, bottom: 150, left: 50 },
        animated: true,
      });
    }
  };

  const focusOnItem = async (item: { type: 'driver' | 'order'; data: any }) => {
    setSelectedItem(item);
    setIsFollowing(false);
    setFocusedRoutePoints([]);

    let coords: { latitude: number; longitude: number }[] = [];
    let routeStart: GeoCoordinates | null = null;
    let routeEnd: GeoCoordinates | null = null;

    if (item.type === 'driver') {
      const driver = item.data as DeliveryDriver;
      if (driver.location) {
        coords.push({ latitude: driver.location.latitude, longitude: driver.location.longitude });
        
        const activeOrder = activeOrders.find(o => o.deliveryDriver?.id === driver.id);
        if (activeOrder?.deliveryAddress?.coordinates) {
          const orderCoords = { 
            latitude: activeOrder.deliveryAddress.coordinates.latitude, 
            longitude: activeOrder.deliveryAddress.coordinates.longitude 
          };
          coords.push(orderCoords);
          coords.push(STORE_LOCATION);

          routeStart = { latitude: driver.location.latitude, longitude: driver.location.longitude };
          routeEnd = activeOrder.status === 'delivering' ? orderCoords : STORE_LOCATION;
        }
      }
    } else {
      const order = item.data as Order;
      if (order.deliveryAddress?.coordinates) {
        const orderCoords = { 
          latitude: order.deliveryAddress.coordinates.latitude, 
          longitude: order.deliveryAddress.coordinates.longitude 
        };
        coords.push(orderCoords);
        coords.push(STORE_LOCATION);
        
        const assignedDriver = drivers.find(d => d.id === order.deliveryDriver?.id);
        if (assignedDriver?.location) {
          const driverCoords = { 
            latitude: assignedDriver.location.latitude, 
            longitude: assignedDriver.location.longitude 
          };
          coords.push(driverCoords);
          
          routeStart = driverCoords;
          routeEnd = order.status === 'delivering' ? orderCoords : STORE_LOCATION;
        } else {
          routeStart = STORE_LOCATION;
          routeEnd = orderCoords;
        }
      }
    }

    if (coords.length > 0) {
      fitMap(coords);
    }

    // Buscar rota detalhada se houver origem e destino
    if (routeStart && routeEnd) {
      const points = await routeService.getRoutePoints(routeStart, routeEnd);
      if (points) {
        setFocusedRoutePoints(points);
      }
    }
  };

  useEffect(() => {
    if (viewMode === 'map' && isFollowing) {
      fitMap();
    }
  }, [drivers, activeOrders, viewMode, isFollowing]);

  useEffect(() => {
    // Monitorar entregadores ativos
    const unsubDrivers = driverService.subscribeToActiveDrivers((driversData) => {
      setDrivers(driversData);
    });

    // Monitorar pedidos em entrega ou prontos
    const unsubOrders = orderService.subscribeToActiveOrders((ordersData) => {
      // Filtrar para mostrar apenas os em entrega ou prontos para coleta
      const relevantOrders = ordersData.filter(o => ['delivering', 'ready'].includes(o.status));
      setActiveOrders(relevantOrders);
    });

    // Monitorar Hotspots de Demanda
    const hotspotsRef = collection(db, 'demand_hotspots');
    const qHotspots = query(hotspotsRef, where('active', '==', true));
    const unsubHotspots = onSnapshot(qHotspots, (snapshot: QuerySnapshot<DocumentData>) => {
      const hotspotsData = snapshot.docs.map((doc: DocumentSnapshot<DocumentData>) => ({
        id: doc.id,
        ...doc.data()
      } as DemandHotspot));
      setHotspots(hotspotsData);
    });

    return () => {
      unsubDrivers();
      unsubOrders();
      unsubHotspots();
    };
  }, []);

  const initialRegion = {
    latitude: STORE_LOCATION.latitude,
    longitude: STORE_LOCATION.longitude,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  };

  const renderDriverMarker = (driver: DeliveryDriver) => {
    if (!driver.location) return null;

    return (
      <Marker
        key={`driver-${driver.id}`}
        coordinate={{
          latitude: driver.location.latitude,
          longitude: driver.location.longitude,
        }}
        onPress={() => focusOnItem({ type: 'driver', data: driver })}
      >
        <View style={styles.driverMarker}>
          <Avatar.Icon 
            size={30} 
            icon={driver.vehicle.type === 'motorcycle' ? 'bike' : 'car'} 
            style={{ backgroundColor: driver.availability.isAvailable ? theme.colors.primary : theme.colors.error }}
          />
        </View>
      </Marker>
    );
  };

  const renderOrderMarker = (order: Order) => {
    if (!order.deliveryAddress?.coordinates) return null;

    return (
      <Marker
        key={`order-${order.id}`}
        coordinate={{
          latitude: order.deliveryAddress.coordinates.latitude,
          longitude: order.deliveryAddress.coordinates.longitude,
        }}
        onPress={() => focusOnItem({ type: 'order', data: order })}
      >
        <View style={styles.orderMarker}>
          <Avatar.Icon 
            size={24} 
            icon="package-variant" 
            style={{ backgroundColor: order.status === 'delivering' ? theme.colors.secondary : theme.colors.tertiary }}
          />
        </View>
      </Marker>
    );
  };

  const renderHotspot = (hotspot: DemandHotspot) => {
    const color = hotspot.demandLevel === 'critical' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 152, 0, 0.3)';
    const strokeColor = hotspot.demandLevel === 'critical' ? 'rgba(255, 0, 0, 0.8)' : 'rgba(255, 152, 0, 0.8)';

    return (
      <React.Fragment key={`hotspot-group-${hotspot.id}`}>
        <Circle
          center={{
            latitude: hotspot.center.latitude,
            longitude: hotspot.center.longitude,
          }}
          radius={hotspot.radiusMeters}
          fillColor={color}
          strokeColor={strokeColor}
          strokeWidth={2}
        />
        <Marker
          coordinate={{
            latitude: hotspot.center.latitude,
            longitude: hotspot.center.longitude,
          }}
          onPress={() => setSelectedItem({ type: 'hotspot', data: hotspot })}
        >
          <View style={styles.hotspotMarker}>
            <Avatar.Icon 
              size={20} 
              icon="fire" 
              style={{ backgroundColor: strokeColor }} 
            />
          </View>
        </Marker>
      </React.Fragment>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <IconButton icon="arrow-left" onPress={() => navigation.goBack()} />
        <Text variant="titleLarge" style={styles.title}>Monitoramento Real-Time</Text>
        <IconButton 
          icon={viewMode === 'map' ? 'format-list-bulleted' : 'map'} 
          onPress={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} 
        />
      </View>

      <View style={styles.statsBar}>
        <Chip icon="bike" style={styles.chip}>{drivers.filter(d => d.availability.isAvailable).length} Disponíveis</Chip>
        <Chip icon="package-variant" style={styles.chip}>{activeOrders.filter(o => o.status === 'delivering').length} Em Rota</Chip>
        <Chip icon="clock-outline" style={styles.chip}>{activeOrders.filter(o => o.status === 'ready').length} Aguardando Coleta</Chip>
      </View>

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={initialRegion}
            provider={PROVIDER_GOOGLE}
            onPanDrag={() => setIsFollowing(false)}
          >
            {/* Marcador da Loja */}
            <Marker
              coordinate={{
                latitude: STORE_LOCATION.latitude,
                longitude: STORE_LOCATION.longitude,
              }}
              title={STORE_LOCATION.address}
              pinColor={theme.colors.primary}
            >
              <View style={styles.storeMarker}>
                <Avatar.Icon size={32} icon="store" style={{ backgroundColor: theme.colors.primary }} />
              </View>
            </Marker>

            {drivers.map(renderDriverMarker)}
            {activeOrders.map(renderOrderMarker)}
            {hotspots.map(renderHotspot)}

            {/* Polilinhas de Rota Dinâmicas */}
            {showRoute && activeOrders.map(order => {
              if (!order.deliveryAddress?.coordinates) return null;
              
              const assignedDriver = order.deliveryDriver?.id 
                ? drivers.find(d => d.id === order.deliveryDriver!.id)
                : null;

              const orderCoords = {
                latitude: order.deliveryAddress.coordinates.latitude,
                longitude: order.deliveryAddress.coordinates.longitude,
              };

              const routes = [];

              // Se houver um item selecionado, dar destaque para a rota dele
              const isFocused = selectedItem?.type === 'order' && selectedItem.data.id === order.id ||
                               selectedItem?.type === 'driver' && selectedItem.data.id === order.deliveryDriver?.id;

              const opacity = !selectedItem || isFocused ? 1 : 0.2;

              // Se for o item focado e tivermos a rota detalhada (ruas), mostrar ela
              if (isFocused && focusedRoutePoints.length > 0) {
                routes.push(
                  <Polyline
                    key={`focused-route-${order.id}`}
                    coordinates={focusedRoutePoints}
                    strokeColor={order.status === 'delivering' ? "#4CAF50" : "#2196F3"}
                    strokeWidth={6}
                    style={{ opacity }}
                  />
                );
              } else {
                // 1. Rota Original (Loja -> Destino) - Sempre mostrada para pedidos ativos, mas mais suave
                routes.push(
                  <Polyline
                    key={`base-route-${order.id}`}
                    coordinates={[
                      { latitude: STORE_LOCATION.latitude, longitude: STORE_LOCATION.longitude },
                      orderCoords
                    ]}
                    strokeColor={theme.colors.backdrop}
                    strokeWidth={isFocused ? 3 : 2}
                    lineDashPattern={[2, 4]}
                    style={{ opacity }}
                  />
                );

                // 2. Rota do Motorista (Motorista -> Próximo Ponto)
                if (assignedDriver?.location) {
                  const driverCoords = {
                    latitude: assignedDriver.location.latitude,
                    longitude: assignedDriver.location.longitude,
                  };

                  if (order.status === 'delivering') {
                    // Motorista a caminho do cliente
                    routes.push(
                      <Polyline
                        key={`driver-to-customer-${order.id}`}
                        coordinates={[driverCoords, orderCoords]}
                        strokeColor="#4CAF50" // Verde para entrega
                        strokeWidth={isFocused ? 6 : 4}
                        style={{ opacity }}
                      />
                    );
                  } else if (order.status === 'ready') {
                    // Motorista a caminho da loja para coleta
                    routes.push(
                      <Polyline
                        key={`driver-to-store-${order.id}`}
                        coordinates={[
                          driverCoords,
                          { latitude: STORE_LOCATION.latitude, longitude: STORE_LOCATION.longitude }
                        ]}
                        strokeColor="#2196F3" // Azul para coleta
                        strokeWidth={isFocused ? 6 : 4}
                        style={{ opacity }}
                      />
                    );
                  }
                }
              }

              return routes;
            })}
          </MapView>

          {/* Controles do Mapa */}
          <View style={styles.mapControls}>
            <IconButton 
              icon={showRoute ? 'map-marker-distance' : 'map-marker-off'} 
              mode="contained"
              containerColor={showRoute ? theme.colors.tertiary : '#fff'}
              iconColor={showRoute ? '#fff' : theme.colors.tertiary}
              onPress={() => setShowRoute(!showRoute)}
              size={24}
            />
            <IconButton 
              icon={isFollowing ? 'crosshairs-gps' : 'crosshairs'} 
              mode="contained"
              containerColor={isFollowing ? theme.colors.primary : '#fff'}
              iconColor={isFollowing ? '#fff' : theme.colors.primary}
              onPress={() => setIsFollowing(!isFollowing)}
              size={24}
            />
            <IconButton 
              icon="fit-to-screen" 
              mode="contained"
              containerColor="#fff"
              iconColor={theme.colors.primary}
              onPress={() => fitMap()}
              size={24}
            />
          </View>

          {/* Legenda do Mapa */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#4CAF50' }]} />
              <Text variant="bodySmall">A caminho do cliente</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#2196F3' }]} />
              <Text variant="bodySmall">A caminho da coleta</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: theme.colors.backdrop, height: 2, borderStyle: 'dashed', borderWidth: 1 }]} />
              <Text variant="bodySmall">Rota planejada</Text>
            </View>
          </View>

          {selectedItem && (
            <Card style={styles.detailsCard}>
              <Card.Content>
                <View style={styles.detailsHeader}>
                  <Text variant="titleMedium">
                    {selectedItem.type === 'driver' ? selectedItem.data.name : `Pedido #${selectedItem.data.id.slice(-6)}`}
                  </Text>
                  <IconButton icon="close" size={20} onPress={() => setSelectedItem(null)} />
                </View>
                
                {selectedItem.type === 'driver' ? (
                  <View>
                    <Text variant="bodySmall">Veículo: {selectedItem.data.vehicle.model}</Text>
                    <Text variant="bodySmall">Placa: {selectedItem.data.vehicle.plate}</Text>
                    <Button 
                      mode="contained-tonal" 
                      compact 
                      style={styles.detailButton}
                      onPress={() => navigation.navigate('DriverProfile', { driverId: selectedItem.data.id })}
                    >
                      Ver Perfil
                    </Button>
                  </View>
                ) : selectedItem.type === 'order' ? (
                  <View>
                    <Text variant="bodySmall">Status: {selectedItem.data.status}</Text>
                    <Text variant="bodySmall">Cliente: {selectedItem.data.customerName || 'N/A'}</Text>
                    <Button 
                      mode="contained-tonal" 
                      compact 
                      style={styles.detailButton}
                      onPress={() => navigation.navigate('OrderDetails', { orderId: selectedItem.data.id })}
                    >
                      Ver Pedido
                    </Button>
                  </View>
                ) : (
                  <View>
                    <Text variant="bodySmall">Demanda: {selectedItem.data.demandLevel === 'critical' ? 'CRÍTICA' : 'ALTA'}</Text>
                    <Text variant="bodySmall">Raio: {selectedItem.data.radiusMeters}m</Text>
                    <Text variant="bodySmall" style={{ marginTop: 4 }}>{selectedItem.data.message}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          )}
        </View>
      ) : (
        <List.Section style={styles.listContainer}>
          <List.Subheader>Entregadores Ativos</List.Subheader>
          {drivers.map(driver => (
            <List.Item
              key={driver.id}
              title={driver.name}
              description={`${driver.vehicle.model} - ${driver.vehicle.plate}`}
              left={props => <Avatar.Icon {...props} icon="bike" size={40} />}
              right={props => (
                <Chip style={{ height: 30 }}>{driver.availability.isAvailable ? 'Livre' : 'Ocupado'}</Chip>
              )}
              onPress={() => {
                focusOnItem({ type: 'driver', data: driver });
                setViewMode('map');
              }}
            />
          ))}
          
          <List.Subheader>Pedidos em Andamento</List.Subheader>
          {activeOrders.map(order => (
            <List.Item
              key={order.id}
              title={`Pedido #${order.id.slice(-6)}`}
              description={order.status === 'delivering' ? 'Em Entrega' : 'Pronto para Coleta'}
              left={props => <Avatar.Icon {...props} icon="package-variant" size={40} />}
              onPress={() => {
                focusOnItem({ type: 'order', data: order });
                setViewMode('map');
              }}
            />
          ))}

          <List.Subheader>Hotspots de Demanda</List.Subheader>
          {hotspots.map(hotspot => (
            <List.Item
              key={hotspot.id}
              title={hotspot.name}
              description={hotspot.message}
              left={props => <Avatar.Icon {...props} icon="fire" size={40} style={{ backgroundColor: hotspot.demandLevel === 'critical' ? theme.colors.error : theme.colors.primary }} />}
              onPress={() => {
                setSelectedItem({ type: 'hotspot', data: hotspot });
                setViewMode('map');
                if (mapRef.current) {
                  mapRef.current.animateToRegion({
                    latitude: hotspot.center.latitude,
                    longitude: hotspot.center.longitude,
                    latitudeDelta: 0.02,
                    longitudeDelta: 0.02,
                  });
                }
              }}
            />
          ))}
        </List.Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 40,
    paddingHorizontal: 8,
    backgroundColor: '#fff',
    elevation: 4,
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    height: 32,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  listContainer: {
    flex: 1,
  },
  storeMarker: {
    padding: 2,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 8,
    borderWidth: 2,
    borderColor: '#FF69B4', // Cor tema rosa
  },
  driverMarker: {
    padding: 2,
    borderRadius: 20,
    backgroundColor: '#fff',
    elevation: 5,
  },
  orderMarker: {
    padding: 2,
    borderRadius: 15,
    backgroundColor: '#fff',
    elevation: 5,
  },
  hotspotMarker: {
    padding: 0,
  },
  detailsCard: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    elevation: 10,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailButton: {
    marginTop: 8,
  },
  legend: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 8,
    elevation: 5,
    gap: 8,
  },
  mapControls: {
    position: 'absolute',
    bottom: 150,
    right: 20,
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendColor: {
    width: 20,
    height: 4,
    borderRadius: 2,
  },
});
