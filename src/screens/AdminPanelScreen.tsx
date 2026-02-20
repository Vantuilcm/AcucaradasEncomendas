import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, Button, List, Divider, Text, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { Permission } from '../services/PermissionsService';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { loggingService, LogLevel } from '../services/LoggingService';

import { Switch } from 'react-native-paper';
import { DatabaseSeedService } from '../services/DatabaseSeedService';
import { DemandForecastService } from '../services/DemandForecastService';

const AdminPanelScreen = () => {
  // Relax navigation typing to avoid TS 'never' errors on string route names
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const theme = useTheme();
  const isProduction =
    process.env.EXPO_PUBLIC_APP_ENV === 'production' || process.env.NODE_ENV === 'production';
  const [recentLogs, setRecentLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [useSimulation, setUseSimulation] = useState(DemandForecastService.useSimulation);

  const toggleSimulation = (value: boolean) => {
    setUseSimulation(value);
    DemandForecastService.useSimulation = value;
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    try {
      const seedService = DatabaseSeedService.getInstance();
      const result = await seedService.seedHotspots();
      if (result.success) {
        if (!isProduction) {
          alert(`Sucesso! ${result.count} hotspots foram criados.`);
        }
      } else {
        if (!isProduction) {
          alert(`Erro ao popular banco: ${result.error}`);
        }
        loggingService.warn('Seed de hotspots falhou', { error: result.error });
      }
    } catch (error: any) {
      if (!isProduction) {
        alert(`Erro crítico: ${error.message}`);
      }
      loggingService.error('Seed de hotspots: erro crítico', error as Error);
    } finally {
      setIsSeeding(false);
    }
  };

  // Dados de exemplo para o painel administrativo
  const stats = {
    totalOrders: 156,
    pendingOrders: 12,
    totalProducts: 48,
    lowStockProducts: 5,
    totalUsers: 230,
    activeUsers: 178,
    revenue: {
      today: 'R$ 1.250,00',
      week: 'R$ 8.750,00',
      month: 'R$ 32.450,00'
    }
  };

  const recentOrders = [
    { id: '#12345', customer: 'Maria Silva', total: 'R$ 125,00', status: 'Pendente', date: '15/06/2023' },
    { id: '#12344', customer: 'João Santos', total: 'R$ 89,90', status: 'Entregue', date: '14/06/2023' },
    { id: '#12343', customer: 'Ana Oliveira', total: 'R$ 210,50', status: 'Em preparo', date: '14/06/2023' },
  ];

  const navigateToSection = (section: string) => {
    switch (section) {
      case 'products':
        navigation.navigate('ProductManagement');
        break;
      case 'orders':
        navigation.navigate('OrderManagement');
        break;
      case 'users':
        // Navegar para gerenciamento de usuários quando disponível
        break;
      case 'notifications':
        navigation.navigate('NotificationSettings');
        break;
      case 'monitoring':
        navigation.navigate('AdminRealTimeMonitoring');
        break;
      case 'settings':
        navigation.navigate('ShopSettings');
        break;
      default:
        break;
    }
  };

  const iconForLevel = (level: LogLevel) => {
    switch (level) {
      case LogLevel.DEBUG:
        return 'bug';
      case LogLevel.INFO:
        return 'information-outline';
      case LogLevel.WARN:
        return 'alert-outline';
      case LogLevel.ERROR:
        return 'alert-circle-outline';
      case LogLevel.FATAL:
        return 'alert-octagon-outline';
      default:
        return 'information-outline';
    }
  };

  const colorForLevel = (level: LogLevel) => {
    if (level === LogLevel.WARN) return '#FF9800';
    if (level === LogLevel.ERROR) return theme.colors.error;
    if (level === LogLevel.FATAL) return '#B00020';
    return theme.colors.primary;
  };

  const loadLogs = async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const logs = await loggingService.getLogs();
      const sorted = logs
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 15);
      setRecentLogs(sorted);
    } catch (err: any) {
      setLogsError(err?.message || 'Falha ao carregar logs');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

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
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryText="Voltar" />}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView>
        <View style={styles.header}>
          <Title style={styles.headerTitle}>Painel Administrativo</Title>
          <Paragraph>Bem-vindo ao painel de controle</Paragraph>
        </View>

        <View style={styles.statsContainer}>
          <Card style={styles.statsCard}>
            <Card.Content>
              <Title>Pedidos</Title>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalOrders}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.pendingOrders}</Text>
                  <Text style={styles.statLabel}>Pendentes</Text>
                </View>
              </View>
              <Button 
                mode="contained" 
                onPress={() => navigateToSection('orders')}
                style={styles.actionButton}
              >
                Gerenciar Pedidos
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Title>Produtos</Title>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalProducts}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.lowStockProducts}</Text>
                  <Text style={styles.statLabel}>Estoque Baixo</Text>
                </View>
              </View>
              <Button 
                mode="contained" 
                onPress={() => navigateToSection('products')}
                style={styles.actionButton}
              >
                Gerenciar Produtos
              </Button>
            </Card.Content>
          </Card>

          <Card style={styles.statsCard}>
            <Card.Content>
              <Title>Configurações</Title>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="store-cog" size={32} color={theme.colors.primary} />
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statLabel}>Loja e Agendamento</Text>
                </View>
              </View>
              <Button 
                mode="contained" 
                onPress={() => navigateToSection('settings')}
                style={styles.actionButton}
              >
                Gerenciar Loja
              </Button>
            </Card.Content>
          </Card>
        </View>

        <Card style={styles.revenueCard}>
          <Card.Content>
            <Title>Faturamento</Title>
            <View style={styles.revenueStats}>
              <View style={styles.revenueStat}>
                <Text style={styles.revenueLabel}>Hoje</Text>
                <Text style={styles.revenueValue}>{stats.revenue.today}</Text>
              </View>
              <View style={styles.revenueStat}>
                <Text style={styles.revenueLabel}>Esta Semana</Text>
                <Text style={styles.revenueValue}>{stats.revenue.week}</Text>
              </View>
              <View style={styles.revenueStat}>
                <Text style={styles.revenueLabel}>Este Mês</Text>
                <Text style={styles.revenueValue}>{stats.revenue.month}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.recentOrdersCard}>
          <Card.Content>
            <Title>Pedidos Recentes</Title>
            {recentOrders.map((order, index) => (
              <React.Fragment key={order.id}>
                <List.Item
                  title={`${order.id} - ${order.customer}`}
                  description={`${order.date} | ${order.status}`}
                  right={() => <Text style={styles.orderTotal}>{order.total}</Text>}
            onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                />
                {index < recentOrders.length - 1 && <Divider />}
              </React.Fragment>
            ))}
            <Button 
              mode="outlined" 
              onPress={() => navigateToSection('orders')}
              style={styles.viewAllButton}
            >
              Ver Todos os Pedidos
            </Button>
          </Card.Content>
        </Card>

        <ProtectedRoute
          requiredPermissions={[Permission.VISUALIZAR_LOGS]}
          requireAllPermissions={true}
          fallbackRoute={undefined}
          unauthorizedComponent={null}
        >
          <Card style={styles.logsCard}>
            <Card.Content>
              <View style={styles.logsHeader}>
                <Title>Logs Recentes</Title>
                <Button mode="outlined" onPress={loadLogs}>Atualizar</Button>
              </View>
              {logsError && (
                <View style={styles.logsErrorBox}>
                  <Text style={{ color: theme.colors.error }}>{logsError}</Text>
                </View>
              )}
              {logsLoading ? (
                <View style={styles.logsLoadingBox}>
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={{ marginLeft: 8 }}>Carregando...</Text>
                </View>
              ) : recentLogs.length === 0 ? (
                <View style={styles.logsEmptyBox}>
                  <Text>Nenhum log encontrado</Text>
                </View>
              ) : (
                recentLogs.map((log, idx) => (
                  <React.Fragment key={`${log.timestamp}-${idx}`}>
                    <List.Item
                      title={`${new Date(log.timestamp).toLocaleString('pt-BR')} • ${String(log.level).toUpperCase()}  ${String(log.message)}`}
                      description={(() => {
                        try {
                          const ctx = log.context ? JSON.stringify(log.context) : '';
                          return ctx.length > 200 ? ctx.slice(0, 200) + '…' : ctx;
                        } catch {
                          return '';
                        }
                      })()}
                      left={props => <List.Icon {...props} icon={iconForLevel(log.level)} color={colorForLevel(log.level)} />}
                    />
                    {idx < recentLogs.length - 1 && <Divider />}
                  </React.Fragment>
                ))
              )}
            </Card.Content>
          </Card>
        </ProtectedRoute>

        {!isProduction && (
          <Card style={styles.automationCard}>
            <Card.Content>
              <Title>Automação e Ferramentas</Title>
              <Paragraph>Use estas ferramentas para configurar o ambiente rapidamente.</Paragraph>
              <Divider style={{ marginVertical: 10 }} />
              
              <List.Item
                title="Popular Hotspots de Demanda"
                description="Cria zonas de alta demanda para testar geofencing e IA."
                left={props => <List.Icon {...props} icon="database-import" color={theme.colors.primary} />}
                right={() => (
                  <Button 
                    mode="outlined" 
                    loading={isSeeding} 
                    disabled={isSeeding}
                    onPress={handleSeedDatabase}
                  >
                    Executar
                  </Button>
                )}
              />
              
              <List.Item
                title="Simular Dados Climáticos"
                description="Habilita IA sem necessidade de chave de API real."
                left={props => <List.Icon {...props} icon="weather-cloudy" color="#2196F3" />}
                right={() => (
                  <Switch 
                    value={useSimulation} 
                    onValueChange={toggleSimulation} 
                  />
                )}
              />

              <List.Item
                title="Simular Notificação Global"
                description="Testa o OneSignal enviando um push para todos."
                left={props => <List.Icon {...props} icon="bell-ring" color="#FF9800" />}
                right={() => (
                  <Button 
                    mode="outlined" 
                    onPress={() => navigation.navigate('TestNotifications')}
                  >
                    Testar
                  </Button>
                )}
              />
            </Card.Content>
          </Card>
        )}
        {!isProduction && (
          <Card style={styles.checklistCard}>
            <Card.Content>
              <Title>Checklist de Ativação Real</Title>
              <Paragraph>Passos manuais para colocar o app em produção.</Paragraph>
              <Divider style={{ marginVertical: 10 }} />
              
              <List.Item
                title={Platform.OS === 'ios' ? "Apple Push Notifications (APNs)" : "Firebase Cloud Messaging (FCM)"}
                description={Platform.OS === 'ios' ? "Configurar certificados .p12 no Dashboard OneSignal." : "Carregar Server Key no Dashboard OneSignal."}
                left={props => <List.Icon {...props} icon={Platform.OS === 'ios' ? "apple" : "firebase"} color={Platform.OS === 'ios' ? "#000000" : "#FFCA28"} />}
                right={props => <List.Icon {...props} icon="open-in-new" />}
                onPress={() => {
                  if (Platform.OS === 'ios') {
                    alert('Vá ao Console OneSignal > Settings > Platforms > Apple iOS e carregue seu certificado p12 de produção.');
                  } else {
                    alert('Vá ao Console OneSignal > Settings > Platforms > Google Android e cole a Server Key do Firebase.');
                  }
                }}
              />

              <List.Item
                title="Chave de API OpenWeather"
                description="Substituir no .env para dados reais de clima."
                left={props => <List.Icon {...props} icon="key-variant" color="#4CAF50" />}
                onPress={() => alert('Crie uma conta em openweathermap.org, obtenha a chave de API (gratuita) e coloque no seu arquivo .env ou segredos do GitHub.')}
              />
            </Card.Content>
          </Card>
        )}

        <View style={styles.quickActions}>
          <Title style={styles.quickActionsTitle}>Ações Rápidas</Title>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('AddEditProduct')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#E3F2FD' }]}>
                <MaterialCommunityIcons name="plus-circle" size={32} color="#1976D2" />
              </View>
              <Text style={styles.quickActionLabel}>Novo Produto</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigateToSection('notifications')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#F3E5F5' }]}>
                <MaterialCommunityIcons name="bell-outline" size={32} color="#7B1FA2" />
              </View>
              <Text style={styles.quickActionLabel}>Notificações</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigateToSection('monitoring')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#E8F5E9' }]}>
                <MaterialCommunityIcons name="map-search-outline" size={32} color="#388E3C" />
              </View>
              <Text style={styles.quickActionLabel}>Monitoramento</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('AdminWithdrawalManagement')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#FFF3E0' }]}>
                <MaterialCommunityIcons name="cash-multiple" size={32} color="#F57C00" />
              </View>
              <Text style={styles.quickActionLabel}>Gestão de Saques</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('AdminDeliveryMonitoring')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#FFEBEE' }]}>
                <MaterialCommunityIcons name="truck-delivery" size={32} color="#D32F2F" />
              </View>
              <Text style={styles.quickActionLabel}>Monitorar Entregas</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.quickActionCard}
              onPress={() => navigation.navigate('ShopSettings')}
            >
              <View style={[styles.quickActionIconContainer, { backgroundColor: '#FCE4EC' }]}>
                <MaterialCommunityIcons name="store-cog" size={32} color="#C2185B" />
              </View>
              <Text style={styles.quickActionLabel}>Configurar Loja</Text>
            </TouchableOpacity>
          </View>
        </View>
        </ScrollView>
      </SafeAreaView>
    </ProtectedRoute>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsContainer: {
    padding: 16,
  },
  statsCard: {
    marginBottom: 16,
    elevation: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
  },
  actionButton: {
    marginTop: 8,
  },
  revenueCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  revenueStat: {
    alignItems: 'center',
    flex: 1,
  },
  revenueLabel: {
    fontSize: 14,
    color: '#666',
  },
  revenueValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  recentOrdersCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  orderTotal: {
    fontWeight: 'bold',
  },
  viewAllButton: {
    marginTop: 8,
  },
  quickActions: {
    padding: 16,
    marginBottom: 16,
  },
  quickActionsTitle: {
    marginBottom: 8,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  quickActionCard: {
    width: '31%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  quickActionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  automationCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 2,
  },
  logsCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      elevation: 2,
    },
    checklistCard: {
      marginHorizontal: 16,
      marginBottom: 16,
      elevation: 2,
    },
  logsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  logsLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  logsErrorBox: {
    paddingVertical: 8,
  },
  logsEmptyBox: {
    paddingVertical: 8,
  },
});

export default AdminPanelScreen;
