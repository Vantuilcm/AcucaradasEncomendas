import React, { useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Appbar, Text } from 'react-native-paper';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';
import type { Store } from '../services/LocationService';
import type { Product } from '../types/Product';
import { ProductService } from '../services/ProductService';
import { ProductGrid } from '../components/ProductGrid';

type StoreFrontRouteProp = RouteProp<RootStackParamList, 'StoreFront'>;

export function StoreFrontScreen() {
  const route = useRoute<StoreFrontRouteProp>();
  const navigation = useNavigation<any>();
  const { storeId, storeName, storeLogoUrl, storeBannerUrl } = route.params || {};

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadProducts = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const list = await ProductService.getInstance().listProducts({
        producerId: storeId,
        disponivel: true,
      });
      setProducts(list);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', {
      productId: product.id,
      storeId,
      storeName,
    });
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={storeName || 'Loja'} />
      </Appbar.Header>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <View style={styles.headerCard}>
          {storeBannerUrl ? (
            <Image source={{ uri: storeBannerUrl }} style={styles.bannerImage} />
          ) : (
            <View style={styles.bannerPlaceholder} />
          )}

          <View style={styles.headerOverlay}>
            {storeLogoUrl ? (
              <Image source={{ uri: storeLogoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder} />
            )}
            <Text style={styles.storeTitle}>{storeName}</Text>
          </View>
        </View>

        <View style={styles.productsSection}>
          <Text style={styles.sectionTitle}>Produtos da loja</Text>
          {loading && products.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF69B4" />
            </View>
          ) : (
            <ProductGrid
              products={products}
              loading={loading}
              onRefresh={handleRefresh}
              showSearch={false}
              showCategories={true}
              showAddToCart={true}
              numColumns={2}
              onProductPress={handleProductPress}
              emptyMessage="Nenhum produto cadastrado nesta loja"
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 16,
  },
  headerCard: {
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  bannerImage: {
    width: '100%',
    height: 160,
  },
  bannerPlaceholder: {
    width: '100%',
    height: 160,
    backgroundColor: '#eee',
  },
  headerOverlay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
    backgroundColor: '#fff',
  },
  logoPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 12,
    backgroundColor: '#ddd',
  },
  storeTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  productsSection: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingContainer: {
    paddingVertical: 32,
  },
});

