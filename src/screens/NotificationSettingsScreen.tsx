import React, { useState } from 'react';
import { StyleSheet, ScrollView, Text, View } from 'react-native';
import { Switch, List, Divider, Button, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OneSignal } from 'react-native-onesignal';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { NotificationSettings } from '../types/NotificationSettings';
import { useNotificationSettings } from '../hooks/useNotificationSettings';

type NotificationSettingsScreenProps = {
  onBack?: () => void;
};

type LocalPushDiagnostic = {
  subscriptionId: string | null;
  optedIn: boolean | null;
  statusLabel: string;
};

export function NotificationSettingsScreen({ onBack }: NotificationSettingsScreenProps = {}) {
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

  const [diagnosticLoading, setDiagnosticLoading] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<LocalPushDiagnostic | null>(null);

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

  const handleConsultPushDiagnostic = async () => {
    setDiagnosticLoading(true);
    setDiagnosticError(null);
    try {
      const subscriptionId = await OneSignal.User.pushSubscription.getIdAsync();
      let optedIn: boolean | null = null;
      try {
        optedIn = await OneSignal.User.pushSubscription.getOptedInAsync();
      } catch {
        optedIn = null;
      }

      const normalizedId =
        typeof subscriptionId === 'string' && subscriptionId.trim().length > 0
          ? subscriptionId.trim()
          : null;

      let statusLabel = 'Indisponível';
      if (optedIn === true) statusLabel = 'Inscrito (opted-in)';
      else if (optedIn === false) statusLabel = 'Não inscrito (opted-out)';
      else statusLabel = 'Estado de inscrição indisponível';

      setDiagnostic({
        subscriptionId: normalizedId,
        optedIn,
        statusLabel,
      });
    } catch {
      setDiagnostic(null);
      setDiagnosticError('Não foi possível consultar o diagnóstico local.');
    } finally {
      setDiagnosticLoading(false);
    }
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
        {error && (
          <ErrorMessage message={(error as Error).message || 'Erro ao carregar configurações'} onRetry={refreshSettings} />
        )}

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

          <Divider />

          <List.Subheader>Diagnóstico local</List.Subheader>

          <View style={styles.diagnosticBlock}>
            <Button
              mode="outlined"
              onPress={handleConsultPushDiagnostic}
              loading={diagnosticLoading}
              disabled={diagnosticLoading}
              testID="consult-push-diagnostic"
              style={styles.diagnosticButton}
            >
              Consultar diagnóstico de notificações
            </Button>

            {diagnosticError ? (
              <Text testID="push-diagnostic-error" style={styles.diagnosticError}>
                {diagnosticError}
              </Text>
            ) : null}

            {diagnostic ? (
              <View style={styles.diagnosticResult} testID="push-diagnostic-result">
                <Text style={styles.diagnosticLabel}>Push Subscription ID</Text>
                <Text
                  testID="push-subscription-id"
                  selectable
                  style={styles.diagnosticValue}
                >
                  {diagnostic.subscriptionId ?? 'Indisponível neste aparelho'}
                </Text>
                <Text style={styles.diagnosticLabel}>Estado de inscrição</Text>
                <Text testID="push-opted-in-status" style={styles.diagnosticValue}>
                  {diagnostic.statusLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </List.Section>

        {onBack && (
          <Button
            mode="contained"
            onPress={onBack}
            style={styles.backButton}
            buttonColor="#9C27B0"
          >
            Voltar
          </Button>
        )}
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
  backButton: {
    margin: 20,
    marginTop: 8,
    borderRadius: 12,
  },
  diagnosticBlock: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  diagnosticButton: {
    alignSelf: 'stretch',
  },
  diagnosticResult: {
    gap: 4,
  },
  diagnosticLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  diagnosticValue: {
    fontSize: 14,
    color: '#111',
  },
  diagnosticError: {
    fontSize: 13,
    color: '#B00020',
  },
});
