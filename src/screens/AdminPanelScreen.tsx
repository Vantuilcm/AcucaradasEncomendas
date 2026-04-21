import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Card, Title, Paragraph, List, Divider, Text, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppTheme } from '../components/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AdminPanelScreen = () => {
  const navigation = useNavigation();
  const { theme } = useAppTheme();
  const styles = React.useMemo(() => createStyles(theme), [theme]);

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

  /*
  const recentOrders = [
    { id: '#12345', customer: 'Maria Silva', total: 'R$ 125,00', status: 'Pendente', date: '15/06/2023' },
    { id: '#12344', customer: 'João Santos', total: 'R$ 89,90', status: 'Entregue', date: '14/06/2023' },
    { id: '#12343', customer: 'Ana Oliveira', total: 'R$ 210,50', status: 'Em preparo', date: '14/06/2023' },
  ];
  */

  const navigateToSection = (section: string) => {
    switch (section) {
      case 'preview':
        (navigation as any).navigate('StorePreview');
        break;
      case 'products':
        (navigation as any).navigate('ProductManagement');
        break;
      case 'orders':
        (navigation as any).navigate('OrderManagement');
        break;
      case 'users':
        // Navegar para gerenciamento de usuários quando disponível
        break;
      case 'notifications':
        (navigation as any).navigate('NotificationSettings');
        break;
      case 'settings':
        (navigation as any).navigate('EditProfile');
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <Surface style={styles.premiumHeader} elevation={2}>
          <View style={styles.headerContent}>
            <Title style={styles.headerTitle}>Minha Loja</Title>
            <Paragraph style={styles.headerSubtitle}>Gestão completa do seu negócio</Paragraph>
          </View>
          <MaterialCommunityIcons name="store-check" size={48} color={theme.colors.primary} />
        </Surface>

        <View style={styles.gridContainer}>
          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigateToSection('preview')}
          >
            <Surface style={styles.gridSurface} elevation={1}>
              <MaterialCommunityIcons name="eye-outline" size={32} color={theme.colors.primary} />
              <Text style={styles.gridLabel}>Ver Loja</Text>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigateToSection('settings')}
          >
            <Surface style={styles.gridSurface} elevation={1}>
              <MaterialCommunityIcons name="cog-outline" size={32} color={theme.colors.primary} />
              <Text style={styles.gridLabel}>Configurar</Text>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => (navigation as any).navigate('AddEditProduct')}
          >
            <Surface style={styles.gridSurface} elevation={1}>
              <MaterialCommunityIcons name="plus-circle-outline" size={32} color={theme.colors.primary} />
              <Text style={styles.gridLabel}>Novo Produto</Text>
            </Surface>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.gridItem} 
            onPress={() => navigateToSection('products')}
          >
            <Surface style={styles.gridSurface} elevation={1}>
              <MaterialCommunityIcons name="package-variant-closed" size={32} color={theme.colors.primary} />
              <Text style={styles.gridLabel}>Meus Doces</Text>
            </Surface>
          </TouchableOpacity>
        </View>

        <Card style={styles.statsOverviewCard}>
          <Card.Content>
            <Title>Resumo de Hoje</Title>
            <View style={styles.revenueOverview}>
              <Text style={styles.revenueValueLarge}>{stats.revenue.today}</Text>
              <Text style={styles.revenueLabel}>Vendas em 24h</Text>
            </View>
            <Divider style={styles.divider} />
            <View style={styles.statsMiniRow}>
              <View style={styles.statMiniItem}>
                <Text style={styles.statMiniValue}>{stats.pendingOrders}</Text>
                <Text style={styles.statMiniLabel}>Pendentes</Text>
              </View>
              <View style={styles.statMiniItem}>
                <Text style={styles.statMiniValue}>{stats.totalProducts}</Text>
                <Text style={styles.statMiniLabel}>Produtos</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <List.Section style={styles.menuSection}>
          <List.Subheader>Atalhos de Gestão</List.Subheader>
          <List.Item
            title="Gerenciar Pedidos"
            left={props => <List.Icon {...props} icon="clipboard-list-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateToSection('orders')}
          />
          <Divider />
          <List.Item
            title="Controle de Estoque"
            left={props => <List.Icon {...props} icon="database-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => (navigation as any).navigate('InventoryManagement')}
          />
          <Divider />
          <List.Item
            title="Configurações de Notificação"
            left={props => <List.Icon {...props} icon="bell-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateToSection('notifications')}
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
};

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  premiumHeader: {
    padding: 24,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 16,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    color: '#666',
    fontSize: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    padding: 8,
  },
  gridSurface: {
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    justifyContent: 'center',
  },
  gridLabel: {
    marginTop: 12,
    fontWeight: '600',
    color: '#333',
    fontSize: 14,
  },
  statsOverviewCard: {
    margin: 16,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  revenueOverview: {
    alignItems: 'center',
    marginVertical: 16,
  },
  revenueValueLarge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  revenueLabel: {
    color: '#666',
    fontSize: 14,
  },
  divider: {
    marginVertical: 8,
  },
  statsMiniRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  statMiniItem: {
    alignItems: 'center',
  },
  statMiniValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  statMiniLabel: {
    fontSize: 12,
    color: '#888',
  },
  menuSection: {
    backgroundColor: '#fff',
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
});

export default AdminPanelScreen;