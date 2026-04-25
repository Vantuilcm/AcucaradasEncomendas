import React, { useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Appbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StoreLocator } from '../components/StoreLocator';
// import { useLocation } from '../contexts/LocationContext';
import { Store } from '../services/LocationService';
import { loggingService } from '../services/LoggingService';

interface RouteParams {
  productId?: string;
  title?: string;
}

export function StoreListScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { productId, title } = (route.params as RouteParams) || {};
  const [proximityEnabled, setProximityEnabled] = useState(false);

  // Lidar com a seleção de uma loja
  const handleStoreSelect = (store: Store) => {
    loggingService.info('Loja selecionada', { storeId: store.id, storeName: store.name });

    // Navegar para a tela de detalhes da loja ou produtos da loja
    if (productId) {
      // Se tiver um productId, navegar para a tela de detalhes do produto na loja específica
      (navigation as any).navigate(
        'ProductDetails',
        {
          productId,
          storeId: store.id,
          storeName: store.name,
        }
      );
    } else {
      // Navegar para a lista de produtos da loja
      (navigation as any).navigate(
        'StoreDetails',
        {
          storeId: store.id,
          storeName: store.name,
        }
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <Appbar.Header style={styles.header} statusBarHeight={0}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title || 'Lojas próximas'} />
        <Appbar.Action icon="filter-variant" onPress={() => setProximityEnabled(!proximityEnabled)} />
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
