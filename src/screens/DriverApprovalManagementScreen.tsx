import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, ScrollView } from 'react-native';
import { Text, Button, Chip, Card, Divider, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '../hooks/usePermissions';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { useAppTheme } from '../components/ThemeProvider';

type DriverStatusFilter = DeliveryDriver['status'];

const STATUS_TABS: { key: DriverStatusFilter; label: string }[] = [
  { key: 'pending', label: 'Pendentes' },
  { key: 'active', label: 'Ativos' },
  { key: 'inactive', label: 'Inativos' },
  { key: 'blocked', label: 'Bloqueados' },
];

export default function DriverApprovalManagementScreen() {
  const { isAdmin } = usePermissions();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const driverService = useMemo(() => new DeliveryDriverService(), []);

  const [selectedStatus, setSelectedStatus] = useState<DriverStatusFilter>('pending');
  const [drivers, setDrivers] = useState<DeliveryDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionDriverId, setActionDriverId] = useState<string | null>(null);

  const loadDrivers = useCallback(async () => {
    if (!isAdmin) {
      setDrivers([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await driverService.getDriversByStatus(selectedStatus);
      setDrivers(data);
    } catch (error) {
      console.error('Erro ao carregar entregadores:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de entregadores.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [driverService, isAdmin, selectedStatus]);

  useEffect(() => {
    setLoading(true);
    loadDrivers();
  }, [loadDrivers]);

  useEffect(() => {
    if (!isAdmin) {
      Alert.alert('Acesso Restrito', 'Apenas administradores podem acessar esta função.');
    }
  }, [isAdmin]);

  const runAction = async (
    driver: DeliveryDriver,
    action: () => Promise<void>,
    successMessage: string
  ) => {
    try {
      setActionDriverId(driver.id);
      await action();
      Alert.alert('Sucesso', successMessage);
      await loadDrivers();
    } catch (error) {
      console.error('Erro ao atualizar entregador:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status do entregador.');
    } finally {
      setActionDriverId(null);
    }
  };

  const handleApprove = (driver: DeliveryDriver) =>
    runAction(driver, () => driverService.updateDriverStatus(driver.id, 'active'), 'Entregador aprovado.');

  const handleBlock = (driver: DeliveryDriver) =>
    runAction(
      driver,
      async () => {
        await driverService.updateDriverStatus(driver.id, 'blocked');
        await driverService.updateDriverAvailability(driver.id, false);
      },
      'Entregador bloqueado.'
    );

  const handleDeactivate = (driver: DeliveryDriver) =>
    runAction(
      driver,
      async () => {
        await driverService.updateDriverStatus(driver.id, 'inactive');
        await driverService.updateDriverAvailability(driver.id, false);
      },
      'Entregador desativado.'
    );

  const handleReactivate = (driver: DeliveryDriver) =>
    runAction(driver, () => driverService.updateDriverStatus(driver.id, 'active'), 'Entregador reativado.');

  const handleUnblock = (driver: DeliveryDriver) =>
    runAction(driver, () => driverService.updateDriverStatus(driver.id, 'active'), 'Entregador desbloqueado.');

  const renderActions = (driver: DeliveryDriver) => {
    const busy = actionDriverId === driver.id;

    switch (driver.status) {
      case 'pending':
        return (
          <View style={styles.actionsRow}>
            <Button
              mode="contained"
              style={styles.actionButton}
              onPress={() => handleApprove(driver)}
              loading={busy}
              disabled={busy}
            >
              Aprovar
            </Button>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() => handleBlock(driver)}
              loading={busy}
              disabled={busy}
            >
              Bloquear
            </Button>
          </View>
        );
      case 'active':
        return (
          <View style={styles.actionsRow}>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() => handleDeactivate(driver)}
              loading={busy}
              disabled={busy}
            >
              Desativar
            </Button>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() => handleBlock(driver)}
              loading={busy}
              disabled={busy}
            >
              Bloquear
            </Button>
          </View>
        );
      case 'inactive':
        return (
          <View style={styles.actionsRow}>
            <Button
              mode="contained"
              style={styles.actionButton}
              onPress={() => handleReactivate(driver)}
              loading={busy}
              disabled={busy}
            >
              Reativar
            </Button>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() => handleBlock(driver)}
              loading={busy}
              disabled={busy}
            >
              Bloquear
            </Button>
          </View>
        );
      case 'blocked':
        return (
          <View style={styles.actionsRow}>
            <Button
              mode="contained"
              style={styles.actionButton}
              onPress={() => handleUnblock(driver)}
              loading={busy}
              disabled={busy}
            >
              Desbloquear
            </Button>
          </View>
        );
      default:
        return null;
    }
  };

  const renderDriver = ({ item }: { item: DeliveryDriver }) => (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.driverName}>{item.name}</Text>
        <Text style={styles.driverMeta}>{item.email}</Text>
        <Text style={styles.driverMeta}>{item.phone}</Text>
        <Text style={styles.driverMeta}>
          {item.vehicle?.brand} {item.vehicle?.model} · {item.vehicle?.plate}
        </Text>
        <Chip style={styles.statusChip} textStyle={styles.statusChipText}>
          {item.status}
        </Chip>
        {renderActions(item)}
      </Card.Content>
    </Card>
  );

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Acesso restrito a administradores.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
        {STATUS_TABS.map((tab) => (
          <Chip
            key={tab.key}
            selected={selectedStatus === tab.key}
            onPress={() => setSelectedStatus(tab.key)}
            style={styles.filterChip}
          >
            {tab.label}
          </Chip>
        ))}
      </ScrollView>

      <Divider />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={drivers}
          keyExtractor={(item) => item.id}
          renderItem={renderDriver}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadDrivers();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Text style={styles.emptyText}>Nenhum entregador nesta categoria.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#FAFAFA',
    },
    filters: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      maxHeight: 56,
    },
    filterChip: {
      marginRight: 8,
    },
    listContent: {
      padding: 16,
      paddingBottom: 32,
    },
    card: {
      marginBottom: 12,
      borderRadius: 12,
    },
    driverName: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1a1a1a',
    },
    driverMeta: {
      fontSize: 14,
      color: '#666',
      marginTop: 4,
    },
    statusChip: {
      alignSelf: 'flex-start',
      marginTop: 12,
      marginBottom: 12,
      backgroundColor: `${theme.colors.primary}15`,
    },
    statusChipText: {
      textTransform: 'capitalize',
    },
    actionsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    actionButton: {
      marginRight: 8,
      marginBottom: 8,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 24,
    },
    emptyText: {
      color: '#888',
      textAlign: 'center',
    },
  });
