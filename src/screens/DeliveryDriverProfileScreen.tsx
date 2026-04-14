import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import {
  Text,
  Card,
  Button,
  Avatar,
  List,
  Switch,
  Portal,
  Modal,
  TextInput,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver, DeliveryDriverStats, DeliveryDriverUpdate } from '../types/DeliveryDriver';
import { formatCurrency } from '../utils/formatters';

export function DeliveryDriverProfileScreen() {
  const { user, logout } = useAuth();
  const driverService = useMemo(() => new DeliveryDriverService(), []);
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [stats, setStats] = useState<DeliveryDriverStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<DeliveryDriverUpdate>({});
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = (user as any)?.uid || (user as any)?.id;
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      const driverData = await driverService.getDriverByUserId(userId);
      if (!driverData) {
        throw new Error('Perfil de entregador não encontrado');
      }

      setDriver(driverData);
      setIsAvailable(driverData.availability.isAvailable);
      setMissingFields(getMissingFields(driverData));

      const statsData = await driverService.getDriverStats(driverData.id);
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
      if (missingFields.length > 0) {
        Alert.alert('Perfil incompleto', 'Complete seu cadastro para ficar disponível.');
        return;
      }
      if (driver.status !== 'active') {
        Alert.alert('Status pendente', 'Seu cadastro precisa estar ativo para aceitar entregas.');
        return;
      }

      await driverService.updateDriverAvailability(driver.id, !isAvailable);

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

      await driverService.updateDriver(driver.id, editForm);
      setDriver(prev => {
        if (!prev) return null;
        const updated: DeliveryDriver = {
          ...prev,
          name: editForm.name ?? prev.name,
          phone: editForm.phone ?? prev.phone,
          email: editForm.email ?? prev.email,
          vehicle: {
            ...prev.vehicle,
            ...(editForm.vehicle || {}),
          },
        };
        setMissingFields(getMissingFields(updated));
        return updated;
      });
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
      {missingFields.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Perfil incompleto</Text>
            <Text variant="bodyMedium">{missingFields.join(', ')}</Text>
          </Card.Content>
        </Card>
      )}

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
            <Switch
              value={isAvailable}
              onValueChange={handleToggleAvailability}
              color="#4CAF50"
              disabled={missingFields.length > 0 || driver.status !== 'active'}
            />
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

      <Card style={styles.card}>
        <Card.Content>
          <Button
            mode="contained"
            buttonColor="#FF3B30"
            onPress={async () => {
              try {
                await logout();
              } catch (error) {
                Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
              }
            }}
          >
            Sair
          </Button>
        </Card.Content>
      </Card>
      
      <View style={styles.footer}>
        <Text style={styles.versionText}>Versão 1.1.8 (Build 1105)</Text>
      </View>

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
            label="Tipo do Veículo"
            value={editForm.vehicle?.type}
            onChangeText={type =>
              setEditForm(prev => ({
                ...prev,
                vehicle: { ...(prev.vehicle || {}), type: type as DeliveryDriver['vehicle']['type'] },
              }))
            }
            style={styles.input}
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
            label="Ano do Veículo"
            value={editForm.vehicle?.year ? String(editForm.vehicle?.year) : ''}
            onChangeText={year =>
              setEditForm(prev => ({
                ...prev,
                vehicle: { ...(prev.vehicle || {}), year: year ? Number(year) : undefined },
              }))
            }
            style={styles.input}
            keyboardType="numeric"
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

const getMissingFields = (driver: DeliveryDriver): string[] => {
  const missing: string[] = [];
  if (!driver.name) missing.push('Nome');
  if (!driver.phone) missing.push('Telefone');
  if (!driver.email) missing.push('Email');
  if (!driver.cpf) missing.push('CPF');
  if (!driver.cnh) missing.push('CNH');
  if (!driver.vehicle?.brand) missing.push('Marca do veículo');
  if (!driver.vehicle?.model) missing.push('Modelo do veículo');
  if (!driver.vehicle?.year) missing.push('Ano do veículo');
  if (!driver.vehicle?.plate) missing.push('Placa do veículo');
  if (!driver.vehicle?.color) missing.push('Cor do veículo');
  if (!driver.documents?.cnhImage) missing.push('Documento CNH');
  if (!driver.documents?.vehicleDocument) missing.push('Documento do veículo');
  if (!driver.documents?.insurance) missing.push('Seguro');
  return missing;
};

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
  footer: {
    marginTop: 32,
    marginBottom: 40,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9E9E9E',
    opacity: 0.8,
  },
});
