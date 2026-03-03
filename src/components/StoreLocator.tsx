import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Text,
  RefreshControl,
  Switch,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { useLocation } from '../contexts/LocationContext';
import { Store } from '../services/LocationService';
import { loggingService } from '../services/LoggingService';

interface StoreLocatorProps {
  onSelectStore?: (store: Store) => void;
  productId?: string; // Opcional: filtrar apenas lojas que têm um produto específico
}

export const StoreLocator: React.FC<StoreLocatorProps> = ({ onSelectStore, productId }) => {
  const theme = useTheme();
  const {
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
  } = useLocation();

  const [refreshing, setRefreshing] = useState(false);

  // Atualiza a lista de lojas
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await updateLocation();

      if (currentLocation) {
        if (productId) {
          await findStoresWithProduct(productId);
        } else {
          await findNearbyStores();
        }
      }
    } catch (error) {
      loggingService.error('Erro ao atualizar lista de lojas', { error });
    } finally {
      setRefreshing(false);
    }
  };

  // Renderiza cada loja na lista
  const renderStoreItem = ({ item }: { item: Store }) => {
    return (
      <TouchableOpacity
        style={styles.storeItem}
        onPress={() => onSelectStore && onSelectStore(item)}
      >
        <View style={styles.storeIcon}>
          <Text style={styles.storeIconText}>{item.name.substring(0, 1).toUpperCase()}</Text>
        </View>

        <View style={styles.storeInfo}>
          <Text style={styles.storeName}>{item.name}</Text>
          <Text style={styles.storeAddress}>{item.address}</Text>

          <View style={styles.storeDetails}>
            <Text style={styles.storeDistance}>
              {item.distance ? `${item.distance} km de distância` : 'Distância não disponível'}
            </Text>

            {item.estimatedDeliveryTime && (
              <Text style={styles.deliveryTime}>
                {item.estimatedDeliveryTime.min}-{item.estimatedDeliveryTime.max} min
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderiza mensagem quando não há lojas próximas
  const renderEmptyList = () => {
    if (isLoadingStores) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.emptyText}>Buscando lojas próximas...</Text>
        </View>
      );
    }

    if (locationError) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{locationError}</Text>
          <TouchableOpacity
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={updateLocation}
          >
            <Text style={styles.retryButtonText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (!isProximityEnabled) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Ative o filtro de proximidade para visualizar lojas próximas.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          Não encontramos lojas num raio de 15km da sua localização.
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleRefresh}
        >
          <Text style={styles.retryButtonText}>Atualizar</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.addressContainer}>
          <Text style={styles.addressLabel}>Sua localização</Text>
          <Text style={styles.addressText}>{currentAddress || 'Localização não disponível'}</Text>
        </View>

        <TouchableOpacity style={styles.refreshButton} onPress={updateLocation}>
          <Text style={[styles.refreshButtonText, { color: theme.colors.primary }]}>Atualizar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterTextContainer}>
          <Text style={styles.filterTitle}>Mostrar lojas próximas (15km)</Text>
          <Text style={styles.filterSubtitle}>
            {nearbyStores.length}{' '}
            {nearbyStores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
          </Text>
        </View>

        <Switch
          value={isProximityEnabled}
          onValueChange={setProximityEnabled}
          trackColor={{ false: '#767577', true: theme.colors.primaryContainer }}
          thumbColor={isProximityEnabled ? theme.colors.primary : '#f4f3f4'}
        />
      </View>

      <FlatList
        data={nearbyStores}
        renderItem={renderStoreItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  addressContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  refreshButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  filterTextContainer: {
    flex: 1,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  filterSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  listContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  storeItem: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  storeIconText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  storeAddress: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 6,
  },
  storeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeDistance: {
    fontSize: 12,
    color: '#757575',
  },
  deliveryTime: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#757575',
    marginTop: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#d32f2f',
    marginTop: 8,
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});
