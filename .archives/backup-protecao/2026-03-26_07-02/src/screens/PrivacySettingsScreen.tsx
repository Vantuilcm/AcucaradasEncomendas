import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Switch, Button, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingState } from '../components/base/LoadingState';
import { PrivacySettings } from '../types/PrivacySettings';
import { PrivacySettingsService } from '../services/PrivacySettingsService';
import { useAppTheme } from '../components/ThemeProvider';

export function PrivacySettingsScreen() {
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showResetModal, setShowResetModal] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const privacyService = new PrivacySettingsService();
      const settingsData = await privacyService.getUserPrivacySettings(user.id);
      setSettings(settingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof PrivacySettings) => {
    if (!user || !settings) return;

    try {
      setError(null);
      const privacyService = new PrivacySettingsService();
      await privacyService.updatePrivacySettings(user.id, {
        [key]: !settings[key],
      });

      setSettings(prev => (prev ? { ...prev, [key]: !prev[key] } : null));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar configuração');
    }
  };

  const handleReset = async () => {
    if (!user) return;

    try {
      setError(null);
      const privacyService = new PrivacySettingsService();
      await privacyService.resetPrivacySettings(user.id);
      await loadSettings();
      setShowResetModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao redefinir configurações');
    }
  };

  if (loading) {
    return <LoadingState message="Carregando configurações..." />;
  }

  if (!settings) {
    return <ErrorMessage message="Configurações não encontradas" onRetry={loadSettings} />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} onRetry={loadSettings} />}

        <View style={styles.content}>
          <Text variant="titleLarge" style={[styles.title, { color: theme.colors.text.primary }]}>
            Configurações de Privacidade
          </Text>

          <Text variant="bodyMedium" style={[styles.description, { color: theme.colors.text.secondary }]}>
            Gerencie suas preferências de privacidade e controle como suas informações são exibidas
            e utilizadas.
          </Text>

          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Visibilidade do Perfil
            </Text>
            <Text variant="bodySmall" style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
              Controle quais informações do seu perfil são visíveis para outros usuários
            </Text>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Perfil Público</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que outros usuários vejam seu perfil
                </Text>
              </View>
              <Switch
                value={settings.showProfile}
                onValueChange={() => handleToggle('showProfile')}
                color={theme.colors.primary}
              />
            </View>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Histórico de Pedidos</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que outros usuários vejam seus pedidos
                </Text>
              </View>
              <Switch
                value={settings.showOrders}
                onValueChange={() => handleToggle('showOrders')}
                color={theme.colors.primary}
              />
            </View>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Avaliações</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que outros usuários vejam suas avaliações
                </Text>
              </View>
              <Switch
                value={settings.showReviews}
                onValueChange={() => handleToggle('showReviews')}
                color={theme.colors.primary}
              />
            </View>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Endereços</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que outros usuários vejam seus endereços
                </Text>
              </View>
              <Switch
                value={settings.showAddresses}
                onValueChange={() => handleToggle('showAddresses')}
                color={theme.colors.primary}
              />
            </View>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Métodos de Pagamento</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que outros usuários vejam seus métodos de pagamento
                </Text>
              </View>
              <Switch
                value={settings.showPaymentMethods}
                onValueChange={() => handleToggle('showPaymentMethods')}
                color={theme.colors.primary}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Permissões do App
            </Text>
            <Text variant="bodySmall" style={[styles.sectionDescription, { color: theme.colors.text.secondary }]}>
              Controle as permissões do aplicativo para diferentes funcionalidades
            </Text>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Notificações</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que o app envie notificações sobre pedidos e atualizações
                </Text>
              </View>
              <Switch
                value={settings.allowNotifications}
                onValueChange={() => handleToggle('allowNotifications')}
                color={theme.colors.primary}
              />
            </View>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Localização</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que o app acesse sua localização para entregas
                </Text>
              </View>
              <Switch
                value={settings.allowLocation}
                onValueChange={() => handleToggle('allowLocation')}
                color={theme.colors.primary}
              />
            </View>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Analytics</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que o app colete dados de uso para melhorar a experiência
                </Text>
              </View>
              <Switch
                value={settings.allowAnalytics}
                onValueChange={() => handleToggle('allowAnalytics')}
                color={theme.colors.primary}
              />
            </View>

            <View style={[styles.setting, { borderBottomColor: theme.colors.border }]}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge" style={{ color: theme.colors.text.primary }}>Marketing</Text>
                <Text variant="bodySmall" style={[styles.settingDescription, { color: theme.colors.text.secondary }]}>
                  Permite que o app envie conteúdo promocional
                </Text>
              </View>
              <Switch
                value={settings.allowMarketing}
                onValueChange={() => handleToggle('allowMarketing')}
                color={theme.colors.primary}
              />
            </View>
          </View>

          <Button
            mode="outlined"
            onPress={() => setShowResetModal(true)}
            style={styles.resetButton}
            textColor={theme.colors.error}
          >
            Redefinir Configurações
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showResetModal}
          onDismiss={() => setShowResetModal(false)}
          contentContainerStyle={[styles.modal, { backgroundColor: theme.colors.surface }]}
        >
          <Text variant="titleLarge" style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
            Redefinir Configurações
          </Text>
          <Text variant="bodyLarge" style={[styles.modalMessage, { color: theme.colors.text.secondary }]}>
            Tem certeza que deseja redefinir todas as suas configurações de privacidade para os
            valores padrão?
          </Text>
          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowResetModal(false)}
              style={styles.modalButton}
            >
              Cancelar
            </Button>
            <Button
              mode="contained"
              onPress={handleReset}
              style={styles.modalButton}
              textColor={theme.colors.error}
            >
              Redefinir
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 8,
  },
  description: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 16,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingDescription: {
    marginTop: 4,
  },
  resetButton: {
    marginTop: 16,
  },
  modal: {
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalMessage: {
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  modalButton: {
    minWidth: 100,
  },
});
