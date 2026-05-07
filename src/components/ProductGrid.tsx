import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Chip, Searchbar, Badge, Button } from 'react-native-paper';
import { useCart } from '../contexts/CartContext';
import { Product } from '../types/Product';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from './ThemeProvider';
import { EnhancedImage, PlaceholderType } from './EnhancedImage';

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
  const { theme } = useAppTheme();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState(initialFilter.busca || '');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    initialFilter.categoria
  );
  const styles = React.useMemo(() => createStyles(theme), [theme]);

  // Calcular a largura dos cards com base no número de colunas
  const cardWidth = (width - (numColumns + 1) * 16) / numColumns;

  // Extrair categorias únicas dos produtos (normalizadas para evitar duplicidade visual)
  const categories = React.useMemo(() => {
    const rawCategories = products.map(p => p.categoria).filter(Boolean);
    const normalized = new Set(
      rawCategories.map(cat => {
        const trimmed = String(cat).trim();
        return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
      })
    );
    return Array.from(normalized);
  }, [products]);

  // Filtrar produtos com base na categoria e busca
  const filteredProducts = React.useMemo(() => {
    return products.filter(product => {
      let matchesCategory = true;
      let matchesSearch = true;

      if (selectedCategory && selectedCategory !== 'todas') {
        const productCat = String(product.categoria || '').trim().toLowerCase();
        matchesCategory = productCat === selectedCategory.toLowerCase();
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        matchesSearch =
          (typeof product.nome === 'string' && product.nome.toLowerCase().includes(query)) ||
          (typeof product.descricao === 'string' && product.descricao.toLowerCase().includes(query));
      }

      return matchesCategory && matchesSearch && product.disponivel;
    });
  }, [products, selectedCategory, searchQuery]);

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
      try {
        addItem({
          productId: product.id,
          name: product.nome,
          price: product.preco,
          quantity: 1,
          image:
            Array.isArray(product.imagens) && product.imagens.length > 0 ? product.imagens[0] : '',
        });
      } catch (error) {
        console.error('Erro ao adicionar ao carrinho:', error);
      }
    },
    [addItem]
  );

  const getEmotionalBadge = (tag: string) => {
    const t = tag.toLowerCase();
    if (t === 'mais_vendido') return '🔥 Mais Vendido';
    if (t === 'destaque') return '⭐ Destaque';
    if (t === 'novo') return '✨ Novidade';
    if (t === 'artesanal') return '🛡️ Artesanal';
    return tag.charAt(0).toUpperCase() + tag.slice(1);
  };

  // Função para renderizar um item do produto
  const renderProductItem = useCallback(
    ({ item }: { item: Product }) => (
      <TouchableOpacity
        style={[styles.productCard, { width: cardWidth }]}
        onPress={() =>
          onProductPress
            ? onProductPress(item)
            : (navigation.navigate as any)('ProductDetails', { product: item })
        }
        activeOpacity={0.7}
      >
        {item.destacado && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredBadgeText}>⭐ Destaque</Text>
          </View>
        )}

        <View style={styles.imageContainer}>
          <EnhancedImage
            source={{
              uri:
                Array.isArray(item.imagens) && item.imagens.length > 0
                  ? item.imagens[0]
                  : 'https://via.placeholder.com/150',
            }}
            style={styles.productImage}
            resizeMode="cover"
            placeholderType={PlaceholderType.SKELETON}
          />
          {showAddToCart && (
            <TouchableOpacity style={styles.quickAddButton} onPress={() => handleAddToCart(item)}>
              <Ionicons name="add" size={20} color="#fff" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={1}>
            {item.nome}
          </Text>
          <Text style={styles.productPrice}>R$ {item.preco.toFixed(2)}</Text>

          {item.tagsEspeciais && item.tagsEspeciais.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tagsEspeciais.slice(0, 2).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{getEmotionalBadge(tag)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    ),
    [cardWidth, handleAddToCart, navigation, onProductPress, showAddToCart, styles]
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
          contentContainerStyle={{ paddingRight: 16 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSelectedCategory(item === 'todas' ? undefined : item)}
              style={[
                styles.categoryChip,
                selectedCategory === (item === 'todas' ? undefined : item) && {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === (item === 'todas' ? undefined : item) && {
                    color: '#fff',
                    fontWeight: 'bold',
                  },
                ]}
              >
                {item === 'todas' ? 'Todas' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Estado de carregamento */}
      {loading && !refreshing && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
              <Ionicons name="basket-outline" size={64} color={theme.colors.text.secondary} />
              <Text style={styles.emptyText}>{emptyMessage}</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const createStyles = (theme: { colors: any }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  searchBar: {
    marginHorizontal: 16,
    marginVertical: 12,
    elevation: 2,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
  },
  categoriesContainer: {
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: '#fff',
    marginRight: 8,
    height: 36,
    justifyContent: 'center',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  productList: {
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  productCard: {
    margin: 6,
    borderRadius: 16,
    backgroundColor: theme.colors.card,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  productImage: {
    height: 150,
    width: '100%',
  },
  imageContainer: {
    position: 'relative',
  },
  quickAddButton: {
    position: 'absolute',
    bottom: -10,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  productInfo: {
    padding: 12,
    paddingTop: 16,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text.primary,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  featuredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    zIndex: 1,
    backgroundColor: '#FFF7E6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F3D7A6',
  },
  featuredBadgeText: {
    color: '#A05A00',
    fontSize: 10,
    fontWeight: 'bold',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tag: {
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.outline || '#E0E0E0',
  },
  tagText: {
    fontSize: 10,
    color: theme.colors.text.secondary || '#666',
    fontWeight: '500',
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
    color: theme.colors.error,
    fontSize: 16,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    marginTop: 16,
    color: theme.colors.text.secondary,
    fontSize: 16,
    textAlign: 'center',
  },
});
