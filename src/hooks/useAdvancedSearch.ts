import { useState, useCallback, useEffect } from 'react';
import type { Product, ProductFilter } from '../types/Product';
import { SearchService } from '../services/SearchService';
import cacheService from '../services/cacheService';
import { useSearchMonitoring } from './useSearchMonitoring';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

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
  const { recordSearchLatency, recordCacheHit } = useSearchMonitoring();

  // Inicializar estatísticas do sistema de busca
  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = searchService.obterEstatisticas();
        setSearchStats(stats);
      } catch (err) {
        logger.error('Erro ao carregar estatísticas de busca:', err instanceof Error ? err : new Error(String(err)));
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

        const cacheKey = `advanced_search:${termo}:${JSON.stringify(filtros)}:${pagina}:${itensPorPagina}`;
        const cachedResult = await cacheService.getItem<{ produtos: Product[]; total: number; paginas: number; sugestoes: string[] }>(cacheKey);

        if (cachedResult) {
          recordCacheHit(true);
          setResults(cachedResult.produtos);
          setSuggestions(cachedResult.sugestoes);
          setTotalResults(cachedResult.total);
          setTotalPages(cachedResult.paginas);
          recordSearchLatency(Date.now() - startTime, termo);
          return;
        }

        
        
        // Registrar miss no cache
        recordCacheHit(false);

        const resultado = await searchService.buscarProdutos(
          termo,
          filtros,
          ordenacao,
          pagina,
          itensPorPagina
        );

        // Registrar latência da busca
        recordSearchLatency(Date.now() - startTime, termo);

        setResults(resultado.produtos);
        setSuggestions(resultado.sugestoes);
        setTotalResults(resultado.total);
        setTotalPages(resultado.paginas);

        await cacheService.setItem(cacheKey, {
          produtos: resultado.produtos,
          total: resultado.total,
          paginas: resultado.paginas,
          sugestoes: resultado.sugestoes,
        }, { expiration: 2 * 60 * 1000 });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao realizar busca avançada');
        logger.error('Erro na busca avançada:', err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    },
    [recordSearchLatency, recordCacheHit]
  );

  /**
   * Atualiza a indexação de um produto após criação ou atualização
   */
  const updateProductIndex = useCallback(async (produto: Product) => {
    try {
      await searchService.atualizarIndexacaoProduto(produto);
    } catch (err) {
      logger.error('Erro ao atualizar indexação do produto:', err instanceof Error ? err : new Error(String(err)));
    }
  }, []);

  /**
   * Remove um produto da indexação após exclusão
   */
  const removeProductFromIndex = useCallback(async (productId: string) => {
    try {
      await searchService.removerProdutoDeIndexacao(productId);
    } catch (err) {
      logger.error('Erro ao remover produto da indexação:', err instanceof Error ? err : new Error(String(err)));
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

