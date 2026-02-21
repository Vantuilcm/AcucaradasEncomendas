import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { OneSignalTest } from '../utils/OneSignalTest';
import { loggingService } from '../services/LoggingService';
import OneSignal from 'onesignal-expo-plugin/build/OneSignal';

interface DeviceState {
  userId?: string;
  pushToken?: string;
  isSubscribed?: boolean;
  hasNotificationPermission?: boolean;
  isPushDisabled?: boolean;
}

/**
 * Painel de teste do OneSignal para desenvolvimento
 * Use este componente para testar e diagnosticar o OneSignal durante o desenvolvimento
 */
export const OneSignalTestPanel: React.FC = () => {
  const [deviceState, setDeviceState] = useState<DeviceState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Atualizar estado do dispositivo
  const updateDeviceState = async () => {
    try {
      const state = await OneSignal.getDeviceState();
      setDeviceState(state);
      setLastUpdate(new Date());
      loggingService.info('OneSignal Test Panel: Estado atualizado', { state });
    } catch (error) {
      loggingService.error('OneSignal Test Panel: Erro ao obter estado', { error });
      Alert.alert('Erro', 'Não foi possível obter o estado do dispositivo');
    }
  };

  // Executar diagnósticos
  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      await OneSignalTest.runDiagnostics();
      await updateDeviceState();
      Alert.alert('Sucesso', 'Diagnósticos executados! Verifique os logs.');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao executar diagnósticos');
    } finally {
      setIsLoading(false);
    }
  };

  // Forçar inscrição
  const forceSubscription = async () => {
    setIsLoading(true);
    try {
      await OneSignalTest.forceSubscription();
      // Aguardar um pouco antes de atualizar o estado
      setTimeout(async () => {
        await updateDeviceState();
        setIsLoading(false);
      }, 3000);
      Alert.alert('Sucesso', 'Tentativa de inscrição iniciada! Aguarde...');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao forçar inscrição');
      setIsLoading(false);
    }
  };

  // Solicitar permissão
  const requestPermission = async () => {
    setIsLoading(true);
    try {
      const response = await OneSignal.promptForPushNotificationsWithUserResponse();
      loggingService.info('OneSignal Test Panel: Resposta da permissão', { response });
      await updateDeviceState();
      Alert.alert('Permissão', `Resposta: ${response ? 'Aceita' : 'Negada'}`);
    } catch (error) {
      Alert.alert('Erro', 'Erro ao solicitar permissão');
    } finally {
      setIsLoading(false);
    }
  };

  // Definir tags de teste
  const setTestTags = async () => {
    try {
      const testTags = {
        test_panel: 'true',
        timestamp: new Date().toISOString(),
        platform: 'android'
      };
      await OneSignal.sendTags(testTags);
      Alert.alert('Sucesso', 'Tags de teste definidas!');
    } catch (error) {
      Alert.alert('Erro', 'Erro ao definir tags');
    }
  };

  // Carregar estado inicial
  useEffect(() => {
    updateDeviceState();
  }, []);

  const getStatusColor = (value: boolean | undefined): string => {
    if (value === undefined) return '#FFA500'; // Laranja para indefinido
    return value ? '#4CAF50' : '#F44336'; // Verde para true, vermelho para false
  };

  const getStatusText = (value: boolean | undefined): string => {
    if (value === undefined) return 'Indefinido';
    return value ? 'Sim' : 'Não';
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔔 OneSignal Test Panel</Text>
        <Text style={styles.subtitle}>
          Última atualização: {lastUpdate.toLocaleTimeString()}
        </Text>
      </View>

      {/* Estado do Dispositivo */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Estado do Dispositivo</Text>
        
        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>ID do Usuário:</Text>
          <Text style={[styles.statusValue, { color: deviceState?.userId ? '#4CAF50' : '#F44336' }]}>
            {deviceState?.userId || 'Não encontrado'}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Push Token:</Text>
          <Text style={[styles.statusValue, { color: deviceState?.pushToken ? '#4CAF50' : '#F44336' }]}>
            {deviceState?.pushToken ? 'Presente' : 'Ausente'}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Inscrito:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(deviceState?.isSubscribed) }]}>
            {getStatusText(deviceState?.isSubscribed)}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Permissão:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(deviceState?.hasNotificationPermission) }]}>
            {getStatusText(deviceState?.hasNotificationPermission)}
          </Text>
        </View>

        <View style={styles.statusItem}>
          <Text style={styles.statusLabel}>Push Desabilitado:</Text>
          <Text style={[styles.statusValue, { color: getStatusColor(!deviceState?.isPushDisabled) }]}>
            {getStatusText(deviceState?.isPushDisabled)}
          </Text>
        </View>
      </View>

      {/* Ações */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔧 Ações de Teste</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={updateDeviceState}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🔄 Atualizar Estado</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={runDiagnostics}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🔍 Executar Diagnósticos</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={requestPermission}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🔔 Solicitar Permissão</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={forceSubscription}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🚀 Forçar Inscrição</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.button} 
          onPress={setTestTags}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>🏷️ Definir Tags de Teste</Text>
        </TouchableOpacity>
      </View>

      {/* Indicador de carregamento */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B6B" />
          <Text style={styles.loadingText}>Processando...</Text>
        </View>
      )}

      {/* Instruções */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>💡 Instruções</Text>
        <Text style={styles.instruction}>
          • Use este painel apenas durante o desenvolvimento{"\n"}
          • Verifique os logs do console para detalhes{"\n"}
          • Para notificações funcionarem, configure a FCM Server Key no dashboard OneSignal{"\n"}
          • Teste sempre em dispositivo físico, não no emulador
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  statusItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  statusLabel: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'right',
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 16,
    color: '#666',
  },
  instruction: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});