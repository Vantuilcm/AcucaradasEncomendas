import { ProductService } from './ProductService';
import { OrderService } from './OrderService';
import type { Order } from '../types/Order';

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
  private orderService: OrderService;

  private constructor() {
    this.productService = ProductService.getInstance();
    this.orderService = OrderService.getInstance();
  }

  public static getInstance(): ReportService {
    if (!ReportService.instance) {
      ReportService.instance = new ReportService();
    }
    return ReportService.instance;
  }

  public async getSalesSummary(period: PeriodFilter): Promise<SalesData> {
    const orders = await this.orderService.getAllOrders();
    const { start, end, prevStart, prevEnd } = this.getPeriodRange(period);

    const currentOrders = this.filterOrdersByRange(orders, start, end);
    const previousOrders = this.filterOrdersByRange(orders, prevStart, prevEnd);

    const totalSales = currentOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalOrders = currentOrders.length;
    const averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    const previousSales = previousOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const comparisonPercentage = previousSales > 0
      ? ((totalSales - previousSales) / previousSales) * 100
      : totalSales > 0 ? 100 : 0;

    return {
      totalSales,
      totalOrders,
      averageOrderValue,
      comparisonPercentage,
    };
  }

  public async getTopProducts(period: PeriodFilter): Promise<TopProductData[]> {
    const orders = await this.orderService.getAllOrders();
    const { start, end } = this.getPeriodRange(period);
    const currentOrders = this.filterOrdersByRange(orders, start, end);

    const productsMap = new Map<string, TopProductData>();

    for (const order of currentOrders) {
      for (const item of order.items || []) {
        const current = productsMap.get(item.productId) || {
          name: item.name,
          quantity: 0,
          totalRevenue: 0,
        };
        current.quantity += item.quantity || 0;
        const itemTotal = typeof item.totalPrice === 'number'
          ? item.totalPrice
          : (item.unitPrice || 0) * (item.quantity || 0);
        current.totalRevenue += itemTotal;
        productsMap.set(item.productId, current);
      }
    }

    return Array.from(productsMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);
  }

  public async getHourlySales(period: PeriodFilter): Promise<HourlySalesData[]> {
    const orders = await this.orderService.getAllOrders();
    const { start, end } = this.getPeriodRange(period);
    const currentOrders = this.filterOrdersByRange(orders, start, end);

    if (period === 'day') {
      const slots = [
        { label: '8-10', start: 8, end: 10 },
        { label: '10-12', start: 10, end: 12 },
        { label: '12-14', start: 12, end: 14 },
        { label: '14-16', start: 14, end: 16 },
        { label: '16-18', start: 16, end: 18 },
        { label: '18-20', start: 18, end: 20 },
      ];
      const sales = slots.map(s => ({ hour: s.label, sales: 0 }));
      for (const order of currentOrders) {
        const date = this.parseOrderDate(order.createdAt);
        const hour = date.getHours();
        const slotIndex = slots.findIndex(s => hour >= s.start && hour < s.end);
        if (slotIndex >= 0) {
          sales[slotIndex].sales += order.totalAmount || 0;
        }
      }
      return sales;
    }

    if (period === 'week') {
      const labels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
      const sales = labels.map(hour => ({ hour, sales: 0 }));
      for (const order of currentOrders) {
        const date = this.parseOrderDate(order.createdAt);
        const day = date.getDay();
        const index = day === 0 ? 6 : day - 1;
        sales[index].sales += order.totalAmount || 0;
      }
      return sales;
    }

    if (period === 'month') {
      const sales = [
        { hour: 'Sem 1', sales: 0 },
        { hour: 'Sem 2', sales: 0 },
        { hour: 'Sem 3', sales: 0 },
        { hour: 'Sem 4', sales: 0 },
      ];
      for (const order of currentOrders) {
        const date = this.parseOrderDate(order.createdAt);
        const weekIndex = Math.min(3, Math.floor((date.getDate() - 1) / 7));
        sales[weekIndex].sales += order.totalAmount || 0;
      }
      return sales;
    }

    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const sales = monthLabels.map(hour => ({ hour, sales: 0 }));
    for (const order of currentOrders) {
      const date = this.parseOrderDate(order.createdAt);
      const index = date.getMonth();
      sales[index].sales += order.totalAmount || 0;
    }
    return sales;
  }

  public async getSalesByCategory(period: PeriodFilter): Promise<SalesByCategoryData[]> {
    const orders = await this.orderService.getAllOrders();
    const { start, end } = this.getPeriodRange(period);
    const currentOrders = this.filterOrdersByRange(orders, start, end);

    const products = await this.productService.getProducts({} as any);
    const productCategoryMap = new Map(products.map(p => [p.id, p.categoria || 'Outros']));

    const categoryTotals = new Map<string, number>();
    for (const order of currentOrders) {
      for (const item of order.items || []) {
        const category = productCategoryMap.get(item.productId) || 'Outros';
        const itemTotal = typeof item.totalPrice === 'number'
          ? item.totalPrice
          : (item.unitPrice || 0) * (item.quantity || 0);
        categoryTotals.set(category, (categoryTotals.get(category) || 0) + itemTotal);
      }
    }

    const totalSales = Array.from(categoryTotals.values()).reduce((sum, val) => sum + val, 0);

    return Array.from(categoryTotals.entries())
      .map(([category, sales]) => ({
        category,
        sales,
        percentage: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.sales - a.sales);
  }

  public async getSalesByPaymentMethod(period: PeriodFilter): Promise<SalesByCategoryData[]> {
    const orders = await this.orderService.getAllOrders();
    const { start, end } = this.getPeriodRange(period);
    const currentOrders = this.filterOrdersByRange(orders, start, end);

    const totals = new Map<string, number>();
    for (const order of currentOrders) {
      const type = order.paymentMethod?.type || 'other';
      const label = type === 'credit_card'
        ? 'Cartão de Crédito'
        : type === 'pix'
        ? 'PIX'
        : type === 'money'
        ? 'Dinheiro'
        : 'Outros';
      totals.set(label, (totals.get(label) || 0) + (order.totalAmount || 0));
    }

    const totalSales = Array.from(totals.values()).reduce((sum, val) => sum + val, 0);
    return Array.from(totals.entries())
      .map(([category, sales]) => ({
        category,
        sales,
        percentage: totalSales > 0 ? (sales / totalSales) * 100 : 0,
      }))
      .sort((a, b) => b.sales - a.sales);
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

  private parseOrderDate(date: string | Date): Date {
    if (date instanceof Date) return date;
    const parsed = new Date(date);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  private filterOrdersByRange(orders: Order[], start: Date, end: Date): Order[] {
    return orders.filter(order => {
      const date = this.parseOrderDate(order.createdAt);
      return date >= start && date < end;
    });
  }

  private getPeriodRange(period: PeriodFilter): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
    const end = new Date();
    const start = new Date(end);
    let prevStart = new Date(end);
    let prevEnd = new Date(end);

    if (period === 'day') {
      start.setHours(0, 0, 0, 0);
      prevEnd = new Date(start);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 1);
      return { start, end, prevStart, prevEnd };
    }

    if (period === 'week') {
      const day = start.getDay();
      const diff = (day + 6) % 7;
      start.setDate(start.getDate() - diff);
      start.setHours(0, 0, 0, 0);
      prevEnd = new Date(start);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      return { start, end, prevStart, prevEnd };
    }

    if (period === 'month') {
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      prevEnd = new Date(start);
      prevStart = new Date(start);
      prevStart.setMonth(prevStart.getMonth() - 1);
      return { start, end, prevStart, prevEnd };
    }

    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
    prevEnd = new Date(start);
    prevStart = new Date(start);
    prevStart.setFullYear(prevStart.getFullYear() - 1);
    return { start, end, prevStart, prevEnd };
  }
}
