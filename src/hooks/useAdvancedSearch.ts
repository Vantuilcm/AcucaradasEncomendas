import { useState, useCallback, useEffect } from 'react';
import { Product, ProductFilter } from '../types/Product';
import { SearchService } from '../services/SearchService';
import { useSearchMonitoring } from './useSearchMonitoring';

/**
 * Hook personalizado para utilizar o sistema de busca avançada
 */
export const useAdvancedSearch = () => {
  const [results, setResults] = useState<Product[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchStats, setSearchStats] = useState<any>(null);

  const searchService = SearchService.getInstance();
  const { recordSearchLatency, recordCacheHit, recordCacheMiss } = useSearchMonitoring();

  // Inicializar estatísticas do sistema de busca
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = searchService.obterEstatisticas();
        setSearchStats(stats);
      } catch (err) {
        console.error('Erro ao carregar estatísticas de busca:', err);
      }
    };

    loadStats();
  }, []);

  /**
   * Realiza uma busca avançada de produtos
   * @param termo Termo de busca
   * @param filtros Filtros a serem aplicados
   * @param ordenacao Ordenação dos resultados
   * @param pagina Número da página
   * @param itensPorPagina Itens por página
   */
  const searchProducts = useCallback(
    async (
      termo: string,
      filtros: ProductFilter = {},
      ordenacao?: { campo: string; direcao: 'asc' | 'desc' },
      pagina: number = 1,
      itensPorPagina: number = 12
    ) => {
      const startTime = Date.now();

      try {
        setLoading(true);
        setError(null);
        setCurrentPage(pagina);

        // Verificar cache primeiro (simulação)
        const cacheKey = `search_${termo}_${JSON.stringify(filtros)}_${pagina}`;
        const cachedResult = null; // Implementar cache real se necessário

        if (cachedResult) {
          recordCacheHit();
          setResults(cachedResult.produtos);
          setSuggestions(cachedResult.sugestoes);
          setTotalResults(cachedResult.total);
          setTotalPages(cachedResult.paginas);
          recordSearchLatency(Date.now() - startTime);
          return;
        }

        recordCacheMiss();

        const resultado = await searchService.buscarProdutos(
          termo,
          filtros,
          ordenacao,
          pagina,
          itensPorPagina
        );

        // Registrar latência da busca
        recordSearchLatency(Date.now() - startTime);

        setResults(resultado.produtos);
        setSuggestions(resultado.sugestoes);
        setTotalResults(resultado.total);
        setTotalPages(resultado.paginas);

        // Cache do resultado (implementar se necessário)
        // cacheResult(cacheKey, resultado);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao realizar busca avançada');
        console.error('Erro na busca avançada:', err);
      } finally {
        setLoading(false);
      }
    },
    [recordSearchLatency, recordCacheHit, recordCacheMiss]
  );

  /**
   * Atualiza a indexação de um produto após criação ou atualização
   */
  const updateProductIndex = useCallback(async (produto: Product) => {
    try {
      await searchService.atualizarIndexacaoProduto(produto);
    } catch (err) {
      console.error('Erro ao atualizar indexação do produto:', err);
    }
  }, []);

  /**
   * Remove um produto da indexação após exclusão
   */
  const removeProductFromIndex = useCallback(async (productId: string) => {
    try {
      await searchService.removerProdutoDeIndexacao(productId);
    } catch (err) {
      console.error('Erro ao remover produto da indexação:', err);
    }
  }, []);

  /**
   * Navega para uma página específica dos resultados
   */
  const goToPage = useCallback(
    async (
      termo: string,
      filtros: ProductFilter = {},
      ordenacao?: { campo: string; direcao: 'asc' | 'desc' },
      pagina: number = 1,
      itensPorPagina: number = 12
    ) => {
      await searchProducts(termo, filtros, ordenacao, pagina, itensPorPagina);
    },
    [searchProducts]
  );

  return {
    results,
    suggestions,
    loading,
    error,
    totalResults,
    totalPages,
    currentPage,
    searchStats,
    searchProducts,
    updateProductIndex,
    removeProductFromIndex,
    goToPage,
    isAdvancedSearchAvailable: searchStats?.disponivel || false,
  };
};
