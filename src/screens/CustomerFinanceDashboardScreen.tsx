import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import {
  Text,
  Card,
  Button,
  Title,
  Paragraph,
  List,
  Divider,
  ActivityIndicator,
  IconButton,
  Portal,
  Modal,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { theme } from '../theme';
import { StripeService } from '../services/StripeService';
import { PaymentService } from '../services/PaymentService';
import { PaymentTransaction } from '../types/Payment';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { loggingService } from '../services/LoggingService';
import { formatCurrency } from '../utils/formatters';

export const CustomerFinanceDashboardScreen: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<'not_started' | 'pending' | 'active'>('not_started');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [summary, setSummary] = useState({
    totalSpent: 0,
    totalOrders: 0,
    activeSubscriptions: 0,
    balance: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Carregar status do Stripe
      const status = await StripeService.getInstance().getAccountStatus(user.stripeAccountId || '');
      setStripeStatus(status);

      // Carregar transações reais
      const userTransactions = await PaymentService.getInstance().getUserTransactions(user.id, { limit: 10 });
      setTransactions(userTransactions);

      // Calcular resumo baseado nas transações
      const totalSpent = userTransactions
        .filter(t => t.status === 'completed' && t.type === 'payment')
        .reduce((acc, t) => acc + t.amount, 0);

      const totalOrders = userTransactions.filter(t => t.type === 'payment').length;

      setSummary({
        totalSpent,
        totalOrders,
        activeSubscriptions: 0, // Implementar quando houver assinaturas
        balance: 0, // Cashback seria calculado aqui
      });
    } catch (error) {
      loggingService.error('Erro ao carregar dados financeiros do cliente', error instanceof Error ? error : undefined);
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
    if (!user) return;
    try {
      const url = await StripeService.getInstance().getOnboardingLink(user.id, user.email, 'customer');
      await Linking.openURL(url);
      setStripeStatus('pending');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível iniciar a configuração dos seus recebimentos.';
      Alert.alert('Erro', message || 'Não foi possível iniciar a configuração dos seus recebimentos.');
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando informações financeiras...</Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Meu Financeiro</Title>
        <Text style={styles.headerSubtitle}>Gerencie seus gastos e cashback</Text>
      </View>

      <View style={styles.summaryContainer}>
        <Card style={styles.balanceCard}>
          <Card.Content>
            <Text style={styles.balanceLabel}>Saldo / Cashback</Text>
            <Text style={styles.balanceValue}>{formatCurrency(summary.balance)}</Text>
          </Card.Content>
        </Card>

        <View style={styles.statsGrid}>
          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="cart-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.statValue}>{summary.totalOrders}</Text>
              <Text style={styles.statLabel}>Pedidos</Text>
            </Card.Content>
          </Card>

          <Card style={styles.statCard}>
            <Card.Content style={styles.statContent}>
              <MaterialCommunityIcons name="cash-multiple" size={24} color="#4CAF50" />
              <Text style={styles.statValue}>{formatCurrency(summary.totalSpent)}</Text>
              <Text style={styles.statLabel}>Total Gasto</Text>
            </Card.Content>
          </Card>
        </View>
      </View>

      <Card style={styles.sectionCard}>
        <Card.Title title="Conta para Estornos e Cashback" subtitle="Usada para devoluções e créditos do app" />
        <Card.Content>
          {stripeStatus === 'active' ? (
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
              <Text style={styles.statusTextActive}>Conta Ativa e Conectada</Text>
            </View>
          ) : stripeStatus === 'pending' ? (
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#FF9800" />
              <Text style={styles.statusTextPending}>Configuração Pendente</Text>
              <Button mode="outlined" onPress={handleStripeOnboarding} style={styles.actionButton}>
                Concluir cadastro
              </Button>
            </View>
          ) : (
            <View style={styles.statusContainer}>
              <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#757575" />
              <Text style={styles.statusTextNotStarted}>Conta não configurada</Text>
              <Button mode="contained" onPress={handleStripeOnboarding} style={styles.actionButton}>
                Configurar recebimentos
              </Button>
            </View>
          )}
        </Card.Content>
      </Card>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Últimas Movimentações</Text>
        <Button mode="text" onPress={() => {}}>Ver Tudo</Button>
      </View>

      <Card style={styles.transactionsCard}>
        {transactions.length > 0 ? (
          transactions.map((transaction, index) => (
            <React.Fragment key={transaction.id}>
              <List.Item
                title={transaction.description || (transaction.type === 'payment' ? 'Pagamento' : 'Estorno')}
                description={`${new Date(transaction.createdAt).toLocaleDateString()} • ${transaction.status}`}
                left={props => (
                  <List.Icon 
                    {...props} 
                    icon={transaction.type === 'payment' ? 'minus-circle' : 'plus-circle'} 
                    color={transaction.type === 'payment' ? '#F44336' : '#4CAF50'} 
                  />
                )}
                right={() => (
                  <Text style={transaction.type === 'payment' ? styles.negativeAmount : styles.positiveAmount}>
                    {transaction.type === 'payment' ? '-' : '+'} {formatCurrency(transaction.amount)}
                  </Text>
                )}
              />
              {index < transactions.length - 1 && <Divider />}
            </React.Fragment>
          ))
        ) : (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text>Nenhuma movimentação encontrada.</Text>
          </View>
        )}
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
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
    color: '#333',
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
    color: 'rgba(255, 255, 255, 0.8)',
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
    flex: 1,
    marginHorizontal: 4,
    elevation: 2,
  },
  statContent: {
    alignItems: 'center',
    padding: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  sectionCard: {
    margin: 16,
    elevation: 2,
  },
  statusContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 10,
  },
  statusTextActive: {
    color: '#4CAF50',
    fontWeight: 'bold',
    marginTop: 8,
  },
  statusTextPending: {
    color: '#FF9800',
    fontWeight: 'bold',
    marginTop: 8,
  },
  statusTextNotStarted: {
    color: '#757575',
    marginTop: 8,
  },
  actionButton: {
    marginTop: 16,
    width: '100%',
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
    color: '#333',
  },
  transactionsCard: {
    margin: 16,
    marginBottom: 32,
    elevation: 2,
  },
  negativeAmount: {
    color: '#F44336',
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  positiveAmount: {
    color: '#4CAF50',
    fontWeight: 'bold',
    alignSelf: 'center',
  },
});
