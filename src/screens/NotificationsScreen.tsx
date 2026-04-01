import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl, Alert } from 'react-native';
import { Text, List, IconButton, Divider, Button, Portal, Modal, Switch, Card } from 'react-native-paper';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import {
  Notification,
  NotificationPreferences,
  NotificationStats,
  NotificationType,
} from '../types/Notification';
import { useAppTheme } from '../components/ThemeProvider';

const notificationTypes: NotificationType[] = [
  'new_order',
  'order_status_update',
  'order_delivered',
  'order_cancelled',
  'payment_received',
  'promotion',
  'system_update',
];

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
  const notificationService = NotificationService.getInstance();
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  useEffect(() => {
    let isMounted = true;
    
    const initialize = async () => {
      try {
        if (user && isMounted) {
          await loadData();
          await checkPushStatus();
        }
      } catch (error) {
        console.error('Erro na inicialização de notificações:', error);
      }
    };

    initialize();
    return () => { isMounted = false; };
  }, [user]);

  const loadData = async () => {
    try {
      const userId = user?.id || (user as any)?.uid;
      if (!userId) {
        setNotifications([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const [notificationsData, statsData, preferencesData] = await Promise.all([
        notificationService.getUserNotifications(userId),
        notificationService.getNotificationStats(userId),
        notificationService.getUserPreferences(userId),
      ]);

      setNotifications(notificationsData || []);
      setStats(statsData);
      setPreferences(preferencesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      await loadData();
    } catch (err) {
      console.error('Erro ao atualizar notificações:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      if (!notificationId) return;
      await notificationService.markAsRead(notificationId);
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
      console.error('Erro ao marcar como lida:', err);
      Alert.alert('Erro', 'Não foi possível marcar a notificação como lida. Tente novamente.');
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const userId = user?.id || (user as any)?.uid;
      if (!userId) return;

      await notificationService.markAllAsRead(userId);
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
      console.error('Erro ao marcar todas como lidas:', err);
      Alert.alert(
        'Erro',
        'Não foi possível marcar todas as notificações como lidas. Tente novamente.'
      );
    }
  };

  const handleDeleteNotification = async (notificationId: string) => {
    try {
      if (!notificationId) return;
      await notificationService.deleteNotification(notificationId);
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
      console.error('Erro ao excluir notificação:', err);
      Alert.alert('Erro', 'Não foi possível excluir a notificação. Tente novamente.');
    }
  };

  const handleOpenPreferences = () => {
    try {
      if (preferences) {
        setTempPreferences(preferences);
        setShowPreferencesModal(true);
      }
    } catch (err) {
      console.error('Erro ao abrir preferências:', err);
    }
  };

  const handleSavePreferences = async () => {
    try {
      const userId = user?.id || (user as any)?.uid;
      if (!userId || !tempPreferences) return;

      await notificationService.updateUserPreferences(userId, tempPreferences);
      setPreferences(tempPreferences);
      setShowPreferencesModal(false);
    } catch (err) {
      console.error('Erro ao salvar preferências:', err);
      Alert.alert('Erro', 'Não foi possível salvar as preferências. Tente novamente.');
    }
  };

  const handleToggleNotificationType = (type: NotificationType) => {
    try {
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
    } catch (err) {
      console.error('Erro ao alternar tipo de notificação:', err);
    }
  };

  const checkPushStatus = async () => {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      setPushEnabled(status === 'granted');
    } catch (error) {
      console.error('Erro ao verificar status das notificações push:', error);
    }
  };

  const handleTogglePushNotifications = async () => {
    try {
      const userId = user?.id || (user as any)?.uid;
      if (!userId) return;

      if (!pushEnabled) {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
          await notificationService.registerUserForPushNotifications(userId);
          setPushEnabled(true);
        }
      } else {
        await notificationService.unregisterUserFromPushNotifications(userId);
        setPushEnabled(false);
      }
    } catch (error) {
      console.error('Erro ao alterar notificações push:', error);
      Alert.alert(
        'Erro',
        'Não foi possível alterar as configurações de notificação push. Tente novamente.'
      );
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>Carregando...</Text>
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
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          colors={[theme?.colors?.primary || '#E91E63']}
          tintColor={theme?.colors?.primary || '#E91E63'}
        />
      }
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
              color={theme?.colors?.success || '#4CAF50'}
            />
          </View>
        </Card.Content>
      </Card>

      {notifications.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nenhuma notificação encontrada</Text>
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
                                ? 'credit-card-outline'
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
                  color={theme?.colors?.primary || '#E91E63'}
                />
            </View>
            {notificationTypes.map(type => (
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
                  color={theme?.colors?.primary || '#E91E63'}
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

const withAlpha = (hex: string, alpha: number) => {
  try {
    const cleaned = hex.replace('#', '');
    const r = parseInt(cleaned.substring(0, 2), 16);
    const g = parseInt(cleaned.substring(2, 4), 16);
    const b = parseInt(cleaned.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch (e) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
};

const createStyles = (theme: { colors: any }, isDark: boolean) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.colors?.background || '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme?.colors?.card || '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme?.colors?.border || '#E0E0E0',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationItem: {
    backgroundColor: theme?.colors?.card || '#FFFFFF',
  },
  unreadNotification: {
    backgroundColor: withAlpha(theme?.colors?.secondary || '#03DAC6', isDark ? 0.2 : 0.12),
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
  emptyText: {
    color: theme?.colors?.text?.secondary || '#757575',
  },
  modal: {
    backgroundColor: theme?.colors?.card || '#FFFFFF',
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
    color: theme?.colors?.error || '#FF0000',
    textAlign: 'center',
    margin: 16,
  },
  card: {
    margin: 16,
    elevation: 2,
    backgroundColor: theme?.colors?.card || '#FFFFFF',
  },
  pushNotificationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
