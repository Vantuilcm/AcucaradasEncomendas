import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, StatusBar, RefreshControl, ActivityIndicator } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { MainTabNavigationProp } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { ProductService } from '../services/ProductService';
import { useLocation } from '../contexts/LocationContext';
import { StoreLocationButton } from '../components/StoreLocationButton';
import { loggingService } from '../services/LoggingService';
import type { Product } from '../types/Product';
import { useAppTheme, type ThemeType } from '../components/ThemeProvider';

export function HomeScreen() {
  const navigation = useNavigation<MainTabNavigationProp<'Home'>>();
  const { user } = useAuth();
  const { updateLocation } = useLocation();
  const [refreshing, setRefreshing] = useState(false);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [productLoading, setProductLoading] = useState(true);
  const { theme, isDark, toggleTheme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const loadProducts = async () => {
    try {
      setProductLoading(true);
      const productService = ProductService.getInstance();
      const products = await productService.getFeaturedProducts(10);
      setFeaturedProducts(products);
    } catch (error) {
      loggingService.error('Erro ao carregar produtos destacados', { error });
    } finally {
      setProductLoading(false);
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

  if (productLoading && featuredProducts.length === 0) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 10, color: theme.colors.text.secondary }}>Buscando produtos...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="home-screen">
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.colors.background} />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text variant="headlineMedium" style={styles.title}>
                Açucaradas Encomendas
              </Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Deliciosas sobremesas artesanais perto de você
              </Text>
            </View>
            <IconButton
              icon={isDark ? 'weather-sunny' : 'weather-night'}
              onPress={() => toggleTheme(!isDark)}
              testID="theme-toggle"
              iconColor={theme.colors.primary}
            />
          </View>
        </View>

        <View style={styles.locationSection}>
          <StoreLocationButton />
        </View>

        <View style={styles.featuredSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Produtos Destacados
          </Text>

          <View style={styles.productsGrid}>
            {productLoading ? (
              <Text style={styles.bodyText}>Carregando produtos...</Text>
            ) : featuredProducts.length > 0 ? (
              featuredProducts.map(product => (
                <View key={product.id} style={styles.productCard}>
                  <Text variant="bodyMedium" style={styles.productName}>
                    {product.nome}
                  </Text>
                  <Text variant="bodySmall" style={styles.productPrice}>
                    {product.preco}
                  </Text>
                  <Button mode="contained" onPress={() => navigation.navigate('ProductDetail', { productId: product.id })}>
                    Ver
                  </Button>
                </View>
              ))
            ) : (
              <Text style={styles.bodyText}>Nenhum produto destacado no momento.</Text>
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

const createStyles = (theme: ThemeType) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    color: theme.colors.primary,
    marginBottom: 4,
  },
  subtitle: {
    color: theme.colors.text.secondary,
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
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: theme.borderRadius?.md || 14,
    padding: 16,
    marginBottom: 16,
    ...theme.shadows?.light,
  },
  productName: {
    color: theme.colors.text.primary,
  },
  productPrice: {
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  actionButtons: {
    padding: 20,
    marginBottom: 20,
  },
  button: {
    marginBottom: 12,
  },
  bodyText: {
    color: theme.colors.text.secondary,
  },
});
