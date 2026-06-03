import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { Surface, Text, Button, Divider, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getAuth, authFunctions, f } from '../config/firebase';
import { useNavigation } from '@react-navigation/native';

// Helper temporário para debug Firestore
const showFirestoreDebug = (path: string, error: any) => {
  console.error('[FIRESTORE_PERMISSION_ERROR]', {
    path,
    code: error?.code,
    message: error?.message,
  });

  if (error?.code === 'permission-denied' || String(error?.message || '').includes('PERMISSION_DENIED')) {
    Alert.alert(
      'Firestore Debug',
      `PATH: ${path}\nCODE: ${error?.code || 'unknown'}\nMSG: ${error?.message || 'sem mensagem'}`
    );
  }
};

export const ContaBancariaScreen = () => {
  const { user } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation();

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [accountData, setAccountData] = useState<any>(null);

  const functions = getFunctions();

  // Função segura para buscar dados
  const loadAccountData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const contextUid = (user as any).uid || (user as any).id;
      const authUid = getAuth().currentUser?.uid;
      const authEmail = getAuth().currentUser?.email ?? null;

      if (!contextUid) {
        console.warn('[BANK_FIRESTORE_OPERATION] UID inválido no loadAccountData', { user });
        console.log('[FS_GUARD] uid não encontrado, abortando loadAccountData');
        setAccountData(null);
        setLoading(false);
        return;
      }

      if (!authUid) {
        console.warn('[BANK_AUTH_GUARD] Auth ausente, leitura adiada', { contextUid, authEmail });
        setAccountData(null);
        setLoading(false);
        return;
      }

      if (authUid !== contextUid) {
        console.warn('[BANK_AUTH_GUARD] UID desalinhado', { contextUid, authUid });
        setAccountData(null);
        setLoading(false);
        return;
      }

      const path = `users/${authUid}`;
      console.log('[BANK_FIRESTORE_OPERATION] getDoc', path, { authUid, authEmail, contextUid });
      const userRef = f.doc('users', authUid);
      const userSnap = await f.getDoc(userRef);
      if (!userSnap.exists()) {
        console.warn('[BANK_FIRESTORE_OPERATION] Documento users/{uid} não existe', { uid: authUid, path });
        console.log('[FS_GUARD] users/{uid} missing, fallback to empty state');
        setAccountData(null);
        setLoading(false);
        return;
      }
      setAccountData(userSnap.data());
    } catch (error: any) {
      console.error('[BANK_FIRESTORE_ERROR] Erro ao carregar dados:', error);
      if (error?.code === 'permission-denied') {
        console.error('[FS_PERMISSION_DENIED] ContaBancariaScreen.loadAccountData', {
          uid: getAuth().currentUser?.uid,
          path: `users/${getAuth().currentUser?.uid ?? 'unknown'}`,
          code: error.code,
          message: error.message,
        });
      }
      showFirestoreDebug(`users/${getAuth().currentUser?.uid ?? 'unknown'}`, error);
      setAccountData(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadAccountData();
  }, [loadAccountData]);

  useEffect(() => {
    const unsubscribe = authFunctions.onAuthStateChanged(() => {
      loadAccountData();
    });
    return () => unsubscribe();
  }, [loadAccountData]);

  const handleStartOnboarding = async () => {
    if (processing) return;
    setProcessing(true);
    console.log('[BANK_SCREEN_START]');

    try {
      const uid = (user as any).uid || (user as any).id;
      if (!uid) {
        throw new Error('UID inválido. Por favor faça logout e login novamente.');
      }

      // VALIDAÇÃO CRÍTICA: Verificar que documento user existe ANTES de continuar
      if (!accountData) {
        console.warn('[FS_GUARD] handleStartOnboarding: accountData é null/undefined', { uid });
        Alert.alert(
          'Configuração necessária',
          'Sua conta ainda não foi completamente configurada. Tente fazer logout e login novamente para sincronizar seus dados.'
        );
        setProcessing(false);
        return;
      }

      const role = accountData?.role || accountData?.activeRole || 'producer';
      let currentAccountId = accountData?.stripeAccountId;

      // 1. Criar conta conectada se não existir
      if (!currentAccountId) {
        console.log('[STRIPE_ONBOARDING] Chamando createConnectedAccount para UID:', uid);
        const createAccountFn = httpsCallable(functions, 'createConnectedAccount');
        
        try {
          const response = await createAccountFn({ 
            email: user?.email || '', 
            role: role 
          });
          
          // Verifica retorno (safe mode)
          const data = response.data as any;
          if (!data || !data.accountId) {
            throw new Error('Falha ao criar conta conectada no Stripe.');
          }
          console.log('[BANK_FUNCTION_SUCCESS] createAccount', !!data?.accountId);
          currentAccountId = data.accountId;
          console.log('[STRIPE_ONBOARDING] Conta criada com sucesso.');
        } catch (createError: any) {
          console.error('[FS_PERMISSION_DENIED]', {
            screen: 'ContaBancariaScreen',
            uid,
            path: `users/${uid}`,
            operation: 'createConnectedAccount',
            message: createError?.message,
            code: createError?.code,
            build: '1292'
          });
          
          // FALLBACK VISUAL
          Alert.alert(
            'Ocorreu um problema',
            'Não foi possível conectar sua conta ao sistema de pagamentos. Por favor, tente novamente mais tarde.',
            [{ text: 'Entendi', onPress: () => setProcessing(false) }]
          );
          return;
        }
      }

      // 2. Gerar link de onboarding
      console.log('[STRIPE_ONBOARDING] Chamando createStripeOnboardingLink...');
      const createLinkFn = httpsCallable(functions, 'createStripeOnboardingLink');
      const linkResponse = await createLinkFn({
        accountId: currentAccountId,
        // Usar URLs de fallback genéricas, pois o app é mobile.
        refreshUrl: 'https://acucaradasencomendas.com.br/stripe-refresh',
        returnUrl: 'https://acucaradasencomendas.com.br/stripe-success',
      });

      const linkData = linkResponse.data as any;
      console.log('[BANK_FUNCTION_SUCCESS] createLink', !!linkData?.url);
      
      if (!linkData || !linkData.url) {
        throw new Error('Não foi possível gerar o link de cadastro.');
      }

      // 3. Abrir link
      console.log('[STRIPE_ONBOARDING] Abrindo link seguro do Stripe...');
      const canOpen = await Linking.canOpenURL(linkData.url);
      if (canOpen) {
        await Linking.openURL(linkData.url);
      } else {
        throw new Error('Não foi possível abrir o navegador.');
      }

    } catch (error: any) {
      console.error('[STRIPE_ONBOARDING] Erro no fluxo:', error);
      console.error('[FS_PERMISSION_DENIED]', {
        screen: 'ContaBancariaScreen',
        uid: (user as any)?.uid || (user as any)?.id,
        operation: 'handleStartOnboarding',
        message: error?.message,
        code: error?.code,
        build: '1292'
      });
      
      Alert.alert('Ops! 😅', error.message || 'Ocorreu um erro ao tentar configurar sua conta. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  const handleSyncStatus = async () => {
    if (processing) return;
    if (!accountData?.stripeAccountId) return;
    
    setProcessing(true);
    try {
      console.log('[STRIPE_ONBOARDING] Sincronizando status...');
      const syncFn = httpsCallable(functions, 'syncStripeAccountStatus');
      await syncFn({ accountId: accountData.stripeAccountId });
      // Firestore listener atualizará o UI automaticamente
      Alert.alert('Tudo certo!', 'Status atualizado com sucesso.');
      console.log('[STRIPE_ONBOARDING] Status sincronizado com sucesso.');
    } catch (error: any) {
      console.error('[STRIPE_ONBOARDING] Erro ao sincronizar status:', error);
      Alert.alert('Erro na sincronização', 'Não foi possível verificar o status no momento.');
    } finally {
      setProcessing(false);
    }
  };

  const renderStatusCard = () => {
    if (loading) {
      return <ActivityIndicator size="large" color="#9C27B0" style={{ margin: 40 }} />;
    }

    const accountId = accountData?.stripeAccountId;
    const payoutsEnabled = accountData?.payoutsEnabled;
    const detailsSubmitted = accountData?.detailsSubmitted;

    let statusTitle = "Você ainda não configurou sua conta para receber.";
    let statusIcon = "bank-remove";
    let statusColor = "#757575";
    let statusDesc = "Conecte sua conta bancária de forma segura para receber os pagamentos de suas vendas.";
    let buttonLabel = "Cadastrar conta bancária";

    if (accountId) {
      if (payoutsEnabled && detailsSubmitted) {
        statusTitle = "Conta aprovada para receber pagamentos.";
        statusIcon = "check-decagram";
        statusColor = "#4CAF50";
        statusDesc = "Sua conta bancária está verificada. Seus repasses ocorrerão automaticamente.";
        buttonLabel = "Atualizar status";
      } else if (detailsSubmitted && !payoutsEnabled) {
        statusTitle = "O Stripe está analisando seus dados.";
        statusIcon = "clock-outline";
        statusColor = "#FF9800";
        statusDesc = "Isso pode levar algumas horas. Avisaremos quando sua conta estiver aprovada.";
        buttonLabel = "Atualizar status";
      } else if (!detailsSubmitted) {
        statusTitle = "Continue seu cadastro para liberar seus recebimentos.";
        statusIcon = "alert-circle-outline";
        statusColor = "#F44336";
        statusDesc = "Faltam informações obrigatórias. Por favor, conclua seu cadastro no ambiente seguro.";
        buttonLabel = "Continuar cadastro";
      }
    }

    const isApproved = payoutsEnabled && detailsSubmitted;

    return (
      <Surface style={styles.statusCard} elevation={2}>
        <View style={[styles.iconContainer, { backgroundColor: `${statusColor}15` }]}>
          <MaterialCommunityIcons name={statusIcon as any} size={40} color={statusColor} />
        </View>
        
        <Text style={[styles.statusTitle, { color: statusColor }]}>{statusTitle}</Text>
        <Text style={styles.statusDesc}>{statusDesc}</Text>

        <Divider style={styles.divider} />

        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="shield-check" size={16} color="#4CAF50" />
          <Text style={styles.infoText}>Ambiente 100% seguro via Stripe</Text>
        </View>

        <Button
          mode="contained"
          onPress={isApproved ? handleSyncStatus : handleStartOnboarding}
          loading={processing}
          disabled={processing}
          style={[styles.actionButton, { backgroundColor: isApproved ? '#2196F3' : '#9C27B0' }]}
          icon={isApproved ? "refresh" : "bank"}
        >
          {buttonLabel}
        </Button>

        {accountId && !isApproved && (
          <Button
            mode="text"
            onPress={handleSyncStatus}
            disabled={processing}
            style={styles.syncButton}
            textColor="#666"
          >
            Já preenchi, atualizar status
          </Button>
        )}
      </Surface>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Recebimentos</Text>
          <Text style={styles.pageSubtitle}>Gerencie sua conta bancária</Text>
        </View>

        {renderStatusCard()}

        <View style={styles.securityBox}>
          <Text style={styles.securityTitle}>Por que usamos o Stripe?</Text>
          <Text style={styles.securityText}>
            Para garantir a segurança dos seus dados, a Açucaradas Encomendas não armazena seu número de conta, agência ou documentos. Todo o processo é feito no ambiente criptografado da Stripe, líder mundial em pagamentos.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 24, marginTop: 8 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
  pageSubtitle: { fontSize: 16, color: '#666', marginTop: 4 },
  
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  statusDesc: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 20,
    width: '100%',
    justifyContent: 'center',
  },
  infoText: {
    fontSize: 12,
    color: '#2E7D32',
    marginLeft: 6,
    fontWeight: '500',
  },
  actionButton: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 4,
  },
  syncButton: {
    marginTop: 12,
    width: '100%',
  },
  securityBox: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  securityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  securityText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  }
});
