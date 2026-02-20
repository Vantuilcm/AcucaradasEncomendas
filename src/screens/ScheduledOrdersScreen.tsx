import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Chip, useTheme, Button, SegmentedButtons, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppNavigation } from '../hooks/useAppNavigation';
import { useAuth } from '../contexts/AuthContext';
import { DatePickerModal } from 'react-native-paper-dates';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { Order } from '../types/Order';
import { OrderService } from '../services/OrderService';
import { formatCurrency } from '../utils/formatters';
import { Ionicons } from '@expo/vector-icons';
import { PrintOrderButton } from '../components/PrintOrderButton';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Platform, Share } from 'react-native';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Permission } from '../services/PermissionsService';
import { usePermissions } from '../hooks/usePermissions';
import Constants from 'expo-constants';
import { DemandForecastService } from '../services/DemandForecastService';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

export function ScheduledOrdersScreen() {
  const theme = useTheme();
  // Fallback to untyped navigation if typed hook is not available
  const navigation = (typeof useAppNavigation === 'function' ? useAppNavigation() : useNavigation<any>()) as any;
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [forecastMap, setForecastMap] = useState<Record<string, { expected: number; lower: number; upper: number; conf: number }>>({});

  useEffect(() => {
    if (!user) { return; }
    const svc = new OrderService();
    const canViewAll =
      hasPermission(Permission.VISUALIZAR_TODOS_PEDIDOS) ||
      hasPermission(Permission.GERENCIAR_PEDIDOS);
    setLoading(true);
    let unsub: (() => void) | null = null;
    if (canViewAll && typeof (svc as any).subscribeToScheduledOrders === 'function') {
      unsub = svc.subscribeToScheduledOrders((list) => {
        setOrders(list);
        setLoading(false);
      });
    } else {
      unsub = svc.subscribeToUserOrders(user.id, (list) => {
        setOrders(list.filter(o => o.isScheduledOrder));
        setLoading(false);
      });
    }
    return () => { try { unsub?.(); } catch {} };
  }, [user, hasPermission]);

  useEffect(() => {
    if (selectedDate) {
      filterOrdersByDate(selectedDate);
    }
  }, [selectedDate, orders]);

  useEffect(() => {
    updateMarkedDates();
  }, [orders]);

  useEffect(() => {
    (async () => {
      try {
        if (!selectedDate || orders.length === 0) {
          setForecastMap({});
          return;
        }

        const svc = DemandForecastService.getInstance();
        const day = new Date(selectedDate);
        const start = new Date(day);
        start.setHours(0, 0, 0, 0);
        const end = new Date(day);
        end.setHours(23, 59, 59, 999);

        const productIds = Array.from(new Set(filteredOrders.flatMap(o => o.items.map(i => i.productId))));

        let historyOrders = orders;
        const canViewAll = hasPermission(Permission.VISUALIZAR_TODOS_PEDIDOS) || hasPermission(Permission.GERENCIAR_PEDIDOS);
        if (canViewAll) {
          const orderService = new OrderService();
          try {
            const all = await orderService.getAllOrders();
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - 365);
            historyOrders = all.filter(o => {
              const created = new Date(o.createdAt);
              return created >= cutoff && o.items?.some(i => productIds.includes(i.productId));
            });
          } catch {}
        }

        const salesHistory: { productId: string; date: Date; quantity: number; price: number }[] = [];
        historyOrders.forEach(order => {
          const created = new Date(order.createdAt);
          order.items.forEach(item => {
            salesHistory.push({ productId: item.productId, date: created, quantity: item.quantity, price: item.unitPrice });
          });
        });

        const map: Record<string, { expected: number; lower: number; upper: number; conf: number }> = {};
        productIds.forEach(pid => {
          const forecast = svc.generateForecast(pid, salesHistory as any);
          if (forecast && Array.isArray(forecast.forecastPoints)) {
            const point = forecast.forecastPoints.find(p => {
              const t = new Date(p.date).getTime();
              return t >= start.getTime() && t <= end.getTime();
            });
            if (point) {
              map[pid] = { expected: point.expectedQuantity, lower: point.lowerBound, upper: point.upperBound, conf: forecast.confidenceScore ?? 0 };
            }
          }
        });
        setForecastMap(map);
      } catch {
        setForecastMap({});
      }
    })();
  }, [orders, selectedDate, filteredOrders, hasPermission]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const orderService = new OrderService();
      const canViewAll =
        hasPermission(Permission.VISUALIZAR_TODOS_PEDIDOS) ||
        hasPermission(Permission.GERENCIAR_PEDIDOS);
      let ordersData: Order[] = [];
      if (canViewAll) {
        const all = await orderService.getAllOrders();
        ordersData = all.filter(o => o.isScheduledOrder);
      } else {
        const filters = { isScheduled: true };
        ordersData = await orderService.getUserOrders(user.id, filters);
      }

      setOrders(ordersData);

      // Se não houver data selecionada, usar a data de hoje
      if (!selectedDate) {
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setLoading(false);
    }
  };

  const updateMarkedDates = () => {
    const dates: Record<string, any> = {};
    const scheduledDates: Record<string, Order[]> = {};

    // Agrupar pedidos por data
    orders.forEach(order => {
      if (order.isScheduledOrder && order.scheduledDelivery) {
        const date = order.scheduledDelivery.date;
        if (!scheduledDates[date]) {
          scheduledDates[date] = [];
        }
        scheduledDates[date].push(order);
      }
    });

    // Marcar as datas no calendário
    Object.keys(scheduledDates).forEach(date => {
      const count = scheduledDates[date].length;
      dates[date] = {
        marked: true,
        dotColor: '#FF69B4',
        selected: date === selectedDate,
        selectedColor: date === selectedDate ? '#FF69B4' : undefined,
      };
    });

    setMarkedDates(dates);
  };

  const filterOrdersByDate = (date: string) => {
    const filtered = orders.filter(
      order =>
        order.isScheduledOrder && order.scheduledDelivery && order.scheduledDelivery.date === date
    );
    setFilteredOrders(filtered);
  };

  const handleDayPress = (day: { dateString: string }) => {
    setSelectedDate(day.dateString);
    setView('list');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return (theme.colors as any).warning ?? theme.colors.primary;
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return (theme.colors as any).info ?? theme.colors.primary;
      case 'delivering':
        return theme.colors.primary;
      case 'delivered':
        return (theme.colors as any).success ?? theme.colors.primary;
      case 'cancelled':
        return (theme.colors as any).error ?? theme.colors.error;
      default:
        return (theme.colors as any).disabled ?? theme.colors.backdrop;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'confirmed':
        return 'Confirmado';
      case 'preparing':
        return 'Em Preparação';
      case 'ready':
        return 'Pronto';
      case 'delivering':
        return 'Em Entrega';
      case 'delivered':
        return 'Entregue';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Função para gerar um relatório de todos os pedidos da data selecionada
  const generateDailyReportHTML = () => {
    const formattedDate = formatDate(selectedDate);

    // Agrupando por tipo de preparação
    const normalPrep = filteredOrders.filter(
      o => o.scheduledDelivery?.preparationTimeType === 'normal'
    );

    const extendedPrep = filteredOrders.filter(
      o => o.scheduledDelivery?.preparationTimeType === 'extended'
    );

    const customPrep = filteredOrders.filter(
      o => o.scheduledDelivery?.preparationTimeType === 'custom'
    );

    // Gerar tabelas para cada tipo
    const generateOrdersTable = (orders: Order[]) => {
      return orders
        .map(
          (order: Order) => `
        <tr>
          <td>#${order.id.substring(0, 6)}</td>
          <td>${
            order.scheduledDelivery?.type === 'scheduled'
              ? `Entre ${order.scheduledDelivery?.timeSlot?.replace(' - ', ' e ')}`
              : `${order.scheduledDelivery?.customTime ?? ''}`
          }</td>
          <td>${order.items.map((item: { quantity: number; name: string }) => `${item.quantity}x ${item.name}`).join('<br>')}</td>
          <td>${formatCurrency(order.totalAmount)}</td>
          <td>${getStatusLabel(order.status)}</td>
        </tr>
      `
        )
        .join('');
    };

    // Gerar listagem de todos os produtos necessários para o dia
    const productsNeeded: Record<string, number> = {};
    filteredOrders.forEach((order: Order) => {
      order.items.forEach((item: { name: string; quantity: number }) => {
        if (!productsNeeded[item.name]) {
          productsNeeded[item.name] = 0;
        }
        productsNeeded[item.name] += item.quantity;
      });
    });

    const productsHTML = Object.keys(productsNeeded)
      .map(
        (productName: string) => `
      <tr>
        <td>${productName}</td>
        <td>${productsNeeded[productName]}</td>
      </tr>
    `
      )
      .join('');

    const brandLogo: any = (Constants as any)?.expoConfig?.extra?.brandLogoUrl;
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Pedidos Agendados - ${formattedDate}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #ddd;
              padding-bottom: 15px;
            }
            .logo {
              font-size: 24px;
              font-weight: bold;
              color: #FF69B4;
            }
            .report-title {
              font-size: 18px;
              margin: 10px 0;
            }
            .section {
              margin-bottom: 20px;
              border-bottom: 1px solid #eee;
              padding-bottom: 15px;
            }
            h2 {
              color: #FF69B4;
              font-size: 18px;
              margin-bottom: 10px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            table th, table td {
              padding: 8px;
              text-align: left;
              border-bottom: 1px solid #ddd;
            }
            th {
              background-color: #f5f5f5;
            }
            .summary {
              font-weight: bold;
              margin-top: 10px;
            }
            .footer {
              margin-top: 30px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="header">
            ${brandLogo ? `<img src="${brandLogo}" alt="Logo" style="height:60px;border-radius:12px;margin-bottom:6px;" />` : `<div class="logo">Açucaradas Encomendas</div>`}
            <div class="report-title">Relatório de Produção - ${formattedDate}</div>
          </div>
          
          <div class="section">
            <h2>Resumo de Produção</h2>
            <div class="summary">Total de Pedidos: ${filteredOrders.length}</div>
            <div class="summary">Preparo Normal: ${normalPrep.length} pedidos</div>
            <div class="summary">Preparo Estendido: ${extendedPrep.length} pedidos</div>
            <div class="summary">Preparo Personalizado: ${customPrep.length} pedidos</div>
          </div>
          
          <div class="section">
            <h2>Produtos Necessários para o Dia</h2>
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Quantidade</th>
                </tr>
              </thead>
              <tbody>
                ${productsHTML}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Pedidos com Preparo Normal (2-3 horas)</h2>
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Horário</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${generateOrdersTable(normalPrep)}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Pedidos com Preparo Estendido (4-5 horas)</h2>
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Horário</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${generateOrdersTable(extendedPrep)}
              </tbody>
            </table>
          </div>
          
          <div class="section">
            <h2>Pedidos com Preparo Personalizado</h2>
            <table>
              <thead>
                <tr>
                  <th>Pedido</th>
                  <th>Horário</th>
                  <th>Itens</th>
                  <th>Total</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${generateOrdersTable(customPrep)}
              </tbody>
            </table>
          </div>
          
          <div class="footer">
            <p>Relatório gerado em ${new Date().toLocaleString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrintDailyReport = async () => {
    try {
      if (filteredOrders.length === 0) {
        Alert.alert('Sem pedidos', 'Não há pedidos agendados para esta data.');
        return;
      }

      const html = generateDailyReportHTML();

      if (Platform.OS === 'web') {
        // No ambiente web, abrir uma nova janela para impressão
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(html);
          newWindow.document.close();
          newWindow.print();
        }
      } else {
        // Em dispositivos móveis, gerar um PDF
        const { uri } = await Print.printToFileAsync({ html });

        // Verificar se o compartilhamento está disponível
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri);
        } else {
          // Alternativa caso o compartilhamento não esteja disponível
          await Share.share({
            url: uri,
            title: `Relatório de Produção - ${formatDate(selectedDate)}`,
          });
        }
      }
    } catch (error) {
      logger.error('Erro ao gerar relatório:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Não foi possível gerar o relatório.');
    }
  };

  const generateDailyCSV = (): string => {
    const header = ['Pedido','Horario','Itens','Total','Status','Preparo'].join(',');
    const rows = filteredOrders.map(o => {
      const horario = o.scheduledDelivery?.type === 'scheduled'
        ? (o.scheduledDelivery?.timeSlot ?? '')
        : (o.scheduledDelivery?.customTime ?? '');
      const itens = o.items.map(i => `${i.quantity}x ${i.name}`).join(' | ');
      const total = `${o.totalAmount}`;
      const status = getStatusLabel(o.status);
      const preparo = o.scheduledDelivery?.preparationTimeType ?? '';
      const escape = (v: any) => `"${String(v).replace(/\r?\n/g, ' ').replace(/"/g, '""')}"`;
      return [`#${o.id.substring(0,6)}`, horario, itens, total, status, preparo]
        .map(escape)
        .join(',');
    });
    return [header, ...rows].join('\n');
  };

  const handleExportDailyCSV = async () => {
    try {
      if (filteredOrders.length === 0) {
        Alert.alert('Sem pedidos', 'Não há pedidos agendados para esta data.');
        return;
      }
      const csv = generateDailyCSV();
      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `relatorio_${selectedDate}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csv,
          title: `Relatório CSV - ${formatDate(selectedDate)}`,
        });
      }
    } catch (error) {
      logger.error('Erro ao exportar CSV:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Não foi possível exportar o CSV.');
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando pedidos agendados..." />;
  }

  return (
    <ProtectedRoute
      requiredPermissions={[Permission.GERENCIAR_PEDIDOS, Permission.VISUALIZAR_TODOS_PEDIDOS]}
      requireAllPermissions={false}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
    >
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>
          Pedidos Agendados
        </Text>

        <SegmentedButtons
          value={view}
          onValueChange={value => setView(value as 'calendar' | 'list')}
          buttons={[
            { value: 'calendar', icon: 'calendar', label: 'Calendário' },
            { value: 'list', icon: 'format-list-bulleted', label: 'Lista' },
          ]}
          style={styles.viewToggle}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {error && <ErrorMessage message={error} onRetry={loadOrders} />}

        {view === 'calendar' ? (
          <Card style={styles.calendarCard}>
            <Card.Content>
              <View>
                <Button
                  icon="calendar"
                  mode="outlined"
                  onPress={() => setDatePickerOpen(true)}
                  style={styles.calendarButton}
                >
                  Selecionar data
                </Button>
                <DatePickerModal
                  locale="pt"
                  mode="single"
                  visible={datePickerOpen}
                  onDismiss={() => setDatePickerOpen(false)}
                  date={selectedDate ? new Date(selectedDate) : undefined}
                  onConfirm={({ date }: { date?: Date }) => {
                    if (date) {
                      const iso = date.toISOString().split('T')[0];
                      setSelectedDate(iso);
                      setView('list');
                    }
                    setDatePickerOpen(false);
                  }}
                />
                <Text style={styles.calendarHint}>Selecione a data para ver pedidos agendados</Text>
              </View>
            </Card.Content>
          </Card>
        ) : (
          <>
            <View style={styles.dateHeader}>
              <Button
                icon="calendar"
                mode="outlined"
                onPress={() => setView('calendar')}
                style={styles.calendarButton}
              >
                {formatDate(selectedDate)}
              </Button>

              <Button
                icon="printer"
                mode="contained"
                onPress={handlePrintDailyReport}
                style={[styles.printButton, { backgroundColor: '#FF69B4' }]}
              >
                Imprimir Relatório
              </Button>
              <Button
                icon="file-delimited"
                mode="outlined"
                onPress={handleExportDailyCSV}
                style={styles.exportButton}
              >
                Exportar CSV
              </Button>
            </View>

            {filteredOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-outline" size={64} color="#ddd" />
                <Text variant="bodyLarge" style={styles.emptyText}>
                  Nenhum pedido agendado para esta data
                </Text>
                <Button
                  icon="calendar"
                  mode="outlined"
                  onPress={() => setView('calendar')}
                  style={styles.emptyButton}
                >
                  Escolher Outra Data
                </Button>
              </View>
            ) : (
              <>
                <View style={styles.ordersSummary}>
                  <Text variant="titleMedium">
                    {filteredOrders.length} pedido{filteredOrders.length !== 1 ? 's' : ''} agendado
                    {filteredOrders.length !== 1 ? 's' : ''} para {formatDate(selectedDate)}
                  </Text>
                </View>

                {(() => {
                  const names: Record<string, string> = {};
                  filteredOrders.forEach(o => o.items.forEach(i => { if (i.productId) { names[i.productId] = i.name; } }));
                  const scheduledByProduct: Record<string, number> = {};
                  filteredOrders.forEach(o => o.items.forEach(i => { if (i.productId) { scheduledByProduct[i.productId] = (scheduledByProduct[i.productId] || 0) + i.quantity; } }));
                  const list = Object.keys(scheduledByProduct).map(pid => ({
                    pid,
                    name: names[pid] || pid,
                    scheduled: scheduledByProduct[pid],
                    expected: Math.round(forecastMap[pid]?.expected || 0),
                    lower: Math.round(forecastMap[pid]?.lower || 0),
                    upper: Math.round(forecastMap[pid]?.upper || 0),
                    confidence: Math.max(0, Math.min(1, forecastMap[pid]?.conf ?? 0)),
                  }))
                    .sort((a, b) => {
                      const wb = 0.5 + 0.5 * (b.confidence ?? 0);
                      const wa = 0.5 + 0.5 * (a.confidence ?? 0);
                      return (b.scheduled + b.expected * wb) - (a.scheduled + a.expected * wa);
                    })
                    .slice(0, 6);
                  return (
                    <Card style={styles.forecastCard}>
                      <Card.Content>
                        <Text variant="titleMedium">Previsão de Demanda</Text>
                        {list.length === 0 ? (
                          <Text variant="bodyMedium">Sem dados suficientes para previsão.</Text>
                        ) : (
                          list.map(item => (
                            <View key={item.pid} style={styles.forecastItemRow}>
                              <Text style={styles.forecastItemName}>{item.name}</Text>
                              <View style={styles.forecastItemValues}>
                                <Chip style={{ backgroundColor: '#FF69B4' }} textStyle={{ color: '#fff' }}>
                                  Agendado: {item.scheduled}
                                </Chip>
                                <Chip style={{ marginLeft: 8 }} mode="outlined">
                                  Previsto: {item.expected}
                                </Chip>
                                <Chip style={{ marginLeft: 8 }} mode="outlined">
                                  IC: {item.lower}–{item.upper}
                                </Chip>
                                <Chip style={{ marginLeft: 8 }} mode="outlined">
                                  Confiança: {Math.round((item.confidence ?? 0) * 100)}%
                                </Chip>
                              </View>
                            </View>
                          ))
                        )}
                      </Card.Content>
                    </Card>
                  );
                })()}

                {filteredOrders.map((order: Order) => (
                  <Card
                    key={order.id}
                    style={styles.orderCard}
                    onPress={() => handleOrderPress(order.id)}
                  >
                    <Card.Content>
                      <View style={styles.orderHeader}>
                        <Text variant="titleMedium">Pedido #{order.id.slice(-6)}</Text>
                        <Chip
                          textStyle={{ color: '#fff' }}
                          style={{ backgroundColor: getStatusColor(order.status) }}
                        >
                          {getStatusLabel(order.status)}
                        </Chip>
                      </View>

                      <View style={styles.timeSlot}>
                        <Ionicons name="time-outline" size={18} color="#FF69B4" />
                        <Text style={styles.timeText}>
                          {order.scheduledDelivery?.type === 'scheduled'
                            ? `Entre ${order.scheduledDelivery?.timeSlot?.replace(' - ', ' e ')}`
                            : `Horário específico: ${order.scheduledDelivery?.customTime ?? ''}`}
                        </Text>
                      </View>

                      <View style={styles.prepTime}>
                        <Ionicons name="hourglass-outline" size={18} color="#FF69B4" />
                        <Text style={styles.prepTimeText}>
                          Preparo:{' '}
                          {order.scheduledDelivery?.preparationHours
                            ? `${order.scheduledDelivery.preparationHours} hora${
                                order.scheduledDelivery.preparationHours > 1 ? 's' : ''
                              } (definido pelo produtor)`
                            : 'Definido pelo produtor'}
                        </Text>
                      </View>

                      <View style={styles.orderItems}>
                        {order.items.map((item, index) => (
                          <Text key={index} style={styles.itemText}>
                            {item.quantity}x {item.name}
                          </Text>
                        ))}
                      </View>

                      <View style={styles.orderFooter}>
                        <Text variant="bodyMedium" style={styles.orderTotal}>
                          Total: {formatCurrency(order.totalAmount)}
                        </Text>
                        <PrintOrderButton order={order} compact />
                      </View>
                    </Card.Content>
                  </Card>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    marginBottom: 16,
    color: '#333',
  },
  viewToggle: {
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
  },
  calendarCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  calendarHint: {
    color: '#666',
    marginTop: 16,
    fontSize: 14,
    fontStyle: 'italic',
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  calendarButton: {
    borderColor: '#FF69B4',
  },
  printButton: {
    marginLeft: 8,
  },
  exportButton: {
    marginLeft: 8,
  },
  ordersSummary: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  orderCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  timeText: {
    marginLeft: 6,
    color: '#333',
  },
  prepTime: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  prepTimeText: {
    marginLeft: 6,
    color: '#333',
  },
  orderItems: {
    borderLeftWidth: 2,
    borderLeftColor: '#FF69B4',
    paddingLeft: 10,
    marginVertical: 8,
  },
  itemText: {
    marginBottom: 4,
    color: '#555',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  orderTotal: {
    fontWeight: 'bold',
    color: '#333',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  emptyText: {
    color: '#666',
    marginVertical: 16,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: 16,
    borderColor: '#FF69B4',
  },
  forecastCard: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  forecastItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  forecastItemName: {
    flex: 1,
    color: '#333',
  },
  forecastItemValues: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
