import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { List, Switch, Text, Divider, Button, ActivityIndicator } from 'react-native-paper';
import { useNotificationSettingsV2 } from '../hooks/useNotificationSettingsV2';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TimePickerModal } from 'react-native-paper-dates';
import { useTheme } from '../contexts/ThemeContext';
import { loggingService } from '../services/LoggingService';

/**
 * Tela aprimorada de configurações de notificação
 * Utiliza o hook useNotificationSettingsV2 para melhor desempenho e funcionalidades adicionais
 */
export const NotificationSettingsScreenV2 = () => {
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

  const { colors } = useTheme();
  const [startTimeVisible, setStartTimeVisible] = React.useState(false);
  const [endTimeVisible, setEndTimeVisible] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);

  // Manipuladores para o seletor de horário
  const showStartTimePicker = () => setStartTimeVisible(true);
  const hideStartTimePicker = () => setStartTimeVisible(false);
  const showEndTimePicker = () => setEndTimeVisible(true);
  const hideEndTimePicker = () => setEndTimeVisible(false);

  // Função para atualizar o horário de início do modo silencioso
  const handleStartTimeConfirm = ({ hours, minutes }) => {
    try {
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const timeString = `${formattedHours}:${formattedMinutes}`;

      if (settings?.quietHours?.end) {
        updateQuietHoursTime(timeString, settings.quietHours.end);
      }
      hideStartTimePicker();
    } catch (error) {
      loggingService.error('Erro ao atualizar horário de início do modo silencioso', error);
    }
  };

  // Função para atualizar o horário de término do modo silencioso
  const handleEndTimeConfirm = ({ hours, minutes }) => {
    try {
      const formattedHours = hours.toString().padStart(2, '0');
      const formattedMinutes = minutes.toString().padStart(2, '0');
      const timeString = `${formattedHours}:${formattedMinutes}`;

      if (settings?.quietHours?.start) {
        updateQuietHoursTime(settings.quietHours.start, timeString);
      }
      hideEndTimePicker();
    } catch (error) {
      loggingService.error('Erro ao atualizar horário de término do modo silencioso', error);
    }
  };

  // Função para atualizar a frequência de notificações
  const handleFrequencyChange = newFrequency => {
    updateFrequency(newFrequency);
  };

  // Função para puxar para atualizar
  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSettings();
    setRefreshing(false);
  };

  // Renderiza um indicador de carregamento enquanto os dados estão sendo carregados
  if (isLoading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ marginTop: 16, color: colors.text }}>Carregando configurações...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView>
        {/* Seção de Configurações Gerais */}
        <List.Section>
          <List.Subheader style={{ color: colors.primary }}>Configurações Gerais</List.Subheader>
          <List.Item
            title="Ativar todas as notificações"
            description="Ative ou desative todas as notificações do aplicativo"
            left={props => <List.Icon {...props} icon="bell" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.enabled || false}
                onValueChange={value => toggleAllNotifications(value)}
                disabled={isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
        </List.Section>

        {/* Seção de Tipos de Notificação */}
        <List.Section>
          <List.Subheader style={{ color: colors.primary }}>Tipos de Notificação</List.Subheader>
          <List.Item
            title="Status de Pedidos"
            description="Receba atualizações sobre seus pedidos"
            left={props => <List.Icon {...props} icon="shopping" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.types?.orderStatus || false}
                onValueChange={() => toggleNotificationType('orderStatus')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Promoções"
            description="Receba informações sobre promoções e descontos"
            left={props => <List.Icon {...props} icon="tag" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.types?.promotions || false}
                onValueChange={() => toggleNotificationType('promotions')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Novidades"
            description="Receba informações sobre novos produtos e serviços"
            left={props => <List.Icon {...props} icon="newspaper" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.types?.news || false}
                onValueChange={() => toggleNotificationType('news')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Atualizações de Entrega"
            description="Receba informações sobre o status de entrega"
            left={props => <List.Icon {...props} icon="truck-delivery" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.types?.deliveryUpdates || false}
                onValueChange={() => toggleNotificationType('deliveryUpdates')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Atualizações de Pagamento"
            description="Receba informações sobre pagamentos"
            left={props => <List.Icon {...props} icon="credit-card" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.types?.paymentUpdates || false}
                onValueChange={() => toggleNotificationType('paymentUpdates')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
        </List.Section>

        {/* Seção de Modo Silencioso */}
        <List.Section>
          <List.Subheader style={{ color: colors.primary }}>Modo Silencioso</List.Subheader>
          <List.Item
            title="Ativar Modo Silencioso"
            description="Não receba notificações durante o período definido"
            left={props => <List.Icon {...props} icon="volume-off" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.quietHours?.enabled || false}
                onValueChange={value => toggleQuietHours(value)}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Horário de Início"
            description={settings?.quietHours?.start || '22:00'}
            left={props => <List.Icon {...props} icon="clock-start" color={colors.primary} />}
            onPress={showStartTimePicker}
            disabled={!settings?.enabled || !settings?.quietHours?.enabled || isUpdating}
          />
          <Divider />
          <List.Item
            title="Horário de Término"
            description={settings?.quietHours?.end || '06:00'}
            left={props => <List.Icon {...props} icon="clock-end" color={colors.primary} />}
            onPress={showEndTimePicker}
            disabled={!settings?.enabled || !settings?.quietHours?.enabled || isUpdating}
          />
          <Divider />
        </List.Section>

        {/* Seção de Frequência */}
        <List.Section>
          <List.Subheader style={{ color: colors.primary }}>
            Frequência de Notificações
          </List.Subheader>
          <List.Item
            title="Imediata"
            description="Receba notificações assim que disponíveis"
            left={props => <List.Icon {...props} icon="bell-ring" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.frequency === 'immediate'}
                onValueChange={() => handleFrequencyChange('immediate')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Diária"
            description="Receba um resumo diário de notificações"
            left={props => <List.Icon {...props} icon="calendar-today" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.frequency === 'daily'}
                onValueChange={() => handleFrequencyChange('daily')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
          <List.Item
            title="Semanal"
            description="Receba um resumo semanal de notificações"
            left={props => <List.Icon {...props} icon="calendar-week" color={colors.primary} />}
            right={() => (
              <Switch
                value={settings?.frequency === 'weekly'}
                onValueChange={() => handleFrequencyChange('weekly')}
                disabled={!settings?.enabled || isUpdating}
                color={colors.primary}
              />
            )}
          />
          <Divider />
        </List.Section>

        {/* Botão de Atualizar */}
        <View style={styles.buttonContainer}>
          <Button
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

      {/* Modal de seleção de horário de início */}
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

      {/* Modal de seleção de horário de término */}
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
