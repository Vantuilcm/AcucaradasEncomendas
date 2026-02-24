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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';

// Tipo para produtos
interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  available: boolean;
  stock: number;
}

export function ProductManagementScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [isEditDialogVisible, setIsEditDialogVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [tempProductData, setTempProductData] = useState({
    name: '',
    description: '',
    price: '',
    stock: '',
    available: true,
  });

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

      // Simulação de carregamento de dados
      // No futuro, isso seria uma chamada para a API
      setTimeout(() => {
        const mockProducts: Product[] = [
          {
            id: '1',
            name: 'Bolo de Chocolate',
            description: 'Delicioso bolo de chocolate com cobertura de brigadeiro.',
            price: 45.9,
            imageUrl: 'https://example.com/bolo-chocolate.jpg',
            category: 'Bolos',
            available: true,
            stock: 5,
          },
          {
            id: '2',
            name: 'Cupcake de Baunilha',
            description: 'Cupcake de baunilha com cobertura de buttercream.',
            price: 8.5,
            imageUrl: 'https://example.com/cupcake-baunilha.jpg',
            category: 'Cupcakes',
            available: true,
            stock: 20,
          },
          {
            id: '3',
            name: 'Torta de Limão',
            description: 'Torta de limão com merengue.',
            price: 40.0,
            imageUrl: 'https://example.com/torta-limao.jpg',
            category: 'Tortas',
            available: true,
            stock: 3,
          },
          {
            id: '4',
            name: 'Bolo de Morango',
            description: 'Bolo recheado com creme e morangos frescos.',
            price: 55.0,
            imageUrl: 'https://example.com/bolo-morango.jpg',
            category: 'Bolos',
            available: false,
            stock: 0,
          },
        ];

        setProducts(mockProducts);

        // Extrair categorias únicas
        const uniqueCategories = [...new Set(mockProducts.map(p => p.category))];
        setCategories(uniqueCategories);

        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = [...products];

    // Filtrar por texto de busca
    if (searchQuery) {
      filtered = filtered.filter(
        product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtrar por categoria
    if (selectedCategory) {
      filtered = filtered.filter(product => product.category === selectedCategory);
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

  const toggleProductAvailability = (productId: string) => {
    setProducts(
      products.map(product => {
        if (product.id === productId) {
          return { ...product, available: !product.available };
        }
        return product;
      })
    );
  };

  const handleDeleteProduct = (productId: string) => {
    Alert.alert('Confirmar exclusão', 'Tem certeza que deseja excluir este produto?', [
      {
        text: 'Cancelar',
        style: 'cancel',
      },
      {
        text: 'Excluir',
        onPress: () => {
          setProducts(products.filter(product => product.id !== productId));
        },
        style: 'destructive',
      },
    ]);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setTempProductData({
      name: product.name,
      description: product.description,
      price: product.price.toString(),
      stock: product.stock.toString(),
      available: product.available,
    });
    setIsEditDialogVisible(true);
  };

  const saveProductChanges = () => {
    if (!editingProduct) return;

    const price = parseFloat(tempProductData.price);
    const stock = parseInt(tempProductData.stock);

    if (isNaN(price) || price <= 0) {
      Alert.alert('Erro', 'Por favor, informe um preço válido.');
      return;
    }

    if (isNaN(stock) || stock < 0) {
      Alert.alert('Erro', 'Por favor, informe um estoque válido.');
      return;
    }

    setProducts(
      products.map(product => {
        if (product.id === editingProduct.id) {
          return {
            ...product,
            name: tempProductData.name,
            description: tempProductData.description,
            price: price,
            stock: stock,
            available: tempProductData.available,
          };
        }
        return product;
      })
    );

    setIsEditDialogVisible(false);
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando produtos..." />;
  }

  // Verificar se o usuário é administrador ou produtor
  if (user?.role !== 'admin' && user?.role !== 'producer') {
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
                    <Text variant="titleMedium">{product.name}</Text>
                    <Chip
                      mode="flat"
                      style={[
                        styles.statusChip,
                        { backgroundColor: product.available ? '#4CAF50' : '#F44336' },
                      ]}
                    >
                      {product.available ? 'Disponível' : 'Indisponível'}
                    </Chip>
                  </View>

                  <Text variant="bodyMedium" style={styles.description}>
                    {product.description}
                  </Text>

                  <View style={styles.productDetails}>
                    <Text variant="bodySmall">Categoria: {product.category}</Text>
                    <Text variant="bodySmall">Estoque: {product.stock} unidades</Text>
                  </View>

                  <Text variant="titleSmall" style={styles.price}>
                    {formatCurrency(product.price)}
                  </Text>
                </View>

                <View style={styles.productActions}>
                  <IconButton
                    icon="pencil"
                    iconColor="#FF69B4"
                    size={20}
                    onPress={() => handleEditProduct(product)}
                  />
                  <IconButton
                    icon={product.available ? 'eye-off' : 'eye'}
                    iconColor={product.available ? '#F44336' : '#4CAF50'}
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
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
        color="#FFFFFF"
      />

      <Portal>
        <Dialog visible={isEditDialogVisible} onDismiss={() => setIsEditDialogVisible(false)}>
          <Dialog.Title>Editar Produto</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Nome do produto"
              value={tempProductData.name}
              onChangeText={text => setTempProductData({ ...tempProductData, name: text })}
              style={styles.dialogInput}
            />
            <TextInput
              label="Descrição"
              value={tempProductData.description}
              onChangeText={text => setTempProductData({ ...tempProductData, description: text })}
              multiline
              numberOfLines={3}
              style={styles.dialogInput}
            />
            <TextInput
              label="Preço (R$)"
              value={tempProductData.price}
              onChangeText={text => setTempProductData({ ...tempProductData, price: text })}
              keyboardType="numeric"
              style={styles.dialogInput}
            />
            <TextInput
              label="Estoque"
              value={tempProductData.stock}
              onChangeText={text => setTempProductData({ ...tempProductData, stock: text })}
              keyboardType="numeric"
              style={styles.dialogInput}
            />
            <View style={styles.availabilityToggle}>
              <Text>Disponível para venda</Text>
              <Button
                mode={tempProductData.available ? 'contained' : 'outlined'}
                onPress={() =>
                  setTempProductData({ ...tempProductData, available: !tempProductData.available })
                }
                style={[
                  styles.toggleButton,
                  { backgroundColor: tempProductData.available ? '#4CAF50' : 'transparent' },
                ]}
              >
                {tempProductData.available ? 'Sim' : 'Não'}
              </Button>
            </View>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setIsEditDialogVisible(false)}>Cancelar</Button>
            <Button onPress={saveProductChanges}>Salvar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
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
