import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { ActivityIndicator, Button, List, Switch, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { ProducerAccountService } from '../../services/ProducerAccountService';
import { UserPreferencesDoc } from '../../types/ProducerAccount';

const service = ProducerAccountService.getInstance();

export const ProducerPreferencesScreen = () => {
  const { user } = useAuth();
  const uid = (user as any)?.uid || (user as any)?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prefs, setPrefs] = useState<UserPreferencesDoc | null>(null);

  const loadData = useCallback(async () => {
    if (!uid) {
      setPrefs(null);
      setLoading(false);
      return;
    }
    try {
      const data = await service.getUserPreferences(uid);
      setPrefs(data);
    } catch (error) {
      console.error('[PRODUCER_PREFS] load error', error);
      Alert.alert('Erro', 'Não foi possível carregar suas preferências.');
    } finally {
      setLoading(false);
    }
  }, [uid]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  const toggle = (key: keyof UserPreferencesDoc) => {
    if (!prefs) return;
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  const handleSave = async () => {
    if (!uid || !prefs) return;
    setSaving(true);
    try {
      await service.saveUserPreferences(uid, prefs);
      Alert.alert('Sucesso', 'Preferências salvas com sucesso.');
    } catch (error) {
      console.error('[PRODUCER_PREFS] save error', error);
      Alert.alert('Erro', 'Não foi possível salvar suas preferências.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !prefs) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#E91E63" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <List.Section>
          <List.Subheader>Notificações</List.Subheader>
          <PreferenceRow
            title="Push Notifications"
            value={prefs.pushNotifications}
            onToggle={() => toggle('pushNotifications')}
          />
          <PreferenceRow
            title="WhatsApp"
            value={prefs.whatsappNotifications}
            onToggle={() => toggle('whatsappNotifications')}
          />
          <PreferenceRow
            title="E-mail"
            value={prefs.emailNotifications}
            onToggle={() => toggle('emailNotifications')}
          />
          <PreferenceRow
            title="Promoções"
            value={prefs.promotions}
            onToggle={() => toggle('promotions')}
          />
          <PreferenceRow
            title="Novos Pedidos"
            value={prefs.newOrders}
            onToggle={() => toggle('newOrders')}
          />
        </List.Section>

        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveBtn}
          buttonColor="#E91E63"
        >
          Salvar preferências
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const PreferenceRow = ({
  title,
  value,
  onToggle,
}: {
  title: string;
  value: boolean;
  onToggle: () => void;
}) => (
  <List.Item
    title={title}
    right={() => <Switch value={value} onValueChange={onToggle} color="#E91E63" />}
  />
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 32 },
  saveBtn: { marginHorizontal: 16, marginTop: 8, borderRadius: 12 },
});
