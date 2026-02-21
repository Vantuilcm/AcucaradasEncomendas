import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Chip, Searchbar, Button, Badge, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';
import { Product, ProductFilter } from '../types/Product';
import { ProductGrid } from './ProductGrid';

interface AdvancedProductSearchProps {
  initialFilter?: ProductFilter;
  showCategories?: boolean;
  showSuggestions?: boolean;
  showStats?: boolean;
  numColumns?: number;
  onProductPress?: (product: Product) => void;
  emptyMessage?: string;
}

export function AdvancedProductSearch({
  initialFilter = {},
  showCategories = true,
  showSuggestions = true,
  showStats = false,
  numColumns = 2,
  onProductPress,
  emptyMessage = 'Nenhum produto encontrado',
}: AdvancedProductSearchProps) {
  const navigation = useNavigation();
  const [searchQuery, setSearchQuery] = useState(initialFilter.busca || '');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(
    initialFilter.categoria
  );
  const [priceRange, setPriceRange] = useState<{ min?: number; max?: number }>({});
  const [selectedTag, setSelectedTag] = useState<string | undefined>(initialFilter.tagEspecial);
  const [currentFilters, setCurrentFilters] = useState<ProductFilter>(initialFilter);
  const [sortOption, setSortOption] = useState<
    { campo: string; direcao: 'asc' | 'desc' } | undefined
  >();
  const [page, setPage] = useState(1);

  // Usar o hook de busca avançada
  const {
    results,
    suggestions,
    loading,
    error,
    totalResults,
    totalPages,
    currentPage,
    searchStats,
    searchProducts,
    goToPage,
    isAdvancedSearchAvailable,
  } = useAdvancedSearch();

  // Realizar busca quando os filtros mudarem
  useEffect(() => {
    const filters: ProductFilter = {
      ...currentFilters,
      categoria: selectedCategory,
      tagEspecial: selectedTag,
      precoMin: priceRange.min,
      precoMax: priceRange.max,
    };

    setCurrentFilters(filters);

    // Executar a busca
    const executeSearch = async () => {
      await searchProducts(searchQuery, filters, sortOption, page);
    };

    executeSearch();
  }, [selectedCategory, selectedTag, priceRange, sortOption, page]);

  // Executar busca quando o termo de busca mudar
  const handleSearch = useCallback(async () => {
    setPage(1); // Resetar para a primeira página
    await searchProducts(searchQuery, currentFilters, sortOption, 1);
  }, [searchQuery, currentFilters, sortOption, searchProducts]);

  // Limpar todos os filtros
  const clearFilters = useCallback(() => {
    setSelectedCategory(undefined);
    setSelectedTag(undefined);
    setPriceRange({});
    setSortOption(undefined);
    setCurrentFilters({});
  }, []);

  // Selecionar uma sugestão
  const selectSuggestion = useCallback(
    (suggestion: string) => {
      setSearchQuery(suggestion);
      searchProducts(suggestion, currentFilters, sortOption, 1);
    },
    [currentFilters, sortOption, searchProducts]
  );

  // Renderizar sugestões de busca
  const renderSuggestions = () => {
    if (!showSuggestions || !suggestions || suggestions.length === 0) return null;

    return (
      <View style={styles.suggestionsContainer}>
        <Text style={styles.suggestionsTitle}>Sugestões:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {suggestions.map((suggestion, index) => (
            <Chip
              key={index}
              mode="outlined"
              onPress={() => selectSuggestion(suggestion)}
              style={styles.suggestionChip}
            >
              {suggestion}
            </Chip>
          ))}
        </ScrollView>
      </View>
    );
  };

  // Renderizar estatísticas de busca
  const renderStats = () => {
    if (!showStats || !searchStats || !isAdvancedSearchAvailable) return null;

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Estatísticas:</Text>
        <Text style={styles.statsText}>
          Total de produtos indexados: {searchStats.totalDocumentos || 0}
        </Text>
        <Text style={styles.statsText}>Termos únicos: {searchStats.termosUnicos || 0}</Text>
      </View>
    );
  };

  // Renderizar paginação
  const renderPagination = () => {
    if (totalPages <= 1) return null;

    return (
      <View style={styles.paginationContainer}>
        <Button
          mode="outlined"
          disabled={currentPage <= 1}
          onPress={() => setPage(currentPage - 1)}
          style={styles.paginationButton}
        >
          Anterior
        </Button>

        <Text style={styles.paginationText}>
          Página {currentPage} de {totalPages}
        </Text>

        <Button
          mode="outlined"
          disabled={currentPage >= totalPages}
          onPress={() => setPage(currentPage + 1)}
          style={styles.paginationButton}
        >
          Próxima
        </Button>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Barra de busca */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar produtos..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchBar}
          right={() => (
            <TouchableOpacity onPress={handleSearch}>
              <Ionicons name="search" size={24} color="#FF69B4" />
            </TouchableOpacity>
          )}
        />

        {currentFilters &&
          Object.keys(currentFilters).some(
            key => currentFilters[key as keyof ProductFilter] !== undefined
          ) && (
            <Button
              mode="text"
              onPress={clearFilters}
              style={styles.clearButton}
              labelStyle={styles.clearButtonText}
            >
              Limpar filtros
            </Button>
          )}
      </View>

      {/* Sugestões de busca */}
      {renderSuggestions()}

      {/* Categorias */}
      {showCategories && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Categorias:</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            <Chip
              mode={selectedCategory === undefined ? 'flat' : 'outlined'}
              selected={selectedCategory === undefined}
              onPress={() => setSelectedCategory(undefined)}
              style={styles.categoryChip}
            >
              Todas
            </Chip>

            {/* Aqui você deve carregar as categorias do seu sistema */}
            {['bolos', 'doces', 'salgados', 'bebidas'].map(category => (
              <Chip
                key={category}
                mode={selectedCategory === category ? 'flat' : 'outlined'}
                selected={selectedCategory === category}
                onPress={() => setSelectedCategory(category)}
                style={styles.categoryChip}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </Chip>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Filtros adicionais */}
      <View style={styles.filtersContainer}>
        <Text style={styles.filterTitle}>Ordenar por:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
        >
          <Chip
            mode={!sortOption ? 'flat' : 'outlined'}
            selected={!sortOption}
            onPress={() => setSortOption(undefined)}
            style={styles.categoryChip}
          >
            Relevância
          </Chip>
          <Chip
            mode={
              sortOption?.campo === 'preco' && sortOption?.direcao === 'asc' ? 'flat' : 'outlined'
            }
            selected={sortOption?.campo === 'preco' && sortOption?.direcao === 'asc'}
            onPress={() => setSortOption({ campo: 'preco', direcao: 'asc' })}
            style={styles.categoryChip}
          >
            Menor preço
          </Chip>
          <Chip
            mode={
              sortOption?.campo === 'preco' && sortOption?.direcao === 'desc' ? 'flat' : 'outlined'
            }
            selected={sortOption?.campo === 'preco' && sortOption?.direcao === 'desc'}
            onPress={() => setSortOption({ campo: 'preco', direcao: 'desc' })}
            style={styles.categoryChip}
          >
            Maior preço
          </Chip>
          <Chip
            mode={
              sortOption?.campo === 'nome' && sortOption?.direcao === 'asc' ? 'flat' : 'outlined'
            }
            selected={sortOption?.campo === 'nome' && sortOption?.direcao === 'asc'}
            onPress={() => setSortOption({ campo: 'nome', direcao: 'asc' })}
            style={styles.categoryChip}
          >
            Nome (A-Z)
          </Chip>
        </ScrollView>
      </View>

      <Divider style={styles.divider} />

      {/* Estatísticas */}
      {renderStats()}

      {/* Estado de carregamento */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
        </View>
      )}

      {/* Mensagem de erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Button mode="contained" onPress={handleSearch} style={styles.retryButton}>
            Tentar novamente
          </Button>
        </View>
      )}

      {/* Resultados */}
      {!loading && !error && (
        <>
          {/* Informação de resultados */}
          <Text style={styles.resultsInfo}>
            {totalResults} {totalResults === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </Text>

          {/* Grid de produtos */}
          <ProductGrid
            products={results}
            loading={loading}
            error={error}
            onRefresh={handleSearch}
            showSearch={false}
            showCategories={false}
            showAddToCart={true}
            numColumns={numColumns}
            onProductPress={onProductPress}
            emptyMessage={emptyMessage}
          />

          {/* Paginação */}
          {renderPagination()}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  searchBar: {
    flex: 1,
    elevation: 2,
    borderRadius: 12,
  },
  clearButton: {
    marginLeft: 8,
  },
  clearButtonText: {
    color: '#FF69B4',
    fontSize: 12,
  },
  suggestionsContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  suggestionsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  suggestionChip: {
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFE6F2',
  },
  filtersContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  categoriesScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    marginRight: 8,
    marginBottom: 4,
  },
  divider: {
    marginVertical: 8,
  },
  statsContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    elevation: 1,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#666',
  },
  statsText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
  resultsInfo: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 14,
    color: '#666',
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  paginationButton: {
    minWidth: 100,
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
  },
});
