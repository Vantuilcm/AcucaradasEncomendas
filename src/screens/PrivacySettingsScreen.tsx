import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Switch, Button, useTheme, Portal, Modal, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { LoadingState } from '../components/base/LoadingState';
import { PrivacySettings } from '../types/PrivacySettings';
import { PrivacySettingsService } from '../services/PrivacySettingsService';
export function PrivacySettingsScreen() {
  const theme = useTheme();
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
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} onRetry={loadSettings} />}

        <View style={styles.content}>
          <Text variant="titleLarge" style={styles.title}>
            Configurações de Privacidade
          </Text>

          <Text variant="bodyMedium" style={styles.description}>
            Gerencie suas preferências de privacidade e controle como suas informações são exibidas
            e utilizadas.
          </Text>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Visibilidade do Perfil
            </Text>
            <Text variant="bodySmall" style={styles.sectionDescription}>
              Controle quais informações do seu perfil são visíveis para outros usuários
            </Text>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Perfil Público</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que outros usuários vejam seu perfil
                </Text>
              </View>
              <Switch
                value={settings.showProfile}
                onValueChange={() => handleToggle('showProfile')}
              />
            </View>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Histórico de Pedidos</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que outros usuários vejam seus pedidos
                </Text>
              </View>
              <Switch
                value={settings.showOrders}
                onValueChange={() => handleToggle('showOrders')}
              />
            </View>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Avaliações</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que outros usuários vejam suas avaliações
                </Text>
              </View>
              <Switch
                value={settings.showReviews}
                onValueChange={() => handleToggle('showReviews')}
              />
            </View>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Endereços</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que outros usuários vejam seus endereços
                </Text>
              </View>
              <Switch
                value={settings.showAddresses}
                onValueChange={() => handleToggle('showAddresses')}
              />
            </View>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Métodos de Pagamento</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que outros usuários vejam seus métodos de pagamento
                </Text>
              </View>
              <Switch
                value={settings.showPaymentMethods}
                onValueChange={() => handleToggle('showPaymentMethods')}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Permissões do App
            </Text>
            <Text variant="bodySmall" style={styles.sectionDescription}>
              Controle as permissões do aplicativo para diferentes funcionalidades
            </Text>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Notificações</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que o app envie notificações sobre pedidos e atualizações
                </Text>
              </View>
              <Switch
                value={settings.allowNotifications}
                onValueChange={() => handleToggle('allowNotifications')}
              />
            </View>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Localização</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que o app acesse sua localização para entregas
                </Text>
              </View>
              <Switch
                value={settings.allowLocation}
                onValueChange={() => handleToggle('allowLocation')}
              />
            </View>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Analytics</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que o app colete dados de uso para melhorar a experiência
                </Text>
              </View>
              <Switch
                value={settings.allowAnalytics}
                onValueChange={() => handleToggle('allowAnalytics')}
              />
            </View>

            <View style={styles.setting}>
              <View style={styles.settingInfo}>
                <Text variant="bodyLarge">Marketing</Text>
                <Text variant="bodySmall" style={styles.settingDescription}>
                  Permite que o app envie conteúdo promocional
                </Text>
              </View>
              <Switch
                value={settings.allowMarketing}
                onValueChange={() => handleToggle('allowMarketing')}
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
          contentContainerStyle={styles.modal}
        >
          <Text variant="titleLarge" style={styles.modalTitle}>
            Redefinir Configurações
          </Text>
          <Text variant="bodyLarge" style={styles.modalMessage}>
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
    backgroundColor: '#fff',
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
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    color: '#666',
    marginBottom: 16,
  },
  setting: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingDescription: {
    color: '#666',
    marginTop: 4,
  },
  resetButton: {
    marginTop: 16,
  },
  modal: {
    backgroundColor: '#fff',
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







