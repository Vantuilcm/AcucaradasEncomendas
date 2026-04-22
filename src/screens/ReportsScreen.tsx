import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Divider,
  Chip,
  Menu,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../hooks/usePermissions';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { SalesChart } from '../components/charts/SalesChart';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
// import { ReportService } from '../services/ReportService';
import { useAppTheme } from '../components/ThemeProvider';

type PeriodFilter = 'day' | 'week' | 'month' | 'year';
type ChartViewType = 'sales' | 'categories' | 'payment' | 'products';

interface SalesSummary {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  comparisonPercentage: number;
}

interface TopProductData {
  name: string;
  quantity: number;
  totalRevenue: number;
}

interface HourlySalesData {
  hour: string;
  sales: number;
}

interface SalesByCategoryData {
  category: string;
  sales: number;
  percentage: number;
}

export function ReportsScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { user: _user } = useAuth();
  const { isAdmin, isProdutor } = usePermissions();
  const [loading, setLoading] = useState(false); // MISSÃO ZERO TELA BRANCA: Forçar loading false
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('week');
  const [selectedChartView, setSelectedChartView] = useState<ChartViewType>('sales');
  const [salesSummary, setSalesSummary] = useState<SalesSummary>({
    totalSales: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    comparisonPercentage: 0,
  });
  const [topProducts, setTopProducts] = useState<TopProductData[]>([]);
  const [hourlySales, setHourlySales] = useState<HourlySalesData[]>([]);
  const [salesByCategory, setSalesByCategory] = useState<SalesByCategoryData[]>([]);
  const [salesByPaymentMethod, setSalesByPaymentMethod] = useState<SalesByCategoryData[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);

  // const reportService = ReportService.getInstance();

  useEffect(() => {
    // loadReportData();
    setLoading(false);
  }, [selectedPeriod]);

  const loadReportData = async () => {
    setLoading(false);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshing(false);
  };

  const handleExportReport = async () => {
    Alert.alert('Modo Diagnóstico', 'Exportação desativada temporariamente');
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando relatórios..." />;
  }

  // Verificar se o usuário é administrador ou produtor
  if (!isAdmin && !isProdutor) {
    return (
      <ErrorMessage
        message="Você não tem permissão para acessar esta área"
        onRetry={() => navigation.goBack()}
        retryLabel="Voltar"
      />
    );
  }

  const renderChartContent = () => {
    return (
      <Card style={{ marginVertical: 20 }}>
        <Card.Content>
          <Text variant="titleMedium" style={{ textAlign: 'center' }}>📊 Modo de Diagnóstico</Text>
          <Divider style={{ marginVertical: 10 }} />
          <Text variant="bodyMedium" style={{ textAlign: 'center' }}>
            Os gráficos e consultas pesadas foram desativados para isolar a causa da tela branca.
          </Text>
          <Button 
            mode="outlined" 
            onPress={() => navigation.navigate('BootDiagnostic' as any)}
            style={{ marginTop: 20 }}
          >
            Ver Status do Sistema
          </Button>
        </Card.Content>
      </Card>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text variant="headlineMedium" style={styles.title}>
            Análise de Vendas
          </Text>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button
                mode="contained"
                icon="export-variant"
                onPress={() => setMenuVisible(true)}
                style={[styles.exportButton, { backgroundColor: theme.colors.primary }]}
              >
                Exportar
              </Button>
            }
          >
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                handleExportReport();
              }}
              title="Exportar CSV"
            />
            <Menu.Item
              onPress={() => {
                setMenuVisible(false);
                Alert.alert('Em breve', 'Exportação para PDF estará disponível em breve');
              }}
              title="Exportar PDF"
            />
          </Menu>
        </View>

        <SegmentedButtons
          value={selectedPeriod}
          onValueChange={value => setSelectedPeriod(value as PeriodFilter)}
          buttons={[
            { value: 'day', label: 'Dia' },
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mês' },
            { value: 'year', label: 'Ano' },
          ]}
          style={styles.periodSelector}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipContainer}>
          <Chip
            selected={selectedChartView === 'sales'}
            onPress={() => setSelectedChartView('sales')}
            style={styles.chip}
            selectedColor="#FF69B4"
          >
            Vendas
          </Chip>
          <Chip
            selected={selectedChartView === 'products'}
            onPress={() => setSelectedChartView('products')}
            style={styles.chip}
            selectedColor="#FF69B4"
          >
            Produtos
          </Chip>
          <Chip
            selected={selectedChartView === 'categories'}
            onPress={() => setSelectedChartView('categories')}
            style={styles.chip}
            selectedColor="#FF69B4"
          >
            Categorias
          </Chip>
          <Chip
            selected={selectedChartView === 'payment'}
            onPress={() => setSelectedChartView('payment')}
            style={styles.chip}
            selectedColor="#FF69B4"
          >
            Pagamentos
          </Chip>
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      >
        {error && <ErrorMessage message={error} onRetry={loadReportData} />}

        <View style={styles.summaryContainer}>
          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardLabel}>
                Total de Vendas
              </Text>
              <Text variant="headlineSmall" style={styles.cardValue}>
                {formatCurrency(salesSummary.totalSales)}
              </Text>
              <View style={styles.comparisonContainer}>
                <Ionicons
                  name={salesSummary.comparisonPercentage >= 0 ? 'arrow-up' : 'arrow-down'}
                  size={16}
                  color={salesSummary.comparisonPercentage >= 0 ? '#4CAF50' : '#F44336'}
                />
                <Text
                  style={[
                    styles.comparisonText,
                    { color: salesSummary.comparisonPercentage >= 0 ? '#4CAF50' : '#F44336' },
                  ]}
                >
                  {salesSummary.comparisonPercentage}% em relação ao período anterior
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardLabel}>
                Total de Pedidos
              </Text>
              <Text variant="headlineSmall" style={styles.cardValue}>
                {salesSummary.totalOrders}
              </Text>
            </Card.Content>
          </Card>

          <Card style={styles.summaryCard}>
            <Card.Content>
              <Text variant="titleSmall" style={styles.cardLabel}>
                Valor Médio
              </Text>
              <Text variant="headlineSmall" style={styles.cardValue}>
                {formatCurrency(salesSummary.averageOrderValue)}
              </Text>
            </Card.Content>
          </Card>
        </View>

        {renderChartContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const getPeriodLabel = (period: PeriodFilter): string => {
  switch (period) {
    case 'day':
      return 'hoje';
    case 'week':
      return 'esta semana';
    case 'month':
      return 'este mês';
    case 'year':
      return 'este ano';
  }
};

const createStyles = (theme: { colors: any }) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: theme.colors.text.primary,
  },
  exportButton: {
    borderRadius: 8,
  },
  periodSelector: {
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    marginTop: 8,
  },
  chip: {
    marginRight: 8,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    width: '32%',
    borderRadius: 12,
    elevation: 2,
    marginBottom: 8,
    backgroundColor: theme.colors.card,
  },
  cardLabel: {
    color: theme.colors.text.secondary,
    marginBottom: 4,
  },
  cardValue: {
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  comparisonText: {
    fontSize: 12,
    marginLeft: 4,
    color: theme.colors.text.secondary,
  },
  tableCard: {
    borderRadius: 12,
    elevation: 2,
    marginVertical: 8,
    backgroundColor: theme.colors.card,
  },
  tableTitle: {
    marginBottom: 8,
    color: theme.colors.text.primary,
  },
  tableDescription: {
    color: theme.colors.text.secondary,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    color: theme.colors.text.primary,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  tableCell: {
    color: theme.colors.text.secondary,
  },
  productNameCell: {
    flex: 2,
  },
  quantityCell: {
    flex: 1,
    textAlign: 'center',
  },
  revenueCell: {
    flex: 1,
    textAlign: 'right',
  },
});
