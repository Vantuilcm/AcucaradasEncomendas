import React, { useMemo, useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { InputValidationService } from '../services/InputValidationService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';
import { useAppTheme } from '../components/ThemeProvider';

export function RegisterScreen({ route }: { route?: any }) {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const role = route?.params?.role || 'comprador';
  const { register, loading, profileLoading } = useAuth();
  
  const isSyncing = loading || profileLoading;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Campos Comuns
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  // Campos Produtor
  const [documentNumber, setDocumentNumber] = useState(''); // CPF/CNPJ
  const [storeName, setStoreName] = useState('');
  
  // Campos Entregador
  const [transportType, setTransportType] = useState('bike'); // 'ape', 'bike', 'moto', 'carro'
  const [cnh, setCnh] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const validateForm = () => {
    try {
      // Validar nome (não vazio)
      if (!name.trim()) {
        throw new Error('Nome é obrigatório');
      }
      
      // Validar email usando o serviço de validação
      InputValidationService.validateInputType(email, 'email');
      
      // Validar senha usando o serviço de validação
      InputValidationService.validateInputType(password, 'password');
      
      // Verificar se as senhas coincidem
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }

      // Validar termos de uso
      if (!termsAccepted) {
        throw new Error('Você precisa aceitar os Termos de Uso e Política de Privacidade para continuar');
      }

      // Validações Específicas por Role
      if (!phone.trim()) throw new Error('Telefone é obrigatório');
      
      if (role === 'produtor') {
        if (!documentNumber.trim()) throw new Error('CPF/CNPJ é obrigatório para produtores');
        if (!storeName.trim()) throw new Error('Nome da loja é obrigatório');
        if (!address.trim()) throw new Error('Endereço da loja é obrigatório');
      } else if (role === 'entregador') {
        if (!documentNumber.trim()) throw new Error('CPF é obrigatório para entregadores');
        if (['moto', 'carro'].includes(transportType) && !cnh.trim()) {
          throw new Error('CNH é obrigatória para este tipo de transporte');
        }
      } else {
        // Comprador
        if (!address.trim()) throw new Error('Endereço é obrigatório');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dados de entrada inválidos';
      setError(errorMessage);
      
      // Registrar falha na validação do formulário
      secureLoggingService.security('REGISTER_VALIDATION_FAILED', {
        email,
        reason: errorMessage
      });
      
      return false;
    }
  };

  const handleRegister = async () => {
    if (isSyncing) return;

    try {
      setError(null);
      
      if (!validateForm()) {
        return;
      }
      
      // Sanitizar entradas antes de enviar
      const sanitizedName = InputValidationService.validateAndSanitizeInput(name, {
        maxLength: 100
      });
      
      const sanitizedEmail = InputValidationService.validateAndSanitizeInput(email, {
        type: 'email'
      });

      secureLoggingService.security('USER_REGISTER_ATTEMPT', { email: sanitizedEmail, role });

      // Preparar dados adicionais com base na role
      let additionalData: any = { phone };
      
      if (role === 'produtor') {
        additionalData = {
          ...additionalData,
          documentNumber,
          storeName,
          address,
          storeStatus: 'pending_approval'
        };
      } else if (role === 'entregador') {
        additionalData = {
          ...additionalData,
          documentNumber,
          transportType,
          cnh: ['moto', 'carro'].includes(transportType) ? cnh : null,
          courierStatus: 'pending_approval'
        };
      } else {
        additionalData = {
          ...additionalData,
          address
        };
      }

      await register({ 
        email: sanitizedEmail, 
        nome: sanitizedName, 
        role,
        referralCode: referralCode.trim(),
        ...additionalData
      } as any, password);
      
      // O redirecionamento é tratado pelo AppNavigator
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar conta';
      setError(errorMessage);
      
      secureLoggingService.error('REGISTER_PROCESS_ERROR', { 
        email, 
        error: errorMessage 
      });
    }
  };

  if (isSyncing) {
    return <LoadingState message={profileLoading ? "Carregando perfil..." : "Criando conta..."} />;
  }

  return (
    <ScreenshotProtection
      enabled={true}
      blurContent={true}
      onScreenshotDetected={() => setError('Captura de tela detectada! Por motivos de segurança, esta ação não é permitida.')}
    >
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Text variant="headlineMedium" style={styles.title}>
              Criar Conta
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Preencha seus dados para se cadastrar
            </Text>

            {error && <ErrorMessage message={error} />}

            <TextInput label="Nome" value={name} onChangeText={setName} style={styles.input} />

            <TextInput
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
            
            <TextInput
              label="Telefone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />

            {role === 'produtor' && (
              <>
                <TextInput
                  label="Nome da Loja"
                  value={storeName}
                  onChangeText={setStoreName}
                  style={styles.input}
                />
                <TextInput
                  label="CPF/CNPJ"
                  value={documentNumber}
                  onChangeText={setDocumentNumber}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <TextInput
                  label="Endereço da Loja"
                  value={address}
                  onChangeText={setAddress}
                  style={styles.input}
                />
              </>
            )}

            {role === 'entregador' && (
              <>
                <TextInput
                  label="CPF"
                  value={documentNumber}
                  onChangeText={setDocumentNumber}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Text style={styles.subtitle}>Tipo de Transporte</Text>
                {/* Simplified input for MVP - ideally a picker/dropdown */}
                <TextInput
                  label="Tipo de Transporte (a pé, bike, moto, carro)"
                  value={transportType}
                  onChangeText={setTransportType}
                  style={styles.input}
                />
                {['moto', 'carro'].includes(transportType.toLowerCase()) && (
                  <TextInput
                    label="CNH"
                    value={cnh}
                    onChangeText={setCnh}
                    style={styles.input}
                  />
                )}
              </>
            )}

            {role === 'comprador' && (
              <TextInput
                label="Endereço Completo"
                value={address}
                onChangeText={setAddress}
                style={styles.input}
              />
            )}

            <TextInput
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              label="Confirmar Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              style={styles.input}
            />

            <TextInput
              label="Código de Indicação (Opcional)"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              style={styles.input}
              placeholder="Ex: JOAO123"
              left={<TextInput.Icon icon="ticket-percent" />}
            />

            <View style={styles.termsContainer}>
              <View style={styles.checkboxWrapper}>
                <Checkbox
                  status={termsAccepted ? 'checked' : 'unchecked'}
                  onPress={() => setTermsAccepted(!termsAccepted)}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.termsTextContainer}>
                <TouchableOpacity onPress={() => setTermsAccepted(!termsAccepted)} style={styles.termsLabelClickable}>
                  <Text style={styles.termsText}>
                    Eu concordo com os{' '}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('TermsOfUse' as never)}>
                  <Text style={[styles.termsText, styles.termsLink]}>
                    Termos de Uso
                  </Text>
                </TouchableOpacity>
                <Text style={styles.termsText}>
                  {' '}e a{' '}
                </Text>
                <TouchableOpacity onPress={() => navigation.navigate('PrivacySettings' as never)}>
                  <Text style={[styles.termsText, styles.termsLink]}>
                    Política de Privacidade
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.button}
              disabled={loading || !termsAccepted}
            >
              Criar Conta
            </Button>

            <Button 
              mode="text" 
              onPress={() => {
                secureLoggingService.info('Navegação de volta para tela de login');
                navigation.goBack();
              }} 
              style={styles.loginButton}
            >
              Já tem uma conta? Faça login
            </Button>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ScreenshotProtection>
  );
}

const createStyles = (theme: { colors: any }) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    color: theme.colors.text.primary,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: theme.colors.text.secondary,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.background,
  },
  termsContainer: {
    marginBottom: 24,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(233, 30, 99, 0.05)',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(233, 30, 99, 0.1)',
  },
  checkboxWrapper: {
    borderWidth: 2,
    borderColor: theme?.colors?.primary || '#E91E63',
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    marginRight: 4,
  },
  termsTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginLeft: 4,
  },
  termsLabelClickable: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  termsText: {
    fontSize: 14,
    color: theme.colors.text.primary,
    lineHeight: 20,
  },
  termsLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
    fontWeight: 'bold',
  },
  button: {
    marginTop: 8,
  },
  loginButton: {
    marginTop: 16,
  },
});
