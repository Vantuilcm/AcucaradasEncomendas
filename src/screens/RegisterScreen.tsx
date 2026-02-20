import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image, Alert } from 'react-native';
import { TextInput, Button, Text, useTheme, SegmentedButtons, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRootNavigationState, useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
// Removida dependência de expo-router para unificar navegação
import { useAuth } from '../contexts/AuthContext';
import { LoadingState } from '../components/base/LoadingState';
import { ErrorMessage } from '../components/ErrorMessage';
import { InputValidationService } from '../services/InputValidationService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { setPendingHref } from '../navigation/pendingNavigation';
import { LegalDocumentLinks } from '../components/LegalDocumentLinks';

// Fallback seguro para FaceDetector removido (módulo obsoleto no SDK 52)
const FaceDetector: any = null;

export function RegisterScreen() {
  const theme = useTheme();
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const navigation = useNavigation<any>();
  const { register, loading } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<'customer' | 'producer' | 'courier'>('customer');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [storeName, setStoreName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [producerCpf, setProducerCpf] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [courierCpf, setCourierCpf] = useState('');
  const [cnhDocUri, setCnhDocUri] = useState<string | null>(null);
  const [crlvDocUri, setCrlvDocUri] = useState<string | null>(null);
  const [faceImageUri, setFaceImageUri] = useState<string | null>(null);
  const [antecedentesDocUri, setAntecedentesDocUri] = useState<string | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [highlightConsent, setHighlightConsent] = useState(false);

  const validateForm = () => {
    try {
      // Validar nome (não vazio)
      if (!name.trim()) {
        throw new Error('Nome é obrigatório');
      }
      // Validar telefone
      if (!phone.trim()) {
        throw new Error('Telefone é obrigatório');
      }

      // Validar email usando o serviço de validação
      InputValidationService.validateInputType(email, 'email');
      
      // Validar senha usando o serviço de validação
      InputValidationService.validateInputType(password, 'password');
      
      // Verificar se as senhas coincidem
      if (password !== confirmPassword) {
        throw new Error('As senhas não coincidem');
      }
      if (role === 'producer') {
        if (!storeName.trim()) throw new Error('Nome da loja é obrigatório');
        if (!storeAddress.trim()) throw new Error('Endereço da loja é obrigatório');
        if (!cnpj.trim() && !producerCpf.trim()) throw new Error('Informe CNPJ ou CPF da loja');
        if (cnpj.trim()) InputValidationService.validateInputType(cnpj, 'cnpj');
        if (producerCpf.trim()) InputValidationService.validateInputType(producerCpf, 'cpf');
      }
      if (role === 'courier') {
        if (!courierCpf.trim()) throw new Error('CPF do entregador é obrigatório');
        InputValidationService.validateInputType(courierCpf, 'cpf');
        if (!cnhDocUri || !crlvDocUri || !faceImageUri || !antecedentesDocUri) throw new Error('CNH, CRLV, foto facial e antecedentes criminais são obrigatórios');
      }
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Dados de entrada inválidos';
      setError(errorMessage);
      
      // Registrar falha na validação do formulário
      secureLoggingService.security('Falha na validação do formulário de registro', {
        email,
        reason: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      return false;
    }
  };

  const pickCnh = async () => {
    if (Platform.OS === 'web') { setError('Envio de documentos não suportado no Web'); return; }
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!res.canceled) setCnhDocUri(res.assets?.[0]?.uri || null);
  };

  const pickCrlv = async () => {
    if (Platform.OS === 'web') { setError('Envio de documentos não suportado no Web'); return; }
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!res.canceled) setCrlvDocUri(res.assets?.[0]?.uri || null);
  };

  const pickAntecedentes = async () => {
    if (Platform.OS === 'web') { setError('Envio de documentos não suportado no Web'); return; }
    const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!res.canceled) setAntecedentesDocUri(res.assets?.[0]?.uri || null);
  };

  const pickFaceImage = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const uri = result.assets[0].uri;
        
        // Verificação segura de FaceDetector (módulo opcional/legado)
        if (FaceDetector && typeof FaceDetector.detectFacesAsync === 'function') {
          try {
            const detection = await FaceDetector.detectFacesAsync(uri, {
              mode: FaceDetector?.FaceDetectorMode?.fast || 1,
              detectLandmarks: FaceDetector?.FaceDetectorLandmarks?.none || 0,
              runClassifications: FaceDetector?.FaceDetectorClassifications?.all || 1,
            });

            const faces = (detection as any)?.faces || (Array.isArray(detection) ? detection : []);
            const count = Array.isArray(faces) ? faces.length : 0;

            if (count === 0) {
              setError('Nenhum rosto detectado na foto. Por favor, tire outra foto.');
              return;
            }
          } catch (e) {
            console.warn('FaceDetector falhou ou não está disponível:', e);
            // Prossegue mesmo se o detector falhar, para não bloquear o usuário
          }
        }

        setFaceImageUri(uri);
        setError(null);
      }
    } catch (err) {
      setError('Erro ao capturar foto do rosto');
    }
  };

  const handleRegister = async () => {
    try {
      setError(null);
      
      secureLoggingService.security('Tentativa de registro de nova conta', { email, name });

      if (!agreed) {
        const msg = 'Você precisa concordar com os Termos de Uso e a Política de Privacidade para continuar.';
        setError(msg);
        setHighlightConsent(true);
        secureLoggingService.security('Tentativa de registro sem aceitar termos', { email, role });
        return;
      }

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

      const sanitizedPhone = InputValidationService.validateAndSanitizeInput(phone, {
        maxLength: 20
      });

      const userExtras: any = {};
      if (role === 'producer') {
        userExtras.producerProfile = { storeName: storeName.trim(), cpf: producerCpf.trim() || undefined, cnpj: cnpj.trim() || undefined, address: storeAddress.trim() };
      }
      if (role === 'courier') {
        try {
          if (faceImageUri && FaceDetector && typeof FaceDetector.detectFacesAsync === 'function') {
            const detection = await FaceDetector.detectFacesAsync(faceImageUri, {
              mode: FaceDetector?.FaceDetectorMode?.fast || 1,
              detectLandmarks: FaceDetector?.FaceDetectorLandmarks?.none || 0,
              runClassifications: FaceDetector?.FaceDetectorClassifications?.all || 1,
            });
            const faces = (detection as any)?.faces || (Array.isArray(detection) ? detection : []);
            const count = Array.isArray(faces) ? faces.length : 0;
            if (count !== 1) {
              throw new Error('Foto facial inválida');
            }
          }
        } catch (e) {
          secureLoggingService.warn('Falha na validação facial no registro:', e);
          // Prossegue mesmo se falhar a detecção técnica, mas para se for "Foto facial inválida" explicitamente
          if (e instanceof Error && e.message === 'Foto facial inválida') {
            setError(e.message);
            return;
          }
        }
        userExtras.courierProfile = { cpf: courierCpf.trim(), cnhDocUri: cnhDocUri || undefined, crlvDocUri: crlvDocUri || undefined, antecedentesDocUri: antecedentesDocUri || undefined, faceImageUri: faceImageUri || undefined };
      }
      await register({ email: sanitizedEmail, nome: sanitizedName, telefone: sanitizedPhone, role, ...userExtras } as any, password);
      
      try {
        Alert.alert(
          'Confirme seu e-mail',
          `Enviamos um e-mail de confirmação para ${sanitizedEmail}. Acesse sua caixa de entrada e clique no link para ativar sua conta.`,
        );
      } catch {}

      secureLoggingService.security('Registro de conta bem-sucedido', { 
        email: sanitizedEmail,
        name: sanitizedName
      });

      console.log('[RegisterScreen] Registro bem-sucedido. Redirecionando para /src-app');
      if (!rootNavigationState?.key) {
        setPendingHref('/src-app');
      } else {
        try {
          router.replace('/src-app');
        } catch {
          setPendingHref('/src-app');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar conta';
      setError(errorMessage);
      
      // Registrar falha no registro
      secureLoggingService.security('Falha no registro de conta', { 
        email, 
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  };

  if (loading) {
    return <LoadingState message="Criando conta..." />;
  }

  const toggleConsent = () => {
    setAgreed(prev => {
      const next = !prev;
      if (next) {
        setHighlightConsent(false);
      }
      return next;
    });
  };

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

          <SegmentedButtons
            value={role}
            onValueChange={v => setRole(v as any)}
            buttons={[
              { value: 'customer', label: 'Comprador' },
              { value: 'producer', label: 'Produtor' },
              { value: 'courier', label: 'Entregador' },
            ]}
            style={{ marginBottom: 16 }}
          />

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
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              right={<TextInput.Icon icon={passwordVisible ? 'eye-off' : 'eye'} onPress={() => setPasswordVisible(v => !v)} />}
              style={styles.input}
            />

            <TextInput
              label="Confirmar Senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!confirmVisible}
              right={<TextInput.Icon icon={confirmVisible ? 'eye-off' : 'eye'} onPress={() => setConfirmVisible(v => !v)} />}
              style={styles.input}
            />

            <TextInput
              label="Telefone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />

            {role === 'producer' && (
              <>
                <TextInput label="Nome da Loja" value={storeName} onChangeText={setStoreName} style={styles.input} />
                <TextInput label="Endereço da Loja" value={storeAddress} onChangeText={setStoreAddress} style={styles.input} />
                <TextInput label="CNPJ" value={cnpj} onChangeText={setCnpj} keyboardType="number-pad" style={styles.input} />
                <TextInput label="CPF (opcional)" value={producerCpf} onChangeText={setProducerCpf} keyboardType="number-pad" style={styles.input} />
              </>
            )}

            {role === 'courier' && (
              <>
                <TextInput label="CPF" value={courierCpf} onChangeText={setCourierCpf} keyboardType="number-pad" style={styles.input} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Button mode="outlined" onPress={pickCnh} style={{ flex: 1, marginRight: 8 }}>{cnhDocUri ? 'CNH selecionada' : 'Enviar CNH'}</Button>
                  <Button mode="outlined" onPress={pickCrlv} style={{ flex: 1, marginLeft: 8 }}>{crlvDocUri ? 'CRLV selecionado' : 'Enviar CRLV'}</Button>
                </View>
                <View style={{ marginTop: 12 }}>
                  <Button mode="outlined" onPress={pickAntecedentes}>{antecedentesDocUri ? 'Antecedentes criminais selecionados' : 'Enviar antecedentes criminais'}</Button>
                </View>
                <View style={{ alignItems: 'center', marginTop: 12 }}>
                  {faceImageUri ? <Image source={{ uri: faceImageUri }} style={{ width: 120, height: 120, borderRadius: 60 }} /> : null}
                  <Button mode="outlined" onPress={pickFaceImage} style={{ marginTop: 8 }}>{faceImageUri ? 'Trocar foto' : 'Enviar foto facial'}</Button>
                </View>
              </>
            )}

            <View
              style={[
                styles.consentRow,
                highlightConsent ? styles.consentRowError : null,
              ]}
            >
              <Checkbox
                status={agreed ? 'checked' : 'unchecked'}
                onPress={toggleConsent}
                color={highlightConsent ? theme.colors.error : theme.colors.primary}
              />
              <Text
                style={[
                  styles.consentText,
                  highlightConsent ? styles.consentTextError : null,
                ]}
              >
                Eu concordo com os Termos de Uso e a Política de Privacidade
              </Text>
            </View>

            <LegalDocumentLinks
              style={styles.legalLinks}
              horizontal
              contextMessage="Ao criar uma conta, você concorda com nossos"
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              style={styles.button}
              disabled={loading}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
  },
  input: {
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
  },
  loginButton: {
    marginTop: 20,
    alignSelf: 'center',
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fafafa',
  },
  consentText: {
    marginLeft: 8,
    fontSize: 12,
    color: '#333',
  },
  consentRowError: {
    borderColor: '#d32f2f',
    backgroundColor: '#ffebee',
  },
  consentTextError: {
    color: '#d32f2f',
  },
  legalLinks: {
    alignSelf: 'center',
  },
});
