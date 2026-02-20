import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  Divider,
  FAB,
  Searchbar,
  Chip,
  IconButton,
  Dialog,
  Portal,
  TextInput,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useAuth } from '../contexts/AuthContext';
import { Permission } from '../services/PermissionsService';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { DemandAnalysisDialog } from '../components/DemandAnalysisDialog';
import { ProductService } from '../services/ProductService';
import type { Product } from '../types/Product';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

export function ProductManagementScreen() {
  const theme = useTheme();
  const navigation = useAppNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [analyzingProduct, setAnalyzingProduct] = useState<{ id: string; name: string; price: number } | null>(null);
  const [isAnalysisVisible, setIsAnalysisVisible] = useState(false);

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

      const service = ProductService.getInstance();
      const loaded = await service.getProducts({});

      setProducts(loaded);

      const uniqueCategories = [
        ...new Set(
          loaded
            .map(p => p.categoria)
            .filter((c): c is string => typeof c === 'string' && c.length > 0)
        ),
      ];
      setCategories(uniqueCategories);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao carregar produtos';
      setError(message);
      logger.error('Erro ao carregar produtos em ProductManagementScreen', err as any);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filtrar por texto de busca
    if (searchQuery) {
      filtered = filtered.filter(product => {
        const nome = product.nome?.toLowerCase?.() || '';
        const descricao = product.descricao?.toLowerCase?.() || '';
        const termo = searchQuery.toLowerCase();
        return nome.includes(termo) || descricao.includes(termo);
      });
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

  const toggleProductAvailability = async (productId: string) => {
    const current = products.find(p => p.id === productId);
    if (!current) {
      return;
    }

    const newStatus = !current.disponivel;
    setProducts(prev =>
      prev.map(product =>
        product.id === productId ? { ...product, disponivel: newStatus } : product
      )
    );

    try {
      await ProductService.getInstance().updateAvailability(productId, newStatus);
    } catch (err) {
      setProducts(prev =>
        prev.map(product =>
          product.id === productId ? { ...product, disponivel: !newStatus } : product
        )
      );
      Alert.alert('Erro', 'Não foi possível atualizar a disponibilidade do produto.');
      logger.error('Erro ao atualizar disponibilidade do produto', err as any);
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
            await ProductService.getInstance().deleteProduct(productId);
            setProducts(products.filter(product => product.id !== productId));
          } catch (err) {
            Alert.alert('Erro', 'Não foi possível excluir o produto.');
            logger.error('Erro ao excluir produto em ProductManagementScreen', err as any);
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleEditProduct = (product: Product) => {
    const mapped: any = {
      ...product,
      id: product.id,
      name: product.nome,
      description: product.descricao,
      price: product.preco,
      imageUrl: Array.isArray(product.imagens) && product.imagens.length > 0 ? product.imagens[0] : undefined,
      category: product.categoria,
      available: product.disponivel,
      stock: product.estoque ?? 0,
    };

    navigation.navigate('AddEditProduct', { product: mapped, isEditing: true } as any);
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando produtos..." />;
  }

  

  return (
    <ProtectedRoute
      requiredPermissions={[Permission.GERENCIAR_PRODUTOS]}
      requireAllPermissions={true}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
    >
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
                        { backgroundColor: product.disponivel ? '#4CAF50' : '#F44336' },
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
                    <Text variant="bodySmall">Estoque: {product.estoque ?? 0} unidades</Text>
                  </View>

                  <Text variant="titleSmall" style={styles.price}>
                    {formatCurrency(product.preco)}
                  </Text>
                </View>

                <View style={styles.productActions}>
                  <IconButton
                    icon="chart-line"
                    iconColor="#2196F3"
                    size={20}
                    onPress={() => {
                      setAnalyzingProduct({ id: product.id, name: product.nome, price: product.preco });
                      setIsAnalysisVisible(true);
                    }}
                  />
                  <IconButton
                    icon="pencil"
                    iconColor="#FF69B4"
                    size={20}
                    onPress={() => handleEditProduct(product)}
                  />
                  <IconButton
                    icon={product.disponivel ? 'eye-off' : 'eye'}
                    iconColor={product.disponivel ? '#F44336' : '#4CAF50'}
                    size={20}
                    onPress={() => toggleProductAvailability(product.id)}
                  />
                  <IconButton
                    icon="delete"
                    iconColor="#F44336"
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
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('AddEditProduct')}
      />

      <Portal>
        <DemandAnalysisDialog
          visible={isAnalysisVisible}
          onDismiss={() => setIsAnalysisVisible(false)}
          product={analyzingProduct}
        />
      </Portal>
    </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    color: '#333',
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
    color: '#666',
  },
  productDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  price: {
    fontWeight: 'bold',
    color: '#FF69B4',
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
    backgroundColor: '#FF69B4',
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
    borderColor: '#4CAF50',
  },
});
