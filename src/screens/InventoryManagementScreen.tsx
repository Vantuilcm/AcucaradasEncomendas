import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Searchbar, Chip, IconButton, Divider, Snackbar, useTheme, Dialog, Portal, TextInput } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import type { RouteProp } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { ProductService } from '../services/ProductService';
import type { Product, ProductFilter } from '../types/Product';
import { Permission } from '../services/PermissionsService';
import cacheService from '../services/cacheService';
import { loggingService } from '../services/LoggingService';
import { OrderService } from '../services/OrderService';
import { DemandForecastService, SalesHistoryPoint } from '../services/DemandForecastService';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function InventoryManagementScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'InventoryManagement'>>();
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
  const [onlyStocked, setOnlyStocked] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarActionLabel, setSnackbarActionLabel] = useState<string | undefined>('Desfazer');
  const [lastAction, setLastAction] = useState<{
    type: 'stock' | 'availability';
    productId: string;
    previousStock?: number;
    previousDisponivel?: boolean;
  } | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const FILTER_CACHE_KEY = 'ui_inventory_filters';
  const [stats, setStats] = useState<any | null>(null);
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [adjustTarget, setAdjustTarget] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [bulkAmount, setBulkAmount] = useState('');
  const [forecastDialogOpen, setForecastDialogOpen] = useState(false);
  const [forecastAdjustments, setForecastAdjustments] = useState<Array<{ productId: string; currentStock: number; recommendedStock: number; adjustment: number; urgency: 'Baixa' | 'Média' | 'Alta'; productName: string; horizonDays: number; coverageDays: number; confidenceScore: number }>>([]);
  const [productionList, setProductionList] = useState<Array<{ productId: string; productName: string; quantity: number; urgency: 'Baixa' | 'Média' | 'Alta' }>>([]);

  const filteredProducts = useMemo(() => {
    let list = [...products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.nome.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q));
    }
    if (selectedCategory) {
      list = list.filter(p => p.categoria === selectedCategory);
    }
    if (onlyStocked) {
      list = list.filter(p => (p.temEstoque ? (p.estoque ?? 0) > 0 : true));
    }
    if (onlyLowStock) {
      list = list.filter(p => (p.temEstoque ? (p.estoque ?? 0) <= 3 : false));
    }
    return list;
  }, [products, searchQuery, selectedCategory, onlyStocked, onlyLowStock]);

  const visibleProducts = useMemo(() => filteredProducts.slice(0, page * pageSize), [filteredProducts, page]);

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    (async () => {
      const saved = await cacheService.getItem<any>(FILTER_CACHE_KEY);
      if (saved) {
        setSearchQuery(saved.searchQuery ?? '');
        setSelectedCategory(saved.selectedCategory);
        setOnlyStocked(!!saved.onlyStocked);
        setOnlyLowStock(!!saved.onlyLowStock);
        setPage(saved.page ?? 1);
      }
    })();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [products, searchQuery, selectedCategory, onlyStocked, onlyLowStock]);

  useEffect(() => {
    cacheService.setItem(FILTER_CACHE_KEY, {
      searchQuery,
      selectedCategory,
      onlyStocked,
      onlyLowStock,
      page,
    }, { expiration: 7 * 24 * 60 * 60 * 1000 }).catch(() => {});
  }, [searchQuery, selectedCategory, onlyStocked, onlyLowStock, page]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const service = ProductService.getInstance();
      const list = await service.getProducts({} as ProductFilter);
      setProducts(list);
      try {
        const s = await (ProductService.getInstance() as any).obterEstatisticas();
        setStats(s);
      } catch {}
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar produtos');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  };

  const openForecastDialog = async () => {
    try {
      setForecastDialogOpen(true);
      const orders = await new OrderService().getAllOrders();
      const history: SalesHistoryPoint[] = [];
      const since = new Date();
      since.setDate(since.getDate() - 120);
      for (const o of orders) {
        const created = new Date(o.createdAt as any);
        if (created.getTime() < since.getTime()) continue;
        for (const item of o.items) {
          const p = products.find(x => x.id === item.productId);
          const price = p?.preco ?? item.unitPrice ?? 0;
          history.push({ productId: item.productId, date: created, quantity: item.quantity, price });
        }
      }
      const productIds = Array.from(new Set(history.map(h => h.productId))).filter(id => !!products.find(p => p.id === id && p.temEstoque));
      const forecasts = DemandForecastService.getInstance().generateBulkForecasts(productIds, history);
      const adjustments: Array<{ productId: string; currentStock: number; recommendedStock: number; adjustment: number; urgency: 'Baixa' | 'Média' | 'Alta'; productName: string; horizonDays: number; coverageDays: number; confidenceScore: number }> = [];
      productIds.forEach(pid => {
        const forecast = forecasts.get(pid);
        const product = products.find(p => p.id === pid);
        if (!forecast || !product) return;
        const leadDays = Math.max(1, Math.min(30, product.leadTimeDays ?? 7));
        const horizonDays = Math.max(7, leadDays + 2);
        const nextPeriod = forecast.forecastPoints.slice(0, horizonDays).reduce((sum, pt) => sum + pt.expectedQuantity, 0);
        const confidenceScore = forecast.confidenceScore ?? 0.5;
        const buffer = 1 + Math.max(0, (1 - confidenceScore) * 0.4);
        const recommended = Math.ceil(nextPeriod * buffer);
        const current = product.estoque ?? 0;
        const adj = recommended - current;
        let urgency: 'Baixa' | 'Média' | 'Alta' = 'Baixa';
        const avgDaily = horizonDays > 0 ? nextPeriod / horizonDays : 0;
        const coverageDays = avgDaily > 0 ? current / avgDaily : 0;
        if (coverageDays < leadDays) urgency = 'Alta'; else if (coverageDays < leadDays + 3) urgency = 'Média';
        adjustments.push({ productId: pid, currentStock: current, recommendedStock: recommended, adjustment: adj, urgency, productName: product.nome, horizonDays, coverageDays, confidenceScore });
      });
      adjustments.sort((a, b) => Math.abs(b.adjustment) - Math.abs(a.adjustment));
      setForecastAdjustments(adjustments);
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Falha ao calcular previsão');
      setSnackbarVisible(true);
    }
  };

  useEffect(() => {
    const params: any = route.params;
    if (params && params.openForecast) {
      openForecastDialog();
    }
  }, [route.params]);

  const updateLocalProduct = (id: string, patch: Partial<Product>) => {
    setProducts(prev => prev.map(p => (p.id === id ? ({ ...p, ...patch, dataAtualizacao: new Date() }) : p)));
  };

  const addToProductionList = (adj: { productId: string; productName: string; adjustment: number; urgency: 'Baixa' | 'Média' | 'Alta' }) => {
    if (adj.adjustment <= 0) return;
    setProductionList(prev => {
      const existing = prev.find(p => p.productId === adj.productId);
      if (existing) {
        return prev.map(p => p.productId === adj.productId ? { ...p, quantity: adj.adjustment, urgency: adj.urgency } : p);
      }
      return [...prev, { productId: adj.productId, productName: adj.productName, quantity: adj.adjustment, urgency: adj.urgency }];
    });
    setSnackbarMessage('Item adicionado à lista de produção');
    setSnackbarVisible(true);
  };

  const generateProductionList = () => {
    const list = forecastAdjustments
      .filter(a => a.adjustment > 0)
      .map(a => ({ productId: a.productId, productName: a.productName, quantity: a.adjustment, urgency: a.urgency }));
    setProductionList(list);
    setSnackbarMessage(list.length ? 'Lista de produção gerada' : 'Nenhum ajuste positivo para produção');
    setSnackbarVisible(true);
  };

  const applyRecommendation = async (adj: { productId: string; adjustment: number }) => {
    if (adj.adjustment === 0) return;
    await adjustStock(adj.productId, adj.adjustment);
    setSnackbarMessage('Ajuste aplicado');
    setSnackbarVisible(true);
  };

  const applyProductionList = async () => {
    if (productionList.length === 0) return;
    for (const item of productionList) {
      await adjustStock(item.productId, item.quantity);
    }
    setSnackbarMessage('Lista de produção aplicada');
    setSnackbarVisible(true);
  };

  const adjustStock = async (id: string, delta: number) => {
    try {
      const current = products.find(p => p.id === id);
      const next = Math.max(0, (current?.estoque ?? 0) + delta);
      const service = ProductService.getInstance() as any;
      if (typeof service.atualizarEstoque === 'function') {
        const updated = await service.atualizarEstoque(id, next);
        updateLocalProduct(id, { estoque: updated.estoque, disponivel: updated.disponivel });
      } else if (typeof service.atualizarProduto === 'function') {
        const updated = await service.atualizarProduto(id, { estoque: next, disponivel: next > 0 });
        updateLocalProduct(id, { estoque: updated.estoque, disponivel: updated.disponivel });
      } else {
        updateLocalProduct(id, { estoque: next, disponivel: next > 0 });
      }
      setLastAction({ type: 'stock', productId: id, previousStock: current?.estoque ?? 0, previousDisponivel: current?.disponivel ?? true });
      setSnackbarMessage('Estoque atualizado');
      setSnackbarVisible(true);
      loggingService.info('Estoque atualizado', { productId: id, next, previous: current?.estoque });
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar estoque');
      loggingService.error('Falha ao atualizar estoque', { productId: id, errorMessage: err?.message });
    }
  };

  const openAdjustDialog = (p: Product) => {
    setAdjustTarget(p);
    setAdjustAmount(String(p.estoque ?? 0));
    setAdjustDialogOpen(true);
  };

  const applyAdjustAbsolute = async () => {
    try {
      if (!adjustTarget) return;
      const value = parseInt(adjustAmount, 10);
      if (isNaN(value) || value < 0) {
        setSnackbarMessage('Valor inválido');
        setSnackbarVisible(true);
        return;
      }
      const current = products.find(p => p.id === adjustTarget.id);
      const delta = value - (current?.estoque ?? 0);
      await adjustStock(adjustTarget.id, delta);
      setAdjustDialogOpen(false);
    } catch (err: any) {
      setSnackbarMessage(err?.message || 'Falha ao ajustar estoque');
      setSnackbarVisible(true);
    }
  };

  const toggleAvailability = async (id: string) => {
    try {
      const current = products.find(p => p.id === id);
      const next = !current?.disponivel;
      const service = ProductService.getInstance() as any;
      if (typeof service.atualizarDisponibilidade === 'function') {
        const updated = await service.atualizarDisponibilidade(id, next);
        updateLocalProduct(id, { disponivel: updated.disponivel });
      } else if (typeof service.atualizarProduto === 'function') {
        const updated = await service.atualizarProduto(id, { disponivel: next });
        updateLocalProduct(id, { disponivel: updated.disponivel });
      } else {
        updateLocalProduct(id, { disponivel: next });
      }
      setLastAction({ type: 'availability', productId: id, previousDisponivel: current?.disponivel ?? true });
      setSnackbarMessage(next ? 'Produto ativado' : 'Produto desativado');
      setSnackbarVisible(true);
      // loggingService.info('Disponibilidade atualizada', { productId: id, next });
    } catch (err: any) {
      setError(err?.message || 'Falha ao atualizar disponibilidade');
      loggingService.error('Falha ao atualizar disponibilidade', { productId: id, errorMessage: err?.message });
    }
  };

  const hideSnackbar = () => setSnackbarVisible(false);
  const undoLastAction = async () => {
    try {
      if (!lastAction) return;
      const service = ProductService.getInstance() as any;
      if (lastAction.type === 'stock' && typeof lastAction.previousStock === 'number') {
        if (typeof service.atualizarEstoque === 'function') {
          const updated = await service.atualizarEstoque(lastAction.productId, lastAction.previousStock);
          updateLocalProduct(lastAction.productId, { estoque: updated.estoque, disponivel: updated.disponivel });
        } else if (typeof service.atualizarProduto === 'function') {
          const updated = await service.atualizarProduto(lastAction.productId, { estoque: lastAction.previousStock, disponivel: (lastAction.previousStock ?? 0) > 0 });
          updateLocalProduct(lastAction.productId, { estoque: updated.estoque, disponivel: updated.disponivel });
        } else {
          updateLocalProduct(lastAction.productId, { estoque: lastAction.previousStock, disponivel: (lastAction.previousStock ?? 0) > 0 });
        }
        setSnackbarMessage('Alteração de estoque desfeita');
      } else if (lastAction.type === 'availability' && typeof lastAction.previousDisponivel === 'boolean') {
        if (typeof service.atualizarDisponibilidade === 'function') {
          const updated = await service.atualizarDisponibilidade(lastAction.productId, lastAction.previousDisponivel);
          updateLocalProduct(lastAction.productId, { disponivel: updated.disponivel });
        } else if (typeof service.atualizarProduto === 'function') {
          const updated = await service.atualizarProduto(lastAction.productId, { disponivel: lastAction.previousDisponivel });
          updateLocalProduct(lastAction.productId, { disponivel: updated.disponivel });
        } else {
          updateLocalProduct(lastAction.productId, { disponivel: lastAction.previousDisponivel });
        }
        setSnackbarMessage('Alteração desfeita');
      }
      setLastAction(null);
      setSnackbarVisible(true);
      // loggingService.info('Alteração desfeita', { productId: lastAction.productId, type: lastAction.type });
    } catch (err: any) {
      setError(err?.message || 'Falha ao desfazer alteração');
      loggingService.error('Falha ao desfazer alteração', { productId: lastAction?.productId, errorMessage: err?.message });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const adjustBulk = async (delta: number) => {
    const count = selectedIds.length;
    for (const id of selectedIds) {
      // eslint-disable-next-line no-await-in-loop
      await adjustStock(id, delta);
    }
    setSelectedIds([]);
    // loggingService.info('Ajuste em lote', { count, delta });
  };

  const setBulkAbsolute = async () => {
    const value = parseInt(bulkAmount, 10);
    if (isNaN(value) || value < 0) {
      setSnackbarMessage('Valor inválido');
      setSnackbarVisible(true);
      return;
    }
    const count = selectedIds.length;
    for (const id of selectedIds) {
      const current = products.find(p => p.id === id);
      const delta = value - (current?.estoque ?? 0);
      // eslint-disable-next-line no-await-in-loop
      await adjustStock(id, delta);
    }
    setSelectedIds([]);
    setBulkAmount('');
    // loggingService.info('Ajuste absoluto em lote', { count, value });
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando estoque..." />;
  }

  

  const categories = Array.from(new Set(products.map(p => p.categoria))).filter(Boolean);

  return (
    <ProtectedRoute
      requiredPermissions={[Permission.GERENCIAR_PRODUTOS]}
      requireAllPermissions={true}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
    >
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Gerenciar Estoque</Text>
        <Searchbar placeholder="Buscar produtos..." value={searchQuery} onChangeText={setSearchQuery} style={styles.searchBar} />
        <View style={styles.actionsRow}>
          <Button mode="contained" onPress={openForecastDialog} style={{ backgroundColor: '#FF69B4' }}>Previsão de demanda</Button>
        </View>
        {stats && (
          <View style={styles.statsRow}>
            <Card style={styles.statsCard}><Card.Content><Text variant="titleSmall">Total</Text><Text variant="headlineSmall">{stats.total}</Text></Card.Content></Card>
            <Card style={styles.statsCard}><Card.Content><Text variant="titleSmall">Disponíveis</Text><Text variant="headlineSmall">{stats.disponiveis}</Text></Card.Content></Card>
            <Card style={styles.statsCard}><Card.Content><Text variant="titleSmall">Sem estoque</Text><Text variant="headlineSmall">{stats.semEstoque}</Text></Card.Content></Card>
          </View>
        )}
        {productionList.length > 0 && (
          <Card style={[styles.card, { marginHorizontal: 0, marginTop: 8 }]}>
            <Card.Content>
              <View style={styles.rowBetween}>
                <Text variant="titleSmall">Lista de produção</Text>
                <Button mode="text" onPress={() => setProductionList([])}>Limpar</Button>
              </View>
              {productionList.map(item => (
                <View key={item.productId} style={styles.rowBetween}>
                  <View>
                    <Text>{item.productName}</Text>
                    <Text variant="bodySmall">Produzir: {item.quantity} unidades</Text>
                  </View>
                  <Chip mode="flat" style={[styles.statusChip, { backgroundColor: item.urgency === 'Alta' ? '#F44336' : item.urgency === 'Média' ? '#FFC107' : '#4CAF50' }]}>{item.urgency}</Chip>
                </View>
              ))}
              <View style={[styles.actionsRow, { marginTop: 8 }]}>
                <Button mode="contained" onPress={applyProductionList}>Aplicar lista</Button>
              </View>
            </Card.Content>
          </Card>
        )}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          <Chip mode={selectedCategory === undefined ? 'flat' : 'outlined'} selected={selectedCategory === undefined} onPress={() => setSelectedCategory(undefined)} style={styles.chip}>Todas</Chip>
          {categories.map(cat => (
            <Chip key={cat} mode={selectedCategory === cat ? 'flat' : 'outlined'} selected={selectedCategory === cat} onPress={() => setSelectedCategory(cat)} style={styles.chip}>{cat}</Chip>
          ))}
          <Chip mode={onlyStocked ? 'flat' : 'outlined'} selected={onlyStocked} onPress={() => setOnlyStocked(s => !s)} style={styles.chip}>Com estoque</Chip>
          <Chip mode={onlyLowStock ? 'flat' : 'outlined'} selected={onlyLowStock} onPress={() => setOnlyLowStock(s => !s)} style={styles.chip}>Baixo estoque</Chip>
        </ScrollView>
        {stats?.categorias && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
            {Object.entries(stats.categorias).map(([cat, count]) => (
              <Chip key={cat} mode="outlined" style={styles.chip}>{cat}: {count as number}</Chip>
            ))}
          </ScrollView>
        )}
        <View style={styles.bulkRow}>
          <Text variant="bodySmall">Selecionados: {selectedIds.length}</Text>
          <View style={styles.actionsRow}>
            <Button mode="outlined" onPress={() => adjustBulk(-1)}>Estoque -1</Button>
            <Button mode="outlined" onPress={() => adjustBulk(1)} style={{ marginLeft: 8 }}>Estoque +1</Button>
            <Button mode="text" onPress={() => setSelectedIds([])} style={{ marginLeft: 8 }}>Limpar</Button>
            <TextInput style={{ width: 100, marginLeft: 8 }} label="Qtd." value={bulkAmount} onChangeText={setBulkAmount} keyboardType="numeric" />
            <Button mode="contained" onPress={setBulkAbsolute} style={{ marginLeft: 8 }}>Definir</Button>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error && <ErrorMessage message={error} onRetry={loadProducts} />}
        {visibleProducts.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="bodyLarge">Nenhum produto encontrado</Text>
            <Button mode="contained" onPress={() => setSearchQuery('')} style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]}>Limpar Filtros</Button>
          </View>
        ) : (
          visibleProducts.map(p => (
            <Card key={p.id} style={styles.card}>
              <Card.Content>
                <View style={styles.rowBetween}>
                  <Text variant="titleMedium">{p.nome}</Text>
                  <Chip mode="flat" style={[styles.statusChip, { backgroundColor: p.disponivel ? '#4CAF50' : '#F44336' }]}>{p.disponivel ? 'Disponível' : 'Indisponível'}</Chip>
                </View>
                <Text variant="bodySmall">Categoria: {p.categoria}</Text>
                {(p.tempoPreparacao || p.leadTimeDays || (p as any).detalhes?.minimo) && (
                  <Text variant="bodySmall">
                    {p.tempoPreparacao ? `Preparo: ${p.tempoPreparacao} min  ` : ''}
                    {typeof p.leadTimeDays === 'number' ? `Antecedência: ${p.leadTimeDays} d  ` : ''}
                    {typeof (p as any).detalhes?.minimo === 'number' ? `Mínimo: ${(p as any).detalhes.minimo} un` : ''}
                  </Text>
                )}
                {Array.isArray(p.ingredientes) && p.ingredientes.length > 0 && (
                  <Text variant="bodySmall">
                    Ingredientes: {p.ingredientes.slice(0, 3).join(', ')}
                    {p.ingredientes.length > 3 ? '…' : ''}
                  </Text>
                )}
                {p.temEstoque ? (
                  <View style={styles.stockRow}>
                    <Text variant="bodyMedium">Estoque: {p.estoque ?? 0}</Text>
                    <View style={styles.actionsRow}>
                      <IconButton icon="minus" size={20} onPress={() => adjustStock(p.id, -1)} />
                      <IconButton icon="plus" size={20} onPress={() => adjustStock(p.id, 1)} />
                      <Button mode="text" onPress={() => openAdjustDialog(p)}>Ajustar...</Button>
                    </View>
                  </View>
                ) : (
                  <Text variant="bodyMedium">Sem controle de estoque</Text>
                )}
                {p.temEstoque && (p.estoque ?? 0) <= 3 && (
                  <Chip mode="flat" style={styles.lowStockChip}>Baixo estoque</Chip>
                )}
                <Divider style={styles.divider} />
                <View style={styles.actionsRow}>
                  <Button mode="outlined" onPress={() => toggleAvailability(p.id)}>{p.disponivel ? 'Desativar' : 'Ativar'}</Button>
                  <Button mode="contained" onPress={() => navigation.navigate('ProductTechnicalSheet', { product: p })} style={styles.editBtn}>Ficha técnica</Button>
                  <Chip mode={selectedIds.includes(p.id) ? 'flat' : 'outlined'} selected={selectedIds.includes(p.id)} onPress={() => toggleSelect(p.id)} style={styles.selectChip}>{selectedIds.includes(p.id) ? 'Selecionado' : 'Selecionar'}</Chip>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
        {visibleProducts.length < filteredProducts.length && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Button mode="outlined" onPress={() => setPage(p => p + 1)}>Carregar mais</Button>
          </View>
        )}
      </ScrollView>
      <Snackbar visible={snackbarVisible} onDismiss={hideSnackbar} duration={3000} action={snackbarActionLabel ? { label: snackbarActionLabel, onPress: undoLastAction } : undefined}>
        {snackbarMessage}
      </Snackbar>
      <Portal>
        <Dialog visible={forecastDialogOpen} onDismiss={() => setForecastDialogOpen(false)}>
          <Dialog.Title>Previsão de demanda e estoque recomendado</Dialog.Title>
          <Dialog.Content>
            {forecastAdjustments.length === 0 ? (
              <Text>Nenhum ajuste recomendado</Text>
            ) : (
              <ScrollView style={{ maxHeight: 300 }}>
                {forecastAdjustments.map(adj => (
                  <Card key={adj.productId} style={{ marginBottom: 8 }}>
                    <Card.Content>
                      <View style={styles.rowBetween}>
                        <Text variant="titleSmall">{adj.productName}</Text>
                        <Chip mode="flat" style={[styles.statusChip, { backgroundColor: adj.urgency === 'Alta' ? '#F44336' : adj.urgency === 'Média' ? '#FFC107' : '#4CAF50' }]}>{adj.urgency}</Chip>
                      </View>
                      <Text>Estoque atual: {adj.currentStock}</Text>
                      <Text>Recomendado ({adj.horizonDays} dias): {adj.recommendedStock}</Text>
                      <Text>Cobertura estimada: {Number(adj.coverageDays).toFixed(1)} dias</Text>
                      <Text>Confiança: {(adj.confidenceScore * 100).toFixed(0)}%</Text>
                      {adj.adjustment > 0 ? (
                        <Text>Ação: produzir mais {adj.adjustment} unidades</Text>
                      ) : adj.adjustment < 0 ? (
                        <Text>Ação: reduzir produção em {Math.abs(adj.adjustment)} unidades</Text>
                      ) : (
                        <Text>Ação: manter produção</Text>
                      )}
                      <View style={[styles.actionsRow, { marginTop: 8 }]}>
                        <Button mode="outlined" onPress={() => addToProductionList(adj)} disabled={adj.adjustment <= 0}>Adicionar à lista</Button>
                        <Button mode="contained" onPress={() => applyRecommendation(adj)} disabled={adj.adjustment === 0} style={{ marginLeft: 8 }}>Aplicar ajuste</Button>
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </ScrollView>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={generateProductionList}>Gerar lista</Button>
            <Button onPress={() => setForecastDialogOpen(false)}>Fechar</Button>
          </Dialog.Actions>
        </Dialog>
        <Dialog visible={adjustDialogOpen} onDismiss={() => setAdjustDialogOpen(false)}>
          <Dialog.Title>Ajustar estoque</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Quantidade" value={adjustAmount} onChangeText={setAdjustAmount} keyboardType="numeric" />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAdjustDialogOpen(false)}>Cancelar</Button>
            <Button onPress={applyAdjustAbsolute}>Aplicar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { color: '#333', marginBottom: 12 },
  searchBar: { marginBottom: 8 },
  filtersRow: { flexDirection: 'row' },
  chip: { marginRight: 8 },
  bulkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  scroll: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyBtn: { marginTop: 12 },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusChip: { height: 24 },
  stockRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  divider: { marginTop: 12, marginBottom: 8 },
  editBtn: { marginLeft: 8, backgroundColor: '#FF69B4' },
  selectChip: { marginLeft: 8 },
  lowStockChip: { marginTop: 8, backgroundColor: '#FF5252' },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  statsCard: { flex: 1 },
});

export default InventoryManagementScreen;
