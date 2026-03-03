import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Button, useTheme, Divider, List, Surface, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Ionicons } from '@expo/vector-icons';

export function AdminDashboardScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
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
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Simulação de carregamento de dados
      // No futuro, isso seria uma chamada para a API
      setTimeout(() => {
        setStats({
          dailySales: 1250.75,
          weeklySales: 8450.5,
          monthlySales: 32750.25,
          pendingOrders: 5,
          stockAlerts: 3,
          scheduledOrders: 8,
        });
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do dashboard');
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

  // Verificar se o usuário é administrador ou produtor
  if (user?.role !== 'admin' && user?.role !== 'producer') {
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
        <Text variant="headlineMedium" style={styles.title}>
          Painel de Administração
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

          <Card style={styles.statsCard}>
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
            title="Clientes"
            description="Gerenciar cadastro de clientes"
            left={props => <List.Icon {...props} icon="account-group" color="#FF69B4" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('CustomerManagement')}
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
            onPress={() => navigation.navigate('AdminSettings')}
            style={styles.menuItem}
          />
        </Surface>
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate('AddProduct')}
        color="#FFFFFF"
      />
    </SafeAreaView>
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
