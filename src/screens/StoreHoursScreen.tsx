import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Switch, TextInput, Divider, ActivityIndicator, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { StoreService } from '../services/StoreService';
import { useAppTheme } from '../components/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const StoreHoursScreen = () => {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  
  const [businessHours, setBusinessHours] = useState<any>({
    0: { open: '08:00', close: '18:00', isClosed: true },
    1: { open: '08:00', close: '18:00', isClosed: false },
    2: { open: '08:00', close: '18:00', isClosed: false },
    3: { open: '08:00', close: '18:00', isClosed: false },
    4: { open: '08:00', close: '18:00', isClosed: false },
    5: { open: '08:00', close: '18:00', isClosed: false },
    6: { open: '08:00', close: '14:00', isClosed: false },
  });

  const storeService = useMemo(() => new StoreService(), []);

  useEffect(() => {
    const loadHours = async () => {
      if (!user) return;
      try {
        const store = await storeService.getStoreByProducerId(user.id);
        if (store) {
          setStoreId(store.id);
          if (store.businessHours) {
            setBusinessHours(store.businessHours);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar horários:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHours();
  }, [user]);

  const updateDayHour = (day: number, field: 'open' | 'close' | 'isClosed', value: any) => {
    setBusinessHours((prev: any) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  const handleSave = async () => {
    if (!storeId) {
      Alert.alert('Erro', 'Loja não encontrada. Configure seu perfil primeiro.');
      return;
    }

    setSaving(true);
    try {
      await storeService.updateStore(storeId, { businessHours });
      Alert.alert('Sucesso', 'Horários atualizados com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar os horários.');
    } finally {
      setSaving(false);
    }
  };

  const getDayName = (day: number) => {
    const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return names[day];
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <MaterialCommunityIcons name="clock-outline" size={48} color={theme.colors.primary} />
          <Text variant="headlineSmall" style={styles.title}>Horários da Loja</Text>
          <Text variant="bodyMedium" style={styles.subtitle}>
            Defina os horários que sua loja aparecerá como aberta para os clientes.
          </Text>
        </View>

        <Surface style={styles.card} elevation={1}>
          {[0, 1, 2, 3, 4, 5, 6].map((day) => (
            <View key={day}>
              <View style={styles.dayRow}>
                <View style={styles.dayMain}>
                  <Text style={styles.dayName}>{getDayName(day)}</Text>
                  <Switch 
                    value={!businessHours[day]?.isClosed} 
                    onValueChange={(val) => updateDayHour(day, 'isClosed', !val)}
                    color={theme.colors.primary}
                  />
                </View>

                {!businessHours[day]?.isClosed ? (
                  <View style={styles.timeContainer}>
                    <TextInput
                      mode="outlined"
                      dense
                      value={businessHours[day]?.open}
                      onChangeText={(t) => updateDayHour(day, 'open', t)}
                      style={styles.timeInput}
                      placeholder="08:00"
                    />
                    <Text style={styles.separator}>até</Text>
                    <TextInput
                      mode="outlined"
                      dense
                      value={businessHours[day]?.close}
                      onChangeText={(t) => updateDayHour(day, 'close', t)}
                      style={styles.timeInput}
                      placeholder="18:00"
                    />
                  </View>
                ) : (
                  <Text style={styles.closedLabel}>Fechado</Text>
                )}
              </View>
              {day < 6 && <Divider />}
            </View>
          ))}
        </Surface>

        <Button 
          mode="contained" 
          onPress={handleSave} 
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
        >
          Salvar Horários
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scrollContent: { padding: 16 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { alignItems: 'center', marginVertical: 20 },
  title: { fontWeight: 'bold', marginTop: 8 },
  subtitle: { textAlign: 'center', color: '#666', marginTop: 4, paddingHorizontal: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden' },
  dayRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: 16,
    minHeight: 72
  },
  dayMain: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  dayName: { fontSize: 16, fontWeight: '500', width: 80 },
  timeContainer: { flexDirection: 'row', alignItems: 'center' },
  timeInput: { width: 75, backgroundColor: '#fff', fontSize: 14 },
  separator: { marginHorizontal: 8, color: '#999' },
  closedLabel: { color: '#999', fontStyle: 'italic' },
  saveButton: { marginTop: 24, borderRadius: 12 },
  saveButtonContent: { height: 48 }
});
