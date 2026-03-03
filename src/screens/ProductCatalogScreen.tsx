import React, { useState, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text } from 'react-native';
import { Appbar, FAB } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ProductGrid } from '../components/ProductGrid';
import { ProductService } from '../services/ProductService';
import { loggingService } from '../services/LoggingService';
import { useCart } from '../contexts/CartContext';

interface Product {
  id: string;
  nome: string;
  descricao: string;
  preco: number;
  categoria: string;
  disponivel: boolean;
  imagens: string[];
  destacado?: boolean;
  tagsEspeciais?: string[];
}

export default function ProductCatalogScreen() {
  const navigation = useNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { itemCount } = useCart();

  // Carregar produtos
  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      // Aqui seria uma chamada para a API ou serviço
      const productService = new ProductService();
      const data = await productService.getProducts();

      setProducts(data);
    } catch (error) {
      loggingService.error('Erro ao carregar produtos', { error });
      setError('Não foi possível carregar os produtos. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Função para gerenciar mudanças de filtro (opcional, pois o ProductGrid já gerencia internamente)
  const handleFilterChange = (filter: { categoria?: string; busca?: string }) => {
    // Lógica adicional se necessário
    loggingService.info('Filtro alterado', { filter });
  };

  // Navegar para a tela de detalhes do produto
  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', { product });
  };

  return (
    <SafeAreaView style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Catálogo de Produtos" />
        <Appbar.Action
          icon="cart"
          onPress={() => navigation.navigate('Cart')}
          style={styles.cartButton}
          size={24}
        />
        {itemCount > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{itemCount > 99 ? '99+' : itemCount}</Text>
          </View>
        )}
      </Appbar.Header>

      <ProductGrid
        products={products}
        loading={loading}
        error={error ? error : undefined}
        onRefresh={loadProducts}
        onFilterChange={handleFilterChange}
        showSearch={true}
        showCategories={true}
        showAddToCart={true}
        numColumns={2}
        onProductPress={handleProductPress}
        emptyMessage="Nenhum produto disponível no momento"
      />

      <FAB icon="refresh" style={styles.fab} onPress={loadProducts} color="#fff" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF69B4',
  },
  cartButton: {
    marginRight: 8,
  },
  cartBadge: {
    position: 'absolute',
    right: 8,
    top: 8,
    backgroundColor: '#FF69B4',
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
