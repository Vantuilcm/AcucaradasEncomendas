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
import { Chip, Searchbar, Button, Badge, Divider } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import type { Product, ProductFilter } from '../types/Product';
import { ProductCategories } from '../types/Product';
import { ProductGrid } from './ProductGrid';
import { ProductService } from '../services/ProductService';
import { useAdvancedSearch } from '../hooks/useAdvancedSearch';

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
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const suggestions: string[] = [];
  const productService = ProductService.getInstance();
  const adv = useAdvancedSearch();
  const searchSimple = useCallback(
    async (
      termo: string,
      filtros: ProductFilter = {},
      ordenacao?: { campo: string; direcao: 'asc' | 'desc' },
      pagina: number = 1,
      itensPorPagina: number = 12
    ) => {
      try {
        setLoading(true);
        setError(null);
        const all = await productService.listarProdutos({
          busca: termo,
          categoria: filtros.categoria,
          precoMin: filtros.precoMin,
          precoMax: filtros.precoMax,
          tagEspecial: filtros.tagEspecial,
          disponivel: filtros.disponivel,
        });
        let arr = [...all];
        if (ordenacao) {
          arr.sort((a, b) => {
            const va = a[ordenacao.campo as keyof Product] as any;
            const vb = b[ordenacao.campo as keyof Product] as any;
            if (typeof va === 'number' && typeof vb === 'number') {
              return ordenacao.direcao === 'asc' ? va - vb : vb - va;
            }
            if (typeof va === 'string' && typeof vb === 'string') {
              return ordenacao.direcao === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
            }
            return 0;
          });
        }
        const inicio = (pagina - 1) * itensPorPagina;
        const fim = inicio + itensPorPagina;
        const pageArr = arr.slice(inicio, fim);
        setResults(pageArr);
        setTotalResults(arr.length);
        setTotalPages(Math.max(1, Math.ceil(arr.length / itensPorPagina)));
        setCurrentPage(pagina);
      } catch (e: any) {
        setError(e?.message || 'Erro ao realizar busca');
      } finally {
        setLoading(false);
      }
    },
    [productService]
  );
  const isAdv = adv.isAdvancedSearchAvailable;
  const search = useCallback(
    async (
      termo: string,
      filtros: ProductFilter = {},
      ordenacao?: { campo: string; direcao: 'asc' | 'desc' },
      pagina: number = 1,
      itensPorPagina: number = 12
    ) => {
      if (isAdv) {
        await adv.searchProducts(termo, filtros, ordenacao, pagina, itensPorPagina);
      } else {
        await searchSimple(termo, filtros, ordenacao, pagina, itensPorPagina);
      }
    },
    [isAdv, adv.searchProducts, searchSimple]
  );
  const goToPage = useCallback(
    async (
      termo: string,
      filtros: ProductFilter = {},
      ordenacao?: { campo: string; direcao: 'asc' | 'desc' },
      pagina: number = 1,
      itensPorPagina: number = 12
    ) => {
      await search(termo, filtros, ordenacao, pagina, itensPorPagina);
    },
    [search]
  );

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
      await search(searchQuery, filters, sortOption, page);
    };

    executeSearch();
  }, [selectedCategory, selectedTag, priceRange, sortOption, page]);

  // Executar busca quando o termo de busca mudar
  const handleSearch = useCallback(async () => {
    setPage(1);
    await search(searchQuery, currentFilters, sortOption, 1);
  }, [searchQuery, currentFilters, sortOption, search]);

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
      search(suggestion, currentFilters, sortOption, 1);
    },
    [currentFilters, sortOption, search]
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
  const renderStats = () => null;

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

            {Object.values(ProductCategories).map(category => (
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
      {(isAdv ? adv.loading : loading) && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF69B4" />
        </View>
      )}

      {/* Mensagem de erro */}
      {(isAdv ? adv.error : error) && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{(isAdv ? adv.error : error) as string}</Text>
          <Button mode="contained" onPress={handleSearch} style={styles.retryButton}>
            Tentar novamente
          </Button>
        </View>
      )}

      {/* Resultados */}
      {!(isAdv ? adv.loading : loading) && !(isAdv ? adv.error : error) && (
        <>
          {/* Informação de resultados */}
          <Text style={styles.resultsInfo}>
            {(isAdv ? adv.totalResults : totalResults)} {(isAdv ? adv.totalResults : totalResults) === 1 ? 'resultado encontrado' : 'resultados encontrados'}
          </Text>

          {/* Grid de produtos */}
          <ProductGrid
            products={isAdv ? adv.results : results}
            loading={isAdv ? adv.loading : loading}
            error={(isAdv ? adv.error : error) || undefined}
            onRefresh={handleSearch}
            showSearch={false}
            showCategories={false}
            showAddToCart={true}
            numColumns={numColumns}
            onProductPress={onProductPress}
            emptyMessage={emptyMessage}
          />

          {/* Paginação */}
          {(() => {
            const tp = isAdv ? adv.totalPages : totalPages;
            const cp = isAdv ? adv.currentPage : currentPage;
            if (tp <= 1) return null;
            return (
              <View style={styles.paginationContainer}>
                <Button
                  mode="outlined"
                  disabled={cp <= 1}
                  onPress={() => {
                    const prev = cp - 1;
                    setPage(prev);
                    search(searchQuery, currentFilters, sortOption, prev);
                  }}
                  style={styles.paginationButton}
                >
                  Anterior
                </Button>

                <Text style={styles.paginationText}>
                  Página {cp} de {tp}
                </Text>

                <Button
                  mode="outlined"
                  disabled={cp >= tp}
                  onPress={() => {
                    const next = cp + 1;
                    setPage(next);
                    search(searchQuery, currentFilters, sortOption, next);
                  }}
                  style={styles.paginationButton}
                >
                  Próxima
                </Button>
              </View>
            );
          })()}
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
