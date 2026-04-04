import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  FAB,
  Searchbar,
  Chip,
  IconButton,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { usePermissions } from '../hooks/usePermissions';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAppTheme } from '../components/ThemeProvider';

import { ProductService } from '../services/ProductService';
import { Product } from '../types/Product';

export function ProductManagementScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { isProdutor, isAdmin } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  
  const productService = useMemo(() => ProductService.getInstance(), []);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [searchQuery, selectedCategory, products]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const allProducts = await productService.listarProdutos();
      setProducts(allProducts);

      // Extrair categorias únicas
      const uniqueCategories = [...new Set(allProducts.map(p => p.categoria))];
      setCategories(uniqueCategories);

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filtrar por texto de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        product =>
          product.nome.toLowerCase().includes(query) ||
          (product.descricao && product.descricao.toLowerCase().includes(query))
      );
    }

    // Filtrar por categoria
    if (selectedCategory) {
      filtered = filtered.filter(product => product.categoria === selectedCategory);
    }

    setFilteredProducts(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const toggleProductAvailability = async (productId: string, currentStatus: boolean) => {
    try {
      await productService.atualizarProduto(productId, { disponivel: !currentStatus });
      await loadProducts();
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar a disponibilidade do produto.');
    }
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert('Confirmar exclusão', 'Tem certeza que deseja excluir este produto?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Excluir',
        onPress: async () => {
          try {
            await productService.excluirProduto(productId);
            await loadProducts();
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível excluir o produto.');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleEditProduct = (product: Product) => {
    (navigation as any).navigate('AddEditProduct', { product, isEditing: true });
  };

  const handleAddProduct = () => {
    (navigation as any).navigate('AddEditProduct', { isEditing: false });
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando produtos..." />;
  }

  // Verificar se o usuário é administrador ou produtor
  if (!isAdmin && !isProdutor) {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Gerenciamento de Produtos
        </Text>

        <Searchbar
          placeholder="Buscar produtos..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
        >
          <Chip
            mode={selectedCategory === null ? 'flat' : 'outlined'}
            selected={selectedCategory === null}
            onPress={() => setSelectedCategory(null)}
            style={styles.categoryChip}
          >
            Todos
          </Chip>

          {categories.map(category => (
            <Chip
              key={category}
              mode={selectedCategory === category ? 'flat' : 'outlined'}
              selected={selectedCategory === category}
              onPress={() => setSelectedCategory(category)}
              style={styles.categoryChip}
            >
              {category}
            </Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && <ErrorMessage message={error} onRetry={loadProducts} />}

        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text variant="bodyLarge">Nenhum produto encontrado</Text>
            <Button
              mode="contained"
              onPress={() => setSearchQuery('')}
              style={[styles.emptyButton, { backgroundColor: theme.colors.primary }]}
            >
              Limpar Filtros
            </Button>
          </View>
        ) : (
          filteredProducts.map(product => (
            <Card key={product.id} style={styles.productCard}>
              <Card.Content style={styles.productContent}>
                <View style={styles.productInfo}>
                  <View style={styles.productHeader}>
                    <Text variant="titleMedium">{product.nome}</Text>
                    <Chip
                      mode="flat"
                      style={[
                        styles.statusChip,
                        {
                          backgroundColor: product.disponivel
                            ? theme.colors.success
                            : theme.colors.error,
                        },
                      ]}
                    >
                      {product.disponivel ? 'Disponível' : 'Indisponível'}
                    </Chip>
                  </View>

                  <Text variant="bodyMedium" style={styles.description}>
                    {product.descricao}
                  </Text>

                  <View style={styles.productDetails}>
                    <Text variant="bodySmall">Categoria: {product.categoria}</Text>
                    <Text variant="bodySmall">Estoque: {product.estoque} unidades</Text>
                  </View>

                  <Text variant="titleSmall" style={styles.price}>
                    {formatCurrency(product.preco)}
                  </Text>
                </View>

                <View style={styles.productActions}>
                  <IconButton
                    icon="pencil"
                    iconColor={theme.colors.primary}
                    size={20}
                    onPress={() => handleEditProduct(product)}
                  />
                  <IconButton
                    icon={product.disponivel ? 'eye-off' : 'eye'}
                    iconColor={product.disponivel ? theme.colors.error : theme.colors.success}
                    size={20}
                    onPress={() => toggleProductAvailability(product.id, product.disponivel)}
                  />
                  <IconButton
                    icon="delete"
                    iconColor={theme.colors.error}
                    size={20}
                    onPress={() => handleDeleteProduct(product.id)}
                  />
                </View>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleAddProduct}
        color={theme.colors.background}
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: { colors: any }) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    color: theme.colors.text.primary,
    marginBottom: 16,
  },
  searchBar: {
    marginBottom: 12,
  },
  categoriesContainer: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
  },
  productCard: {
    margin: 16,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
  },
  productContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  productInfo: {
    flex: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusChip: {
    height: 24,
  },
  description: {
    marginBottom: 8,
    color: theme.colors.text.secondary,
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  price: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  productActions: {
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyButton: {
    marginTop: 16,
  },
  dialogInput: {
    marginBottom: 12,
  },
  availabilityToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  toggleButton: {
    borderColor: theme.colors.success,
  },
});
