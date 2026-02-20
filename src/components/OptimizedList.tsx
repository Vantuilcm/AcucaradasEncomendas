import React, { memo, useState, useCallback, useRef } from 'react';
import { FlatList, ListRenderItemInfo, StyleSheet, View, RefreshControl } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface OptimizedListProps<T> {
  data: T[];
  renderItem: (info: ListRenderItemInfo<T>) => React.ReactElement | null;
  keyExtractor?: (item: T, index: number) => string;
  contentContainerStyle?: any;
  style?: any;
  numColumns?: number;
  horizontal?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  ListEmptyComponent?: React.ReactElement | null;
  ListHeaderComponent?: React.ReactElement | null;
  ListFooterComponent?: React.ReactElement | null;
  estimatedItemSize?: number;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  itemHeight?: number; // altura fixa para getItemLayout
  getItemSizeByIndex?: (index: number) => number; // função para calcular altura variável
  separatorHeight?: number;
  scrollEnabled?: boolean;
  extraData?: any;
  onScroll?: (event: any) => void;
}

function OptimizedListComponent<T extends { id?: string | number }>({
  data,
  renderItem,
  keyExtractor = (item, index) => (item && item.id != null ? String(item.id) : String(index)),
  contentContainerStyle,
  style,
  numColumns,
  horizontal,
  refreshing = false,
  onRefresh,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  estimatedItemSize = 100,
  onEndReached,
  onEndReachedThreshold = 0.5,
  itemHeight,
  getItemSizeByIndex,
  separatorHeight = 0,
  scrollEnabled = true,
  extraData,
  onScroll,
}: OptimizedListProps<T>) {
  const theme = useTheme();
  const flatListRef = useRef<FlatList<T>>(null);
  const [viewableItems, setViewableItems] = useState<string[]>([]);


  // Gerencia quais itens estão visíveis no momento
  const onViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    const viewableIds = viewableItems.map((item: any) => item.key);
    setViewableItems(viewableIds);
  }, []);

  // Config para calcular quais items são visíveis
  const viewabilityConfig = {
    itemVisiblePercentThreshold: 10, // Porcentagem do item visível para ser considerado "viewable"
  };

  // Memoriza o componente renderItem para evitar re-renderizações desnecessárias
  const memoizedRenderItem = useCallback(
    (info: ListRenderItemInfo<T>) => {
      return renderItem(info);
    },
    [renderItem]
  );

  // Para listas com itens de altura fixa, isso aumenta muito a performance
  const getItemLayout = itemHeight
    ? (_data: ArrayLike<T> | null | undefined, index: number) => ({
        length: itemHeight + separatorHeight,
        offset: (itemHeight + separatorHeight) * index,
        index,
      })
    : getItemSizeByIndex
      ? (_data: ArrayLike<T> | null | undefined, index: number) => {
          const size = getItemSizeByIndex(index);
          const offset = Array.from(
            { length: index },
            (_, i) => getItemSizeByIndex(i) + separatorHeight
          ).reduce((a, b) => a + b, 0);
          return {
            length: size,
            offset,
            index,
          };
        }
      : undefined;

  // Componente otimizado para lista vazia
  const renderEmptyComponent = useCallback(() => {
    if (ListEmptyComponent) {
      return ListEmptyComponent;
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>
          Nenhum item encontrado
        </Text>
      </View>
    );
  }, [ListEmptyComponent, theme]);

  const memoizedKeyExtractor = useCallback(
    (item: T, index: number) => keyExtractor(item, index),
    [keyExtractor]
  );

  return (
    <FlatList
      ref={flatListRef}
      data={data}
      renderItem={memoizedRenderItem}
      keyExtractor={memoizedKeyExtractor}
      initialNumToRender={10}
      maxToRenderPerBatch={8}
      windowSize={5}
      updateCellsBatchingPeriod={50}
      removeClippedSubviews={true}
      contentContainerStyle={contentContainerStyle}
      style={style}
      numColumns={numColumns}
      horizontal={horizontal}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        ) : undefined
      }
      ListEmptyComponent={renderEmptyComponent}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      getItemLayout={getItemLayout}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      scrollEnabled={scrollEnabled}
      extraData={extraData}
      onScroll={onScroll}
      maintainVisibleContentPosition={
        data && data.length > 20 ? { minIndexForVisible: 0 } : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginTop: 16,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
  },
});

// Memo para evitar re-renderizações desnecessárias do componente lista
export const OptimizedList = memo(OptimizedListComponent) as typeof OptimizedListComponent;
