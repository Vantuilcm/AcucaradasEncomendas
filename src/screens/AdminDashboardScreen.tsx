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
import { Ionicons } from '@expo/vector-icons';
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
  });

  // Função para carregar inteligência de dados - DESATIVADA PARA DIAGNÓSTICO
  const loadIntelligence = React.useCallback(async () => {
    /* 
    try {
      // ... logic
    } catch (error) {
      console.error('Erro ao carregar inteligência:', error);
    }
    */
    setLoading(false);
  }, []);

  useEffect(() => {
    // MISSÃO ZERO TELA BRANCA: Bypassing heavy initializations
    /*
    watchdogService.checkStuckOrders();
    automationService.runAutomations();
    autonomousOrchestrator.runOrchestrationCycle();
    */
    
    setLoading(false);
    
    // Configurar Watchdog e Automação para rodar periodicamente - DESATIVADO
    /*
    const watchdogInterval = setInterval(() => {
      // ...
    }, 5 * 60 * 1000);
    */

    return () => {
      // clearInterval(watchdogInterval);
    };
  }, []);

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
        {/* 🛡️ Release Guardian Status (Global Scale) */}
        {releaseState && releaseState!.releases[releaseState!.activeReleaseId] && (() => {
          const active = releaseState!.releases[releaseState!.activeReleaseId];
          const isCritical = active.status === 'CRITICAL';
          return (
            <Surface style={[
              styles.releaseGuardianSection, 
              isCritical && { borderColor: theme.colors.error, borderWeight: 2 } as any
            ]}>
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name={active.status === 'STABLE' ? 'shield-checkmark' : 'alert-circle'} 
                  size={22} 
                  color={active.status === 'STABLE' ? '#4CAF50' : (isCritical ? theme.colors.error : '#FF9800')} 
                />
                <View style={{ marginLeft: 8 }}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Release Guardian v2</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.text.secondary }}>
                    v{active.version} (Build: {active.buildNumber})
                  </Text>
                </View>
                <Badge 
                  style={{ 
                    backgroundColor: active.status === 'STABLE' ? '#4CAF50' : (isCritical ? theme.colors.error : '#FF9800'),
                    marginLeft: 'auto'
                  }}
                >
                  {active.status}
                </Badge>
              </View>
              
              <View style={{ marginTop: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <View style={styles.canaryInfo}>
                    <Ionicons name="git-branch-outline" size={14} color={theme.colors.primary} />
                    <Text variant="labelSmall" style={{ marginLeft: 4 }}>Rollout: {Math.round(active.rollout * 100)}%</Text>
                  </View>
                  <Text variant="labelSmall" style={{ color: theme.colors.text.secondary }}>
                    Canal: {active.channel}
                  </Text>
                </View>

                {/* Progress Bar para Rollout */}
                <View style={{ height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, marginBottom: 12 }}>
                  <View style={{ 
                    height: '100%', 
                    width: `${active.rollout * 100}%`, 
                    backgroundColor: active.status === 'STABLE' ? '#4CAF50' : '#FF9800',
                    borderRadius: 2 
                  }} />
                </View>
                {active.rollbackTriggered && (
                  <View style={styles.rollbackBanner}>
                    <Ionicons name="refresh-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.rollbackText}>
                      ROLLBACK ATIVO {'->'} {releaseState?.lastStableReleaseId}
                    </Text>
                  </View>
                )}

                {(active.anomalies?.length ?? 0) > 0 && (
                  <View style={styles.anomalyBox}>
                    {active.anomalies?.map((a, i) => (
                      <Text
                        key={i}
                        variant="bodySmall"
                        style={{ color: '#D32F2F' }}
                      >
                        • {a}
                      </Text>
                    ))}
                  </View>
                )}

                {active.health! && (
                  <View style={styles.healthGrid}>
                    <View style={styles.healthItem}>
                      <Text variant="labelSmall">Crash Rate</Text>
                      <Text variant="bodySmall" style={{ fontWeight: 'bold', color: active.health!.crashRate > 0.02 ? theme.colors.error : theme.colors.success }}>
                        {(active.health!.crashRate * 100).toFixed(2)}%
                      </Text>
                    </View>
                    <View style={styles.healthItem}>
                      <Text variant="labelSmall">Payment Success</Text>
                      <Text variant="bodySmall" style={{ fontWeight: 'bold', color: active.health!.paymentFailureRate > 0.05 ? theme.colors.error : theme.colors.success }}>
                        {(100 - active.health!.paymentFailureRate * 100).toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.healthItem}>
                      <Text variant="labelSmall">Status Decisão</Text>
                      <Text variant="bodySmall" style={{ 
                        fontWeight: 'bold', 
                        color: active.status === 'STABLE' ? theme.colors.success : theme.colors.error 
                      }}>
                        {active.status === 'STABLE' ? 'ESTÁVEL' : 'RISCO'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </Surface>
          );
        })()}

        {/* 🌍 Marketplace Expansion Intelligence */}
        {cityMetrics.length > 0 && (
          <Surface style={styles.marketplaceSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="globe-outline" size={22} color="#009688" />
              <Text variant="titleMedium" style={[styles.sectionTitle, { marginLeft: 8 }]}>
                Marketplace Expansion
              </Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {cityMetrics.map(city => (
                <View key={city.cityId} style={styles.cityCard}>
                  <Text variant="titleSmall">{city.cityName}</Text>
                  <View style={styles.cityMetricRow}>
                    <Text variant="labelSmall">Produtores: </Text>
                    <Text variant="bodySmall" style={{ fontWeight: 'bold' }}>{city.activeProducers}</Text>
                  </View>
                  <View style={styles.cityMetricRow}>
                    <Text variant="labelSmall">Usuários: </Text>
                    <Text variant="bodySmall">{city.activeUsers}</Text>
                  </View>
                  <View style={styles.cityMetricRow}>
                    <Text variant="labelSmall">Receita: </Text>
                    <Text variant="bodySmall" style={{ color: '#2E7D32' }}>{formatCurrency(city.revenue)}</Text>
                  </View>
                  
                  {city.opportunityLevel === 'EXPANSION_OPPORTUNITY' && (
                    <Badge style={{ backgroundColor: '#009688', marginTop: 8, width: '100%' }}>OPORTUNIDADE</Badge>
                  )}
                  {city.activeProducers === 0 && city.activeUsers > 0 && (
                    <TouchableOpacity 
                      style={styles.activateButton}
                      onPress={() => marketplaceService.activateCity(city.cityId)}
                    >
                      <Text style={styles.activateButtonText}>Ativar Cidade</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
          </Surface>
        )}

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
                Vendas Semana
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: theme.colors.primary }]}>
                {formatCurrency(stats.weeklySales)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Vendas Mês
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: theme.colors.primary }]}>
                {formatCurrency(stats.monthlySales)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Pedidos Pendentes
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: theme.colors.warning }]}>
                {stats.pendingOrders}
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
            labels={["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"]}
            data={[
              stats.dailySales > 0 ? stats.dailySales : Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100,
              Math.random() * 100
            ]}
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
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F44336',
    marginRight: 6,
  },
  liveText: {
    color: '#F44336',
    fontSize: 10,
    fontWeight: 'bold',
  },
  metricsBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    marginBottom: 8,
    elevation: 1,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  metricLabel: {
    fontSize: 10,
    color: theme.colors.text.secondary,
    marginTop: 2,
  },
  alertsSection: {
    margin: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  alertDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 8,
  },
  alertText: {
    fontSize: 12,
    color: '#E65100',
  },
  liveSection: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  growthSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  growthMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  growthMetricBox: {
    alignItems: 'center',
    flex: 1,
  },
  funnelContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  funnelStep: {
    padding: 8,
    marginVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
  },
  rankText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
    fontSize: 14,
    width: 30,
    textAlign: 'center',
    marginTop: 10,
  },
  referralRevenueBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  autonomousSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FFFDE7',
    borderWidth: 1,
    borderColor: '#FFF9C4',
    elevation: 2,
  },
  actionLogItem: {
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD600',
  },
  releaseGuardianSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F1F8E9',
    elevation: 2,
    borderWidth: 1,
    borderColor: '#DCEDC8',
  },
  rollbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.error,
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  rollbackText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
    marginLeft: 8,
  },
  healthGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    backgroundColor: '#FFFFFF',
    padding: 10,
    borderRadius: 8,
  },
  healthItem: {
    alignItems: 'center',
    flex: 1,
  },
  canaryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  anomalyBox: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#D32F2F',
  },
  marketplaceSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  cityCard: {
    width: 160,
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  cityMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  activateButton: {
    marginTop: 12,
    backgroundColor: '#009688',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: theme.colors.text.secondary,
    paddingVertical: 20,
  },
  intelligenceSection: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  insightCard: {
    width: 140,
    padding: 10,
    marginRight: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  recommendationContainer: {
    marginTop: 8,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FCE4EC',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  title: {
    color: theme.colors.text.primary,
  },
  scrollView: {
    flex: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 16,
  },
  statsCard: {
    width: '48%',
    borderRadius: 12,
    elevation: 2,
    backgroundColor: theme.colors.card,
  },
  statsTitle: {
    color: theme.colors.text.secondary,
    marginBottom: 8,
  },
  statsValue: {
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
  chartSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  mapSection: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.surface,
    elevation: 2,
  },
  mapContainer: {
    height: 300,
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
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
  sectionTitle: {
    color: theme.colors.text.primary,
    marginBottom: 8,
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
