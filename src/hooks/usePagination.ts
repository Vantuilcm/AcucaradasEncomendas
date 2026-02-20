import { useState, useCallback } from 'react';
import { loggingService } from '../services/LoggingService';

interface PaginationState {
  page: number;
  hasMore: boolean;
  refreshing: boolean;
  loadMore: () => void;
  onRefresh: () => Promise<void>;
  reset: () => void;
}

export function usePagination(
  itemsPerPage: number,
  loadData: (page: number) => Promise<{ total: number; hasMore: boolean }>
): PaginationState {
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const handleLoadPage = useCallback(
    async (pageNumber: number) => {
      try {
        const { total, hasMore: hasMoreItems } = await loadData(pageNumber);
        setHasMore(hasMoreItems);
        setPage(pageNumber);

        loggingService.info('Página carregada com sucesso', {
          page: pageNumber,
          total,
        });
      } catch (err) {
        loggingService.error('Erro ao carregar página', {
          page: pageNumber,
          error: err,
        });
      }
    },
    [loadData]
  );

  const loadMore = useCallback(() => {
    if (!refreshing && hasMore) {
      handleLoadPage(page + 1);
    }
  }, [page, hasMore, refreshing, handleLoadPage]);

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await handleLoadPage(1);
    } finally {
      setRefreshing(false);
    }
  }, [handleLoadPage]);

  const reset = useCallback(() => {
    setPage(1);
    setHasMore(true);
    setRefreshing(false);
  }, []);

  return {
    page,
    hasMore,
    refreshing,
    loadMore,
    onRefresh,
    reset,
  };
}
