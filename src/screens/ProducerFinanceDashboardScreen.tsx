import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Linking, ActivityIndicator } from 'react-native';
import { Text, Card, List, Divider, Button } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { StripeService } from '../services/StripeService';
import { PaymentService } from '../services/PaymentService';
import { OrderService } from '../services/OrderService';
import { PaymentTransaction } from '../types/Payment';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { loggingService } from '../services/LoggingService';
import { formatCurrency } from '../utils/formatters';

export const ProducerFinanceDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const stripe = useStripe();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'not_started' | 'pending' | 'active'>('not_started');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [summary, setSummary] = useState({
    totalSales: 0,
    pendingPayout: 0,
    totalOrders: 0,
    commissionPaid: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    try {
      if (stripe) {
        StripeService.getInstance().initialize(stripe);
      }
    } catch (error) {
      loggingService.error('Erro ao inicializar Stripe no painel financeiro', error instanceof Error ? error : undefined);
    }
  }, [stripe]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Carregar status do Stripe
      const status = await StripeService.getInstance().getAccountStatus(user.stripeAccountId || '');
      setStripeStatus(status);

      // 2. Carregar transações do produtor
      // Nota: Para o produtor, queremos transações onde ele é o beneficiário
      // Por enquanto usamos getUserTransactions, mas o backend deve filtrar por beneficiário
      const userTransactions = await PaymentService.getInstance().getUserTransactions(user.id, { limit: 10 });
      setTransactions(userTransactions);

      // 3. Carregar estatísticas de vendas
      const orderService = new OrderService();
      const stats = await orderService.getOrderStats();
      
      setSummary({
        totalSales: stats.totalRevenue || 0,
        pendingPayout: 0, // Seria calculado via Stripe API no backend
        totalOrders: stats.totalOrders || 0,
        commissionPaid: (stats.totalRevenue || 0) * 0.1, // Exemplo de 10% de comissão
      });
    } catch (error) {
      loggingService.error('Erro ao carregar dados financeiros do produtor', error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleStripeOnboarding = async () => {
    if (!user) {
      Alert.alert('Erro', 'Não foi possível identificar o usuário.');
      return;
    }
    try {
      const url = await StripeService.getInstance().getOnboardingLink(user.id, user.email, 'producer');
      if (!url) {
        throw new Error('Link de onboarding inválido');
      }
      await Linking.openURL(url);
      setStripeStatus('pending');
    } catch (error) {
      loggingService.error('Erro ao iniciar configuração de recebimentos', error instanceof Error ? error : undefined);
      const message =
        error instanceof Error
          ? error.message || 'Não foi possível iniciar a configuração dos seus recebimentos. Verifique sua conexão ou tente novamente mais tarde.'
          : 'Não foi possível iniciar a configuração dos seus recebimentos. Verifique sua conexão ou tente novamente mais tarde.';
      Alert.alert('Erro', message);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando painel financeiro...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.headerTitle}>Painel Financeiro</Text>
        <Text style={styles.headerSubtitle}>Acompanhe suas vendas e recebimentos</Text>
      </View>

      <View style={styles.summaryContainer}>
        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text style={styles.balanceLabel}>Total de Vendas</Text>
            <Text style={styles.balanceValue}>{formatCurrency(summary.totalSales)}</Text>
          </Card.Content>
        </Card>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />
              <Text style={styles.statValue}>{formatCurrency(summary.pendingPayout)}</Text>
              <Text style={styles.statLabel}>A Receber</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="percent" size={24} color="#F44336" />
              <Text style={styles.statValue}>{formatCurrency(summary.commissionPaid)}</Text>
              <Text style={styles.statLabel}>Comissões</Text>
            </Card.Content>
          </Card>
        </View>
      </View>

      <Card style={styles.sectionCard}>
        <Card.Title title="Conta de Recebimentos" subtitle="Configuração para receber automaticamente pelas vendas" />
        <Card.Content>
          {stripeStatus === 'active' ? (
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.statusTextActive}>Conta Ativa e Pronta</Text>
              <Button mode="outlined" onPress={handleStripeOnboarding} style={styles.actionButton}>
                Abrir painel financeiro
              </Button>
            </View>
          ) : stripeStatus === 'pending' ? (
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />
              <Text style={styles.statusTextPending}>Verificação em Andamento</Text>
              <Button mode="outlined" onPress={handleStripeOnboarding} style={styles.actionButton}>
                Concluir cadastro
              </Button>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#757575" />
              <Text style={styles.statusTextNotStarted}>Recebimentos Desativados</Text>
              <Button mode="contained" onPress={handleStripeOnboarding} style={styles.actionButton}>
                Configurar recebimentos
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.sectionHeader}>
        <Text variant="titleMedium" style={styles.sectionTitle}>Últimas Transações</Text>
        <Button mode="text" onPress={() => {}}>Ver Extrato</Button>
      </View>

      <Card style={styles.transactionsCard}>
        {transactions.length > 0 ? (
          transactions.map((transaction, index) => (
            <React.Fragment key={transaction.id}>
              <List.Item
                title={transaction.description || 'Venda de Produto'}
                description={`${new Date(transaction.createdAt).toLocaleDateString()} • ${transaction.status}`}
                left={props => (
                  <List.Icon 
                    {...props} 
                    icon={transaction.type === 'payout' ? 'bank-transfer-out' : 'cash-plus'} 
                    color={transaction.type === 'payout' ? '#2196F3' : '#4CAF50'} 
                  />
                )}
                right={() => (
                  <Text style={transaction.type === 'payout' ? styles.negativeAmount : styles.positiveAmount}>
                    {transaction.type === 'payout' ? '-' : '+'} {formatCurrency(transaction.amount)}
                  </Text>
                )}
              />
              {index < transactions.length - 1 && <Divider />}
            </React.Fragment>
          ))
        ) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text>Nenhuma transação encontrada.</Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  summaryContainer: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: theme.colors.primary,
    marginBottom: 16,
    elevation: 4,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 0.48,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    padding: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionCard: {
    margin: 16,
    marginTop: 0,
    elevation: 2,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusTextActive: {
    flex: 1,
    marginLeft: 8,
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  statusTextPending: {
    flex: 1,
    marginLeft: 8,
    color: '#FF9800',
    fontWeight: 'bold',
  },
  statusTextNotStarted: {
    flex: 1,
    marginLeft: 8,
    color: '#757575',
  },
  actionButton: {
    marginLeft: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  transactionsCard: {
    margin: 16,
    marginBottom: 32,
    elevation: 2,
  },
  positiveAmount: {
    color: '#4CAF50',
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  negativeAmount: {
    color: '#F44336',
    fontWeight: 'bold',
    alignSelf: 'center',
  },
});
