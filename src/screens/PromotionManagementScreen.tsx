import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Card, Button, Searchbar, Chip, IconButton, Divider, Dialog, Portal, TextInput, Snackbar, useTheme } from 'react-native-paper';
import { DatePickerModal } from 'react-native-paper-dates';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { ProductService } from '../services/ProductService';
import { OrderService } from '../services/OrderService';
import { dynamicPricingService, type SalesData, type ProductPricing } from '../services/DynamicPricingService';
import type { Product, ProductFilter } from '../types/Product';
import { Permission } from '../services/PermissionsService';
import { loggingService } from '../services/LoggingService';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function PromotionManagementScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [targetProduct, setTargetProduct] = useState<Product | null>(null);
  const [discountPercent, setDiscountPercent] = useState<string>('10');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [rangeOpen, setRangeOpen] = useState(false);
  const [scheduleTarget, setScheduleTarget] = useState<Product | null>(null);
  const [range, setRange] = useState<{ startDate?: Date; endDate?: Date }>({});
  const [suggestedPrice, setSuggestedPrice] = useState<number | null>(null);
  const [suggestionConfidence, setSuggestionConfidence] = useState<number | null>(null);
  const [suggestionReasons, setSuggestionReasons] = useState<string[]>([]);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const filtered = useMemo(() => {
    let list = [...products];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.nome.toLowerCase().includes(q) || p.descricao.toLowerCase().includes(q));
    }
    if (category) {
      list = list.filter(p => p.categoria === category);
    }
    return list;
  }, [products, searchQuery, category]);

  const visible = useMemo(() => filtered.slice(0, page * pageSize), [filtered, page]);

  const newPricePreview = useMemo(() => {
    const percent = parseFloat(discountPercent);
    if (!targetProduct || isNaN(percent) || percent <= 0 || percent >= 90) return null;
    return Number((targetProduct.preco * (1 - percent / 100)).toFixed(2));
  }, [discountPercent, targetProduct]);

  const parseDate = (value?: string | number) => {
    if (!value) return undefined;
    try {
      const s = typeof value === 'number' ? String(value) : String(value);
      return new Date(`${s}T00:00:00`);
    } catch {
      return undefined;
    }
  };

  const getPromotionStatus = (p: Product) => {
    const hasPromo = Array.isArray(p.tagsEspeciais) && p.tagsEspeciais.includes('promocao');
    const inicio = parseDate((p.detalhes as any)?.promocaoInicio as any);
    const fim = parseDate((p.detalhes as any)?.promocaoFim as any);
    const today = new Date();
    const startOk = inicio ? inicio.getTime() <= today.getTime() : false;
    const endOk = fim ? today.getTime() <= fim.getTime() : false;
    if (hasPromo && inicio && fim) {
      if (startOk && endOk) return 'Ativa';
      if (!startOk && fim && fim.getTime() >= today.getTime()) return 'Agendada';
      return 'Expirada';
    }
    return hasPromo ? 'Ativa' : 'Normal';
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, category]);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      setError(null);
      const service = ProductService.getInstance() as any;
      let list: Product[] = [];
      if (typeof service.listarProdutosPromocao === 'function') {
        list = await service.listarProdutosPromocao();
      } else if (typeof service.listarProdutos === 'function') {
        list = await service.listarProdutos({ tagEspecial: 'promocao' } as ProductFilter);
      } else if (typeof service.getProducts === 'function') {
        const all = await service.getProducts({} as ProductFilter);
        list = all.filter((p: Product) => (p.tagsEspeciais || []).includes('promocao'));
      }
      setProducts(list);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar promoções');
      setLoading(false);
      loggingService.error('Erro ao carregar promoções', { errorMessage: err?.message });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPromotions();
    setRefreshing(false);
  };

  const togglePromotionTag = async (p: Product) => {
    try {
      const tags = Array.isArray(p.tagsEspeciais) ? [...p.tagsEspeciais] : [];
      const hasPromo = tags.includes('promocao');
      const nextTags = hasPromo ? tags.filter(t => t !== 'promocao') : [...tags, 'promocao'];
      if (!hasPromo) {
        const inicio = parseDate((p.detalhes as any)?.promocaoInicio as any);
        const fim = parseDate((p.detalhes as any)?.promocaoFim as any);
        const today = new Date();
        if (fim && fim.getTime() < today.getTime()) {
          Alert.alert('Período expirado', 'O período definido para a promoção já expirou. Ajuste as datas antes de ativar.');
          return;
        }
        if (inicio && fim && inicio.getTime() > fim.getTime()) {
          Alert.alert('Período inválido', 'A data inicial não pode ser após a final.');
          return;
        }
      }
      const service = ProductService.getInstance() as any;
      let updated: Product = p;
      if (typeof service.atualizarProduto === 'function') {
        updated = await service.atualizarProduto(p.id, { tagsEspeciais: nextTags });
      } else {
        updated = { ...p, tagsEspeciais: nextTags };
      }
      setProducts(prev => prev.map(x => (x.id === p.id ? updated : x)));
      setSnackbarMessage(hasPromo ? 'Promoção removida' : 'Promoção aplicada');
      setSnackbarVisible(true);
      // loggingService.info(hasPromo ? 'Promoção removida' : 'Promoção aplicada', { productId: p.id });
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao atualizar promoção');
      loggingService.error('Falha ao atualizar promoção', { productId: p.id, errorMessage: err?.message });
    }
  };

  const openDiscountDialog = (p: Product) => {
    setTargetProduct(p);
    setDiscountPercent('10');
    setDiscountDialogOpen(true);
    setSuggestedPrice(null);
    setSuggestionConfidence(null);
    setSuggestionReasons([]);
    setSuggestionLoading(true);
    calculatePriceSuggestion(p).finally(() => setSuggestionLoading(false));
  };

  const openScheduleRange = (p: Product) => {
    setScheduleTarget(p);
    setRange({});
    setRangeOpen(true);
  };

  const confirmScheduleRange = async ({ startDate, endDate }: { startDate: Date | undefined; endDate: Date | undefined }) => {
    try {
      if (!scheduleTarget || !startDate || !endDate) {
        setRangeOpen(false);
        return;
      }
      if (startDate.getTime() > endDate.getTime()) {
        setRangeOpen(false);
        setSnackbarMessage('Período inválido');
        setSnackbarVisible(true);
        return;
      }
      const startISO = startDate.toISOString().split('T')[0];
      const endISO = endDate.toISOString().split('T')[0];
      const service = ProductService.getInstance() as any;
      const baseDetalhes = Array.isArray([]) ? {} : (scheduleTarget.detalhes || {});
      const updated = typeof service.atualizarProduto === 'function'
        ? await service.atualizarProduto(scheduleTarget.id, { detalhes: { ...baseDetalhes, promocaoInicio: startISO, promocaoFim: endISO } })
        : { ...scheduleTarget, detalhes: { ...baseDetalhes, promocaoInicio: startISO, promocaoFim: endISO } };
      setProducts(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setRangeOpen(false);
      setSnackbarMessage('Período de promoção definido');
      setSnackbarVisible(true);
    } catch (err: any) {
      setRangeOpen(false);
      setSnackbarMessage(err?.message || 'Falha ao definir período');
      setSnackbarVisible(true);
    }
  };

  const applyDiscount = async () => {
    try {
      const percent = parseFloat(discountPercent);
      if (isNaN(percent) || percent <= 0 || percent >= 90) {
        Alert.alert('Valor inválido', 'Informe um percentual entre 1 e 90');
        return;
      }
      if (!targetProduct) return;
      const newPrice = Number((targetProduct.preco * (1 - percent / 100)).toFixed(2));
      const service = ProductService.getInstance() as any;
      let updated: Product = targetProduct;
      if (typeof service.atualizarPreco === 'function') {
        updated = await service.atualizarPreco(targetProduct.id, newPrice);
      } else if (typeof service.atualizarProduto === 'function') {
        updated = await service.atualizarProduto(targetProduct.id, { preco: newPrice });
      } else {
        updated = { ...targetProduct, preco: newPrice } as Product;
      }
      const tags = Array.isArray(updated.tagsEspeciais) ? updated.tagsEspeciais : [];
      if (!tags.includes('promocao')) {
        const patched = typeof service.atualizarProduto === 'function' ? await service.atualizarProduto(updated.id, { tagsEspeciais: [...tags, 'promocao'] }) : { ...updated, tagsEspeciais: [...tags, 'promocao'] };
        updated = patched;
      }
      setProducts(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setDiscountDialogOpen(false);
      setSnackbarMessage(`Desconto de ${percent}% aplicado`);
      setSnackbarVisible(true);
      // loggingService.info('Desconto aplicado', { productId: updated.id, percent, newPrice });
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao aplicar desconto');
      loggingService.error('Falha ao aplicar desconto', { productId: targetProduct?.id, errorMessage: err?.message });
    }
  };

  const applySuggestedPrice = async () => {
    try {
      if (!targetProduct || suggestedPrice == null) return;
      const service = ProductService.getInstance() as any;
      let updated: Product = targetProduct;
      if (typeof service.atualizarPreco === 'function') {
        updated = await service.atualizarPreco(targetProduct.id, Number(suggestedPrice));
      } else if (typeof service.atualizarProduto === 'function') {
        updated = await service.atualizarProduto(targetProduct.id, { preco: Number(suggestedPrice) });
      } else {
        updated = { ...targetProduct, preco: Number(suggestedPrice) } as Product;
      }
      const tags = Array.isArray(updated.tagsEspeciais) ? updated.tagsEspeciais : [];
      if (!tags.includes('promocao')) {
        const patched = typeof service.atualizarProduto === 'function' ? await service.atualizarProduto(updated.id, { tagsEspeciais: [...tags, 'promocao'] }) : { ...updated, tagsEspeciais: [...tags, 'promocao'] };
        updated = patched;
      }
      setProducts(prev => prev.map(x => (x.id === updated.id ? updated : x)));
      setDiscountDialogOpen(false);
      setSnackbarMessage('Preço sugerido aplicado');
      setSnackbarVisible(true);
      // loggingService.info('Preço sugerido aplicado', { productId: updated.id, suggestedPrice });
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao aplicar preço sugerido');
      loggingService.error('Falha ao aplicar preço sugerido', { productId: targetProduct?.id, errorMessage: err?.message });
    }
  };

  const calculatePriceSuggestion = async (p: Product) => {
    try {
      const orders = await new OrderService().getAllOrders();
      const cfg = dynamicPricingService.getConfig();
      const since = new Date();
      since.setDate(since.getDate() - (cfg.historyDays || 90));
      const salesHistory: SalesData[] = [];
      const similarSales: SalesData[] = [];
      for (const o of orders) {
        const created = new Date(o.createdAt as any);
        if (created.getTime() < since.getTime()) continue;
        for (const item of o.items) {
          const base = {
            date: created.getTime(),
            quantity: item.quantity,
            price: item.unitPrice,
            promotionActive: Array.isArray(p.tagsEspeciais) && p.tagsEspeciais.includes('promocao'),
          };
          if (item.productId === p.id) {
            salesHistory.push({ productId: item.productId, ...base });
          } else {
            const prod = products.find(x => x.id === item.productId);
            if (prod && prod.categoria === p.categoria) {
              similarSales.push({ productId: item.productId, ...base });
            }
          }
        }
      }
      const min = typeof (p.detalhes as any)?.precoMin === 'number' ? Number((p.detalhes as any)?.precoMin) : Number((p.preco * 0.8).toFixed(2));
      const max = typeof (p.detalhes as any)?.precoMax === 'number' ? Number((p.detalhes as any)?.precoMax) : Number((p.preco * 1.2).toFixed(2));
      const pricing: ProductPricing = {
        id: p.id,
        name: p.nome,
        basePrice: p.preco,
        currentPrice: p.preco,
        minPrice: min,
        maxPrice: max,
        producerId: 'default',
        category: p.categoria,
        tags: Array.isArray(p.tagsEspeciais) ? p.tagsEspeciais : [],
        createdAt: (p.dataCriacao instanceof Date ? p.dataCriacao.getTime() : new Date(p.dataCriacao as any).getTime()),
        updatedAt: (p.dataAtualizacao instanceof Date ? p.dataAtualizacao.getTime() : (p.dataAtualizacao ? new Date(p.dataAtualizacao as any).getTime() : Date.now())),
      };
      const suggestion = dynamicPricingService.generatePriceSuggestion(pricing, salesHistory, similarSales);
      setSuggestedPrice(suggestion.suggestedPrice);
      setSuggestionConfidence(suggestion.confidence);
      setSuggestionReasons(suggestion.reasons.map(r => r.description));
    } catch (err: any) {
      setSuggestedPrice(null);
      setSuggestionConfidence(null);
      setSuggestionReasons([]);
      loggingService.error('Falha ao calcular sugestão de preço', { productId: p.id, errorMessage: err?.message });
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando promoções..." />;
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
        <Text variant="headlineMedium" style={styles.title}>Gerenciar Promoções</Text>
        <Searchbar placeholder="Buscar produtos..." value={searchQuery} onChangeText={setSearchQuery} style={styles.searchBar} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          <Chip mode={category === undefined ? 'flat' : 'outlined'} selected={category === undefined} onPress={() => setCategory(undefined)} style={styles.chip}>Todas</Chip>
          {categories.map(cat => (
            <Chip key={cat} mode={category === cat ? 'flat' : 'outlined'} selected={category === cat} onPress={() => setCategory(cat)} style={styles.chip}>{cat}</Chip>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}> 
        {error && <ErrorMessage message={error} onRetry={loadPromotions} />}
        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text variant="bodyLarge">Nenhum produto em promoção</Text>
            <Button mode="contained" onPress={() => setSearchQuery('')} style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]}>Limpar Filtros</Button>
          </View>
        ) : (
          visible.map(p => (
            <Card key={p.id} style={styles.card}>
              <Card.Content>
                <View style={styles.rowBetween}>
                  <Text variant="titleMedium">{p.nome}</Text>
                  {(() => {
                    const status = getPromotionStatus(p);
                    const style =
                      status === 'Ativa'
                        ? { backgroundColor: '#FF69B4' }
                        : status === 'Expirada'
                          ? { backgroundColor: '#F44336' }
                          : status === 'Agendada'
                            ? { backgroundColor: '#FFC107' }
                            : {};
                    return <Chip mode={status === 'Normal' ? 'outlined' : 'flat'} style={[styles.promoChip, style]}>{status}</Chip>;
                  })()}
                </View>
                <Text variant="bodySmall">Categoria: {p.categoria}</Text>
                <Text variant="titleSmall" style={styles.price}>R$ {p.preco.toFixed(2)}</Text>
                {p.detalhes && (p.detalhes as any).promocaoInicio && (p.detalhes as any).promocaoFim && (
                  <Text variant="bodySmall">Promoção de {(p.detalhes as any).promocaoInicio} a {(p.detalhes as any).promocaoFim}</Text>
                )}
                <Divider style={styles.divider} />
                <View style={styles.actionsRow}>
                  <Button mode="outlined" onPress={() => togglePromotionTag(p)}>{Array.isArray(p.tagsEspeciais) && p.tagsEspeciais.includes('promocao') ? 'Remover promoção' : 'Marcar promoção'}</Button>
                  <Button mode="contained" onPress={() => openDiscountDialog(p)} style={styles.applyBtn}>Aplicar desconto</Button>
                  <Button mode="text" onPress={() => openScheduleRange(p)}>Agendar período</Button>
                </View>
              </Card.Content>
            </Card>
          ))
        )}
        {visible.length < filtered.length && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Button mode="outlined" onPress={() => setPage(p => p + 1)}>Carregar mais</Button>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={discountDialogOpen} onDismiss={() => setDiscountDialogOpen(false)}>
          <Dialog.Title>Aplicar desconto (%)</Dialog.Title>
          <Dialog.Content>
            <TextInput label="Percentual" value={discountPercent} onChangeText={setDiscountPercent} keyboardType="numeric" />
            {targetProduct && newPricePreview != null && (
              <View style={{ marginTop: 12 }}>
                <Text>Preço atual: R$ {targetProduct.preco.toFixed(2)}</Text>
                <Text>Novo preço: R$ {Number(newPricePreview).toFixed(2)}</Text>
              </View>
            )}
            {suggestionLoading && (
              <View style={{ marginTop: 12 }}>
                <Text>Calculando sugestão de preço...</Text>
              </View>
            )}
            {!suggestionLoading && suggestedPrice != null && targetProduct && (
              <View style={{ marginTop: 12 }}>
                <Text>Preço sugerido: R$ {Number(suggestedPrice).toFixed(2)}</Text>
                {suggestionConfidence != null && (
                  <Text>Confiança: {(suggestionConfidence * 100).toFixed(0)}%</Text>
                )}
                {suggestionReasons.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {suggestionReasons.slice(0, 3).map((r, idx) => (
                      <Text key={`${idx}`}>• {r}</Text>
                    ))}
                  </View>
                )}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDiscountDialogOpen(false)}>Cancelar</Button>
            {suggestedPrice != null && (
              <Button onPress={applySuggestedPrice}>Aplicar sugerido</Button>
            )}
            <Button onPress={applyDiscount}>Aplicar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <DatePickerModal
        locale="pt"
        mode="range"
        visible={rangeOpen}
        onDismiss={() => setRangeOpen(false)}
        startDate={range.startDate}
        endDate={range.endDate}
        onConfirm={(params: { startDate?: Date; endDate?: Date }) => confirmScheduleRange({ startDate: params.startDate, endDate: params.endDate })}
        onChange={(params: { startDate?: Date; endDate?: Date }) => setRange({ startDate: params.startDate, endDate: params.endDate })}
      />
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000}>
        {snackbarMessage}
      </Snackbar>
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
  scroll: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyBtn: { marginTop: 12 },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  promoChip: { height: 24 },
  divider: { marginTop: 12, marginBottom: 8 },
  price: { color: '#FF69B4', fontWeight: 'bold' },
  actionsRow: { flexDirection: 'row', alignItems: 'center' },
  applyBtn: { marginLeft: 8, backgroundColor: '#FF69B4' },
});

export default PromotionManagementScreen;
