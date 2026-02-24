import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
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
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver, DeliveryDriverStats } from '../types/DeliveryDriver';
import { formatCurrency } from '../utils/formatters';

export function DeliveryDriverProfileScreen() {
  const { user } = useAuth();
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [stats, setStats] = useState<DeliveryDriverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DeliveryDriver>>({});

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

      const driverData = await DeliveryDriverService.getDriverByUserId(user.uid);
      if (!driverData) {
        throw new Error('Perfil de entregador não encontrado');
      }

      setDriver(driverData);
      setIsAvailable(driverData.availability.isAvailable);

      const statsData = await DeliveryDriverService.getDriverStats(driverData.id);
      setStats(statsData);
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

      await DeliveryDriverService.updateDriverAvailability(driver.id, !isAvailable);

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

      await DeliveryDriverService.updateDriver(driver.id, editForm);
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
          <Text variant="titleMedium">Estatísticas</Text>
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
  statItem: {
    alignItems: 'center',
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
});
