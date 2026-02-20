import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Divider, useTheme, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { formatCurrency } from '../utils/formatters';
import { Order } from '../types/Order';
import { Ionicons } from '@expo/vector-icons';
import { PrintOrderButton } from '../components/PrintOrderButton';

interface RouteParams {
  order: Order;
}

export default function OrderCompletedScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { order } = route.params as RouteParams;
  

  const handleTrackOrder = () => {
    navigation.navigate('OrderDetails', { orderId: order.id });
  };

  const handleBackToHome = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <SafeAreaView style={styles.container} testID="confirmacao-pedido-screen">
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <View style={styles.animationContainer}>
          <Ionicons name="checkmark-circle" size={120} color="#4CAF50" />
        </View>

        <Text variant="headlineMedium" style={styles.title}>
          Pedido Confirmado!
        </Text>

        <Text variant="bodyLarge" style={styles.subtitle}>
          Seu pedido foi realizado com sucesso.
        </Text>

        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Detalhes do Pedido
              </Text>
              <PrintOrderButton order={order} compact={true} />
            </View>

            <View style={styles.row}>
              <Text variant="bodyMedium">Número do pedido: {order.id}</Text>
            </View>

            <View style={styles.row}>
              <Text variant="bodyMedium">Data</Text>
              <Text variant="bodyMedium" style={styles.value}>
                {new Date(order.createdAt).toLocaleDateString('pt-BR')}
              </Text>
            </View>

            <View style={styles.row}>
              <Text variant="bodyMedium">Hora</Text>
              <Text variant="bodyMedium" style={styles.value}>
                {new Date(order.createdAt).toLocaleTimeString('pt-BR')}
              </Text>
            </View>

            <View style={styles.row}>
              <Text variant="bodyMedium">Status</Text>
              <View style={[styles.statusBadge, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.statusText}>Confirmado</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            {/* Informações de agendamento caso seja um pedido agendado */}
            {order.isScheduledOrder && order.scheduledDelivery && (
              <>
                <Text variant="titleMedium" style={styles.cardTitle}>
                  Informações da Entrega Agendada
                </Text>

                <View style={styles.scheduleInfo}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color="#FF69B4"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoText}>
                    {new Date(order.scheduledDelivery.date).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                    })}
                  </Text>
                </View>

                <View style={styles.scheduleInfo}>
                  <Ionicons name="time-outline" size={20} color="#FF69B4" style={styles.infoIcon} />
                  <Text style={styles.infoText}>
                    {order.scheduledDelivery.type === 'scheduled'
                      ? `Entre ${order.scheduledDelivery.timeSlot?.replace(' - ', ' e ')}`
                      : `Horário específico: ${order.scheduledDelivery.customTime}`}
                  </Text>
                </View>

                <View style={styles.scheduleInfo}>
                  <Ionicons
                    name="hourglass-outline"
                    size={20}
                    color="#FF69B4"
                    style={styles.infoIcon}
                  />
                  <Text style={styles.infoText}>
                    Tempo de preparo definido pelo produtor:{' '}
                    {order.scheduledDelivery.preparationHours} hora
                    {order.scheduledDelivery.preparationHours > 1 ? 's' : ''}
                  </Text>
                </View>

                {order.scheduledDelivery.specialInstructions && (
                  <View style={styles.scheduleInfo}>
                    <Ionicons
                      name="document-text-outline"
                      size={20}
                      color="#FF69B4"
                      style={styles.infoIcon}
                    />
                    <Text style={styles.infoText}>
                      Instruções: {order.scheduledDelivery.specialInstructions}
                    </Text>
                  </View>
                )}

                <Divider style={styles.divider} />
              </>
            )}

            <Text variant="titleMedium" style={styles.cardTitle}>
              Itens
            </Text>

            {order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text variant="bodyMedium" style={styles.itemCount}>
                    {item.quantity}x
                  </Text>
                  <Text variant="bodyMedium">{item.name}</Text>
                </View>
                <Text variant="bodyMedium">{formatCurrency(item.unitPrice * item.quantity)}</Text>
              </View>
            ))}

            <Divider style={styles.divider} />

            <View style={styles.totalRow}>
              <Text variant="titleMedium">Total</Text>
              <Text variant="titleMedium" style={{ color: theme.colors.primary }}>
                {formatCurrency(order.totalAmount)}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.addressCard}>
          <Card>
            <Card.Content>
              <Text variant="titleMedium" style={styles.cardTitle}>
                Endereço de Entrega
              </Text>
              <Text variant="bodyMedium">
                {order.deliveryAddress.street}, {order.deliveryAddress.number}
              </Text>
              {order.deliveryAddress.complement && (
                <Text variant="bodyMedium">{order.deliveryAddress.complement}</Text>
              )}
              <Text variant="bodyMedium">
                {order.deliveryAddress.neighborhood}, {order.deliveryAddress.city} -{' '}
                {order.deliveryAddress.state}
              </Text>
              <Text variant="bodyMedium">{order.deliveryAddress.zipCode}</Text>
              {order.deliveryAddress.reference && (
                <Text variant="bodyMedium">Referência: {order.deliveryAddress.reference}</Text>
              )}
            </Card.Content>
          </Card>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={handleTrackOrder}
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
          >
            Acompanhar Pedido
          </Button>

          <Button
            mode="outlined"
            onPress={handleBackToHome}
            style={styles.button}
            textColor={theme.colors.primary}
            testID="voltar-inicio-button"
          >
            Voltar para Home
          </Button>

          <PrintOrderButton order={order} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  animationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
  },
  animation: {
    width: 200,
    height: 200,
  },
  title: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.7,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
  },
  addressCard: {
    marginBottom: 24,
  },
  cardTitle: {
    marginBottom: 12,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  value: {
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemCount: {
    marginRight: 8,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginBottom: 12,
    borderRadius: 8,
    paddingVertical: 6,
  },
  scheduleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoIcon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
});
