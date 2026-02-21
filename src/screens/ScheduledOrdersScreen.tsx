import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Chip, useTheme, Button, SegmentedButtons, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, LocaleConfig } from 'react-native-calendars';
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

// Configurar o calendário para português brasileiro
LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ],
  monthNamesShort: [
    'Jan.',
    'Fev.',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul.',
    'Ago',
    'Set.',
    'Out.',
    'Nov.',
    'Dez.',
  ],
  dayNames: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
  dayNamesShort: ['Dom.', 'Seg.', 'Ter.', 'Qua.', 'Qui.', 'Sex.', 'Sáb.'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

export function ScheduledOrdersScreen() {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      filterOrdersByDate(selectedDate);
    }
  }, [selectedDate, orders]);

  useEffect(() => {
    updateMarkedDates();
  }, [orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const orderService = new OrderService();
      const filters = { isScheduled: true };
      const ordersData = await orderService.getUserOrders(user.id, filters);

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
    const dates = {};
    const scheduledDates = {};

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

  const filterOrdersByDate = date => {
    const filtered = orders.filter(
      order =>
        order.isScheduledOrder && order.scheduledDelivery && order.scheduledDelivery.date === date
    );
    setFilteredOrders(filtered);
  };

  const handleDayPress = day => {
    setSelectedDate(day.dateString);
    setView('list');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOrders();
    setRefreshing(false);
  };

  const handleOrderPress = orderId => {
    navigation.navigate('OrderDetails', { orderId });
  };

  const getStatusColor = status => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'confirmed':
      case 'preparing':
      case 'ready':
        return theme.colors.info;
      case 'delivering':
        return theme.colors.primary;
      case 'delivered':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.disabled;
    }
  };

  const getStatusLabel = status => {
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

  const formatDate = dateString => {
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
    const generateOrdersTable = orders => {
      return orders
        .map(
          order => `
        <tr>
          <td>#${order.id.substring(0, 6)}</td>
          <td>${
            order.scheduledDelivery.type === 'scheduled'
              ? `Entre ${order.scheduledDelivery.timeSlot?.replace(' - ', ' e ')}`
              : `${order.scheduledDelivery.customTime}`
          }</td>
          <td>${order.items.map(item => `${item.quantity}x ${item.name}`).join('<br>')}</td>
          <td>${formatCurrency(order.totalAmount)}</td>
          <td>${getStatusLabel(order.status)}</td>
        </tr>
      `
        )
        .join('');
    };

    // Gerar listagem de todos os produtos necessários para o dia
    const productsNeeded = {};
    filteredOrders.forEach(order => {
      order.items.forEach(item => {
        if (!productsNeeded[item.name]) {
          productsNeeded[item.name] = 0;
        }
        productsNeeded[item.name] += item.quantity;
      });
    });

    const productsHTML = Object.keys(productsNeeded)
      .map(
        productName => `
      <tr>
        <td>${productName}</td>
        <td>${productsNeeded[productName]}</td>
      </tr>
    `
      )
      .join('');

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
            <div class="logo">Açucaradas Encomendas</div>
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
      console.error('Erro ao gerar relatório:', error);
      Alert.alert('Erro', 'Não foi possível gerar o relatório.');
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando pedidos agendados..." />;
  }

  return (
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
              <Calendar
                onDayPress={handleDayPress}
                markedDates={markedDates}
                firstDay={1}
                enableSwipeMonths
                hideExtraDays
                theme={{
                  selectedDayBackgroundColor: '#FF69B4',
                  todayTextColor: '#FF69B4',
                  arrowColor: '#FF69B4',
                  dotColor: '#FF69B4',
                  textDayFontSize: 16,
                  textMonthFontSize: 16,
                  textDayHeaderFontSize: 14,
                }}
              />

              <Text style={styles.calendarHint}>
                • Datas com pedidos agendados estão marcadas com um ponto rosa
              </Text>

              <Text style={styles.calendarHint}>
                • Toque em uma data para ver os pedidos agendados
              </Text>
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

                {filteredOrders.map(order => (
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
                          {order.scheduledDelivery.type === 'scheduled'
                            ? `Entre ${order.scheduledDelivery.timeSlot?.replace(' - ', ' e ')}`
                            : `Horário específico: ${order.scheduledDelivery.customTime}`}
                        </Text>
                      </View>

                      <View style={styles.prepTime}>
                        <Ionicons name="hourglass-outline" size={18} color="#FF69B4" />
                        <Text style={styles.prepTimeText}>
                          Preparo:{' '}
                          {order.scheduledDelivery.preparationTimeType === 'normal'
                            ? 'Normal (2-3h)'
                            : order.scheduledDelivery.preparationTimeType === 'extended'
                              ? 'Estendido (4-5h)'
                              : `Personalizado (${order.scheduledDelivery.preparationHours}h)`}
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
});
