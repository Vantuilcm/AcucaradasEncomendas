import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Platform, FlatList } from 'react-native';
import { Button, Text, Card, Divider, ActivityIndicator, List } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { NotificationService } from '../services/NotificationService';
import { PushNotificationService } from '../services/PushNotificationService';
import { mobileNotificationService } from '../services/MobileNotificationService';
import * as Notifications from 'expo-notifications';
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  setDoc,
  orderBy,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatDate } from '../utils/formatters';
import { LoggingService } from '../services/LoggingService';
import {
  getOneSignalUserId,
  setOneSignalTags,
  OneSignalNotificationType,
  formatOneSignalNotification,
} from '../config/onesignal';
import Constants from 'expo-constants';

// Interface para o log de notificações
interface NotificationLog {
  id?: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  status: 'sent' | 'received' | 'clicked' | 'failed';
  timestamp: string;
  deviceInfo?: {
    platform: string;
    deviceModel?: string;
    osVersion?: string;
  };
}

export function TestNotificationsScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const logger = LoggingService.getInstance();
  const [loading, setLoading] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [oneSignalId, setOneSignalId] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<any>(null);
  const [tokenUpdateDate, setTokenUpdateDate] = useState<string | null>(null);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string | null>(null);
  const pushNotificationService = new PushNotificationService();
  const notificationService = NotificationService.getInstance();

  // Coleção do Firestore para os logs de notificações
  const notificationLogsCollection = 'notification_logs';

  useEffect(() => {
    if (user) {
      loadUserData();
      checkOneSignalId();
      loadNotificationLogs();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Buscar dados do usuário no Firestore
      const uid = (user as any)?.uid ?? (user as any)?.id;
      if (!uid) {
        logger.warn('Usuário sem UID/ID válido ao carregar dados');
        return;
      }
      const tokens = await mobileNotificationService.getUserTokens(uid);
      setPushToken(tokens.length > 0 ? tokens[0] : null);
      setTokenUpdateDate(null);
    } catch (error: any) {
      logger.error('Erro ao carregar dados do usuário', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do usuário');
  } finally {
    setLoading(false);
  }
};

  // Função para carregar logs de notificações do Firestore (dentro do componente)
  const loadNotificationLogs = async () => {
    try {
      setLogsLoading(true);
      const uid = (user as any)?.uid ?? (user as any)?.id ?? '';
      if (!uid) return;

      // Buscar logs do Firestore
      const logsRef = collection(db, notificationLogsCollection);
      let q = query(logsRef, where('userId', '==', String(uid)), orderBy('timestamp', 'desc'));

      // Aplicar filtro por tipo se estiver selecionado
      if (filterType) {
        if (['sent', 'received', 'clicked', 'failed'].includes(filterType)) {
          q = query(
            logsRef,
            where('userId', '==', String(uid)),
            where('status', '==', filterType),
            orderBy('timestamp', 'desc')
          );
        } else {
          q = query(
            logsRef,
            where('userId', '==', String(uid)),
            where('type', '==', filterType),
            orderBy('timestamp', 'desc')
          );
        }
      }

      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as NotificationLog[];

      setNotificationLogs(logs);
    } catch (error: any) {
      logger.error('Erro ao carregar logs de notificações', error);
      Alert.alert('Erro', 'Não foi possível carregar os logs de notificações');
    } finally {
      setLogsLoading(false);
    }
  };

  // Função para registrar um novo log de notificação no Firestore (dentro do componente)
  const logNotification = async (log: NotificationLog): Promise<NotificationLog | null> => {
    try {
      const logId = `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const logRef = doc(db, notificationLogsCollection, logId);
      await setDoc(logRef, { ...log, id: logId, createdAt: new Date().toISOString() });

      const newLog: NotificationLog = { ...log, id: logId };
      setNotificationLogs(prev => [newLog, ...prev]);
      return newLog;
    } catch (error: any) {
      logger.error('Erro ao registrar log de notificação', error);
      Alert.alert('Erro', 'Não foi possível registrar o log de notificação');
      return null;
    }
  };

  const checkOneSignalId = async () => {
    try {
      const id = await getOneSignalUserId();
      setOneSignalId(id);
    } catch (error: any) {
      logger.error('Erro ao obter ID do OneSignal', error);
    }
  };

  const updatePushToken = async () => {
    try {
      setLoading(true);
      if (!user) return;
      const uid = (user as any)?.uid ?? (user as any)?.id;
      if (!uid) {
        logger.warn('Usuário sem UID/ID válido ao atualizar token');
        return;
      }

      const token = await mobileNotificationService.registerForPushNotifications(uid, true);
      setPushToken(token);
      setTokenUpdateDate(new Date().toISOString());

      Alert.alert('Sucesso', 'Token de push atualizado com sucesso!');
    } catch (error: any) {
      logger.error('Erro ao atualizar token de push', error);
      Alert.alert('Erro', 'Não foi possível atualizar o token de push');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Verificar se o token existe
      if (!pushToken) {
        Alert.alert('Token não encontrado', 'Atualize o token de push primeiro');
        return;
      }

      // Enviar notificação de teste
      const userId = (user as any)?.uid ?? (user as any)?.id;
      if (!userId) {
        Alert.alert('Erro', 'Usuário inválido para envio de notificação');
        return;
      }
      await pushNotificationService.sendPushNotification(
        userId,
        'Notificação de Teste',
        'Esta é uma notificação de teste do Açucaradas Encomendas',
        {
          type: 'TEST_NOTIFICATION',
          screen: 'Home',
          timestamp: new Date().toISOString(),
        }
      );

      // Registrar log da notificação enviada
      await logNotification({
        userId: userId,
        type: 'TEST_NOTIFICATION',
        title: 'Notificação de Teste',
        message: 'Esta é uma notificação de teste do Açucaradas Encomendas',
        data: {
          type: 'TEST_NOTIFICATION',
          screen: 'Home',
          timestamp: new Date().toISOString(),
        },
        status: 'sent',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
        },
      });

      Alert.alert('Sucesso', 'Notificação de teste enviada!');
    } catch (error: any) {
      logger.error('Erro ao enviar notificação de teste', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação de teste');
    } finally {
      setLoading(false);
    }
  };

  const sendOrderNotification = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Verificar se o token existe
      if (!pushToken) {
        Alert.alert('Token não encontrado', 'Atualize o token de push primeiro');
        return;
      }

      // Enviar notificação simulando um pedido
      const fakeOrderId = 'order_' + Math.floor(Math.random() * 10000);

      // Usar o formatador do OneSignal para criar a notificação
      const notificationData = {
        orderId: fakeOrderId,
        orderNumber: fakeOrderId.replace('order_', ''),
        status: 'recebido',
        screen: 'OrderDetails',
        timestamp: new Date().toISOString(),
      };

      const formattedNotification = formatOneSignalNotification(
        OneSignalNotificationType.NEW_ORDER,
        notificationData
      );

      const userIdOrder = (user as any)?.uid ?? (user as any)?.id;
      await pushNotificationService.sendPushNotification(
        String(userIdOrder ?? ''),
        formattedNotification.title,
        formattedNotification.message,
        formattedNotification.data
      );

      // Registrar log da notificação de pedido
      await logNotification({
        userId: String(userIdOrder ?? ''),
        type: 'NEW_ORDER',
        title: formattedNotification.title,
        message: formattedNotification.message,
        data: formattedNotification.data,
        status: 'sent',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
          deviceModel: Constants.deviceName,
          osVersion: Platform.Version.toString(),
        },
      });

      Alert.alert('Sucesso', 'Notificação de pedido enviada!');
    } catch (error: any) {
      logger.error('Erro ao enviar notificação de pedido', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação de pedido');
    } finally {
      setLoading(false);
    }
  };

  const updateOneSignalTags = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Definir tags do OneSignal
      const oneSignalUserId = (user as any)?.uid ?? (user as any)?.id;
      await setOneSignalTags({
        user_id: String(oneSignalUserId ?? ''),
        user_type: String((user as any)?.role ?? 'customer'),
        email: String((user as any)?.email ?? ''),
        last_login: new Date().toISOString(),
        app_version: String(Constants.expoConfig?.version ?? '1.0.0'),
        platform: String(Platform.OS),
        test_user: true,
      });

      // Registrar log da atualização de tags
      await logNotification({
        userId: String(oneSignalUserId ?? ''),
        type: 'ONESIGNAL_TAGS_UPDATE',
        title: 'Atualização de Tags OneSignal',
        message: 'Tags do OneSignal foram atualizadas',
        data: {
          user_id: String(oneSignalUserId ?? ''),
          user_type: String((user as any)?.role ?? 'customer'),
          timestamp: new Date().toISOString(),
        },
        status: 'sent',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
        },
      });

      Alert.alert('Sucesso', 'Tags do OneSignal atualizadas!');
    } catch (error: any) {
      logger.error('Erro ao atualizar tags do OneSignal', error);
      Alert.alert('Erro', 'Não foi possível atualizar as tags do OneSignal');
    } finally {
      setLoading(false);
    }
  };

  // Função para testar a navegação específica quando uma notificação é recebida
  const testNotificationNavigation = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Verificar se o token existe
      if (!pushToken) {
        Alert.alert('Token não encontrado', 'Atualize o token de push primeiro');
        return;
      }

      // Simular uma notificação com navegação para uma tela específica
      const fakeOrderId = 'order_' + Math.floor(Math.random() * 10000);

      // Agendar uma notificação local que será exibida em 3 segundos
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Teste de Navegação',
          body: `Toque para navegar para detalhes do pedido #${fakeOrderId}`,
          data: {
            type: 'NEW_ORDER',
            orderId: fakeOrderId,
            screen: 'OrderDetails',
            timestamp: new Date().toISOString(),
          },
        },
        trigger: { seconds: 3 } as Notifications.NotificationTriggerInput,
      });

      Alert.alert(
        'Sucesso',
        'Notificação de navegação agendada! Toque nela quando aparecer para testar a navegação.'
      );
    } catch (error: any) {
      logger.error('Erro ao agendar notificação de navegação', error);
      Alert.alert('Erro', 'Não foi possível agendar a notificação de navegação');
    } finally {
      setLoading(false);
    }
  };

  // Configurar listeners para notificações recebidas e respondidas
  useEffect(() => {
    // Listener para notificações recebidas
    const receivedSubscription = Notifications.addNotificationReceivedListener(notification => {
      logger.info('Notificação recebida', { notification });
      setLastNotification(notification);

      // Registrar log da notificação recebida
      if (user) {
        const uid = (user as any)?.uid ?? (user as any)?.id ?? '';
        const data = notification.request.content.data as Record<string, unknown> | undefined;
        logNotification({
          userId: String(uid),
          type: typeof data?.type === 'string' ? (data?.type as string) : 'UNKNOWN',
          title: String(notification.request.content.title ?? ''),
          message: String(notification.request.content.body ?? ''),
          data: data,
          status: 'received',
          timestamp: new Date().toISOString(),
          deviceInfo: {
            platform: Platform.OS,
          },
        });
      }
    });

    // Listener para notificações respondidas (quando o usuário clica na notificação)
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      logger.info('Resposta à notificação', { data });

      // Registrar log da notificação clicada
      if (user) {
        const uid = (user as any)?.uid ?? (user as any)?.id ?? '';
        logNotification({
          userId: String(uid),
          type: typeof data?.type === 'string' ? (data?.type as string) : 'UNKNOWN',
          title: String(response.notification.request.content.title ?? ''),
          message: String(response.notification.request.content.body ?? ''),
          data: data,
          status: 'clicked',
          timestamp: new Date().toISOString(),
          deviceInfo: {
            platform: Platform.OS,
          },
        });
      }

      // Navegar para a tela apropriada com base nos dados da notificação via fila pendente
      if (data) {
        if (data.type === 'NEW_ORDER' && data.orderId) {
          Alert.alert(
            'Navegação de Notificação',
            `Navegando para detalhes do pedido: ${data.orderId}`,
            [
              {
                text: 'OK',
                onPress: () => {
                  // Usar setPendingHref para evitar erro de navegação prematura
                  import('../navigation/pendingNavigation').then(({ setPendingHref }) => {
                    setPendingHref(`/detalhes-pedido/${data.orderId}`);
                  });
                },
              },
            ]
          );
        } else if (data.type === 'TEST_NOTIFICATION') {
          Alert.alert('Navegação de Notificação', `Navegando para a tela Home`, [
            {
              text: 'OK',
              onPress: () => {
                // Usar setPendingHref para evitar erro de navegação prematura
                import('../navigation/pendingNavigation').then(({ setPendingHref }) => {
                  setPendingHref('/src-app');
                });
              },
            },
          ]);
        }
      }
    });

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [navigation, user]);

  // Função para limpar logs de notificações do Firestore
  const clearNotificationLogs = async () => {
    try {
      setLoading(true);
      if (!user) return;

      Alert.alert('Limpar Logs', 'Tem certeza que deseja limpar todos os logs de notificações?', [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              // Buscar todos os logs do usuário
              const logsRef = collection(db, notificationLogsCollection);
              const uid = (user as any)?.uid ?? (user as any)?.id ?? '';
              const q = query(logsRef, where('userId', '==', String(uid)));
              const querySnapshot = await getDocs(q);

              // Excluir cada documento em lote
              for (const d of querySnapshot.docs) {
                await deleteDoc(doc(db, notificationLogsCollection, d.id));
              }

              // Limpar o estado local
              setNotificationLogs([]);
              Alert.alert('Sucesso', 'Logs de notificações limpos com sucesso!');
            } catch (error: any) {
              logger.error('Erro ao excluir logs', error);
              Alert.alert('Erro', 'Não foi possível excluir os logs de notificações');
            }
          },
        },
      ]);
    } catch (error: any) {
      logger.error('Erro ao limpar logs de notificações', error);
      Alert.alert('Erro', 'Não foi possível limpar os logs de notificações');
    } finally {
      setLoading(false);
    }
  };

  // Função para filtrar logs por tipo
  const filterLogsByType = (type: string | null) => {
    setFilterType(type);
    loadNotificationLogs();
  };

  // Renderizar item de log com mais detalhes
  const renderLogItem = ({ item }: { item: NotificationLog }) => {
    // Escolher ícone com base no tipo de notificação
    let icon = 'bell';
    if (item.type === 'NEW_ORDER') icon = 'shopping';
    else if (item.type === 'TEST_NOTIFICATION') icon = 'test-tube';

    // Escolher cor com base no status
    let statusColor = '#666';
    if (item.status === 'sent') statusColor = '#2196F3';
    else if (item.status === 'received') statusColor = '#4CAF50';
    else if (item.status === 'clicked') statusColor = '#FF9800';
    else if (item.status === 'failed') statusColor = '#F44336';

    return (
      <List.Item
        title={item.title}
        description={
          <View>
            <Text>{item.message}</Text>
            <View style={{ flexDirection: 'row', marginTop: 4 }}>
              <Text style={{ fontWeight: 'bold', marginRight: 8 }}>Tipo: {item.type}</Text>
              <Text style={{ color: statusColor }}>Status: {item.status}</Text>
            </View>
            {item.deviceInfo && (
              <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                Dispositivo: {item.deviceInfo.platform}
              </Text>
            )}
          </View>
        }
        left={props => <List.Icon {...props} icon={icon} />}
        right={props => (
          <Text style={{ fontSize: 12 }}>{formatDate(new Date(item.timestamp))}</Text>
        )}
      />
    );
  };

  // Função para enviar uma notificação segmentada por tipo de usuário
  const sendSegmentedNotification = async () => {
    try {
      setLoading(true);
      if (!user) return;

      // Verificar se o token existe
      if (!pushToken) {
        Alert.alert('Token não encontrado', 'Atualize o token de push primeiro');
        return;
      }

      // Criar uma notificação promocional
      const notificationData = {
        title: 'Promoção Especial',
        message: 'Aproveite nossos descontos especiais para clientes VIP!',
        promoId: 'promo_' + Math.floor(Math.random() * 1000),
        imageUrl: 'https://example.com/promo-image.jpg',
        screen: 'PromotionDetails',
        timestamp: new Date().toISOString(),
      };

      const formattedNotification = formatOneSignalNotification(
        OneSignalNotificationType.PROMOTION,
        notificationData
      );

      const promoUserId = (user as any)?.uid ?? (user as any)?.id;
      await pushNotificationService.sendPushNotification(
        String(promoUserId ?? ''),
        formattedNotification.title,
        formattedNotification.message,
        formattedNotification.data
      );

      // Registrar log da notificação promocional
      await logNotification({
        userId: String(promoUserId ?? ''),
        type: 'PROMOTION',
        title: formattedNotification.title,
        message: formattedNotification.message,
        data: formattedNotification.data,
        status: 'sent',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
          deviceModel: Constants.deviceName,
          osVersion: Platform.Version.toString(),
        },
      });

      Alert.alert('Sucesso', 'Notificação promocional enviada!');
    } catch (error: any) {
      logger.error('Erro ao enviar notificação promocional', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação promocional');
    } finally {
      setLoading(false);
    }
  };

  // Função para enviar notificação para um segmento específico de usuários
  const sendUserSegmentNotification = async (segment: string) => {
    try {
      setLoading(true);
      if (!user) return;

      // Verificar se o token existe
      if (!pushToken) {
        Alert.alert('Token não encontrado', 'Atualize o token de push primeiro');
        return;
      }

      // Definir mensagem com base no segmento selecionado
      let title = '';
      let message = '';
      let type = '';
      let data: any = {};

      switch (segment) {
        case 'vip_customers':
          title = 'Oferta Exclusiva VIP';
          message = 'Temos uma oferta exclusiva para nossos clientes VIP! Confira agora.';
          type = 'VIP_PROMOTION';
          data = {
            type: 'VIP_PROMOTION',
            promoId: 'vip_' + Math.floor(Math.random() * 1000),
            discount: '15%',
            screen: 'PromotionDetails',
            timestamp: new Date().toISOString(),
          };
          break;
        case 'inactive_users':
          title = 'Sentimos sua Falta!';
          message = 'Faz tempo que não te vemos por aqui. Que tal voltar com um desconto especial?';
          type = 'REACTIVATION';
          data = {
            type: 'REACTIVATION',
            promoId: 'react_' + Math.floor(Math.random() * 1000),
            discount: '10%',
            screen: 'Home',
            timestamp: new Date().toISOString(),
          };
          break;
        case 'new_users':
          title = 'Bem-vindo ao Açucaradas!';
          message = 'Obrigado por se juntar a nós! Aqui está um presente de boas-vindas.';
          type = 'WELCOME';
          data = {
            type: 'WELCOME',
            promoId: 'welcome_' + Math.floor(Math.random() * 1000),
            discount: '5%',
            screen: 'Home',
            timestamp: new Date().toISOString(),
          };
          break;
        case 'local_users':
          title = 'Promoção na sua Região';
          message = 'Temos ofertas especiais disponíveis na sua região! Confira agora.';
          type = 'LOCAL_PROMOTION';
          data = {
            type: 'LOCAL_PROMOTION',
            promoId: 'local_' + Math.floor(Math.random() * 1000),
            region: 'Sua Cidade',
            screen: 'PromotionDetails',
            timestamp: new Date().toISOString(),
          };
          break;
        default:
          title = 'Notificação Personalizada';
          message = 'Temos uma mensagem especial para você!';
          type = 'CUSTOM';
          data = {
            type: 'CUSTOM',
            screen: 'Home',
            timestamp: new Date().toISOString(),
          };
      }

      // Enviar notificação
      const uidSeg = (user as any)?.uid ?? (user as any)?.id;
      await pushNotificationService.sendPushNotification(String(uidSeg ?? ''), title, message, data);

      // Registrar log da notificação segmentada
      await logNotification({
        userId: String(uidSeg ?? ''),
        type,
        title,
        message,
        data,
        status: 'sent',
        timestamp: new Date().toISOString(),
        deviceInfo: {
          platform: Platform.OS,
          deviceModel: Constants.deviceName,
          osVersion: Platform.Version.toString(),
        },
      });

      // Atualizar tags do OneSignal para simular segmentação
      await setOneSignalTags({
        last_segment_notification: segment,
        last_notification_date: new Date().toISOString(),
      });

      Alert.alert('Sucesso', `Notificação enviada para o segmento: ${segment}`);
    } catch (error: any) {
      logger.error('Erro ao enviar notificação segmentada', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação segmentada');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Title title="Teste de Notificações Push" />
        <Card.Content>
          <Text style={styles.subtitle}>Status do Token de Push</Text>
          {loading ? (
            <ActivityIndicator animating={true} />
          ) : (
            <>
              <Text>Token: {pushToken ? `${pushToken.substring(0, 20)}...` : 'Não disponível'}</Text>
              {tokenUpdateDate && (
                <Text>Última atualização: {formatDate(new Date(tokenUpdateDate))}</Text>
              )}
            </>
          )}

          <Divider style={styles.divider} />

          <Text style={styles.subtitle}>OneSignal ID</Text>
          <Text>{oneSignalId || 'Não disponível'}</Text>

          <Divider style={styles.divider} />

          <Text style={styles.subtitle}>Última Notificação Recebida</Text>
          {lastNotification ? (
            <>
              <Text>Título: {lastNotification.request.content.title}</Text>
              <Text>Mensagem: {lastNotification.request.content.body}</Text>
              <Text>Dados: {JSON.stringify(lastNotification.request.content.data)}</Text>
            </>
          ) : (
            <Text>Nenhuma notificação recebida</Text>
          )}

          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={updatePushToken}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Atualizar Token de Push
            </Button>

            <Button
              mode="contained"
              onPress={sendTestNotification}
              style={styles.button}
              loading={loading}
              disabled={loading || !pushToken}
            >
              Enviar Notificação Teste
            </Button>

            <Button
              mode="contained"
              onPress={sendOrderNotification}
              style={styles.button}
              loading={loading}
              disabled={loading || !pushToken}
            >
              Simular Notificação de Pedido
            </Button>

            <Button
              mode="contained"
              onPress={updateOneSignalTags}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Atualizar Tags OneSignal
            </Button>

            <Button
              mode="contained"
              onPress={testNotificationNavigation}
              style={styles.button}
              loading={loading}
              disabled={loading || !pushToken}
            >
              Testar Navegação por Notificação
            </Button>

            <Button
              mode="contained"
              onPress={sendSegmentedNotification}
              style={styles.button}
              loading={loading}
              disabled={loading || !pushToken}
            >
              Enviar Notificação Promocional
            </Button>
          </View>

          <Divider style={styles.divider} />

          <View style={styles.logsContainer}>
            <View style={styles.logsHeader}>
              <Text style={styles.subtitle}>Logs de Notificações</Text>
              <View style={{ flexDirection: 'row' }}>
                <Button
                  mode="outlined"
                  onPress={() => filterLogsByType(null)}
                  disabled={loading}
                  compact
                  style={{ marginRight: 8 }}
                >
                  Todos
                </Button>
                <Button
                  mode="outlined"
                  onPress={clearNotificationLogs}
                  disabled={loading || notificationLogs.length === 0}
                  compact
                >
                  Limpar Logs
                </Button>
              </View>
            </View>

            <View style={styles.filterContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Button
                  mode={filterType === 'TEST_NOTIFICATION' ? 'contained' : 'outlined'}
                  onPress={() => filterLogsByType('TEST_NOTIFICATION')}
                  style={styles.filterButton}
                  compact
                >
                  Teste
                </Button>
                <Button
                  mode={filterType === 'NEW_ORDER' ? 'contained' : 'outlined'}
                  onPress={() => filterLogsByType('NEW_ORDER')}
                  style={styles.filterButton}
                  compact
                >
                  Pedidos
                </Button>
                <Button
                  mode={filterType === 'clicked' ? 'contained' : 'outlined'}
                  onPress={() => filterLogsByType('clicked')}
                  style={styles.filterButton}
                  compact
                >
                  Clicadas
                </Button>
                <Button
                  mode={filterType === 'received' ? 'contained' : 'outlined'}
                  onPress={() => filterLogsByType('received')}
                  style={styles.filterButton}
                  compact
                >
                  Recebidas
                </Button>
              </ScrollView>
            </View>

            {logsLoading ? (
              <ActivityIndicator animating={true} style={styles.logsLoading} />
            ) : notificationLogs.length > 0 ? (
              <FlatList
                data={notificationLogs}
                renderItem={renderLogItem}
                keyExtractor={item => item.id || item.timestamp}
                style={styles.logsList}
                scrollEnabled={false}
              />
            ) : (
              <Text>Nenhum log de notificação disponível</Text>
            )}
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  divider: {
    marginVertical: 16,
  },
  buttonContainer: {
    marginTop: 24,
  },
  button: {
    marginBottom: 12,
  },
  logsContainer: {
    marginTop: 8,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logsList: {
    maxHeight: 400,
  },
  logsLoading: {
    marginVertical: 20,
  },
  filterContainer: {
    marginBottom: 12,
  },
  filterButton: {
    marginRight: 8,
    marginBottom: 8,
  },
});

// (funções externas removidas)
