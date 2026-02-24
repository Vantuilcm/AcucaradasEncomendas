import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useOrders } from '../hooks/useOrders';
import { OrderCard } from '../components/OrderCard';
import { ErrorMessage } from '../components/ErrorMessage';
import { SkeletonList } from '../components/base/SkeletonLoading';
import { ProductService } from '../services/ProductService';
import { useLocation } from '../contexts/LocationContext';
import { StoreLocationButton } from '../components/StoreLocationButton';
import { loggingService } from '../services/LoggingService';

export function HomeScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { orders, loading, error, refreshOrders } = useOrders();
  const { updateLocation } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState([]);

  const handleNewOrder = () => {
    navigation.navigate('ProductScreen');
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('OrderDetailsScreen', { orderId });
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
    <SafeAreaView style={styles.container} edges={['top']}>
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
                  <Text variant="bodyMedium">{product.name}</Text>
                  <Text variant="bodySmall">{product.price}</Text>
                  <Button
                    mode="contained"
                    onPress={() => navigation.navigate('Product', { productId: product.id })}
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

          <Button mode="outlined" onPress={() => navigation.navigate('Cart')} style={styles.button}>
            Carrinho
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
    padding: 16,
    marginBottom: 16,
  },
  actionButtons: {
    padding: 20,
    marginBottom: 20,
  },
  button: {
    marginBottom: 12,
  },
});
