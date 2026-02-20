import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, useTheme, Divider, List, Surface, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Ionicons } from '@expo/vector-icons';
import { Permission, PermissionsService, Role } from '../services/PermissionsService';
import { usePermissions } from '../hooks/usePermissions';
import { OrderService } from '../services/OrderService';
import { ProductService } from '../services/ProductService';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { ProtectedRoute } from '../components/ProtectedRoute';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

export function AdminDashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { user } = useAuth();
  const { hasPermission, isAdmin: isAdminFromHook } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estatísticas simuladas - no futuro serão carregadas de uma API
  const [stats, setStats] = useState({
    dailySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    pendingOrders: 0,
    stockAlerts: 0,
    scheduledOrders: 0,
    promoActive: 0,
    availableDrivers: 0,
    activeDeliveries: 0,
  });

  const rawRole: any = (user as any)?.activeRole ?? (user as any)?.role;
  const isProducer = PermissionsService.getInstance().isProducerRole(rawRole);
  const isAdminRole = String(rawRole ?? '').toLowerCase() === String(Role.ADMIN) || isAdminFromHook;

  useEffect(() => {
    loadDashboardData();
  }, []);

  

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const orderService = new OrderService();
      const statsData = await orderService.getOrderStats();

      let lowStockCount = 0;
      let promoCount = 0;
      let availableDriversCount = 0;
      let activeDeliveriesCount = 0;

      try {
        const productService = ProductService.getInstance();
        const products = await productService.getProducts({} as any);
        lowStockCount = products.filter(p => p.temEstoque ? (p.estoque ?? 0) <= 3 : false).length;
        promoCount = products.filter(p => Array.isArray(p.tagsEspeciais) && p.tagsEspeciais.includes('promocao')).length;
      } catch (e) {
        logger.error('Erro ao carregar produtos no dashboard', e instanceof Error ? e : new Error(String(e)));
      }

      try {
        const driverService = DeliveryDriverService.getInstance();
        const availableDrivers = await driverService.getAvailableDrivers();
        availableDriversCount = availableDrivers.length;
        
        // Contar entregas ativas (status 'delivering')
        const allOrders = await orderService.getAllOrders();
        activeDeliveriesCount = allOrders.filter(o => o.status === 'delivering').length;
      } catch (e) {
        logger.error('Erro ao carregar entregadores no dashboard', e instanceof Error ? e : new Error(String(e)));
      }

      setStats({
        dailySales: Number(statsData.todayRevenue || 0),
        weeklySales: Number(statsData.totalRevenue || 0),
        monthlySales: Number(statsData.totalRevenue || 0),
        pendingOrders: Number((statsData.statusCounts?.pending) || 0),
        stockAlerts: Number(lowStockCount || 0),
        scheduledOrders: Number(statsData.scheduledOrders || 0),
        promoActive: Number(promoCount || 0),
        availableDrivers: availableDriversCount,
        activeDeliveries: activeDeliveriesCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
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

  

  return (
    <ProtectedRoute
      requiredPermissions={[
        Permission.GERENCIAR_PRODUTOS,
        Permission.GERENCIAR_PEDIDOS,
        Permission.GERENCIAR_USUARIOS,
        Permission.VISUALIZAR_RELATORIOS,
      ]}
      requireAllPermissions={false}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
    >
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          {isProducer && !isAdminRole ? 'Painel do Produtor' : 'Painel de Administração'}
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && <ErrorMessage message={error} onRetry={loadDashboardData} />}

        <View style={styles.statsRow}>
          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Vendas Hoje
              </Text>
              <Text variant="headlineSmall" style={styles.statsValue}>
                {formatCurrency(stats.dailySales)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Vendas Semana
              </Text>
              <Text variant="headlineSmall" style={styles.statsValue}>
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
              <Text variant="headlineSmall" style={styles.statsValue}>
                {formatCurrency(stats.monthlySales)}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard} onPress={() => navigation.navigate('OrderManagement')}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Pedidos Pendentes
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: '#FF9800' }]}>
                {stats.pendingOrders}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statsCard} onPress={() => navigation.navigate('InventoryManagement', { openForecast: true })}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Sugestões de estoque (IA)
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: '#FF5252' }]}>
                {stats.stockAlerts}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard} onPress={() => navigation.navigate('PromotionManagement')}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Promoções Ativas
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: '#FF69B4' }]}>
                {stats.promoActive}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <View style={styles.statsRow}>
          <Card style={styles.statsCard} onPress={() => {}}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Entregadores On
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: '#4CAF50' }]}>
                {stats.availableDrivers}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard} onPress={() => navigation.navigate('OrderManagement')}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.statsTitle}>
                Entregas Ativas
              </Text>
              <Text variant="headlineSmall" style={[styles.statsValue, { color: '#2196F3' }]}>
                {stats.activeDeliveries}
              </Text>
            </Card.Content>
          </Card>
        </View>

        <Surface style={styles.menuSection}>
          <Text variant="titleLarge" style={styles.sectionTitle}>
            Gerenciamento
          </Text>

          <Divider style={styles.divider} />

          <List.Item
            title="Produtos"
            description="Gerenciar catálogo de produtos"
            left={props => <List.Icon {...props} icon="cake-variant" color="#FF69B4" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ProductManagement')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Pedidos"
            description="Gerenciar pedidos recebidos"
            left={props => <List.Icon {...props} icon="shopping" color="#FF69B4" />}
            right={props => (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.pendingOrders}</Text>
              </View>
            )}
            onPress={() => navigation.navigate('OrderManagement')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Pedidos Agendados"
            description="Gerenciar entregas agendadas"
            left={props => <List.Icon {...props} icon="calendar-clock" color="#FF69B4" />}
            right={props => (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{stats.scheduledOrders}</Text>
              </View>
            )}
            onPress={() => navigation.navigate('ScheduledOrders')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Estoque"
            description="Gerenciar estoque de ingredientes"
            left={props => <List.Icon {...props} icon="package-variant" color="#FF69B4" />}
            right={props =>
              stats.stockAlerts > 0 ? (
                <View style={[styles.badge, { backgroundColor: '#FF5252' }]}>
                  <Text style={styles.badgeText}>{stats.stockAlerts}</Text>
                </View>
              ) : (
                <List.Icon {...props} icon="chevron-right" />
              )
            }
            onPress={() => navigation.navigate('InventoryManagement')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Configurações da Loja"
            description="Definir logo, banner e regras de agendamento"
            left={props => <List.Icon {...props} icon="store-cog" color="#FF69B4" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ShopSettings')}
            style={styles.menuItem}
          />

          <Divider />

          {isAdminRole && (
            <>
              <List.Item
                title="Clientes"
                description="Gerenciar cadastro de clientes"
                left={props => <List.Icon {...props} icon="account-group" color="#FF69B4" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                onPress={() => navigation.navigate('CustomerManagement')}
                style={styles.menuItem}
              />

              <Divider />
            </>
          )}

          <List.Item
            title="Entregadores"
            description="Monitorar disponibilidade e atribuições"
            left={props => <List.Icon {...props} icon="bicycle" color="#FF69B4" />}
            right={props => (
              <View style={[styles.badge, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.badgeText}>{stats.availableDrivers}</Text>
              </View>
            )}
            onPress={() => {}}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Promoções"
            description="Gerenciar cupons e descontos"
            left={props => <List.Icon {...props} icon="tag" color="#FF69B4" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('PromotionManagement')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Financeiro"
            description="Acompanhar vendas e recebimentos do app"
            left={props => <List.Icon {...props} icon="cash-register" color="#FF69B4" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('ProducerFinanceDashboard')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Relatórios"
            description="Visualizar relatórios e análises de vendas"
            left={props => <List.Icon {...props} icon="chart-bar" color="#FF69B4" />}
            right={props => <List.Icon {...props} icon="chart-line" color="#FF69B4" />}
            onPress={() => navigation.navigate('ReportsScreen')}
            style={styles.menuItem}
          />

          <Divider />

          <List.Item
            title="Configurações"
            description="Configurações do sistema"
            left={props => <List.Icon {...props} icon="cog" color="#FF69B4" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Configuracoes')}
            style={styles.menuItem}
          />
        </Surface>
      </ScrollView>

      {hasPermission(Permission.GERENCIAR_PRODUTOS) && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('AddEditProduct')}
          color="#FFFFFF"
        />
      )}
    </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    color: '#333',
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
  },
  statsTitle: {
    color: '#666',
    marginBottom: 8,
  },
  statsValue: {
    color: '#333',
    fontWeight: 'bold',
  },
  menuSection: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  sectionTitle: {
    color: '#333',
    marginBottom: 8,
  },
  divider: {
    marginVertical: 8,
  },
  menuItem: {
    paddingVertical: 8,
  },
  badge: {
    backgroundColor: '#FF69B4',
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
    backgroundColor: '#FF69B4',
  },
});
