import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Paragraph, Button, List, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AdminPanelScreen = () => {
  const navigation = useNavigation();

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

  const navigateToSection = (section) => {
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
      default:
        break;
    }
  };

  return (
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
              <Title>Usuários</Title>
              <View style={styles.statsRow}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.totalUsers}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{stats.activeUsers}</Text>
                  <Text style={styles.statLabel}>Ativos</Text>
                </View>
              </View>
              <Button 
                mode="contained" 
                onPress={() => navigateToSection('users')}
                style={styles.actionButton}
              >
                Gerenciar Usuários
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
                  onPress={() => navigation.navigate('OrderDetail', { orderId: order.id })}
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

        <View style={styles.quickActions}>
          <Title style={styles.quickActionsTitle}>Ações Rápidas</Title>
          <View style={styles.actionButtonsContainer}>
            <Button 
              icon="plus" 
              mode="contained" 
              onPress={() => navigation.navigate('AddEditProduct')}
              style={styles.quickActionButton}
            >
              Novo Produto
            </Button>
            <Button 
              icon="bell-outline" 
              mode="contained" 
              onPress={() => navigateToSection('notifications')}
              style={styles.quickActionButton}
            >
              Notificações
            </Button>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
});

export default AdminPanelScreen;