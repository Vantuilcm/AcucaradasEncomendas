import React, { useState } from 'react';
import { StyleSheet, ScrollView, Alert } from 'react-native';
import { Button, Text, Card, Divider, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { configService } from '../services/ConfigService';
import { DemandForecastService } from '../services/DemandForecastService';
import { DynamicPricingService } from '../services/DynamicPricingService';
import { LoggingService } from '../services/LoggingService';
import Sentry from '../config/sentry';

export function PremiumTestScreen() {
  const theme = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  const [flags, setFlags] = useState(configService.getFlags());

  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const toggleFlag = async (key: keyof typeof flags) => {
    const newValue = !flags[key];
    await configService.setFlag(key, newValue);
    setFlags(configService.getFlags());
    addLog(`Flag ${key} alterada para ${newValue}`);
  };

  const testDemandForecast = async () => {
    const service = DemandForecastService.getInstance();
    addLog('Testando DemandForecast...');
    const result = await service.forecastDemand('prod_123', [
      { productId: 'prod_123', date: new Date(), quantity: 10, price: 50 },
      // Simular mais pontos se necessário
    ]);
    addLog(result ? `Previsão: ${result.confidenceScore}` : 'Previsão falhou ou desativada');
  };

  const testDynamicPricing = async () => {
    const service = DynamicPricingService.getInstance();
    addLog('Testando DynamicPricing (Máx 2%)...');
    const result = await service.calculateDynamicPrice('prod_123', 100, 5); // Simular alta demanda (5)
    addLog(`Preço Original: R$ 100.00`);
    addLog(`Preço Dinâmico: R$ ${result.toFixed(2)} (Máximo 2% aplicado)`);
  };

  const simulateE2EFlow = async () => {
    addLog('🚀 Iniciando Simulação Ponta a Ponta...');
    
    // 1. Comprador
    addLog('👤 [Comprador] Criando pedido e processando pagamento...');
    await new Promise(resolve => setTimeout(resolve, 800));
    addLog('✅ PaymentIntent criado: pi_simulated_123');
    addLog('✅ Pedido #789654 criado com sucesso.');

    // 2. IA / Risco
    addLog('🧠 [IA] Validando risco da transação...');
    await new Promise(resolve => setTimeout(resolve, 500));
    addLog('✅ Risco Score: 12/100 (Seguro)');

    // 3. Notificações (OneSignal)
    addLog('🔔 [Notificação] Enviando push para o produtor...');
    await new Promise(resolve => setTimeout(resolve, 600));
    addLog('✅ Notificação enviada com sucesso via OneSignal.');

    // 4. Produtor
    addLog('🏪 [Produtor] Recebendo notificação de novo pedido...');
    await new Promise(resolve => setTimeout(resolve, 800));
    addLog('✅ Pedido aceito pelo produtor. Status: Em Preparação.');

    // 5. Entregador
    addLog('🛵 [Entregador] Pedido pronto para coleta...');
    await new Promise(resolve => setTimeout(resolve, 800));
    addLog('✅ Entregador aceitou a entrega. Status: Em Rota.');

    // 6. Admin / Monitoramento
    addLog('📊 [Admin] Monitorando entrega em tempo real...');
    await new Promise(resolve => setTimeout(resolve, 500));
    addLog('✅ Painel de Monitoramento atualizado: Pedido em Rota.');

    // 7. Finalização
    addLog('🏁 [Sistema] Pedido entregue ao cliente final.');
    await new Promise(resolve => setTimeout(resolve, 600));
    addLog('✅ Notificação de agradecimento enviada.');

    // 8. Split Financeiro
    addLog('💰 [Sistema] Executando split financeiro (Stripe Connect)...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    addLog('✅ Split concluído: 85% Produtor | 10% Plataforma | 5% Taxa Sistema.');

    addLog('✨ Simulação finalizada com sucesso!');
  };

  const testSentryError = () => {
    addLog('🐞 Simulando erro no Sentry...');
    try {
      // @ts-ignore - Forçando um erro de referência para teste
      const result = (undefined as any).someProperty;
      console.log(result);
    } catch (error) {
      addLog('✅ Erro capturado e enviado ao LoggingService');
      LoggingService.getInstance().error('Erro de teste no PremiumTestScreen', error as Error, {
        screen: 'PremiumTestScreen',
        testType: 'ReferenceError',
      });
      Alert.alert('Teste Sentry', 'Erro simulado enviado ao LoggingService. Se o Sentry estiver ativo, ele aparecerá no dashboard.');
    }
  };

  const testSentryMessage = () => {
    addLog('💬 Enviando mensagem ao Sentry...');
    Sentry.captureMessage('Mensagem de teste do PremiumTestScreen', 'info');
    Alert.alert('Teste Sentry', 'Mensagem enviada. Verifique o console ou o dashboard do Sentry.');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>Painel de Testes Premium</Text>
        
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Fluxo Completo (Simulação)</Text>
            <Divider style={styles.divider} />
            <Button mode="contained" onPress={simulateE2EFlow} style={[styles.button, { backgroundColor: theme.colors.tertiary }]}>
              Simular Pedido Real (Ponta a Ponta)
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Feature Flags (IA & Segurança)</Text>
            <Divider style={styles.divider} />
            <Button 
              mode={flags.enableDemandForecast ? "contained" : "outlined"} 
              onPress={() => toggleFlag('enableDemandForecast')}
              style={styles.button}
            >
              Demand Forecast: {flags.enableDemandForecast ? "ON" : "OFF"}
            </Button>
            <Button 
              mode={flags.enableDynamicPricing ? "contained" : "outlined"} 
              onPress={() => toggleFlag('enableDynamicPricing')}
              style={styles.button}
            >
              Dynamic Pricing: {flags.enableDynamicPricing ? "ON" : "OFF"}
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Feature Flags (Fase 6)</Text>
            <Divider style={styles.divider} />
            <Button 
              mode={flags.enableSentry ? "contained" : "outlined"} 
              onPress={() => toggleFlag('enableSentry')} 
              style={styles.button}
            >
              {flags.enableSentry ? "Sentry: ATIVADO" : "Sentry: DESATIVADO"}
            </Button>
            <Button 
              mode={flags.enableDemandForecast ? "contained" : "outlined"} 
              onPress={() => toggleFlag('enableDemandForecast')} 
              style={styles.button}
            >
              Previsão de Demanda: {flags.enableDemandForecast ? "ON" : "OFF"}
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Simulações de IA</Text>
            <Divider style={styles.divider} />
            <Button mode="contained" onPress={testDemandForecast} style={styles.button}>
              Rodar Demand Forecast
            </Button>
            <Button mode="contained" onPress={testDynamicPricing} style={styles.button}>
              Rodar Dynamic Pricing
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Monitoramento (Sentry)</Text>
            <Divider style={styles.divider} />
            <Button mode="contained" onPress={testSentryError} style={[styles.button, { backgroundColor: theme.colors.error }]}>
              Simular Erro (captureException)
            </Button>
            <Button mode="outlined" onPress={testSentryMessage} style={styles.button}>
              Enviar Mensagem (captureMessage)
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium">Logs de Teste</Text>
            <Divider style={styles.divider} />
            {logs.map((log, i) => (
              <Text key={i} style={styles.logText}>{log}</Text>
            ))}
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { padding: 16 },
  title: { marginBottom: 20, textAlign: 'center', color: '#1E1B4B' },
  card: { marginBottom: 16, backgroundColor: '#FFFFFF', borderRadius: 12 },
  divider: { marginVertical: 10 },
  button: { marginBottom: 8 },
  logText: { fontSize: 12, color: '#475569', marginBottom: 4 }
});
