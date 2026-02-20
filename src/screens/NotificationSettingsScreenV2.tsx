import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { List, Switch, Text, Divider, Button, ActivityIndicator } from 'react-native-paper';
import { useNotificationSettingsV2 } from '../hooks/useNotificationSettingsV2';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimePickerModal } from 'react-native-paper-dates';
import { useTheme } from 'react-native-paper';
import { loggingService } from '@/services/LoggingService';
import { ErrorMessage } from '../components/ErrorMessage';
import { useNavigation } from '@react-navigation/native';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Permission } from '../services/PermissionsService';
import { requestOneSignalPermission } from '../config/onesignal';

/**
 * Tela aprimorada de Configurações de notificaÃ§Ã£o
 * Utiliza o hook useNotificationSettingsV2 para melhor desempenho e funcionalidades adicionais
 */
export const NotificationSettingsScreenV2 = () => {
  const navigation = useNavigation<any>();
  const {
    settings,
    isLoading,
    isUpdating,
    toggleAllNotifications,
    toggleNotificationType,
    toggleQuietHours,
    updateQuietHoursTime,
    updateFrequency,
    refreshSettings,
  } = useNotificationSettingsV2();

  const theme = useTheme();
  const { colors } = theme;
  const [startTimeVisible, setStartTimeVisible] = React.useState(false);
  const [endTimeVisible, setEndTimeVisible] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  // Manipuladores para o seletor de horÃ¡rio
  const showStartTimePicker = () => setStartTimeVisible(true);
  const hideStartTimePicker = () => setStartTimeVisible(false);
  const showEndTimePicker = () => setEndTimeVisible(true);
  const hideEndTimePicker = () => setEndTimeVisible(false);

  // FunÃ§Ã£o para atualizar o horÃ¡rio de inÃ­cio do modo silencioso
  const handleStartTimeConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    try {
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const timeString = `${formattedHours}:${formattedMinutes}`;

      if (settings?.quietHours?.end) {
        updateQuietHoursTime(timeString, settings.quietHours.end);
      }
      hideStartTimePicker();
    } catch (error) {
      loggingService.error('Erro ao atualizar horário de início do modo silencioso', error instanceof Error ? error : undefined);
    }
  };

  // FunÃ§Ã£o para atualizar o horÃ¡rio de tÃ©rmino do modo silencioso
  const handleEndTimeConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    try {
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const timeString = `${formattedHours}:${formattedMinutes}`;

      if (settings?.quietHours?.start) {
        updateQuietHoursTime(settings.quietHours.start, timeString);
      }
      hideEndTimePicker();
    } catch (error) {
      loggingService.error('Erro ao atualizar horário de início do modo silencioso', error instanceof Error ? error : undefined);
    }
  };

  // FunÃ§Ã£o para atualizar a Frequência de Notificações
  const handleFrequencyChange = (newFrequency: 'immediate' | 'daily' | 'weekly') => {
    updateFrequency(newFrequency);
  };

  // FunÃ§Ã£o para puxar para atualizar
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSettings();
    setRefreshing(false);
  };

  const handleRequestPermission = async () => {
    try {
      const granted = await requestOneSignalPermission();
      Alert.alert('Permissão de Notificações', granted ? 'Permissão concedida.' : 'Permissão negada.');
    } catch (error) {
      loggingService.error('Erro ao solicitar permissão de notificação', error instanceof Error ? error : undefined);
      Alert.alert('Erro', 'Não foi possível solicitar permissão de notificação.');
    }
  };

  // Renderiza um indicador de carregamento enquanto os dados estÃ£o sendo carregados
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator testID="loading" size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.onSurface }}>Carregando Configurações...</Text>
      </SafeAreaView>
    );
  }

  return (
    <ProtectedRoute
      requiredPermissions={[Permission.EDITAR_PERFIL]}
      requireAllPermissions={true}
      fallbackRoute={undefined}
      unauthorizedComponent={<ErrorMessage message="Você não tem permissão para acessar esta área" onRetry={() => navigation.goBack()} retryLabel="Voltar" />}
    >
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        <List.Section testID="section-Permissões de Notificação">
          <List.Subheader testID="subheader-Permissões de Notificação" style={{ color: colors.primary }}>
            Permissões de Notificação
          </List.Subheader>
          <View style={styles.buttonContainer}>
            <Button
              testID="button-request-permission"
              mode="contained"
              onPress={handleRequestPermission}
              disabled={isUpdating}
            >
              Solicitar Permissão de Notificações
            </Button>
          </View>
          <Divider />
        </List.Section>
        <List.Section testID="section-Configurações Gerais">
          <List.Subheader testID="subheader-Configurações Gerais" style={{ color: colors.primary }}>Configurações Gerais</List.Subheader>
          <List.Item
            testID="list-item-Ativar todas as Notificações"
            title="Ativar todas as Notificações"
            description="Ative ou desative todas as Notificações do aplicativo"
            left={props => <List.Icon {...props} icon="bell" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.enabled || false}
                onValueChange={value => toggleAllNotifications(value)}
                disabled={isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
        </List.Section>

        <List.Section testID="section-Tipos de Notificação">
          <List.Subheader testID="subheader-Tipos de Notificação" style={{ color: colors.primary }}>Tipos de Notificação</List.Subheader>
          <List.Item
            testID="list-item-Status de Pedidos"
            title="Status de Pedidos"
            description="Receba Atualizações sobre seus pedidos"
            left={props => <List.Icon {...props} icon="shopping" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.types?.orderStatus || false}
                onValueChange={() => toggleNotificationType('orderStatus')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            testID="list-item-Promoções"
            title="Promoções"
            description="Receba informações sobre Promoções e descontos"
            left={props => <List.Icon {...props} icon="tag" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.types?.promotions || false}
                onValueChange={() => toggleNotificationType('promotions')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            testID="list-item-Novidades"
            title="Novidades"
            description="Receba informações sobre novos produtos e serviços"
            left={props => <List.Icon {...props} icon="newspaper" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.types?.news || false}
                onValueChange={() => toggleNotificationType('news')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            testID="list-item-Atualizações de Entrega"
            title="Atualizações de Entrega"
            description="Receba informações sobre o status de entrega"
            left={props => <List.Icon {...props} icon="truck-delivery" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.types?.deliveryUpdates || false}
                onValueChange={() => toggleNotificationType('deliveryUpdates')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            testID="list-item-Atualizações de Pagamento"
            title="Atualizações de Pagamento"
            description="Receba informações sobre pagamentos"
            left={props => <List.Icon {...props} icon="credit-card" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.types?.paymentUpdates || false}
                onValueChange={() => toggleNotificationType('paymentUpdates')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
        </List.Section>

        <List.Section testID="section-Modo Silencioso">
          <List.Subheader testID="subheader-Modo Silencioso" style={{ color: colors.primary }}>Modo Silencioso</List.Subheader>
          <List.Item
            testID="list-item-Ativar Modo Silencioso"
            title="Ativar Modo Silencioso"
            description="Não receba Notificações durante o perÃ­odo definido"
            left={props => <List.Icon {...props} icon="volume-off" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.quietHours?.enabled || false}
                onValueChange={value => toggleQuietHours(value)}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            testID="list-item-Horário de Início"
            title="Horário de Início"
            description={settings?.quietHours?.start || '22:00'}
            left={props => <List.Icon {...props} icon="clock-start" color={colors.primary} />}
            onPress={showStartTimePicker}
            disabled={!settings?.enabled || !settings?.quietHours?.enabled || isUpdating}
          />
          <Divider />
          <List.Item
            testID="list-item-Horário de Término"
            title="Horário de Término"
            description={settings?.quietHours?.end || '06:00'}
            left={props => <List.Icon {...props} icon="clock-end" color={colors.primary} />}
            onPress={showEndTimePicker}
            disabled={!settings?.enabled || !settings?.quietHours?.enabled || isUpdating}
          />
          <Divider />
        </List.Section>

        <List.Section testID="section-Frequência de Notificações">
          <List.Subheader testID="subheader-Frequência de Notificações" style={{ color: colors.primary }}>
            Frequência de Notificações
          </List.Subheader>
          <List.Item
            testID="list-item-Imediata"
            title="Imediata"
            description="Receba Notificações assim que disponíveis"
            left={props => <List.Icon {...props} icon="bell-ring" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.frequency === 'immediate'}
                onValueChange={() => handleFrequencyChange('immediate')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            testID="list-item-Diária"
            title="Diária"
            description="Receba um resumo diário de Notificações"
            left={props => <List.Icon {...props} icon="calendar-today" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.frequency === 'daily'}
                onValueChange={() => handleFrequencyChange('daily')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            testID="list-item-Semanal"
            title="Semanal"
            description="Receba um resumo semanal de Notificações"
            left={props => <List.Icon {...props} icon="calendar-week" color={colors.primary} />}
            right={() => (
              <Switch
                testID="switch"
                value={settings?.frequency === 'weekly'}
                onValueChange={() => handleFrequencyChange('weekly')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
        </List.Section>

        {/* BotÃ£o de Atualizar */}
        <View style={styles.buttonContainer}>
          <Button
            testID="button"
            mode="contained"
            onPress={handleRefresh}
            loading={refreshing}
            disabled={refreshing || isUpdating}
            style={styles.refreshButton}
          >
            Atualizar Configurações
          </Button>
        </View>
      </ScrollView>

      {/* Modal de seleÃ§Ã£o de horÃ¡rio de inÃ­cio */}
      <TimePickerModal
        visible={startTimeVisible}
        onDismiss={hideStartTimePicker}
        onConfirm={handleStartTimeConfirm}
        hours={parseInt(settings?.quietHours?.start?.split(':')[0] || '22')}
        minutes={parseInt(settings?.quietHours?.start?.split(':')[1] || '00')}
        label="Selecione o horário de início"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
      />

      {/* Modal de seleÃ§Ã£o de horÃ¡rio de tÃ©rmino */}
      <TimePickerModal
        visible={endTimeVisible}
        onDismiss={hideEndTimePicker}
        onConfirm={handleEndTimeConfirm}
        hours={parseInt(settings?.quietHours?.end?.split(':')[0] || '06')}
        minutes={parseInt(settings?.quietHours?.end?.split(':')[1] || '00')}
        label="Selecione o horário de término"
        cancelLabel="Cancelar"
        confirmLabel="Confirmar"
      />
    </SafeAreaView>
    </ProtectedRoute>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonContainer: {
    padding: 16,
    marginBottom: 16,
  },
  refreshButton: {
    marginTop: 8,
  },
});

export default NotificationSettingsScreenV2;





