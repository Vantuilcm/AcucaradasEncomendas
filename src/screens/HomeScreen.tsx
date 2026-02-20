import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, Image } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../hooks/useOrders';
import { OrderCard } from '../components/OrderCard';
import { ErrorMessage } from '../components/ErrorMessage';
import { SkeletonList } from '../components/base/SkeletonLoading';
import { ProductService } from '../services/ProductService';
import { Product } from '../types/Product';
import { useLocation } from '../contexts/LocationContext';
import { StoreLocationButton } from '../components/StoreLocationButton';
import { loggingService } from '../services/LoggingService';
import { formatCurrency } from '../utils/formatters';

export function HomeScreen() {
  // Relax navigation typing to avoid TS 'never' errors while routes are being aligned
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { orders, loading, error, refreshOrders } = useOrders();
  const { updateLocation } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);

  const handleNewOrder = () => {
    // Navigate to Catalog to start a new order
    navigation.navigate('Catalog');
  };

  const handleOrderPress = (orderId: string) => {
  navigation.navigate('OrderDetails', { orderId });
  };

  const loadProducts = async () => {
    try {
      const productService = new ProductService();
      const products = await productService.getFeaturedProducts(10);
      setFeaturedProducts(products);
    } catch (error) {
      loggingService.error('Erro ao carregar produtos destacados', { error });
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([updateLocation(), loadProducts()]);
    } catch (error) {
      loggingService.error('Erro ao atualizar a tela inicial', { error });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProducts();
    updateLocation();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="home-screen">
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#FF69B4']} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Açucaradas Encomendas
          </Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Deliciosas sobremesas artesanais perto de você
          </Text>
        </View>

        <View style={styles.locationSection}>
          <StoreLocationButton />
        </View>

        <View style={styles.featuredSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Produtos Destacados
          </Text>

          <View style={styles.productsGrid}>
            {loading ? (
              <Text>Carregando produtos...</Text>
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map(product => (
                <View key={product.id} style={styles.productCard}>
                  <Image
                    source={{
                      uri:
                        Array.isArray(product.imagens) && product.imagens.length > 0
                          ? product.imagens[0]
                          : 'https://via.placeholder.com/300x200?text=Produto',
                    }}
                    style={styles.productImage}
                    resizeMode="cover"
                  />
                  <Text variant="bodyMedium" style={styles.productName} numberOfLines={2}>
                    {product.nome}
                  </Text>
                  <Text variant="bodySmall" style={styles.productPrice}>
                    {formatCurrency(product.preco)}
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => navigation.navigate('ProductDetails', { productId: product.id })}
                  >
                    Ver
                  </Button>
                </View>
              ))
            ) : (
              <Text>Nenhum produto destacado no momento.</Text>
            )}
          </View>
        </View>

        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            onPress={() => {
              if (user) {
                navigation.navigate('Orders');
              } else {
                navigation.navigate('Login');
              }
            }}
            style={styles.button}
          >
            {user ? 'Meus Pedidos' : 'Entrar'}
          </Button>

          <Button mode="outlined" onPress={() => navigation.navigate('Cart')} style={styles.button} testID="carrinho-button">
            Carrinho
          </Button>

          <Button mode="outlined" onPress={() => navigation.navigate('Catalog')} style={styles.button} testID="produtos-button">
            Produtos
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 12,
  },
  title: {
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 4,
  },
  subtitle: {
    color: '#777',
  },
  locationSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  featuredSection: {
    padding: 20,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#eee',
  },
  productName: {
    marginBottom: 4,
  },
  productPrice: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  actionButtons: {
    padding: 20,
    marginBottom: 20,
  },
  button: {
    marginBottom: 12,
  },
});
