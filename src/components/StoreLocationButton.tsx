import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useLocation } from '../contexts/LocationContext';

interface StoreLocationButtonProps {
  productId?: string;
  label?: string;
  style?: object;
  compact?: boolean;
}

export const StoreLocationButton: React.FC<StoreLocationButtonProps> = ({
  productId,
  label = 'Lojas próximas',
  style,
  compact = false,
}) => {
  const navigation = useNavigation();
  const { currentAddress, isLoadingLocation, nearbyStores } = useLocation();

  const handlePress = () => {
    navigation.navigate(
      'StoreList' as never,
      {
        productId,
        title: productId ? 'Lojas com este produto' : 'Lojas próximas',
      } as never
    );
  };

  return (
    <TouchableOpacity
      style={[styles.container, compact ? styles.compactContainer : null, style]}
      onPress={handlePress}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>📍</Text>
      </View>

      <View style={styles.textContainer}>
        <Text style={[styles.label, compact ? styles.compactLabel : null]}>{label}</Text>

        {!compact && (
          <Text style={styles.subtitle} numberOfLines={1}>
            {isLoadingLocation
              ? 'Buscando sua localização...'
              : currentAddress
                ? `${nearbyStores.length} lojas num raio de 15km`
                : 'Toque para buscar lojas próximas'}
          </Text>
        )}
      </View>

      {isLoadingLocation && (
        <ActivityIndicator size="small" color="#FF69B4" style={styles.loader} />
      )}

      {!isLoadingLocation && !compact && <Text style={styles.arrowIcon}>›</Text>}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F5',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#FFE4E1',
  },
  compactContainer: {
    padding: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  textContainer: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF69B4',
    marginBottom: 2,
  },
  compactLabel: {
    fontSize: 14,
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 12,
    color: '#888',
  },
  loader: {
    marginLeft: 8,
  },
  arrowIcon: {
    fontSize: 24,
    color: '#FF69B4',
    marginLeft: 8,
  },
});
