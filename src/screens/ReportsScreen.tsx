import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert, Share } from 'react-native';
import {
  Text,
  Card,
  Button,
  useTheme,
  Divider,
  Chip,
  Menu,
  Searchbar,
  SegmentedButtons,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { SalesChart } from '../components/charts/SalesChart';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { formatCurrency } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { ReportService } from '../services/ReportService';

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
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
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

  const reportService = ReportService.getInstance();

  useEffect(() => {
    loadReportData();
  }, [selectedPeriod]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar dados do serviço
      const summary = await reportService.getSalesSummary(selectedPeriod);
      const products = await reportService.getTopProducts(selectedPeriod);
      const hourly = await reportService.getHourlySales(selectedPeriod);
      const categories = await reportService.getSalesByCategory(selectedPeriod);
      const paymentMethods = await reportService.getSalesByPaymentMethod(selectedPeriod);

      setSalesSummary(summary);
      setTopProducts(products);
      setHourlySales(hourly);
      setSalesByCategory(categories);
      setSalesByPaymentMethod(paymentMethods);

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados do relatório');
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReportData();
    setRefreshing(false);
  };

  const handleExportReport = async () => {
    try {
      setChartLoading(true);
      const csvContent = await reportService.exportReportData(selectedPeriod);
      setChartLoading(false);

      // Salvar arquivo CSV temporariamente
      const period = {
        day: 'Diário',
        week: 'Semanal',
        month: 'Mensal',
        year: 'Anual',
      }[selectedPeriod];

      const fileName = `relatorio_vendas_${period}_${new Date().toISOString().split('T')[0]}.csv`;
      const filePath = `${FileSystem.cacheDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(filePath, csvContent);

      // Compartilhar arquivo
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(filePath, {
          mimeType: 'text/csv',
          dialogTitle: `Relatório de Vendas ${period}`,
          UTI: 'public.comma-separated-values-text',
        });
      } else {
        Alert.alert('Erro', 'Compartilhamento não disponível neste dispositivo');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível exportar o relatório');
      console.error('Erro ao exportar relatório:', error);
      setChartLoading(false);
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando relatórios..." />;
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

  // Preparar dados para os gráficos
  const salesByPeriodData = {
    labels: hourlySales.map(hour => hour.hour),
    datasets: [
      {
        data: hourlySales.map(hour => hour.sales),
      },
    ],
  };

  const topProductsChartData = topProducts.map((product, index) => ({
    name: product.name,
    value: product.totalRevenue,
    color: [
      '#FF69B4', // Rosa
      '#4CAF50', // Verde
      '#2196F3', // Azul
      '#FF9800', // Laranja
      '#9C27B0', // Roxo
    ][index % 5],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  const categoryChartData = salesByCategory.map((category, index) => ({
    name: category.category,
    value: category.sales,
    color: [
      '#FF69B4', // Rosa
      '#4CAF50', // Verde
      '#2196F3', // Azul
      '#FF9800', // Laranja
      '#9C27B0', // Roxo
    ][index % 5],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  const paymentMethodChartData = salesByPaymentMethod.map((method, index) => ({
    name: method.category,
    value: method.sales,
    color: [
      '#FF69B4', // Rosa
      '#4CAF50', // Verde
      '#2196F3', // Azul
      '#FF9800', // Laranja
    ][index % 4],
    legendFontColor: '#7F7F7F',
    legendFontSize: 12,
  }));

  const renderChartContent = () => {
    switch (selectedChartView) {
      case 'sales':
        return (
          <>
            <SalesChart
              title="Vendas por Período"
              data={salesByPeriodData}
              type="bar"
              description={`Vendas por ${selectedPeriod === 'day' ? 'horário' : 'período'} (${getPeriodLabel(selectedPeriod)})`}
              showValues={true}
              loading={chartLoading}
            />

            <SalesChart
              title="Tendência de Vendas"
              data={salesByPeriodData}
              type="line"
              description={`Tendência de vendas ${getPeriodLabel(selectedPeriod)}`}
              loading={chartLoading}
              animated={true}
            />
          </>
        );

      case 'products':
        return (
          <>
            <SalesChart
              title="Produtos Mais Vendidos"
              data={topProductsChartData}
              type="pie"
              description="Distribuição de receita por produto"
              loading={chartLoading}
            />

            <Card style={styles.tableCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.tableTitle}>
                  Top 5 Produtos
                </Text>
                <Text variant="bodySmall" style={styles.tableDescription}>
                  Produtos mais vendidos no período
                </Text>

                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, styles.productNameCell]}>Produto</Text>
                  <Text style={[styles.tableHeaderCell, styles.quantityCell]}>Qtd.</Text>
                  <Text style={[styles.tableHeaderCell, styles.revenueCell]}>Receita</Text>
                </View>

                <Divider />

                {topProducts.map((product, index) => (
                  <View key={index}>
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.productNameCell]}>{product.name}</Text>
                      <Text style={[styles.tableCell, styles.quantityCell]}>
                        {product.quantity}
                      </Text>
                      <Text style={[styles.tableCell, styles.revenueCell]}>
                        {formatCurrency(product.totalRevenue)}
                      </Text>
                    </View>
                    <Divider />
                  </View>
                ))}
              </Card.Content>
            </Card>
          </>
        );

      case 'categories':
        return (
          <>
            <SalesChart
              title="Vendas por Categoria"
              data={categoryChartData}
              type="pie"
              description="Distribuição de vendas por categoria de produto"
              loading={chartLoading}
            />

            <Card style={styles.tableCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.tableTitle}>
                  Vendas por Categoria
                </Text>
                <Text variant="bodySmall" style={styles.tableDescription}>
                  Distribuição de vendas por categoria
                </Text>

                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, styles.productNameCell]}>Categoria</Text>
                  <Text style={[styles.tableHeaderCell, styles.quantityCell]}>%</Text>
                  <Text style={[styles.tableHeaderCell, styles.revenueCell]}>Valor</Text>
                </View>

                <Divider />

                {salesByCategory.map((category, index) => (
                  <View key={index}>
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.productNameCell]}>
                        {category.category}
                      </Text>
                      <Text style={[styles.tableCell, styles.quantityCell]}>
                        {category.percentage.toFixed(1)}%
                      </Text>
                      <Text style={[styles.tableCell, styles.revenueCell]}>
                        {formatCurrency(category.sales)}
                      </Text>
                    </View>
                    <Divider />
                  </View>
                ))}
              </Card.Content>
            </Card>
          </>
        );

      case 'payment':
        return (
          <>
            <SalesChart
              title="Vendas por Forma de Pagamento"
              data={paymentMethodChartData}
              type="pie"
              description="Distribuição de vendas por método de pagamento"
              loading={chartLoading}
            />

            <Card style={styles.tableCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.tableTitle}>
                  Vendas por Meio de Pagamento
                </Text>
                <Text variant="bodySmall" style={styles.tableDescription}>
                  Distribuição de vendas por forma de pagamento
                </Text>

                <View style={styles.tableHeader}>
                  <Text style={[styles.tableHeaderCell, styles.productNameCell]}>
                    Meio de Pagamento
                  </Text>
                  <Text style={[styles.tableHeaderCell, styles.quantityCell]}>%</Text>
                  <Text style={[styles.tableHeaderCell, styles.revenueCell]}>Valor</Text>
                </View>

                <Divider />

                {salesByPaymentMethod.map((method, index) => (
                  <View key={index}>
                    <View style={styles.tableRow}>
                      <Text style={[styles.tableCell, styles.productNameCell]}>
                        {method.category}
                      </Text>
                      <Text style={[styles.tableCell, styles.quantityCell]}>
                        {method.percentage.toFixed(1)}%
                      </Text>
                      <Text style={[styles.tableCell, styles.revenueCell]}>
                        {formatCurrency(method.sales)}
                      </Text>
                    </View>
                    <Divider />
                  </View>
                ))}
              </Card.Content>
            </Card>
          </>
        );

      default:
        return null;
    }
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
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
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: '#333',
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
  },
  cardLabel: {
    color: '#666',
    marginBottom: 4,
  },
  cardValue: {
    fontWeight: 'bold',
    color: '#333',
  },
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  comparisonText: {
    fontSize: 12,
    marginLeft: 4,
  },
  tableCard: {
    borderRadius: 12,
    elevation: 2,
    marginVertical: 8,
  },
  tableTitle: {
    marginBottom: 8,
    color: '#333',
  },
  tableDescription: {
    color: '#666',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    color: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
  },
  tableCell: {
    color: '#555',
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
