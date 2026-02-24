import { Product } from '../types/Product';
import { ProductService } from './ProductService';

interface SalesData {
  totalSales: number;
  totalOrders: number;
  averageOrderValue: number;
  comparisonPercentage: number;
}

interface HourlySalesData {
  hour: string;
  sales: number;
}

interface TopProductData {
  name: string;
  quantity: number;
  totalRevenue: number;
}

interface SalesByCategoryData {
  category: string;
  sales: number;
  percentage: number;
}

type PeriodFilter = 'day' | 'week' | 'month' | 'year';

export class ReportService {
  private static instance: ReportService;
  private productService: ProductService;

  private constructor() {
    this.productService = ProductService.getInstance();
  }

  public static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  public async getSalesSummary(period: PeriodFilter): Promise<SalesData> {
    // Dados simulados - No futuro virão de uma API
    const summaryData = {
      day: {
        totalSales: 1250.5,
        totalOrders: 15,
        averageOrderValue: 83.37,
        comparisonPercentage: 5.2,
      },
      week: {
        totalSales: 8450.75,
        totalOrders: 94,
        averageOrderValue: 89.9,
        comparisonPercentage: 12.8,
      },
      month: {
        totalSales: 32750.25,
        totalOrders: 367,
        averageOrderValue: 89.24,
        comparisonPercentage: 7.4,
      },
      year: {
        totalSales: 387500.8,
        totalOrders: 4250,
        averageOrderValue: 91.18,
        comparisonPercentage: 18.6,
      },
    };

    // Simular uma latência de rede
    await this.delay(300);

    return summaryData[period];
  }

  public async getTopProducts(period: PeriodFilter): Promise<TopProductData[]> {
    // Dados simulados - No futuro virão de uma API
    const topProductsData = [
      { name: 'Bolo de Chocolate', quantity: 48, totalRevenue: 2260.8 },
      { name: 'Torta de Limão', quantity: 39, totalRevenue: 1560.0 },
      { name: 'Cupcake de Baunilha', quantity: 120, totalRevenue: 1020.0 },
      { name: 'Bolo de Morango', quantity: 18, totalRevenue: 990.0 },
      { name: 'Docinhos Diversos', quantity: 15, totalRevenue: 1125.0 },
    ];

    // Simular uma latência de rede
    await this.delay(500);

    return topProductsData;
  }

  public async getHourlySales(period: PeriodFilter): Promise<HourlySalesData[]> {
    // Dados simulados - No futuro virão de uma API
    const hourlySalesData = {
      day: [
        { hour: '8-10', sales: 970.5 },
        { hour: '10-12', sales: 1430.25 },
        { hour: '12-14', sales: 2150.0 },
        { hour: '14-16', sales: 1650.8 },
        { hour: '16-18', sales: 1370.2 },
        { hour: '18-20', sales: 880.0 },
      ],
      week: [
        { hour: 'Seg', sales: 1850.25 },
        { hour: 'Ter', sales: 1320.5 },
        { hour: 'Qua', sales: 1450.75 },
        { hour: 'Qui', sales: 1975.8 },
        { hour: 'Sex', sales: 2150.3 },
        { hour: 'Sáb', sales: 2450.9 },
        { hour: 'Dom', sales: 1580.4 },
      ],
      month: [
        { hour: 'Sem 1', sales: 8500.75 },
        { hour: 'Sem 2', sales: 7890.5 },
        { hour: 'Sem 3', sales: 9120.3 },
        { hour: 'Sem 4', sales: 8450.8 },
      ],
      year: [
        { hour: 'Jan', sales: 28500.75 },
        { hour: 'Fev', sales: 32100.5 },
        { hour: 'Mar', sales: 30750.3 },
        { hour: 'Abr', sales: 31200.8 },
        { hour: 'Mai', sales: 29850.2 },
        { hour: 'Jun', sales: 33500.9 },
        { hour: 'Jul', sales: 35800.4 },
        { hour: 'Ago', sales: 34250.6 },
        { hour: 'Set', sales: 32900.3 },
        { hour: 'Out', sales: 30450.2 },
        { hour: 'Nov', sales: 37250.8 },
        { hour: 'Dez', sales: 42800.5 },
      ],
    };

    // Simular uma latência de rede
    await this.delay(400);

    return hourlySalesData[period];
  }

  public async getSalesByCategory(period: PeriodFilter): Promise<SalesByCategoryData[]> {
    // Dados simulados - No futuro virão de uma API
    const categorySalesData = [
      { category: 'Bolos', sales: 12560.8, percentage: 38.2 },
      { category: 'Tortas', sales: 8750.2, percentage: 26.6 },
      { category: 'Docinhos', sales: 5480.5, percentage: 16.7 },
      { category: 'Cupcakes', sales: 3250.75, percentage: 9.9 },
      { category: 'Outros', sales: 2820.3, percentage: 8.6 },
    ];

    // Simular uma latência de rede
    await this.delay(450);

    return categorySalesData;
  }

  public async getSalesByPaymentMethod(period: PeriodFilter): Promise<SalesByCategoryData[]> {
    // Dados simulados - No futuro virão de uma API
    const paymentMethodData = [
      { category: 'Cartão de Crédito', sales: 18750.8, percentage: 57.2 },
      { category: 'PIX', sales: 10250.3, percentage: 31.3 },
      { category: 'Dinheiro', sales: 2450.75, percentage: 7.5 },
      { category: 'Outros', sales: 1320.4, percentage: 4.0 },
    ];

    // Simular uma latência de rede
    await this.delay(350);

    return paymentMethodData;
  }

  public async exportReportData(period: PeriodFilter): Promise<string> {
    const salesSummary = await this.getSalesSummary(period);
    const topProducts = await this.getTopProducts(period);
    const hourlySales = await this.getHourlySales(period);

    // Formatar os dados para um CSV
    const header = 'Métrica,Valor\n';
    const summaryRows = [
      `Total de Vendas,${salesSummary.totalSales.toFixed(2)}\n`,
      `Total de Pedidos,${salesSummary.totalOrders}\n`,
      `Valor Médio por Pedido,${salesSummary.averageOrderValue.toFixed(2)}\n`,
      `Crescimento,${salesSummary.comparisonPercentage}%\n\n`,
    ].join('');

    const topProductsHeader = 'Produto,Quantidade,Receita Total\n';
    const topProductsRows = topProducts
      .map(product => `${product.name},${product.quantity},${product.totalRevenue.toFixed(2)}\n`)
      .join('');

    const hourlySalesHeader = '\nHorário,Vendas\n';
    const hourlySalesRows = hourlySales
      .map(hour => `${hour.hour},${hour.sales.toFixed(2)}\n`)
      .join('');

    return (
      header +
      summaryRows +
      topProductsHeader +
      topProductsRows +
      hourlySalesHeader +
      hourlySalesRows
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
