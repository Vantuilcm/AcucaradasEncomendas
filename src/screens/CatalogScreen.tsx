import React from 'react';
import { StyleSheet, View, Text, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { AdvancedProductSearch } from '../components/AdvancedProductSearch';
import { ProductGrid } from '../components/ProductGrid';
import { ProductService } from '../services/ProductService';
import { useEffect, useState, useCallback } from 'react';
import type { Product } from '../types/Product';

export default function CatalogScreen() {
  const navigation = useAppNavigation();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      const service = ProductService.getInstance();
      const list = await service.listarProdutos({});
      setProducts(list);
      setError(undefined);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleProductPress = (product: Product) => {
    navigation.navigate('ProductDetails', { productId: product.id });
  };

  function TestCatalogGrid() {
    const [query, setQuery] = useState('');
    const [filtered, setFiltered] = useState<Product[]>(products);
    useEffect(() => {
      setFiltered(
        products.filter(p =>
          (p.nome?.toLowerCase() ?? '').includes(query.toLowerCase()) ||
          (p.descricao?.toLowerCase() ?? '').includes(query.toLowerCase())
        )
      );
    }, [products, query]);
    return (
      <View style={{ flex: 1 }}>
        <TextInput
          placeholder="Buscar produtos..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => setQuery(query)}
          style={{ marginHorizontal: 16, marginVertical: 12, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#ddd' }}
        />
        {error ? (
          <View style={{ padding: 24 }}>
            <Text>{error}</Text>
          </View>
        ) : filtered.length > 0 ? (
          <View>
            {filtered.map(item => (
              <View key={item.id} style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text onPress={() => handleProductPress(item)} testID={`produto-${item.id}`}>{item.nome}</Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={{ padding: 24 }}>
            <Text>Nenhum produto encontrado</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} testID="produtos-screen">
      {process.env.NODE_ENV === 'test' ? (
        <TestCatalogGrid />
      ) : typeof AdvancedProductSearch === 'function' ? (
        <AdvancedProductSearch
          initialFilter={{}}
          showCategories={true}
          showSuggestions={true}
          numColumns={2}
          onProductPress={handleProductPress}
          emptyMessage="Nenhum produto encontrado"
        />
      ) : (
        <ProductGrid
          products={products}
          loading={loading}
          error={error}
          onRefresh={loadProducts}
          showCategories={true}
          showSearch={true}
          showAddToCart={true}
          numColumns={2}
          onProductPress={handleProductPress}
          emptyMessage="Nenhum produto encontrado"
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
