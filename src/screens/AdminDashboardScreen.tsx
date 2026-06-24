import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Button, Card, Divider, List, Surface, FAB, Badge } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { useAppTheme } from '../components/ThemeProvider';
import { OrderService } from '../services/OrderService';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { OrderWatchdogService } from '../services/OrderWatchdogService';
import { SalesAutomationService } from '../services/SalesAutomationService';
import { f } from '../config/firebase';
import { DemandForecastService, ProductDemandInsight } from '../services/DemandForecastService';
import { RecommendationService, ProductRecommendation } from '../services/RecommendationService';
import { GrowthIntelligenceService, GrowthMetrics } from '../services/GrowthIntelligenceService';
import { MarketplaceExpansionService, CityExpansionMetrics } from '../services/MarketplaceExpansionService';
import { AutonomousGrowthOrchestrator, AutonomousAction } from '../services/AutonomousGrowthOrchestrator';
import { ReleaseService, ReleaseState } from '../services/ReleaseService';
import { DeliveryDriver } from '../types/DeliveryDriver';
// MISSÃO ZERO TELA BRANCA: Reativando Mapa com proteção, Gráfico nativo customizado em uso
import MapView, { Marker } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { Order, OrderStatus } from '../types/Order';
import { formatCurrency } from '../utils/formatters';

// Componente de proteção de módulo para evitar tela branca (ErrorBoundary local)
class ModuleBoundary extends React.Component<{ name: string, fallback: React.ReactNode, children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.log(`[Diagnostic] Erro isolado no módulo ${this.props.name}:`, error);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const screenWidth = Dimensions.get('window').width;

// Componente para item de pedido na lista ao vivo
const LiveOrderItem = ({ order, theme }: { order: Order; theme: any }) => {
  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return '#9E9E9E'; // Cinza
      case 'confirmed': return '#2196F3'; // Azul
      case 'preparing': return '#FF9800'; // Laranja
      case 'ready': return '#FFEB3B'; // Amarelo
      case 'delivering': return '#9C27B0'; // Roxo
      case 'delivered': return '#4CAF50'; // Verde
      case 'cancelled': return '#F44336'; // Vermelho
      default: return '#000000';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'confirmed': return 'Confirmado';
      case 'preparing': return 'Preparando';
      case 'ready': return 'Pronto';
      case 'delivering': return 'Em Entrega';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return status;
    }
  };

  const getElapsedTime = (updatedAt: any) => {
    const now = new Date();
    const updated = new Date(updatedAt);
    const diff = Math.floor((now.getTime() - updated.getTime()) / (1000 * 60));
    return diff;
  };

  const elapsed = getElapsedTime(order.updatedAt);
  const timeColor = elapsed > 30 ? '#F44336' : elapsed > 15 ? '#FF9800' : '#4CAF50';

  return (
    <Card style={{ marginVertical: 4, borderRadius: 8, elevation: 1 }}>
      <Card.Content style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}>
        <View style={{ width: 4, height: '100%', backgroundColor: getStatusColor(order.status), marginRight: 12, borderRadius: 2 }} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text variant="titleSmall">#{order.id.substring(0, 8)}</Text>
            <Text variant="bodySmall" style={{ color: timeColor, fontWeight: 'bold' }}>{elapsed} min</Text>
          </View>
          <Text variant="bodySmall" style={{ color: theme.colors.text.secondary }}>{getStatusLabel(order.status)}</Text>
        </View>
        <Text variant="titleSmall" style={{ marginLeft: 8 }}>{formatCurrency(order.totalAmount)}</Text>
      </Card.Content>
    </Card>
  );
};

// Gráfico Seguro (Pure React Native Views) para evitar crashes do react-native-svg
const SafeBarChart = ({ data, labels, theme }: { data: number[], labels: string[], theme: any }) => {
  const max = Math.max(...data, 1); // evita divisão por zero
  return (
    <View style={{ height: 220, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 32, paddingBottom: 16, backgroundColor: theme.colors.surface, borderRadius: 16 }}>
      {data.map((val, i) => {
        const heightPct = (val / max) * 100;
        return (
          <View key={i} style={{ alignItems: 'center', width: 30 }}>
            <Text style={{ fontSize: 10, color: theme.colors.text.secondary, marginBottom: 4 }}>{Math.round(val)}</Text>
            <View style={{ height: 120, width: '100%', justifyContent: 'flex-end', backgroundColor: '#F5F5F5', borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ height: `${heightPct}%`, width: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 }} />
            </View>
            <Text style={{ fontSize: 10, color: theme.colors.text.primary, marginTop: 8, fontWeight: 'bold' }}>{labels[i]}</Text>
          </View>
        );
      })}
    </View>
  );
};

export function AdminDashboardScreen() {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Serviços (Instâncias Únicas)
  const orderService = React.useMemo(() => OrderService.getInstance(), []);
  const driverService = React.useMemo(() => new DeliveryDriverService(), []);
  const watchdogService = React.useMemo(() => OrderWatchdogService.getInstance(), []);
  const automationService = React.useMemo(() => SalesAutomationService.getInstance(), []);
  const demandService = React.useMemo(() => DemandForecastService.getInstance(), []);
  const recommendationService = React.useMemo(() => RecommendationService.getInstance(), []);
  const growthIntelService = React.useMemo(() => GrowthIntelligenceService.getInstance(), []);
  const marketplaceService = React.useMemo(() => MarketplaceExpansionService.getInstance(), []);
  const autonomousOrchestrator = React.useMemo(() => AutonomousGrowthOrchestrator.getInstance(), []);
  const releaseService = React.useMemo(() => ReleaseService.getInstance(), []);

  // Estado Centralizado
  const [releaseState, setReleaseState] = useState<ReleaseState | null>(null);
  const [activeDrivers, setActiveDrivers] = useState<DeliveryDriver[]>([]);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [demandInsights, setDemandInsights] = useState<ProductDemandInsight[]>([]);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null);
  const [cityMetrics, setCityMetrics] = useState<CityExpansionMetrics[]>([]);
  const [autonomousActions, setAutonomousActions] = useState<AutonomousAction[]>([]);
  const [alerts, setAlerts] = useState<{ id: string; type: 'payment' | 'stuck' | 'stock' | 'growth' | 'marketplace' | 'autonomous' | 'release'; message: string; timestamp: Date }[]>([]);
  const [pendingDriversCount, setPendingDriversCount] = useState(0);
  
  const [stats, setStats] = useState({
    dailySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    pendingOrders: 0,
    activeOrders: 0,
    stuckOrders: 0,
    failedPayments: 0,
    stockAlerts: 0,
    scheduledOrders: 0,
    chartData: [] as number[],
    chartLabels: [] as string[]
  });

  // Função para carregar inteligência de dados
  const loadIntelligence = React.useCallback(async () => {
    try {
      // 1. Carregar estatísticas reais de pedidos
      const userRole = ((user as any)?.role || (user as any)?.activeRole || '').toLowerCase();
      const producerId = (user as any)?.id || (user as any)?.uid;
      const orders =
        userRole === 'admin'
          ? await orderService.getOrders()
          : (userRole === 'producer' || userRole === 'produtor') && producerId
            ? await orderService.getOrdersByProducerId(producerId)
            : await orderService.getOrders();
      if (!orders || orders.length === 0) {
        setStats(prev => ({
          ...prev,
          dailySales: 0,
          pendingOrders: 0,
          activeOrders: 0,
          scheduledOrders: 0,
          chartData: [0, 0, 0, 0, 0, 0, 0],
          chartLabels: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
        }));
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

      let dailySales = 0;
      let pendingOrders = 0;
      let activeOrders = 0;
      let scheduledOrders = 0;

      // Calcular dados dos últimos 7 dias para o gráfico
      const last7Days = Array(7).fill(0);
      const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const currentDay = new Date().getDay();
      const chartLabels: string[] = [];
      for (let i = 6; i >= 0; i--) {
        let d = currentDay - i;
        if (d < 0) d += 7;
        chartLabels.push(dayNames[d]);
      }

      orders.forEach((order: Order) => {
        const orderDate = new Date(order.createdAt);
        
        // Vendas hoje
        if (orderDate >= today && (order.status === 'delivered' || order.status === 'delivering' || order.status === 'ready' || order.status === 'preparing' || order.status === 'confirmed')) {
          dailySales += order.totalAmount || 0;
        }

        // Gráfico de Tendência (Últimos 7 dias)
        const diffTime = Math.abs(today.getTime() - new Date(orderDate.setHours(0,0,0,0)).getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 7 && order.status !== 'cancelled') {
          // index 6 is today, 5 is yesterday...
          const index = 6 - diffDays;
          if (index >= 0 && index < 7) {
            last7Days[index] += order.totalAmount || 0;
          }
        }

        // Status
        if (order.status === 'pending') pendingOrders++;
        if (order.status === 'preparing') activeOrders++;
        if (order.status === 'confirmed') scheduledOrders++; // Consider confirmed as scheduled for now
      });

        setStats(prev => ({
          ...prev,
          dailySales,
          pendingOrders,
          activeOrders,
          scheduledOrders,
          chartData: last7Days,
          chartLabels
        }));
      }

      // 2. Insights Reais do DemandForecastService
      const insights = await demandService.generateDemandInsights();
      if (insights && insights.length > 0) {
        setDemandInsights(insights);
      }

      if (userRole === 'admin') {
        try {
          const pendingDrivers = await driverService.getDriversByStatus('pending');
          setPendingDriversCount(pendingDrivers.length);
        } catch (error) {
          console.error('Erro ao carregar entregadores pendentes:', error);
          setPendingDriversCount(0);
        }
      } else {
        setPendingDriversCount(0);
      }

    } catch (error) {
      console.error('Erro ao carregar inteligência:', error);
    }
    setLoading(false);
  }, [orderService, demandService, driverService, user]);

  useEffect(() => {
    loadIntelligence();
  }, [loadIntelligence]);

  const loadDashboardData = async () => {
    setRefreshing(true);
    await loadIntelligence();
    setRefreshing(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando painel administrativo..." />;
  }

  // Verificar se o usuário é administrador ou produtor
  const role = ((user as any)?.role || (user as any)?.activeRole || '').toLowerCase();
  const hasAccess = role === 'admin' || role === 'producer' || role === 'produtor';

  if (!hasAccess) {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  // MISSÃO ZERO TELA BRANCA: Diagnostic Mode Removido, renderizando dashboard real com proteção nos módulos pesados.
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Surface style={styles.premiumHeader} elevation={2}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Olá, {user?.nome || user?.name || 'Produtor'}! 👋</Text>
            <Text style={styles.headerSubtitle}>Aqui está o resumo da sua confeitaria hoje.</Text>
          </View>
        </Surface>

        <View style={styles.aiInsightContainer}>
          <Surface style={styles.aiInsightSurface} elevation={2}>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons name="robot-outline" size={20} color="#9C27B0" />
              <Text style={styles.aiTitle}>Insights Açucaradas</Text>
            </View>
            {demandInsights.length > 0 ? (
              <Text style={styles.aiText}>
                Seu produto <Text style={styles.aiHighlight}>{demandInsights[0].productName}</Text> está com tendência de alta. Mantenha o estoque preparado!
              </Text>
            ) : (
              <Text style={styles.aiText}>
                O assistente está analisando suas vendas para gerar insights reais em breve.
              </Text>
            )}
          </Surface>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Vendas Hoje
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: theme.colors.primary }]}>
                {formatCurrency(stats.dailySales)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Pedidos Pendentes
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: '#E91E63' }]}>
                {stats.pendingOrders}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Em Preparo
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: '#FF9800' }]}>
                {stats.activeOrders}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Próximos Pedidos
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: '#2196F3' }]}>
                {stats.scheduledOrders}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Surface style={styles.chartSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Tendência de Vendas
          </Text>
          <SafeBarChart
            theme={theme}
            labels={stats.chartLabels && stats.chartLabels.length > 0 ? stats.chartLabels : ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]}
            data={stats.chartData && stats.chartData.length > 0 ? stats.chartData : [0, 0, 0, 0, 0, 0, 0]}
          />
        </Surface>

        <Surface style={styles.mapSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Entregadores Online ({activeDrivers.length})
          </Text>
          <View style={styles.mapContainer}>
            <ModuleBoundary
              name="Mapa de Entregadores"
              fallback={
                <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFEBEE', borderRadius: 16 }]}>
                  <Ionicons name="map-outline" size={48} color="#D32F2F" />
                  <Text style={{ marginTop: 8, color: '#C62828' }}>Mapa indisponível</Text>
                </View>
              }
            >
              {MapView ? (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: -23.5505,
                    longitude: -46.6333,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                  }}
                >
                  {activeDrivers.map((driver) => (
                    driver.location && (
                      <Marker
                        key={driver.id}
                        coordinate={{
                          latitude: driver.location.latitude,
                          longitude: driver.location.longitude,
                        }}
                        title={driver.name}
                        description={`Veículo: ${driver.vehicle.model}`}
                      />
                    )
                  ))}
                </MapView>
              ) : (
                <View style={[styles.map, { justifyContent: 'center', alignItems: 'center', backgroundColor: '#eee' }]}>
                  <Ionicons name="map-outline" size={48} color="#ccc" />
                  <Text>Mapa desativado temporariamente</Text>
                </View>
              )}
            </ModuleBoundary>
          </View>
        </Surface>

        <Surface style={styles.menuSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Gerenciamento
          </Text>

          <Divider style={styles.divider} />

          <List.Item
            title="Produtos"
            description="Gerenciar catálogo de produtos"
            left={() => <List.Icon icon="cake-variant" color={theme.colors.primary} />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => (navigation as any).navigate('ProductManagement')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Pedidos"
            description="Gerenciar pedidos recebidos"
            left={() => <List.Icon icon="shopping" color={theme.colors.primary} />}
            right={() => (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.pendingOrders}</Text>
              </View>
            )}
            onPress={() => (navigation as any).navigate('OrderManagement')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Pedidos Agendados"
            description="Gerenciar entregas agendadas"
            left={() => <List.Icon icon="calendar-clock" color={theme.colors.primary} />}
            right={() => (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.scheduledOrders}</Text>
              </View>
            )}
            onPress={() => (navigation as any).navigate('ScheduledOrders')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Estoque"
            description="Gerenciar estoque de ingredientes"
            left={() => <List.Icon icon="package-variant" color={theme.colors.primary} />}
            right={() =>
              stats.stockAlerts > 0 ? (
                <View style={[styles.badge, { backgroundColor: theme.colors.error }]}>
                  <Text style={styles.badgeText}>{stats.stockAlerts}</Text>
                </View>
              ) : (
                <List.Icon icon="chevron-right" />
              )
            }
            onPress={() => (navigation as any).navigate('InventoryManagement')}
            style={styles.menuItem}
          />

          <Divider />

          {role === 'admin' && (
            <>
              <List.Item
                title="Aprovar Entregadores"
                description="Gerenciar aprovação e status dos entregadores"
                left={() => <List.Icon icon="moped" color={theme.colors.primary} />}
                right={() =>
                  pendingDriversCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{pendingDriversCount}</Text>
                    </View>
                  ) : (
                    <List.Icon icon="chevron-right" />
                  )
                }
                onPress={() => (navigation as any).navigate('DriverApprovalManagement')}
                style={styles.menuItem}
              />

              <Divider />
            </>
          )}

          <List.Item
            title="Clientes"
            description="Gerenciar cadastro de clientes"
            left={() => <List.Icon icon="account-group" color={theme.colors.primary} />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => (navigation as any).navigate('CustomerManagement')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Promoções"
            description="Gerenciar cupons e descontos"
            left={() => <List.Icon icon="tag" color={theme.colors.primary} />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => (navigation as any).navigate('PromotionManagement')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Relatórios"
            description="Visualizar relatórios e análises de vendas"
            left={() => <List.Icon icon="chart-bar" color={theme.colors.primary} />}
            right={() => <List.Icon icon="chart-line" color={theme.colors.primary} />}
            onPress={() => (navigation as any).navigate('ReportsScreen')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Configurações"
            description="Configurações do sistema"
            left={() => <List.Icon icon="cog" color={theme.colors.primary} />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => (navigation as any).navigate('AdminSettings')}
            style={styles.menuItem}
          />
        </Surface>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => (navigation as any).navigate('AddProduct')}
        color="#FFFFFF"
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: { colors: any }) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollView: {
    flex: 1,
  },
  premiumHeader: {
    padding: 24,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 15,
    marginTop: 4,
  },
  aiInsightContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  aiInsightSurface: {
    borderRadius: 16,
    backgroundColor: '#F3E5F5',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E1BEE7',
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#9C27B0',
    marginLeft: 8,
  },
  aiText: {
    fontSize: 14,
    color: '#4A148C',
    lineHeight: 20,
  },
  aiHighlight: {
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  statsCard: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  statsTitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  statsValue: {
    fontWeight: 'bold',
  },
  chartSection: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  mapSection: {
    margin: 16,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
    elevation: 2,
    marginBottom: 40,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  map: {
    flex: 1,
  },
  menuSection: {
    margin: 16,
    padding: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  divider: {
    marginVertical: 8,
  },
  menuItem: {
    paddingVertical: 8,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.primary,
  },
});
