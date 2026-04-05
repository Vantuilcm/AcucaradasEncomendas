import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, List, Surface, FAB, Badge } from 'react-native-paper';
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
import { 
  collection, 
  query, 
  limit, 
  orderBy, 
  // @ts-ignore
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { DemandForecastService, ProductDemandInsight } from '../services/DemandForecastService';
import { RecommendationService, ProductRecommendation } from '../services/RecommendationService';
import { GrowthIntelligenceService, GrowthMetrics } from '../services/GrowthIntelligenceService';
import { MarketplaceExpansionService, CityExpansionMetrics } from '../services/MarketplaceExpansionService';
import { AutonomousGrowthOrchestrator, AutonomousAction } from '../services/AutonomousGrowthOrchestrator';
import { ReleaseService, ReleaseState } from '../services/ReleaseService';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { LineChart } from 'react-native-chart-kit';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Dimensions } from 'react-native';
import { Order, OrderStatus } from '../types/Order';
import { formatCurrency } from '../utils/formatters';

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

export function AdminDashboardScreen() {
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  const [activeDrivers, setActiveDrivers] = useState<DeliveryDriver[]>([]);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [demandInsights, setDemandInsights] = useState<ProductDemandInsight[]>([]);
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);
  const [growthMetrics, setGrowthMetrics] = useState<GrowthMetrics | null>(null);
  const [cityMetrics, setCityMetrics] = useState<CityExpansionMetrics[]>([]);
  const [autonomousActions, setAutonomousActions] = useState<AutonomousAction[]>([]);
  const [releaseState, setReleaseState] = useState<ReleaseState | null>(null);
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

  useEffect(() => {
    // Iniciar Watchdog Operacional e Automação de Vendas (Hybrid Mode)
    watchdogService.checkStuckOrders();
    automationService.runAutomations();
    autonomousOrchestrator.runOrchestrationCycle();
    
    // Carregar Inteligência de Demanda
    const loadIntelligence = async () => {
      const insights = await demandService.generateDemandInsights();
      setDemandInsights(insights);
      
      const recs = await recommendationService.generateMarketBasketAnalysis();
      setRecommendations(recs);
      console.log(`💡 [Intelligence] ${recs.length} recomendações geradas`);

      // 📊 Growth Intelligence
      const metrics = await growthIntelService.calculateMetrics();
      setGrowthMetrics(metrics);
      const growthAlerts = await growthIntelService.detectAnomalies(metrics);
      
      const newGrowthAlerts = growthAlerts.map((msg, idx) => ({
        id: `growth-${idx}-${Date.now()}`,
        type: 'growth' as const,
        message: msg,
        timestamp: new Date()
      }));

      // 🌍 Marketplace Expansion
      const cities = await marketplaceService.getCityMetrics();
      setCityMetrics(cities);
      
      const marketplaceAlerts = cities
        .filter(c => c.opportunityLevel === 'EXPANSION_OPPORTUNITY')
        .map(c => ({
          id: `market-${c.cityId}`,
          type: 'marketplace' as const,
          message: `OPORTUNIDADE: ${c.cityName} tem ${c.activeUsers} usuários e 0 produtores!`,
          timestamp: new Date()
        }));

      // Gerar alertas de estoque baseado em demanda
      const stockAlerts = insights
        .filter(i => i.repositionRequired)
        .map(i => ({
          id: `stock-${i.productId}`,
          type: 'stock' as const,
          message: `REPOR AGORA: ${i.productName} (Demanda Alta / Estoque ${i.currentStock})`,
          timestamp: new Date()
        }));
      
      setAlerts(prev => {
        const filtered = prev.filter(a => a.type !== 'stock' && a.type !== 'growth' && a.type !== 'marketplace');
        return [...filtered, ...stockAlerts, ...newGrowthAlerts, ...marketplaceAlerts];
      });
    };

    loadIntelligence();
    
    // Configurar Watchdog e Automação para rodar periodicamente
    const watchdogInterval = setInterval(() => {
      watchdogService.checkStuckOrders();
      automationService.runAutomations();
      loadIntelligence();
    }, 5 * 60 * 1000);

    const unsubscribeOrders = orderService.subscribeToOrderStats((realtimeStats) => {
      setStats(prev => ({
        ...prev,
        dailySales: realtimeStats.todayRevenue,
        weeklySales: realtimeStats.totalRevenue,
        monthlySales: realtimeStats.totalRevenue,
        pendingOrders: realtimeStats.statusCounts.pending,
        activeOrders: (realtimeStats.statusCounts.pending || 0) + 
                      (realtimeStats.statusCounts.confirmed || 0) + 
                      (realtimeStats.statusCounts.preparing || 0) + 
                      (realtimeStats.statusCounts.ready || 0) + 
                      (realtimeStats.statusCounts.delivering || 0),
        scheduledOrders: realtimeStats.scheduledOrders,
      }));
      setLoading(false);
    });

    // Monitorar pedidos ao vivo (últimos 50)
    const unsubscribeLiveOrders = orderService.subscribeToAllOrders((orders) => {
      setLiveOrders(orders.slice(0, 50));
      
      // Gerar alertas de pedidos travados baseado no tempo
      const now = new Date();
      const newStuckAlerts = orders
        .filter(o => {
          if (['delivered', 'cancelled'].includes(o.status)) return false;
          const updated = new Date(o.updatedAt);
          const diff = (now.getTime() - updated.getTime()) / (1000 * 60);
          return diff > 30; // Mais de 30 min parado
        })
        .map(o => ({
          id: `stuck-${o.id}`,
          type: 'stuck' as const,
          message: `Pedido #${o.id.substring(0, 8)} está parado há mais de 30 min`,
          timestamp: new Date()
        }));
      
      setAlerts(prev => {
        const filtered = prev.filter(a => a.type !== 'stuck');
        return [...filtered, ...newStuckAlerts].slice(0, 10);
      });

      setStats(prev => ({
        ...prev,
        stuckOrders: newStuckAlerts.length
      }));
    });

    const unsubscribeDrivers = driverService.subscribeToActiveDrivers((drivers) => {
      setActiveDrivers(drivers);
    });

    // Monitorar ações autônomas em tempo real
    const autonomousQuery = query(
      collection(db, 'autonomous_actions_log'),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    
    const unsubscribeAutonomous = onSnapshot(autonomousQuery, (snap: any) => {
      const actions = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() })) as AutonomousAction[];
      setAutonomousActions(actions);
      
      const autonomousAlerts = actions.map(action => ({
        id: `auto-${action.id}`,
        type: 'autonomous' as const,
        message: `ROBÔ: ${action.action === 'coupon_created' ? 'Cupom gerado' : 'Expansão ativada'} por ${action.reason}`,
        timestamp: new Date()
      }));
      
      setAlerts(prev => {
        const filtered = prev.filter(a => a.type !== 'autonomous');
        return [...filtered, ...autonomousAlerts].slice(0, 10);
      });
    });

    // Monitorar estado da release (Release Guardian)
    const unsubscribeRelease = releaseService.subscribeToReleaseState((state: ReleaseState) => {
      setReleaseState(state);
      
      const active = state.releases[state.activeReleaseId];
      if (active && active.status !== 'STABLE') {
        const releaseAlert = {
          id: `release-${active.buildNumber}`,
          type: 'release' as const,
          message: `⚠️ RELEASE ${active.status}: v${active.version} (${active.buildNumber})`,
          timestamp: new Date()
        };
        
        setAlerts(prev => {
          const filtered = prev.filter(a => a.type !== 'release');
          return [releaseAlert, ...filtered].slice(0, 10);
        });
      } else {
        setAlerts(prev => prev.filter(a => a.type !== 'release'));
      }
    });

    return () => {
      clearInterval(watchdogInterval);
      unsubscribeOrders();
      unsubscribeLiveOrders();
      unsubscribeDrivers();
      unsubscribeAutonomous();
      unsubscribeRelease();
    };
  }, [orderService, driverService, watchdogService]);

  const loadDashboardData = async () => {
    // Agora o loadDashboardData pode ser apenas para forçar um refresh se necessário,
    // embora o onSnapshot já cuide disso.
    setRefreshing(true);
    // Simular um delay pequeno para o UI de refresh
    setTimeout(() => setRefreshing(false), 500);
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
  if ((user as any)?.role !== 'admin' && (user as any)?.role !== 'producer') {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Centro de Comando Live
        </Text>
        <View style={styles.liveBadge}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>AO VIVO</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Top Metrics Bar */}
        <View style={styles.metricsBar}>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{stats.activeOrders}</Text>
            <Text style={styles.metricLabel}>Ativos</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.error }]}>{stats.stuckOrders}</Text>
            <Text style={styles.metricLabel}>Travados</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricValue}>{activeDrivers.length}</Text>
            <Text style={styles.metricLabel}>Drivers</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={[styles.metricValue, { color: theme.colors.primary }]}>{formatCurrency(stats.dailySales)}</Text>
            <Text style={styles.metricLabel}>Hoje</Text>
          </View>
        </View>

        {/* Alertas Críticos */}
        {alerts.length > 0 && (
          <Surface style={styles.alertsSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="alert-circle" size={20} color={theme.colors.error} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.error, marginLeft: 8 }]}>
                ALERTAS AGORA ({alerts.length})
              </Text>
            </View>
            {alerts.map(alert => (
              <View key={alert.id} style={styles.alertItem}>
                <View style={[styles.alertDot, { backgroundColor: alert.type === 'payment' ? theme.colors.error : (alert.type === 'stock' ? '#E91E63' : (alert.type === 'growth' ? '#673AB7' : (alert.type === 'marketplace' ? '#009688' : (alert.type === 'autonomous' ? '#FFD600' : theme.colors.warning)))) }]} />
                <Text style={[styles.alertText, (alert.type === 'stock' || alert.type === 'growth' || alert.type === 'marketplace' || alert.type === 'autonomous') && { color: alert.type === 'growth' ? '#4527A0' : (alert.type === 'marketplace' ? '#004D40' : (alert.type === 'autonomous' ? '#F57F17' : '#880E4F')), fontWeight: 'bold' }]}>{alert.message}</Text>
              </View>
            ))}
          </Surface>
        )}

        {/* Inteligência de Demanda */}
        {(demandInsights.length > 0 || recommendations.length > 0) && (
          <Surface style={styles.intelligenceSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              🔥 Inteligência de Vendas
            </Text>
            
            <Text variant="labelSmall" style={{ marginBottom: 8, color: theme.colors.text.secondary }}>
              Produtos com Alta Procura
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              {demandInsights.slice(0, 5).map(insight => (
                <View key={insight.productId} style={styles.insightCard}>
                  <Text variant="labelMedium" numberOfLines={1}>{insight.productName}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons 
                      name={insight.trend === 'UP' ? 'trending-up' : (insight.trend === 'DOWN' ? 'trending-down' : 'remove')} 
                      size={16} 
                      color={insight.trend === 'UP' ? theme.colors.success : (insight.trend === 'DOWN' ? theme.colors.error : theme.colors.text.secondary)} 
                    />
                    <Text variant="bodySmall" style={{ marginLeft: 4 }}>Score: {insight.score.toFixed(1)}</Text>
                  </View>
                  {insight.repositionRequired && (
                    <Badge style={{ backgroundColor: theme.colors.error, marginTop: 4 }}>REPOR</Badge>
                  )}
                </View>
              ))}
            </ScrollView>

            {recommendations.length > 0 && (
              <>
                <Text variant="labelSmall" style={{ marginBottom: 8, color: theme.colors.text.secondary }}>
                  Sugestão: Itens Comprados Juntos
                </Text>
                <View style={styles.recommendationContainer}>
                  {recommendations.slice(0, 3).map((rec, index) => (
                    <View key={`rec-${index}`} style={styles.recommendationItem}>
                      <Ionicons name="link" size={12} color={theme.colors.primary} />
                      <Text variant="bodySmall" style={{ marginLeft: 4 }}>
                        Frequência: {rec.strength}x
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </Surface>
        )}

        {/* Operação ao Vivo */}
        <Surface style={styles.liveSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Operação ao Vivo
          </Text>
          {liveOrders.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum pedido ativo no momento</Text>
          ) : (
            liveOrders.map(order => (
              <LiveOrderItem key={order.id} order={order} theme={theme} />
            ))
          )}
        </Surface>

        {/* 📊 Growth Intelligence */}
        {growthMetrics && (
          <Surface style={styles.growthSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="analytics" size={22} color={theme.colors.primary} />
              <Text variant="titleMedium" style={[styles.sectionTitle, { marginLeft: 8 }]}>
                Growth Intelligence
              </Text>
            </View>

            <View style={styles.growthMetricsRow}>
              <View style={styles.growthMetricBox}>
                <Text variant="labelSmall">CAC</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.error }}>{formatCurrency(growthMetrics.cac)}</Text>
              </View>
              <View style={styles.growthMetricBox}>
                <Text variant="labelSmall">LTV</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.primary }}>{formatCurrency(growthMetrics.ltv)}</Text>
              </View>
              <View style={styles.growthMetricBox}>
                <Text variant="labelSmall">ROI (LTV/CAC)</Text>
                <Text variant="titleMedium" style={{ color: theme.colors.success }}>{(growthMetrics.ltv / growthMetrics.cac).toFixed(1)}x</Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <Text variant="labelSmall" style={{ marginBottom: 8 }}>Funil de Vendas (AARRR)</Text>
            <View style={styles.funnelContainer}>
              <View style={[styles.funnelStep, { width: '100%', backgroundColor: '#E1F5FE' }]}>
                <Text variant="bodySmall">Visitantes: {growthMetrics.funnel.visitors}</Text>
              </View>
              <View style={[styles.funnelStep, { width: '85%', backgroundColor: '#B3E5FC' }]}>
                <Text variant="bodySmall">Cadastros: {growthMetrics.funnel.registered} ({(growthMetrics.funnel.registered / growthMetrics.funnel.visitors * 100).toFixed(0)}%)</Text>
              </View>
              <View style={[styles.funnelStep, { width: '70%', backgroundColor: '#81D4FA' }]}>
                <Text variant="bodySmall">Conversão: {growthMetrics.funnel.purchased} ({growthMetrics.conversionRate.toFixed(1)}%)</Text>
              </View>
              <View style={[styles.funnelStep, { width: '55%', backgroundColor: '#4FC3F7' }]}>
                <Text variant="bodySmall">Retenção: {growthMetrics.funnel.returned} ({growthMetrics.retentionRate.toFixed(1)}%)</Text>
              </View>
            </View>

            <Divider style={{ marginVertical: 12 }} />

            <Text variant="labelSmall" style={{ marginBottom: 8 }}>Top 3 Embaixadores (Indicação)</Text>
            {growthMetrics.topReferrers.slice(0, 3).map((ref, idx) => (
              <List.Item
                key={ref.userId}
                title={ref.name}
                description={`${ref.count} amigos indicados • ${formatCurrency(ref.value)} gerados`}
                left={() => <Text style={styles.rankText}>{idx + 1}º</Text>}
                style={{ paddingVertical: 0 }}
              />
            ))}
            
            <View style={styles.referralRevenueBox}>
              <Text variant="labelSmall">Receita por Indicação:</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>{formatCurrency(growthMetrics.referralRevenue)}</Text>
            </View>
          </Surface>
        )}

        {/* 🤖 Autonomous Growth Orchestrator Log */}
        {autonomousActions.length > 0 && (
          <Surface style={styles.autonomousSection}>
            <View style={styles.sectionHeader}>
              <Ionicons name="hardware-chip-outline" size={22} color="#FFD600" />
              <Text variant="titleMedium" style={[styles.sectionTitle, { marginLeft: 8 }]}>
                Ações Autônomas (AI)
              </Text>
            </View>
            {autonomousActions.map(action => (
              <View key={action.id} style={styles.actionLogItem}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text variant="labelMedium" style={{ color: '#F57F17', fontWeight: 'bold' }}>
                    {action.action.toUpperCase().replace('_', ' ')}
                  </Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.text.secondary }}>
                    {new Date(action.timestamp?.toDate ? action.timestamp.toDate() : action.timestamp).toLocaleTimeString()}
                  </Text>
                </View>
                <Text variant="bodySmall" style={{ marginTop: 4 }}>Motivo: {action.reason}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.primary }}>Impacto: {action.impact}</Text>
              </View>
            ))}
          </Surface>
        )}

        {/* 🛡️ Release Guardian Status (Global Scale) */}
        {releaseState && releaseState.releases[releaseState.activeReleaseId] && (() => {
          const active = releaseState.releases[releaseState.activeReleaseId];
          return (
            <Surface style={[styles.releaseGuardianSection, active.status === 'CRITICAL' && { borderColor: theme.colors.error, borderWeight: 2 } as any]}>
              <View style={styles.sectionHeader}>
                <Ionicons 
                  name={active.status === 'STABLE' ? 'shield-checkmark' : 'alert-circle'} 
                  size={22} 
                  color={active.status === 'STABLE' ? '#4CAF50' : (active.status === 'CRITICAL' ? theme.colors.error : '#FF9800')} 
                />
                <View style={{ marginLeft: 8 }}>
                  <Text variant="titleMedium" style={styles.sectionTitle}>Release Guardian</Text>
                  <Text variant="labelSmall" style={{ color: theme.colors.text.secondary }}>ID: {releaseState.activeReleaseId}</Text>
                </View>
                <Badge 
                  style={{ 
                    backgroundColor: active.status === 'STABLE' ? '#4CAF50' : (active.status === 'CRITICAL' ? theme.colors.error : '#FF9800'),
                    marginLeft: 'auto'
                  }}
                >
                  {active.status}
                </Badge>
              </View>
              
              <View style={{ marginTop: 8 }}>
                <View style={styles.canaryInfo}>
                  <Ionicons name="git-branch-outline" size={14} color={theme.colors.primary} />
                  <Text variant="labelSmall" style={{ marginLeft: 4 }}>Canal: {active.channel} ({active.rollout * 100}%)</Text>
                </View>

                {active.rollbackTriggered && (
                  <View style={styles.rollbackBanner}>
                    <Ionicons name="refresh-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.rollbackText}>ROLLBACK ATIVO {'->'} {releaseState.lastStableReleaseId}</Text>
                  </View>
                )}

                {active.anomalies && active.anomalies.length > 0 && (
                  <View style={styles.anomalyBox}>
                    {active.anomalies.map((a, i) => (
                      <Text key={i} variant="bodySmall" style={{ color: '#D32F2F' }}>• {a}</Text>
                    ))}
                  </View>
                )}

                {active.health && (
                  <View style={styles.healthGrid}>
                    <View style={styles.healthItem}>
                      <Text variant="labelSmall">Crash</Text>
                      <Text variant="bodySmall" style={{ color: active.health.crashRate > 0.02 ? theme.colors.error : theme.colors.success }}>
                        {(active.health.crashRate * 100).toFixed(2)}%
                      </Text>
                    </View>
                    <View style={styles.healthItem}>
                      <Text variant="labelSmall">Payment</Text>
                      <Text variant="bodySmall" style={{ color: active.health.paymentFailureRate > 0.05 ? theme.colors.error : theme.colors.success }}>
                        {(active.health.paymentFailureRate * 100).toFixed(1)}%
                      </Text>
                    </View>
                    <View style={styles.healthItem}>
                      <Text variant="labelSmall">Critical</Text>
                      <Text variant="bodySmall" style={{ color: active.health.criticalErrors > 3 ? theme.colors.error : theme.colors.success }}>
                        {active.health.criticalErrors}
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
          <LineChart
            data={{
              labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
              datasets: [
                {
                  data: [
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100,
                    Math.random() * 100
                  ]
                }
              ]
            }}
            width={screenWidth - 32}
            height={220}
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 2,
              color: (opacity = 1) => `rgba(255, 105, 180, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
              style: {
                borderRadius: 16
              },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: theme.colors.primary
              }
            }}
            bezier
            style={{
              marginVertical: 8,
              borderRadius: 16
            }}
          />
        </Surface>

        <Surface style={styles.mapSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Entregadores Online ({activeDrivers.length})
          </Text>
          <View style={styles.mapContainer}>
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
