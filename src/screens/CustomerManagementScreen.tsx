import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text, Searchbar, Card, List, Divider, Button, Chip, Dialog, Portal, RadioButton, Snackbar, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { User } from '../models/User';
import { UserProfileService } from '../services/UserProfileService';
import { Role, Permission, PermissionsService } from '../services/PermissionsService';
import { usePermissions } from '../hooks/usePermissions';
import { OrderService } from '../services/OrderService';
import { customerSegmentationService } from '../services/CustomerSegmentationService';
import { formatCurrency } from '../utils/formatters';
import { ProtectedRoute } from '../components/ProtectedRoute';

export function CustomerManagementScreen() {
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const theme = useTheme();
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [targetUser, setTargetUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role>(Role.CLIENTE);
  const [previousRole, setPreviousRole] = useState<Role | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [roleFilter, setRoleFilter] = useState<Role | undefined>(undefined);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [statsTarget, setStatsTarget] = useState<User | null>(null);
  const [statsData, setStatsData] = useState<{
    totalSpent: number;
    orderCount: number;
    averageOrderValue: number;
    lastPurchaseDate?: Date;
    ltv: number;
    segmentName?: string;
    preferredCategories: string[];
  } | null>(null);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      searchUsers();
    } else {
      setResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [results, searchQuery]);

  const searchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const svc = UserProfileService.getInstance();
      const list = await svc.searchUsers(searchQuery, 20);
      setResults(list);
      setLoading(false);
    } catch (err: any) {
      setError(err?.message || 'Erro ao buscar clientes');
      setLoading(false);
    }
  };

  const filtered = roleFilter ? results.filter(u => (u.role ?? Role.CLIENTE) === roleFilter) : results;
  const visible = filtered.slice(0, page * pageSize);

  const handleRefresh = async () => {
    setRefreshing(true);
    if (searchQuery.length >= 3) {
      await searchUsers();
    }
    setRefreshing(false);
  };

  const openRoleDialog = (u: User) => {
    setTargetUser(u);
    const current = u.role ?? Role.CLIENTE;
    setSelectedRole(current);
    setPreviousRole(current);
    setRoleDialogOpen(true);
  };

  const openStats = async (u: User) => {
    try {
      setStatsTarget(u);
      setStatsDialogOpen(true);
      const orders = await new OrderService().getUserOrders(u.id);
      const processed = customerSegmentationService.processCustomerData(u.id, orders as any[]);
      customerSegmentationService.segmentCustomersRFM();
      const ltv = customerSegmentationService.calculateCustomerLTV(u.id);
      const segment = customerSegmentationService.getCustomerSegment(u.id);
      const preferred = customerSegmentationService.getCustomerPreferredCategories(u.id);
      setStatsData({
        totalSpent: processed.totalSpent,
        orderCount: processed.orderCount,
        averageOrderValue: processed.averageOrderValue,
        lastPurchaseDate: processed.lastPurchaseDate,
        ltv,
        segmentName: segment?.name,
        preferredCategories: preferred,
      });
    } catch (err: any) {
      setStatsData(null);
      setSnackbarMessage(err?.message || 'Erro ao carregar estatísticas');
      setSnackbarVisible(true);
    }
  };

  const confirmRoleChange = async () => {
    try {
      const perm = await PermissionsService.getInstance().hasPermission(Permission.GERENCIAR_USUARIOS);
      if (!perm) {
        Alert.alert('Permissão negada', 'Você não possui permissão para alterar papéis');
        return;
      }
      if (!targetUser) return;
      const ok = await PermissionsService.getInstance().changeUserRole(targetUser.id, selectedRole);
      if (ok) {
        setResults(prev => prev.map(r => (r.id === targetUser.id ? { ...r, role: selectedRole } : r)));
        setRoleDialogOpen(false);
        setSnackbarMessage('Papel alterado');
        setSnackbarVisible(true);
      } else {
        Alert.alert('Falha', 'Não foi possível alterar o papel');
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao alterar papel');
    }
  };

  const undoRoleChange = async () => {
    try {
      if (!targetUser || previousRole == null) return;
      const ok = await PermissionsService.getInstance().changeUserRole(targetUser.id, previousRole);
      if (ok) {
        setResults(prev => prev.map(r => (r.id === targetUser.id ? { ...r, role: previousRole } : r)));
        setSnackbarMessage('Alteração desfeita');
        setSnackbarVisible(true);
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message || 'Falha ao desfazer alteração');
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando..." />;
  }

  if (!isAdmin) {
    return (
      <ProtectedRoute
        requiredPermissions={[Permission.GERENCIAR_USUARIOS]}
        requireAllPermissions={true}
        fallbackRoute={undefined}
        unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
      >
        <SafeAreaView style={styles.container}>
          <ErrorMessage
            message="Apenas administradores da plataforma podem gerenciar a base completa de clientes."
            onRetry={() => navigation.goBack()}
            retryLabel="Voltar"
          />
        </SafeAreaView>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute
      requiredPermissions={[Permission.GERENCIAR_USUARIOS]}
      requireAllPermissions={true}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
    >
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Gerenciar Clientes</Text>
        <Searchbar placeholder="Buscar por nome ou email..." value={searchQuery} onChangeText={setSearchQuery} style={styles.searchBar} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersRow}>
          <Chip mode={roleFilter === undefined ? 'flat' : 'outlined'} selected={roleFilter === undefined} onPress={() => setRoleFilter(undefined)} style={styles.roleChip}>Todos</Chip>
          <Chip mode={roleFilter === Role.CLIENTE ? 'flat' : 'outlined'} selected={roleFilter === Role.CLIENTE} onPress={() => setRoleFilter(Role.CLIENTE)} style={styles.roleChip}>Cliente</Chip>
          <Chip mode={roleFilter === Role.ATENDENTE ? 'flat' : 'outlined'} selected={roleFilter === Role.ATENDENTE} onPress={() => setRoleFilter(Role.ATENDENTE)} style={styles.roleChip}>Atendente</Chip>
          <Chip mode={roleFilter === Role.GERENTE ? 'flat' : 'outlined'} selected={roleFilter === Role.GERENTE} onPress={() => setRoleFilter(Role.GERENTE)} style={styles.roleChip}>Gerente</Chip>
          <Chip mode={roleFilter === Role.ENTREGADOR ? 'flat' : 'outlined'} selected={roleFilter === Role.ENTREGADOR} onPress={() => setRoleFilter(Role.ENTREGADOR)} style={styles.roleChip}>Entregador</Chip>
          <Chip mode={roleFilter === Role.ADMIN ? 'flat' : 'outlined'} selected={roleFilter === Role.ADMIN} onPress={() => setRoleFilter(Role.ADMIN)} style={styles.roleChip}>Admin</Chip>
        </ScrollView>
      </View>
      <ScrollView style={styles.scroll} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}>
        {error && <ErrorMessage message={error} onRetry={searchUsers} />}
        {results.length === 0 && searchQuery.length >= 3 ? (
          <View style={styles.empty}>
            <Text variant="bodyLarge">Nenhum cliente encontrado</Text>
            <Button mode="contained" onPress={() => setSearchQuery('')} style={[styles.emptyBtn, { backgroundColor: theme.colors.primary }]}>Limpar</Button>
          </View>
        ) : (
          visible.map(u => (
            <Card key={u.id} style={styles.card}>
              <Card.Content>
                <List.Item
                  title={u.nome || u.displayName || (isAdmin ? u.email : 'Cliente da plataforma')}
                  description={isAdmin ? u.email : undefined}
                  left={props => <List.Icon {...props} icon="account" />}
                  right={props => (
                    <View style={styles.rightRow}>
                      <Chip mode="outlined" style={styles.roleChip}>{(u.role ?? Role.CLIENTE).toString()}</Chip>
                      <Button mode="text" onPress={() => openRoleDialog(u)}>Alterar papel</Button>
                      <Button mode="text" onPress={() => openStats(u)}>Estatísticas</Button>
                    </View>
                  )}
                />
              </Card.Content>
            </Card>
          ))
        )}
        {visible.length < results.length && (
          <View style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
            <Button mode="outlined" onPress={() => setPage(p => p + 1)}>Carregar mais</Button>
          </View>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={roleDialogOpen} onDismiss={() => setRoleDialogOpen(false)}>
          <Dialog.Title>Alterar papel</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group value={selectedRole} onValueChange={value => setSelectedRole(value as Role)}>
              <RadioButton.Item label="Cliente" value={Role.CLIENTE} />
              <RadioButton.Item label="Atendente" value={Role.ATENDENTE} />
              <RadioButton.Item label="Gerente" value={Role.GERENTE} />
              <RadioButton.Item label="Entregador" value={Role.ENTREGADOR} />
              <RadioButton.Item label="Admin" value={Role.ADMIN} />
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRoleDialogOpen(false)}>Cancelar</Button>
            <Button onPress={confirmRoleChange}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Portal>
        <Dialog visible={statsDialogOpen} onDismiss={() => setStatsDialogOpen(false)}>
          <Dialog.Title>Estatísticas do cliente</Dialog.Title>
          <Dialog.Content>
            {!statsData ? (
              <Text>Nenhum dado disponível</Text>
            ) : (
              <View>
                <Text>Pedidos: {statsData.orderCount}</Text>
                <Text>Total gasto: {formatCurrency(statsData.totalSpent)}</Text>
                <Text>Ticket médio: {formatCurrency(statsData.averageOrderValue)}</Text>
                {statsData.lastPurchaseDate && (
                  <Text>Última compra: {new Date(statsData.lastPurchaseDate).toLocaleDateString('pt-BR')}</Text>
                )}
                <Text>LTV estimado: {formatCurrency(statsData.ltv)}</Text>
                {statsData.segmentName && <Text>Segmento: {statsData.segmentName}</Text>}
                {statsData.preferredCategories.length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    <Text>Categorias preferidas:</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
                      {statsData.preferredCategories.map(cat => (
                        <Chip key={cat} style={{ marginRight: 6, marginBottom: 6 }} mode="outlined">{cat}</Chip>
                      ))}
                    </View>
                  </View>
                )}
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setStatsDialogOpen(false)}>Fechar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <Snackbar visible={snackbarVisible} onDismiss={() => setSnackbarVisible(false)} duration={3000} action={{ label: 'Desfazer', onPress: undoRoleChange }}>
        {snackbarMessage}
      </Snackbar>
    </SafeAreaView>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { color: '#333', marginBottom: 12 },
  searchBar: { marginBottom: 8 },
  filtersRow: { flexDirection: 'row' },
  scroll: { flex: 1 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyBtn: { marginTop: 12 },
  card: { marginHorizontal: 16, marginTop: 12, borderRadius: 12 },
  rightRow: { flexDirection: 'row', alignItems: 'center' },
  roleChip: { marginRight: 8 },
});

export default CustomerManagementScreen;
