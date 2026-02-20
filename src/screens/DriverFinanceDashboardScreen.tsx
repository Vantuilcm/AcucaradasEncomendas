import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, Card, Title, Paragraph, List, Divider, useTheme, Button, Chip, Portal, Modal, TextInput, RadioButton, HelperText, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DriverFinanceSummary, DriverEarning, WithdrawalRequest } from '../types/DeliveryDriver';
import { formatCurrency } from '../utils/formatters';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

export function DriverFinanceDashboardScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DriverFinanceSummary | null>(null);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<'not_started' | 'pending' | 'active'>('not_started');
  
  // Withdrawal state
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [withdrawalMethod, setWithdrawalMethod] = useState<'pix' | 'stripe'>('pix');
  const [withdrawStep, setWithdrawStep] = useState<'details' | 'verification'>('details');
  const [verificationCode, setVerificationCode] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [pixKeyType, setPixKeyType] = useState<WithdrawalRequest['pixKeyType']>('cpf');
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const loadFinanceData = async () => {
    try {
      if (!user?.id) return;
      const driverService = DeliveryDriverService.getInstance();
      const [financeData, stripeStatus] = await Promise.all([
        driverService.getFinanceSummary(user.id),
        driverService.getStripeAccountStatus(user.id)
      ]);
      setSummary(financeData);
      setStripeAccountStatus(stripeStatus);
      setError(null);
    } catch (err) {
      logger.error('Erro ao carregar dados financeiros:', err instanceof Error ? err : new Error(String(err)));
      setError('Não foi possível carregar seu resumo financeiro.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFinanceData();
  };

  const handleStripeOnboarding = async () => {
    if (!user) return;
    try {
      const driverService = DeliveryDriverService.getInstance();
      const url = await driverService.getStripeOnboardingLink(user.id, user.email || '');
      const Linking = (await import('react-native')).Linking;
      await Linking.openURL(url);
      setStripeAccountStatus('pending');
    } catch (error) {
      logger.error('Erro ao iniciar configuração de recebimentos:', error instanceof Error ? error : new Error(String(error)));
      setSnackbarMessage('Não foi possível iniciar a configuração dos seus recebimentos.');
      setSnackbarVisible(true);
    }
  };

  const handleStartWithdraw = async () => {
    if (withdrawalMethod === 'pix' && !pixKey) {
      setSnackbarMessage('Por favor, informe sua chave PIX.');
      setSnackbarVisible(true);
      return;
    }

    setWithdrawLoading(true);
    try {
      if (!user?.id) return;
      const driverService = DeliveryDriverService.getInstance();
      
      // Solicitar código 2FA
      await driverService.generateWithdrawalVerificationCode(user.id);
      setWithdrawStep('verification');
    } catch (err) {
      logger.error('Erro ao gerar código 2FA:', err instanceof Error ? err : new Error(String(err)));
      setSnackbarMessage('Erro ao enviar código de segurança. Tente novamente.');
      setSnackbarVisible(true);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const handleConfirmWithdraw = async () => {
    if (verificationCode.length < 6) {
      setSnackbarMessage('Por favor, informe o código de 6 dígitos.');
      setSnackbarVisible(true);
      return;
    }

    setWithdrawLoading(true);
    try {
      if (!user?.id) return;
      const driverService = DeliveryDriverService.getInstance();
      
      // Verificar código
      const isValid = await driverService.verifyWithdrawalCode(user.id, verificationCode);
      
      if (!isValid) {
        setSnackbarMessage('Código de segurança incorreto ou expirado.');
        setSnackbarVisible(true);
        setWithdrawLoading(false);
        return;
      }

      // Se válido, processar o saque
      const amount = summary?.availableBalance || 0;
      if (withdrawalMethod === 'pix') {
        await driverService.requestWithdrawal({
          driverId: user.id,
          driverName: user.name || 'Entregador',
          amount,
          pixKey,
          pixKeyType,
        });
      } else {
        await driverService.requestStripePayout(user.id, amount);
      }

      setWithdrawModalVisible(false);
      setWithdrawStep('details');
      setVerificationCode('');
      setSnackbarMessage('Solicitação de saque enviada com sucesso!');
      setSnackbarVisible(true);
      loadFinanceData();
    } catch (err) {
      logger.error('Erro ao solicitar saque:', err instanceof Error ? err : new Error(String(err)));
      setSnackbarMessage('Erro ao processar saque. Tente novamente.');
      setSnackbarVisible(true);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const getStatusColor = (status: DriverEarning['status']) => {
    switch (status) {
      case 'available': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'paid': return '#2196F3';
      default: return '#666';
    }
  };

  const getStatusLabel = (status: DriverEarning['status']) => {
    switch (status) {
      case 'available': return 'Disponível';
      case 'pending': return 'Pendente';
      case 'paid': return 'Pago';
      default: return status;
    }
  };

  if (loading && !refreshing) {
    return <LoadingState message="Carregando finanças..." />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.headerTitle}>Minhas Finanças</Text>
        </View>

        {error && <ErrorMessage message={error} onRetry={onRefresh} />}

        <View style={styles.balanceContainer}>
          <Card style={[styles.balanceCard, { backgroundColor: theme.colors.primary }]}>
            <Card.Content>
              <Text style={styles.balanceLabel}>Saldo Disponível</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(summary?.availableBalance || 0)}
              </Text>
              <Button 
                mode="contained" 
                style={styles.withdrawButton}
                buttonColor="#fff"
                textColor={theme.colors.primary}
                onPress={() => setWithdrawModalVisible(true)}
                disabled={(summary?.availableBalance || 0) <= 0}
              >
                Solicitar Saque
              </Button>
            </Card.Content>
          </Card>

          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.smallLabel}>Aguardando</Text>
                <Text style={[styles.smallValue, { color: '#FF9800' }]}>
                  {formatCurrency(summary?.pendingBalance || 0)}
                </Text>
              </Card.Content>
            </Card>

            <Card style={styles.statCard}>
              <Card.Content>
                <Text style={styles.smallLabel}>Total Pago</Text>
                <Text style={[styles.smallValue, { color: '#2196F3' }]}>
                  {formatCurrency(summary?.totalWithdrawn || 0)}
                </Text>
              </Card.Content>
            </Card>
          </View>
        </View>

        <Card style={styles.stripeCard}>
          <Card.Title 
            title="Conta de Recebimentos" 
            subtitle="Receba seus ganhos automaticamente"
            left={props => <List.Icon {...props} icon="bank" color={theme.colors.primary} />}
          />
          <Card.Content>
            {stripeAccountStatus === 'active' ? (
              <View style={styles.stripeStatusContainer}>
                <Chip icon="check-circle" style={styles.statusChipActive} textStyle={{ color: '#fff' }}>
                  Conta Ativa e Pronta
                </Chip>
                <Text style={styles.stripeDescription}>
                  Sua conta está vinculada. Você pode solicitar saques automáticos para sua conta bancária.
                </Text>
              </View>
            ) : stripeAccountStatus === 'pending' ? (
              <View style={styles.stripeStatusContainer}>
                <Chip icon="clock-outline" style={styles.statusChipPending} textStyle={{ color: '#fff' }}>
                  Verificação em Andamento
                </Chip>
                <Button mode="outlined" onPress={handleStripeOnboarding} style={styles.stripeButton}>
                  Concluir cadastro
                </Button>
              </View>
            ) : (
              <View style={styles.stripeStatusContainer}>
                <Chip icon="alert-circle-outline" style={styles.statusChipNotStarted}>
                  Não Configurada
                </Chip>
                <Text style={styles.stripeDescription}>
                  Conclua seu cadastro de recebimentos para receber seus pagamentos de forma rápida e segura.
                </Text>
                <Button mode="contained" onPress={handleStripeOnboarding} style={styles.stripeButton}>
                  Configurar recebimentos
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        <Card style={styles.historyCard}>
          <Card.Content>
            <Title style={styles.sectionTitle}>Histórico Recente</Title>
            <Divider style={styles.divider} />
            
            {summary?.recentEarnings && summary.recentEarnings.length > 0 ? (
              summary.recentEarnings.map((earning) => (
                <View key={earning.id} style={styles.earningItem}>
                  <View style={styles.earningInfo}>
                    <Text variant="titleMedium">{earning.description || 'Entrega'}</Text>
                    <Text variant="bodySmall" style={styles.earningDate}>
                      {new Date(earning.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </Text>
                  </View>
                  <View style={styles.earningAmountContainer}>
                    <Text variant="titleLarge" style={styles.earningAmount}>
                      {formatCurrency(earning.amount)}
                    </Text>
                    <Chip 
                      compact 
                      textStyle={{ fontSize: 10, color: '#fff' }} 
                      style={{ 
                        backgroundColor: getStatusColor(earning.status),
                        height: 20,
                        marginTop: 4
                      }}
                    >
                      {getStatusLabel(earning.status)}
                    </Chip>
                  </View>
                </View>
              ))
            ) : (
              <Paragraph style={styles.emptyText}>
                Nenhum ganho registrado recentemente.
              </Paragraph>
            )}
          </Card.Content>
        </Card>

        <View style={styles.infoBox}>
          <Text variant="bodySmall" style={styles.infoText}>
            * Os pagamentos são processados semanalmente todas as segundas-feiras para o saldo disponível.
          </Text>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={withdrawModalVisible}
          onDismiss={() => {
            if (!withdrawLoading) {
              setWithdrawModalVisible(false);
              setWithdrawStep('details');
              setVerificationCode('');
            }
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <Title>Solicitar Saque</Title>
          
          {withdrawStep === 'details' ? (
            <>
              <Paragraph>
                Valor a sacar: <Text style={{ fontWeight: 'bold' }}>{formatCurrency(summary?.availableBalance || 0)}</Text>
              </Paragraph>
              
              <Text style={styles.pixLabel}>Método de Recebimento:</Text>
              <RadioButton.Group onValueChange={value => setWithdrawalMethod(value as any)} value={withdrawalMethod}>
                <View style={styles.radioRow}>
                  <View style={styles.radioItem}>
                    <RadioButton value="pix" />
                    <Text>PIX</Text>
                  </View>
                  {stripeAccountStatus === 'active' && (
                    <View style={styles.radioItem}>
                      <RadioButton value="stripe" />
                      <Text>Stripe (Automático)</Text>
                    </View>
                  )}
                </View>
              </RadioButton.Group>

              {withdrawalMethod === 'pix' ? (
                <>
                  <Text style={styles.pixLabel}>Tipo de Chave PIX:</Text>
                  <RadioButton.Group onValueChange={value => setPixKeyType(value as any)} value={pixKeyType}>
                    <View style={styles.radioRow}>
                      <View style={styles.radioItem}>
                        <RadioButton value="cpf" />
                        <Text>CPF</Text>
                      </View>
                      <View style={styles.radioItem}>
                        <RadioButton value="email" />
                        <Text>E-mail</Text>
                      </View>
                      <View style={styles.radioItem}>
                        <RadioButton value="phone" />
                        <Text>Tel</Text>
                      </View>
                      <View style={styles.radioItem}>
                        <RadioButton value="random" />
                        <Text>Aleatória</Text>
                      </View>
                    </View>
                  </RadioButton.Group>

                  <TextInput
                    label="Chave PIX"
                    value={pixKey}
                    onChangeText={setPixKey}
                    mode="outlined"
                    style={styles.pixInput}
                    placeholder={pixKeyType === 'cpf' ? '000.000.000-00' : 'Sua chave PIX'}
                    disabled={withdrawLoading}
                  />
                  <HelperText type="info">
                    Certifique-se de que a chave está correta. Não nos responsabilizamos por chaves incorretas.
                  </HelperText>
                </>
              ) : (
                <View style={{ marginVertical: 16, padding: 12, backgroundColor: '#E3F2FD', borderRadius: 8 }}>
                  <Text style={{ color: '#1976D2', fontSize: 14 }}>
                    Seus ganhos serão transferidos diretamente para sua conta Stripe conectada.
                  </Text>
                </View>
              )}

              <View style={styles.modalButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => setWithdrawModalVisible(false)}
                  disabled={withdrawLoading}
                  style={styles.modalButton}
                >
                  Cancelar
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleStartWithdraw}
                  loading={withdrawLoading}
                  disabled={withdrawLoading}
                  style={styles.modalButton}
                >
                  Continuar
                </Button>
              </View>
            </>
          ) : (
            <>
              <Paragraph style={{ marginBottom: 16 }}>
                Enviamos um código de segurança de 6 dígitos para o seu aplicativo. Por favor, insira-o abaixo para confirmar o saque de <Text style={{ fontWeight: 'bold' }}>{formatCurrency(summary?.availableBalance || 0)}</Text>.
              </Paragraph>

              <TextInput
                label="Código de Segurança"
                value={verificationCode}
                onChangeText={setVerificationCode}
                mode="outlined"
                keyboardType="numeric"
                maxLength={6}
                style={styles.pixInput}
                placeholder="000000"
                disabled={withdrawLoading}
                autoFocus
              />
              <HelperText type="info">
                O código expira em 5 minutos.
              </HelperText>

              <View style={styles.modalButtons}>
                <Button 
                  mode="outlined" 
                  onPress={() => setWithdrawStep('details')}
                  disabled={withdrawLoading}
                  style={styles.modalButton}
                >
                  Voltar
                </Button>
                <Button 
                  mode="contained" 
                  onPress={handleConfirmWithdraw}
                  loading={withdrawLoading}
                  disabled={withdrawLoading}
                  style={styles.modalButton}
                >
                  Confirmar Saque
                </Button>
              </View>
            </>
          )}
        </Modal>

        <Snackbar
          visible={snackbarVisible}
          onDismiss={() => setSnackbarVisible(false)}
          duration={3000}
        >
          {snackbarMessage}
        </Snackbar>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontWeight: 'bold',
  },
  balanceContainer: {
    padding: 16,
  },
  balanceCard: {
    borderRadius: 16,
    marginBottom: 16,
    elevation: 4,
  },
  balanceLabel: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
  },
  balanceValue: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  withdrawButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 0.48,
    borderRadius: 12,
  },
  smallLabel: {
    fontSize: 12,
    color: '#666',
  },
  smallValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  historyCard: {
    margin: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  earningItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  earningInfo: {
    flex: 1,
  },
  earningDate: {
    color: '#999',
    marginTop: 2,
  },
  earningAmountContainer: {
    alignItems: 'flex-end',
  },
  earningAmount: {
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginVertical: 20,
  },
  infoBox: {
    padding: 20,
    paddingTop: 0,
  },
  infoText: {
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalContainer: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  pixLabel: {
    marginTop: 16,
    fontWeight: 'bold',
  },
  radioRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 8,
  },
  radioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  stripeCard: {
    margin: 16,
    borderRadius: 12,
    elevation: 2,
  },
  stripeStatusContainer: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  statusChipActive: {
    backgroundColor: '#4CAF50',
    marginBottom: 12,
  },
  statusChipPending: {
    backgroundColor: '#FF9800',
    marginBottom: 12,
  },
  statusChipNotStarted: {
    backgroundColor: '#E0E0E0',
    marginBottom: 12,
  },
  stripeDescription: {
    textAlign: 'center',
    color: '#666',
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  stripeButton: {
    width: '100%',
  },
  pixInput: {
    marginTop: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
});
