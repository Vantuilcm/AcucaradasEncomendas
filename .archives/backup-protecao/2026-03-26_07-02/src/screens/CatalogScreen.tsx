import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ProductGrid } from '../components/ProductGrid';
import { ProductService } from '../services/ProductService';
import { loggingService } from '../services/LoggingService';
import { useCart } from '../contexts/CartContext';
import { useAppTheme } from '../components/ThemeProvider';
import type { MainTabNavigationProp } from '../types/navigation';

const sampleProducts = [
  {
    id: '1',
    nome: 'Bolo de Chocolate',
    preco: 45.99,
    imagens: ['https://images.unsplash.com/photo-1578985545062-69928b1d9587?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'],
    categoria: 'Bolos',
    descricao: 'Delicioso bolo de chocolate com cobertura de brigadeiro',
    disponivel: true,
  },
  {
    id: '2',
    nome: 'Cupcake de Baunilha',
    preco: 8.99,
    imagens: ['https://images.unsplash.com/photo-1576618148400-f54bed99fcfd?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'],
    categoria: 'Cupcakes',
    descricao: 'Cupcake de baunilha com cobertura de buttercream',
    disponivel: true,
  },
  {
    id: '3',
    nome: 'Torta de Limão',
    preco: 39.99,
    imagens: ['https://images.unsplash.com/photo-1519869325930-281384150729?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'],
    categoria: 'Tortas',
    descricao: 'Torta de limão com merengue',
    disponivel: true,
  },
  {
    id: '4',
    nome: 'Brigadeiro Gourmet',
    preco: 3.99,
    imagens: ['https://images.unsplash.com/photo-1541783245831-57d6fb0926d3?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'],
    categoria: 'Doces',
    descricao: 'Brigadeiro gourmet com chocolate belga',
    disponivel: true,
  },
  {
    id: '5',
    nome: 'Bolo Red Velvet',
    preco: 55.99,
    imagens: ['https://images.unsplash.com/photo-1616541823729-00fe0aacd32c?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=60'],
    categoria: 'Bolos',
    descricao: 'Bolo red velvet com cream cheese',
    disponivel: false,
  },
];

export default function CatalogScreen() {
  const navigation = useNavigation<MainTabNavigationProp<'Catalog'>>();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { itemCount } = useCart();
  const { theme } = useAppTheme();

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const productService = ProductService.getInstance();
      const data = await productService.getProducts();
      
      if (data && data.length > 0) {
        setProducts(data);
      } else {
        // Fallback to sample data if database is empty
        setProducts(sampleProducts);
      }
    } catch (error: any) {
      loggingService.error('Erro ao carregar produtos no catálogo', { error });
      // Fallback to sample data on error
      setProducts(sampleProducts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const handleProductPress = (product: any) => {
    navigation.navigate('ProductDetail', { productId: product.id });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Appbar.Header style={{ backgroundColor: theme.colors.card }}>
        <Appbar.Content title="Catálogo" titleStyle={{ color: theme.colors.text.primary }} />
        <Appbar.Action
          icon="cart"
          color={theme.colors.text.primary}
          onPress={() => navigation.navigate('Cart')}
          style={styles.cartButton}
          size={24}
        />
        {itemCount > 0 && (
          <View style={[styles.cartBadge, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
          </View>
        )}
      </Appbar.Header>

      <ProductGrid
        products={products as any}
        loading={loading}
        error={error ? error : undefined}
        onRefresh={loadProducts}
        showSearch={true}
        showCategories={true}
        showAddToCart={true}
        numColumns={2}
        onProductPress={handleProductPress as any}
        emptyMessage="Nenhum produto disponível no momento"
      />

      <FAB icon="refresh" style={[styles.fab, { backgroundColor: theme.colors.primary }]} onPress={loadProducts} color="#fff" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  cartButton: {
    marginRight: 8,
  },
  cartBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
