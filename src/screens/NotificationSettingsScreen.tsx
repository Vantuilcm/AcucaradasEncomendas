import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Switch, List, Divider, useTheme, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { NotificationSettings } from '../types/NotificationSettings';
import { useNotificationSettings } from '../hooks/useNotificationSettings';

export function NotificationSettingsScreen() {
  const theme = useTheme();
  const {
    settings,
    isLoading,
    error,
    updateSettings,
    toggleNotificationType,
    toggleQuietHours,
    refreshSettings,
  } = useNotificationSettings();

  const handleToggleEnabled = () => {
    if (!settings) return;
    updateSettings({ enabled: !settings.enabled });
  };

  const handleToggleType = (type: keyof NotificationSettings['types']) => {
    toggleNotificationType(type);
  };

  const handleToggleQuietHours = () => {
    if (!settings) return;
    toggleQuietHours(!settings.quietHours.enabled);
  };

  if (isLoading) {
    return <LoadingState message="Carregando configurações..." />;
  }

  if (!settings) {
    return <ErrorMessage message="Configurações não encontradas" onRetry={refreshSettings} />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} onRetry={refreshSettings} />}

        <List.Section>
          <List.Subheader>Configurações Gerais</List.Subheader>

          <List.Item
            title="Notificações"
            description="Ativar ou desativar todas as notificações"
            right={() => (
              <Switch
                value={settings.enabled}
                onValueChange={handleToggleEnabled}
                color={theme.colors.primary}
              />
            )}
          />

          <Divider />

          <List.Subheader>Tipos de Notificação</List.Subheader>

          <List.Item
            title="Status do Pedido"
            description="Atualizações sobre seus pedidos"
            right={() => (
              <Switch
                value={settings.types.orderStatus}
                onValueChange={() => handleToggleType('orderStatus')}
                disabled={!settings.enabled}
                color={theme.colors.primary}
              />
            )}
          />

          <List.Item
            title="Promoções"
            description="Ofertas e descontos especiais"
            right={() => (
              <Switch
                value={settings.types.promotions}
                onValueChange={() => handleToggleType('promotions')}
                disabled={!settings.enabled}
                color={theme.colors.primary}
              />
            )}
          />

          <List.Item
            title="Novidades"
            description="Atualizações sobre novos produtos e funcionalidades"
            right={() => (
              <Switch
                value={settings.types.news}
                onValueChange={() => handleToggleType('news')}
                disabled={!settings.enabled}
                color={theme.colors.primary}
              />
            )}
          />

          <List.Item
            title="Atualizações de Entrega"
            description="Informações sobre o status da entrega"
            right={() => (
              <Switch
                value={settings.types.deliveryUpdates}
                onValueChange={() => handleToggleType('deliveryUpdates')}
                disabled={!settings.enabled}
                color={theme.colors.primary}
              />
            )}
          />

          <List.Item
            title="Atualizações de Pagamento"
            description="Informações sobre pagamentos e reembolsos"
            right={() => (
              <Switch
                value={settings.types.paymentUpdates}
                onValueChange={() => handleToggleType('paymentUpdates')}
                disabled={!settings.enabled}
                color={theme.colors.primary}
              />
            )}
          />

          <Divider />

          <List.Subheader>Modo Silencioso</List.Subheader>

          <List.Item
            title="Ativar Modo Silencioso"
            description={`${settings.quietHours.start} - ${settings.quietHours.end}`}
            right={() => (
              <Switch
                value={settings.quietHours.enabled}
                onValueChange={handleToggleQuietHours}
                disabled={!settings.enabled}
                color={theme.colors.primary}
              />
            )}
          />
        </List.Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
});
