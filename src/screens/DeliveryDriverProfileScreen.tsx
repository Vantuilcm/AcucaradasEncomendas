import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  Text,
  Card,
  Button,
  Avatar,
  Divider,
  List,
  Switch,
  Portal,
  Modal,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver, DeliveryDriverStats } from '../types/DeliveryDriver';
import { Order } from '../types/Order';
import { OrderService } from '../services/OrderService';
import { formatCurrency } from '../utils/formatters';

export function DeliveryDriverProfileScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const theme = useTheme();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [stats, setStats] = useState<DeliveryDriverStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [ratedOrders, setRatedOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DeliveryDriver>>({});
  const [stripeAccountStatus, setStripeAccountStatus] = useState<'not_started' | 'pending' | 'active'>('not_started');
  const [stripeLoading, setStripeLoading] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const service = DeliveryDriverService.getInstance();
      const orderService = new OrderService();

      const driverData = await service.getDriverByUserId(user.id);
      if (!driverData) {
        throw new Error('Perfil de entregador não encontrado');
      }

      setDriver(driverData);
      setIsAvailable(driverData.availability.isAvailable);

      const [statsData, orders, ratingsData, stripeStatus] = await Promise.all([
        service.getDriverStats(driverData.id),
        orderService.getCourierOrders(driverData.id, { status: ['delivered'] }),
        orderService.getDriverRatings(driverData.id, 5),
        service.getStripeAccountStatus(driverData.id)
      ]);

      setStats(statsData);
      setRecentOrders(orders.slice(0, 5));
      setRatedOrders(ratingsData);
      setStripeAccountStatus(stripeStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleToggleAvailability = async () => {
    try {
      if (!driver) return;

      const service = DeliveryDriverService.getInstance();
      await service.updateDriverAvailability(driver.id, !isAvailable);

      setIsAvailable(!isAvailable);
      setDriver(prev =>
        prev
          ? {
              ...prev,
              availability: {
                ...prev.availability,
                isAvailable: !isAvailable,
              },
            }
          : null
      );
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar sua disponibilidade. Tente novamente.');
    }
  };

  const handleStripeOnboarding = async () => {
    if (!driver || !user) return;
    
    setStripeLoading(true);
    try {
      const service = DeliveryDriverService.getInstance();
      const url = await service.getStripeOnboardingLink(driver.id, user.email);
      
      await Linking.openURL(url);
      setStripeAccountStatus('pending');
      Alert.alert(
        'Configuração iniciada', 
        'Abrimos a página de cadastro de recebimentos. Após concluir, retorne ao app.'
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível iniciar a configuração dos seus recebimentos.');
    } finally {
      setStripeLoading(false);
    }
  };

  const handleEditProfile = () => {
    if (driver) {
      setEditForm({
        name: driver.name,
        phone: driver.phone,
        email: driver.email,
        vehicle: driver.vehicle,
      });
      setShowEditModal(true);
    }
  };

  const handleSaveProfile = async () => {
    try {
      if (!driver) return;

      const service = DeliveryDriverService.getInstance();
      await service.updateDriver(driver.id, editForm);
      setDriver(prev => (prev ? { ...prev, ...editForm } : null));
      setShowEditModal(false);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível atualizar seu perfil. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!driver) {
    return (
      <View style={styles.container}>
        <Text>Perfil não encontrado</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Card style={styles.card}>
        <Card.Content style={styles.profileHeader}>
          <Avatar.Text
            size={80}
            label={driver.name
              .split(' ')
              .map(n => n[0])
              .join('')
              .toUpperCase()}
          />
          <View style={styles.profileInfo}>
            <Text variant="titleLarge">{driver.name}</Text>
            <Text variant="bodyMedium">{driver.email}</Text>
          </View>
        </Card.Content>
        <Card.Actions>
          <Button onPress={handleEditProfile}>Editar Perfil</Button>
        </Card.Actions>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Status</Text>
          <View style={styles.statusContainer}>
            <Text>Disponível para entregas</Text>
            <Switch value={isAvailable} onValueChange={handleToggleAvailability} color="#4CAF50" />
          </View>
          <Text variant="bodyMedium" style={styles.statusText}>
            {isAvailable
              ? 'Você está disponível para receber pedidos'
              : 'Você está indisponível para receber pedidos'}
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium">Estatísticas</Text>
            <Button 
              mode="text" 
              compact 
              onPress={() => navigation.navigate('DriverFinanceDashboard')}
            >
              Ver Finanças
            </Button>
          </View>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text variant="titleLarge">{stats?.totalDeliveries || 0}</Text>
              <Text variant="bodyMedium">Entregas</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge">{formatCurrency(stats?.totalEarnings || 0)}</Text>
              <Text variant="bodyMedium">Ganhos Totais</Text>
            </View>
            <View style={styles.statItem}>
              <Text variant="titleLarge">{stats?.averageRating?.toFixed(1) || '0.0'}</Text>
              <Text variant="bodyMedium">Avaliação</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Pagamentos e Recebimentos</Text>
          <Text variant="bodySmall" style={{ marginBottom: 16 }}>
            Configure como você receberá pelos seus ganhos aqui no app.
          </Text>

          <View style={styles.stripeStatusContainer}>
            <View style={styles.stripeStatusInfo}>
              <MaterialCommunityIcons 
                name={stripeAccountStatus === 'active' ? "check-circle" : "alert-circle"} 
                size={24} 
                color={stripeAccountStatus === 'active' ? "#4CAF50" : "#FF9800"} 
              />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text variant="titleSmall">
                  {stripeAccountStatus === 'active' ? "Conta de recebimentos ativa" : 
                   stripeAccountStatus === 'pending' ? "Configuração pendente" : "Configuração necessária"}
                </Text>
                <Text variant="bodySmall">
                  {stripeAccountStatus === 'active' 
                    ? "Sua conta está pronta para receber pagamentos." 
                    : "Você precisa concluir o cadastro para receber seus ganhos automaticamente."}
                </Text>
              </View>
            </View>

            <Button
              mode={stripeAccountStatus === 'active' ? "outlined" : "contained"}
              onPress={handleStripeOnboarding}
              loading={stripeLoading}
              disabled={stripeLoading}
              style={styles.stripeButton}
            >
              {stripeAccountStatus === 'active' ? "Ver configurações de recebimento" : "Configurar recebimentos"}
            </Button>
          </View>
        </Card.Content>
      </Card>

      {driver.badges && driver.badges.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>Conquistas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesContainer}>
              {driver.badges.map(badge => (
                <View key={badge.id} style={styles.badgeItem}>
                  <View style={[styles.badgeIconContainer, { backgroundColor: theme.colors.primaryContainer }]}>
                    <MaterialCommunityIcons name={badge.icon as any} size={32} color={theme.colors.primary} />
                  </View>
                  <Text variant="labelSmall" style={styles.badgeName}>{badge.name}</Text>
                </View>
              ))}
            </ScrollView>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Entregas Recentes</Text>
          {recentOrders.length > 0 ? (
            recentOrders.map(order => (
              <List.Item
                key={order.id}
                title={`Pedido #${order.id.slice(-6)}`}
                description={`${new Date(order.createdAt).toLocaleDateString('pt-BR')} - ${formatCurrency(
                  order.paymentSplit?.shares.find(s => s.recipient === 'courier')?.amount || 
                  order.paymentDetails?.deliveryFee || 0
                )}`}
                left={props => <List.Icon {...props} icon="package-variant" />}
                right={props => <List.Icon {...props} icon="chevron-right" />}
                  onPress={() => {
                    navigation.navigate('OrderDetails', { orderId: order.id });
                  }}
                />
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhuma entrega realizada recentemente.</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Avaliações Recentes</Text>
          {ratedOrders.length > 0 ? (
            ratedOrders.map(order => (
              <View key={`rating-${order.id}`} style={styles.ratingItem}>
                <View style={styles.ratingHeader}>
                  <View style={styles.starsContainer}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <Ionicons
                        key={star}
                        name={star <= (order.rating?.rating || 0) ? 'star' : 'star-outline'}
                        size={16}
                        color={star <= (order.rating?.rating || 0) ? '#FFD700' : '#BDC3C7'}
                      />
                    ))}
                  </View>
                  <Text variant="bodySmall" style={styles.ratingDate}>
                    {new Date(order.rating!.createdAt).toLocaleDateString('pt-BR')}
                  </Text>
                </View>
                {order.rating?.comment ? (
                  <Text variant="bodyMedium" style={styles.ratingComment}>
                    "{order.rating.comment}"
                  </Text>
                ) : (
                  <Text variant="bodyMedium" style={styles.noComment}>Sem comentário</Text>
                )}
                <Divider style={styles.ratingDivider} />
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>Nenhuma avaliação recebida ainda.</Text>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium">Informações do Veículo</Text>
          <List.Item
            title="Tipo"
            description={driver.vehicle.type}
            left={props => <List.Icon {...props} icon="car" />}
          />
          <List.Item
            title="Marca/Modelo"
            description={`${driver.vehicle.brand} ${driver.vehicle.model}`}
            left={props => <List.Icon {...props} icon="car-info" />}
          />
          <List.Item
            title="Placa"
            description={driver.vehicle.plate}
            left={props => <List.Icon {...props} icon="card-text" />}
          />
          <List.Item
            title="Cor"
            description={driver.vehicle.color}
            left={props => <List.Icon {...props} icon="palette" />}
          />
        </Card.Content>
      </Card>

      <Portal>
        <Modal
          visible={showEditModal}
          onDismiss={() => setShowEditModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Editar Perfil
          </Text>
          <TextInput
            label="Nome"
            value={editForm.name}
            onChangeText={name => setEditForm(prev => ({ ...prev, name }))}
            style={styles.input}
          />
          <TextInput
            label="Telefone"
            value={editForm.phone}
            onChangeText={phone => setEditForm(prev => ({ ...prev, phone }))}
            style={styles.input}
          />
          <TextInput
            label="Email"
            value={editForm.email}
            onChangeText={email => setEditForm(prev => ({ ...prev, email }))}
            style={styles.input}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            label="Marca do Veículo"
            value={editForm.vehicle?.brand}
            onChangeText={brand =>
              setEditForm(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle!, brand },
              }))
            }
            style={styles.input}
          />
          <TextInput
            label="Modelo do Veículo"
            value={editForm.vehicle?.model}
            onChangeText={model =>
              setEditForm(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle!, model },
              }))
            }
            style={styles.input}
          />
          <TextInput
            label="Placa"
            value={editForm.vehicle?.plate}
            onChangeText={plate =>
              setEditForm(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle!, plate },
              }))
            }
            style={styles.input}
          />
          <TextInput
            label="Cor"
            value={editForm.vehicle?.color}
            onChangeText={color =>
              setEditForm(prev => ({
                ...prev,
                vehicle: { ...prev.vehicle!, color },
              }))
            }
            style={styles.input}
          />
          <View style={styles.modalActions}>
            <Button onPress={() => setShowEditModal(false)}>Cancelar</Button>
            <Button onPress={handleSaveProfile}>Salvar</Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 16,
    elevation: 2,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileInfo: {
    flex: 1,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  statusText: {
    marginTop: 8,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
    marginVertical: 16,
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 16,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    margin: 16,
  },
  ratingItem: {
    marginTop: 12,
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 2,
  },
  ratingDate: {
    opacity: 0.6,
  },
  ratingComment: {
    fontStyle: 'italic',
    color: '#444',
    marginBottom: 8,
  },
  noComment: {
    opacity: 0.4,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  ratingDivider: {
    marginTop: 8,
  },
  badgesContainer: {
    paddingVertical: 8,
    gap: 16,
  },
  badgeItem: {
    alignItems: 'center',
    width: 80,
  },
  badgeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  badgeName: {
    textAlign: 'center',
  },
  stripeStatusContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
  },
  stripeStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stripeButton: {
    marginTop: 8,
  },
});
