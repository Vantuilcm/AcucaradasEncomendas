import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Chip, Searchbar, Button, Badge } from 'react-native-paper';
import { useCart } from '../contexts/CartContext';
import { ProductCategories } from '../types/Product';
import { Ionicons } from '@expo/vector-icons';

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

interface ProductGridProps {
  products: Product[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
  onFilterChange?: (filter: { categoria?: string; busca?: string }) => void;
  initialFilter?: { categoria?: string; busca?: string };
  showSearch?: boolean;
  showCategories?: boolean;
  showAddToCart?: boolean;
  numColumns?: number;
  onProductPress?: (product: Product) => void;
  emptyMessage?: string;
}

const { width } = Dimensions.get('window');
const DEFAULT_COLUMNS = 2;

export function ProductGrid({
  products,
  loading = false,
  error,
  onRefresh,
  onFilterChange,
  initialFilter = {},
  showSearch = true,
  showCategories = true,
  showAddToCart = true,
  numColumns = DEFAULT_COLUMNS,
  onProductPress,
  emptyMessage = 'Nenhum produto encontrado',
}: ProductGridProps) {
  const navigation = useNavigation();
  const { addItem } = useCart();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilter.busca || '');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    initialFilter.categoria
  );

  // Calcular a largura dos cards com base no número de colunas
  const cardWidth = (width - (numColumns + 1) * 16) / numColumns;

  // Extrair categorias únicas dos produtos
  const categories = [...new Set(products.map(p => p.categoria))];

  // Filtrar produtos com base na categoria e busca
  const filteredProducts = products.filter(product => {
    let matchesCategory = true;
    let matchesSearch = true;

    if (selectedCategory) {
      matchesCategory = product.categoria === selectedCategory;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      matchesSearch =
        (typeof product.nome === 'string' && product.nome.toLowerCase().includes(query)) ||
        (typeof product.descricao === 'string' && product.descricao.toLowerCase().includes(query));
    }

    return matchesCategory && matchesSearch && product.disponivel;
  });

  // Notificar o componente pai sobre alteração nos filtros
  useEffect(() => {
    if (onFilterChange) {
      onFilterChange({
        categoria: selectedCategory,
        busca: searchQuery || undefined,
      });
    }
  }, [selectedCategory, searchQuery, onFilterChange]);

  // Função para atualizar a tela
  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  // Função para adicionar produto ao carrinho
  const handleAddToCart = useCallback(
    (product: Product) => {
      addItem({
        productId: product.id,
        name: product.nome,
        price: product.preco,
        quantity: 1,
        image:
          Array.isArray(product.imagens) && product.imagens.length > 0 ? product.imagens[0] : '',
      });

      // Mostrar feedback visual (pode ser um toast ou snackbar)
    },
    [addItem]
  );

  // Função para renderizar um item do produto
  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        style={[styles.productCard, { width: cardWidth }]}
        onPress={() =>
          onProductPress
            ? onProductPress(item)
            : navigation.navigate('ProductDetails', { product: item })
        }
        activeOpacity={0.7}
      >
        {item.destacado && <Badge style={styles.featuredBadge}>Destaque</Badge>}

        <Image
          source={{
            uri:
              Array.isArray(item.imagens) && item.imagens.length > 0
                ? item.imagens[0]
                : 'https://via.placeholder.com/150',
          }}
          style={styles.productImage}
          resizeMode="cover"
        />

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={styles.productPrice}>R$ {item.preco.toFixed(2)}</Text>

          {item.tagsEspeciais && item.tagsEspeciais.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tagsEspeciais.slice(0, 2).map((tag, index) => (
                <Chip key={index} style={styles.tag} textStyle={styles.tagText} compact>
                  {tag}
                </Chip>
              ))}
            </View>
          )}

          {showAddToCart && (
            <TouchableOpacity style={styles.addButton} onPress={() => handleAddToCart(item)}>
              <Ionicons name="cart-outline" size={16} color="#fff" />
              <Text style={styles.addButtonText}>Adicionar</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    ),
    [cardWidth, handleAddToCart, navigation, onProductPress, showAddToCart]
  );

  return (
    <View style={styles.container}>
      {/* Barra de busca */}
      {showSearch && (
        <Searchbar
          placeholder="Buscar produtos..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      )}

      {/* Categorias */}
      {showCategories && categories.length > 0 && (
        <FlatList
          horizontal
          data={['todas', ...categories]}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          renderItem={({ item }) => (
            <Chip
              mode={
                selectedCategory === (item === 'todas' ? undefined : item) ? 'flat' : 'outlined'
              }
              selected={selectedCategory === (item === 'todas' ? undefined : item)}
              onPress={() => setSelectedCategory(item === 'todas' ? undefined : item)}
              style={styles.categoryChip}
            >
              {item === 'todas' ? 'Todas' : item}
            </Chip>
          )}
        />
      )}

      {/* Estado de carregamento */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
        </View>
      )}

      {/* Mensagem de erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={handleRefresh} style={styles.retryButton}>
            Tentar novamente
          </Button>
        </View>
      )}

      {/* Grid de produtos */}
      {!loading && !error && (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductItem}
          keyExtractor={item => item.id}
          numColumns={numColumns}
          contentContainerStyle={styles.productList}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="basket-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchBar: {
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 2,
    borderRadius: 12,
  },
  categoriesContainer: {
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  categoryChip: {
    marginHorizontal: 4,
    marginBottom: 4,
  },
  productList: {
    paddingHorizontal: 8,
    paddingBottom: 16,
  },
  productCard: {
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
  },
  productImage: {
    height: 150,
    width: '100%',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF69B4',
    marginBottom: 8,
  },
  addButton: {
    backgroundColor: '#FF69B4',
    padding: 8,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 4,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
    backgroundColor: '#FF69B4',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: '#FFE6F2',
  },
  tagText: {
    fontSize: 10,
    color: '#FF69B4',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: 16,
    color: '#666',
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: '#FF69B4',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
});
