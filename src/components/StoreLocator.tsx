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
import { useLocation } from '../contexts/LocationContext';
import { Store } from '../services/LocationService';
import { loggingService } from '../services/LoggingService';

import { useAppTheme } from './ThemeProvider';

interface StoreLocatorProps {
  onSelectStore?: (store: Store) => void;
  productId?: string; // Opcional: filtrar apenas lojas que têm um produto específico
}

export const StoreLocator: React.FC<StoreLocatorProps> = ({ onSelectStore, productId }) => {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const {
    currentLocation,
    currentAddress,
    isLoadingLocation: _isLoadingLocation,
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

  // Atualiza as lojas próximas quando a configuração de proximidade muda
  React.useEffect(() => {
    if (currentLocation && isProximityEnabled) {
      findNearbyStores(undefined);
    }
  }, [isProximityEnabled, currentLocation]);

  // Atualiza a lista de lojas
  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await updateLocation();

      if (currentLocation) {
        if (productId) {
          await findStoresWithProduct(productId);
        } else {
          // Find all stores, not just open ones, so users can see all nearby options
          await findNearbyStores(undefined);
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
        style={[styles.storeItem, !item.isOpen && styles.storeItemClosed]}
        onPress={() => onSelectStore && onSelectStore(item)}
      >
        <View style={[styles.storeIcon, !item.isOpen && styles.storeIconClosed]}>
          <Text style={styles.storeIconText}>{item.name.substring(0, 1).toUpperCase()}</Text>
        </View>

        <View style={styles.storeInfo}>
          <View style={styles.storeNameContainer}>
            <Text style={styles.storeName}>{item.name}</Text>
            {!item.isOpen && (
              <View style={styles.closedBadge}>
                <Text style={styles.closedBadgeText}>Fechado</Text>
              </View>
            )}
          </View>
          <Text style={styles.storeAddress}>{item.address}</Text>

          <View style={styles.storeDetails}>
            <Text style={styles.storeDistance}>
              {item.distance ? `${item.distance} km de distância` : 'Distância não disponível'}
            </Text>

            {item.estimatedDeliveryTime && item.isOpen && (
              <Text style={styles.deliveryTime}>
                Preparo: {item.estimatedDeliveryTime.min}-{item.estimatedDeliveryTime.max} min
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
          trackColor={{ false: '#767577', true: theme.colors.primary + '80' }}
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

const createStyles = (theme: { colors: any }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  addressContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterTextContainer: {
    flex: 1,
  },
  filterTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text.primary,
  },
  filterSubtitle: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  listContent: {
    flexGrow: 1,
  },
  storeItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  storeItemClosed: {
    opacity: 0.6,
  },
  storeIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  storeIconClosed: {
    backgroundColor: theme.colors.disabled,
  },
  storeIconText: {
    color: theme.colors.surface,
    fontSize: 24,
    fontWeight: 'bold',
  },
  storeInfo: {
    flex: 1,
  },
  storeNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
    flex: 1,
  },
  closedBadge: {
    backgroundColor: theme.colors.error,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  closedBadgeText: {
    color: theme.colors.surface,
    fontSize: 10,
    fontWeight: 'bold',
  },
  storeAddress: {
    fontSize: 14,
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  storeDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  storeDistance: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  deliveryTime: {
    fontSize: 12,
    color: theme.colors.text.secondary,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: theme.colors.text.secondary,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 24,
  },
  errorText: {
    fontSize: 16,
    color: theme.colors.error,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
});
