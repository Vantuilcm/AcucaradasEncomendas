import React from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Appbar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StoreLocator } from '../components/StoreLocator';
import { useLocation } from '../contexts/LocationContext';
import { Store } from '../services/LocationService';
import { loggingService } from '../services/LoggingService';

interface RouteParams {
  productId?: string;
  title?: string;
}

export function StoreListScreen() {
  // Cast navigation to any to avoid overly strict generic constraints during navigate calls
  const navigation = useNavigation<any>() as any;
  const route = useRoute();
  const { productId, title } = (route.params as RouteParams) || {};
  const { setProximityEnabled, isProximityEnabled } = useLocation();

  // Lidar com a seleção de uma loja
  const handleStoreSelect = (store: Store) => {
    navigation.navigate('StoreFront', {
      storeId: store.id,
      storeName: store.name,
      storeLogoUrl: store.logoUrl,
      storeBannerUrl: store.bannerUrl,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Appbar.Header style={styles.header} statusBarHeight={0}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title || 'Lojas próximas'} />
        <Appbar.Action
          icon="filter-variant"
          onPress={() => setProximityEnabled(!isProximityEnabled)}
        />
      </Appbar.Header>

      <View style={styles.content}>
        <StoreLocator onSelectStore={handleStoreSelect} productId={productId} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: '#fff',
    elevation: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  content: {
    flex: 1,
  },
});
