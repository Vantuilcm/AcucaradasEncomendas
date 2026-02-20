import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, List, IconButton, Divider, Button, Portal, Modal, Switch, Card } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import {
  Notification,
  NotificationPreferences,
  NotificationStats,
  NotificationType,
} from '../types/Notification';
import { formatDate } from '../utils/formatters';
import { PushNotificationService } from '../services/PushNotificationService';
import * as Notifications from 'expo-notifications';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

export function NotificationsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [tempPreferences, setTempPreferences] = useState<NotificationPreferences | null>(null);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      checkPushStatus();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const userId = (user?.uid ?? user?.id) as string;
      const service = NotificationService.getInstance();
      const [notificationsData, statsData, preferencesData] = await Promise.all([
        service.getUserNotifications(userId),
        service.getNotificationStats(userId),
        service.getUserPreferences(userId),
      ]);

      setNotifications(notificationsData);
      setStats(statsData);
      setPreferences(preferencesData);
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

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      const service = NotificationService.getInstance();
      await service.markAsRead(notificationId);
      setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, read: true } : n)));
      if (stats) {
        setStats(prev =>
          prev
            ? {
                ...prev,
                unread: Math.max(0, prev.unread - 1),
              }
            : null
        );
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível marcar a notificação como lida. Tente novamente.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      if (!user) return;

      const service = NotificationService.getInstance();
      const userId = (user?.uid ?? user?.id) as string;
      await service.markAllAsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      if (stats) {
        setStats(prev =>
          prev
            ? {
                ...prev,
                unread: 0,
              }
            : null
        );
      }
    } catch (err) {
      Alert.alert(
        'Erro',
        'Não foi possível marcar todas as notificações como lidas. Tente novamente.'
      );
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      const service = NotificationService.getInstance();
      await service.deleteNotification(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (stats) {
        setStats(prev =>
          prev
            ? {
                ...prev,
                total: prev.total - 1,
                unread: Math.max(0, prev.unread - 1),
              }
            : null
        );
      }
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível excluir a notificação. Tente novamente.');
    }
  };

  const handleOpenPreferences = () => {
    if (preferences) {
      setTempPreferences(preferences);
      setShowPreferencesModal(true);
    }
  };

  const handleSavePreferences = async () => {
    try {
      if (!user || !tempPreferences) return;

      const service = NotificationService.getInstance();
      const userId = (user?.uid ?? user?.id) as string;
      await service.updateUserPreferences(userId, tempPreferences);
      setPreferences(tempPreferences);
      setShowPreferencesModal(false);
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível salvar as preferências. Tente novamente.');
    }
  };

  const handleToggleNotificationType = (type: NotificationType) => {
    if (!tempPreferences) return;

    setTempPreferences(prev =>
      prev
        ? {
            ...prev,
            types: {
              ...prev.types,
              [type]: !prev.types[type],
            },
          }
        : null
    );
  };

  const checkPushStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPushEnabled(status === 'granted');
    } catch (error) {
      logger.error('Erro ao verificar status das notificações push:', error instanceof Error ? error : new Error(String(error)));
    }
  };

  const handleTogglePushNotifications = async () => {
    try {
      if (!user) return;

      const service = NotificationService.getInstance();
      const userId = (user?.uid ?? user?.id) as string;
      if (!pushEnabled) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await service.registerUserForPushNotifications(userId);
          setPushEnabled(true);
        }
      } else {
        await service.unregisterUserFromPushNotifications(userId);
        setPushEnabled(false);
      }
    } catch (error) {
      Alert.alert(
        'Erro',
        'Não foi possível alterar as configurações de notificação push. Tente novamente.'
      );
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

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text variant="titleMedium">{stats?.unread || 0} notificações não lidas</Text>
        <View style={styles.headerActions}>
          <Button mode="text" onPress={handleMarkAllAsRead} disabled={!stats?.unread}>
            Marcar todas como lidas
          </Button>
          <IconButton icon="cog" onPress={handleOpenPreferences} />
        </View>
      </View>

      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.pushNotificationContainer}>
            <View>
              <Text variant="titleMedium">Notificações Push</Text>
              <Text variant="bodyMedium">
                Receba notificações em tempo real sobre seus pedidos e atualizações
              </Text>
            </View>
            <Switch
              value={pushEnabled}
              onValueChange={handleTogglePushNotifications}
              color="#4CAF50"
            />
          </View>
        </Card.Content>
      </Card>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text>Nenhuma notificação encontrada</Text>
        </View>
      ) : (
        <List.Section>
          {notifications.map(notification => (
            <React.Fragment key={notification.id}>
              <List.Item
                title={notification.title}
                description={notification.message}
                left={props => (
                  <List.Icon
                    {...props}
                    icon={
                      notification.type === 'new_order'
                        ? 'shopping'
                        : notification.type === 'order_status_update'
                          ? 'update'
                          : notification.type === 'order_delivered'
                            ? 'check-circle'
                            : notification.type === 'order_cancelled'
                              ? 'close-circle'
                              : notification.type === 'payment_received'
                                ? 'cash'
                                : notification.type === 'promotion'
                                  ? 'tag'
                                  : 'information'
                    }
                  />
                )}
                right={props => (
                  <View style={styles.notificationActions}>
                    {!notification.read && (
                      <IconButton
                        {...props}
                        icon="check"
                        onPress={() => handleMarkAsRead(notification.id)}
                      />
                    )}
                    <IconButton
                      {...props}
                      icon="delete"
                      onPress={() => handleDeleteNotification(notification.id)}
                    />
                  </View>
                )}
                style={[styles.notificationItem, !notification.read && styles.unreadNotification]}
              />
              <Divider />
            </React.Fragment>
          ))}
        </List.Section>
      )}

      <Portal>
        <Modal
          visible={showPreferencesModal}
          onDismiss={() => setShowPreferencesModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Preferências de Notificação
          </Text>
          <View style={styles.preferencesContainer}>
            <View style={styles.preferenceItem}>
              <Text>Notificações Gerais</Text>
              <Switch
                value={tempPreferences?.enabled ?? true}
                onValueChange={enabled =>
                  setTempPreferences(prev => (prev ? { ...prev, enabled } : null))
                }
              />
            </View>
            {(
              [
                'new_order',
                'order_status_update',
                'order_delivered',
                'order_cancelled',
                'payment_received',
                'promotion',
                'system_update',
              ] as NotificationType[]
            ).map(type => (
              <View key={type} style={styles.preferenceItem}>
                <Text>
                  {type === 'new_order'
                    ? 'Novos Pedidos'
                    : type === 'order_status_update'
                      ? 'Atualizações de Pedido'
                      : type === 'order_delivered'
                        ? 'Pedidos Entregues'
                        : type === 'order_cancelled'
                          ? 'Pedidos Cancelados'
                          : type === 'payment_received'
                            ? 'Pagamentos Recebidos'
                            : type === 'promotion'
                              ? 'Promoções'
                              : 'Atualizações do Sistema'}
                </Text>
                <Switch
                  value={tempPreferences?.types[type] ?? true}
                  onValueChange={() => handleToggleNotificationType(type)}
                />
              </View>
            ))}
          </View>
          <View style={styles.modalActions}>
            <Button onPress={() => setShowPreferencesModal(false)}>Cancelar</Button>
            <Button onPress={handleSavePreferences}>Salvar</Button>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationItem: {
    backgroundColor: '#fff',
  },
  unreadNotification: {
    backgroundColor: '#f0f9ff',
  },
  notificationActions: {
    flexDirection: 'row',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
  preferencesContainer: {
    gap: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  card: {
    margin: 16,
    elevation: 2,
  },
  pushNotificationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
