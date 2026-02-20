import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, ScrollView } from 'react-native';
import {
  Text,
  Card,
  Title,
  Paragraph,
  Button,
  Chip,
  Divider,
  useTheme,
  ActivityIndicator,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { WithdrawalRequest } from '../types/DeliveryDriver';
import { formatCurrency } from '../utils/formatters';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

export default function AdminWithdrawalManagementScreen() {
  const theme = useTheme();
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<WithdrawalRequest['status'] | 'all'>('all');

  const loadRequests = async () => {
    try {
      const service = DeliveryDriverService.getInstance();
      const data = await service.getWithdrawalRequests(filter === 'all' ? undefined : filter);
      setRequests(data);
    } catch (error) {
      logger.error('Erro ao carregar saques:', error instanceof Error ? error : new Error(String(error)));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  const handleUpdateStatus = (request: WithdrawalRequest, newStatus: WithdrawalRequest['status']) => {
    const actionLabel = newStatus === 'approved' ? 'aprovar' : newStatus === 'paid' ? 'marcar como pago' : 'rejeitar';
    
    Alert.alert(
      'Confirmar Ação',
      `Deseja realmente ${actionLabel} o saque de ${formatCurrency(request.amount)} para ${request.driverName}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              const service = DeliveryDriverService.getInstance();
              await service.updateWithdrawalStatus(request.id, newStatus);
              loadRequests();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível atualizar o status do saque.');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'pending': return '#FF9800';
      case 'approved': return '#2196F3';
      case 'paid': return '#4CAF50';
      case 'rejected': return '#F44336';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: WithdrawalRequest['status']) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'approved': return 'Aprovado';
      case 'paid': return 'Pago';
      case 'rejected': return 'Rejeitado';
      default: return status;
    }
  };

  const renderItem = ({ item }: { item: WithdrawalRequest }) => (
    <Card style={styles.card}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View>
            <Title>{item.driverName}</Title>
            <Text variant="bodySmall">Solicitado em: {new Date(item.requestedAt).toLocaleString()}</Text>
          </View>
          <Chip 
            style={{ backgroundColor: getStatusColor(item.status) }}
            textStyle={{ color: '#fff' }}
          >
            {getStatusLabel(item.status)}
          </Chip>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.infoRow}>
          <View>
            <Text variant="labelSmall">Valor</Text>
            <Text variant="headlineSmall" style={styles.amountText}>{formatCurrency(item.amount)}</Text>
          </View>
          <View style={styles.pixInfo}>
            <Text variant="labelSmall">Chave PIX ({item.pixKeyType.toUpperCase()})</Text>
            <Text variant="bodyLarge" selectable>{item.pixKey}</Text>
          </View>
        </View>

        {item.status === 'pending' && (
          <View style={styles.actions}>
            <Button 
              mode="outlined" 
              onPress={() => handleUpdateStatus(item, 'rejected')}
              textColor={theme.colors.error}
              style={styles.actionButton}
            >
              Rejeitar
            </Button>
            <Button 
              mode="contained" 
              onPress={() => handleUpdateStatus(item, 'approved')}
              style={styles.actionButton}
            >
              Aprovar
            </Button>
          </View>
        )}

        {item.status === 'approved' && (
          <Button 
            mode="contained" 
            onPress={() => handleUpdateStatus(item, 'paid')}
            buttonColor="#4CAF50"
            style={styles.fullWidthButton}
          >
            Confirmar Pagamento Realizado
          </Button>
        )}

        {item.processedAt && (
          <Text variant="bodySmall" style={styles.processedText}>
            Processado em: {new Date(item.processedAt).toLocaleString()}
          </Text>
        )}
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>Gestão de Saques</Text>
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {(['all', 'pending', 'approved', 'paid', 'rejected'] as const).map((s) => (
              <Chip
                key={s}
                selected={filter === s}
                onPress={() => setFilter(s)}
                style={styles.filterChip}
                showSelectedCheck={false}
              >
                {s === 'all' ? 'Todos' : getStatusLabel(s)}
              </Chip>
            ))}
          </ScrollView>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" />
      ) : (
        <FlatList
          data={requests}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="cash-remove" size={64} color="#ccc" />
              <Text style={styles.emptyText}>Nenhuma solicitação encontrada.</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
  },
  filterContainer: {
    flexDirection: 'row',
  },
  filterChip: {
    marginRight: 8,
  },
  list: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  divider: {
    marginVertical: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  amountText: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  pixInfo: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 16,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  actionButton: {
    minWidth: 100,
  },
  fullWidthButton: {
    marginTop: 8,
  },
  processedText: {
    marginTop: 12,
    textAlign: 'center',
    color: '#999',
    fontStyle: 'italic',
  },
  loader: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 64,
  },
  emptyText: {
    marginTop: 16,
    color: '#999',
    fontSize: 16,
  },
});
