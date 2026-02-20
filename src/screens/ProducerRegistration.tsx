import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Card,
  useTheme,
  ProgressBar,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { ProducerService } from '../services/ProducerService';
import { useNavigation } from '@react-navigation/native';
import { loggingService } from '../services/LoggingService';
import { InputValidationService } from '../services/InputValidationService';

export function ProducerRegistrationScreen() {
  const theme = useTheme();
  const { user, updateUser } = useAuth();
  const navigation = useNavigation<any>();
  const producerService = ProducerService.getInstance();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [storeData, setStoreData] = useState({
    name: '',
    cnpj: '',
    cpf: '',
    phone: user?.telefone || '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });

  const validateStep1 = () => {
    if (!storeData.name.trim()) {
      Alert.alert('Erro', 'Nome da loja é obrigatório.');
      return false;
    }
    if (!storeData.cnpj.trim() && !storeData.cpf.trim()) {
      Alert.alert('Erro', 'CNPJ ou CPF é obrigatório.');
      return false;
    }
    if (storeData.cnpj.trim()) {
      try {
        InputValidationService.validateInputType(storeData.cnpj, 'cnpj');
      } catch (e: any) {
        Alert.alert('Erro', e.message);
        return false;
      }
    }
    if (storeData.cpf.trim()) {
      try {
        InputValidationService.validateInputType(storeData.cpf, 'cpf');
      } catch (e: any) {
        Alert.alert('Erro', e.message);
        return false;
      }
    }
    return true;
  };

  const validateStep2 = () => {
    if (!storeData.address.trim()) {
      Alert.alert('Erro', 'Endereço é obrigatório.');
      return false;
    }
    if (!storeData.city.trim()) {
      Alert.alert('Erro', 'Cidade é obrigatória.');
      return false;
    }
    if (!storeData.state.trim()) {
      Alert.alert('Erro', 'Estado é obrigatório.');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!validateStep2()) return;

    try {
      setLoading(true);
      
      const producer = await producerService.createProducer({
        userId: user.id,
        name: storeData.name,
        email: user.email || '',
        phone: storeData.phone,
        cnpj: storeData.cnpj || undefined,
        cpf: storeData.cpf || undefined,
        address: {
          street: storeData.address,
          city: storeData.city,
          state: storeData.state,
          zipCode: storeData.zipCode,
          number: '',
          complement: '',
          neighborhood: '',
        },
        isActive: false, // Fica inativo até aprovação ou configuração de pagamento
        status: 'pending',
      });

      // Atualizar o perfil do usuário localmente se necessário
      await updateUser({
        producerProfile: {
          storeName: storeData.name,
          cnpj: storeData.cnpj || undefined,
          cpf: storeData.cpf || undefined,
          address: `${storeData.address}, ${storeData.city} - ${storeData.state}`,
        }
      });

      Alert.alert(
        'Sucesso',
        'Seu cadastro de produtor foi enviado com sucesso! Agora você pode habilitar o perfil de produtor nas configurações.',
        [{ text: 'OK', onPress: () => navigation.navigate('Profile') }]
      );
    } catch (error) {
      loggingService.error('Erro ao cadastrar produtor', error instanceof Error ? error : undefined);
      Alert.alert('Erro', 'Não foi possível enviar o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={styles.title}>Seja um Produtor</Text>
        
        <ProgressBar progress={step / 2} color={theme.colors.primary} style={styles.progress} />
        
        {step === 1 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>1. Informações da Loja</Text>
              
              <TextInput
                label="Nome da Loja"
                value={storeData.name}
                onChangeText={text => setStoreData({...storeData, name: text})}
                style={styles.input}
                mode="outlined"
              />
              
              <TextInput
                label="CNPJ (opcional)"
                value={storeData.cnpj}
                onChangeText={text => setStoreData({...storeData, cnpj: text})}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
              />

              <TextInput
                label="CPF do Responsável (se não houver CNPJ)"
                value={storeData.cpf}
                onChangeText={text => setStoreData({...storeData, cpf: text})}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
              />

              <TextInput
                label="Telefone de Contato"
                value={storeData.phone}
                onChangeText={text => setStoreData({...storeData, phone: text})}
                style={styles.input}
                mode="outlined"
                keyboardType="phone-pad"
              />

              <Button 
                mode="contained" 
                onPress={() => {
                  if (validateStep1()) setStep(2);
                }} 
                style={styles.nextButton}
              >
                Próximo Passo
              </Button>
            </Card.Content>
          </Card>
        )}

        {step === 2 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.sectionTitle}>2. Localização</Text>
              
              <TextInput
                label="Endereço"
                value={storeData.address}
                onChangeText={text => setStoreData({...storeData, address: text})}
                style={styles.input}
                mode="outlined"
              />

              <View style={styles.row}>
                <TextInput
                  label="Cidade"
                  value={storeData.city}
                  onChangeText={text => setStoreData({...storeData, city: text})}
                  style={[styles.input, { flex: 2, marginRight: 8 }]}
                  mode="outlined"
                />
                <TextInput
                  label="UF"
                  value={storeData.state}
                  onChangeText={text => setStoreData({...storeData, state: text})}
                  style={[styles.input, { flex: 1 }]}
                  mode="outlined"
                  autoCapitalize="characters"
                  maxLength={2}
                />
              </View>

              <TextInput
                label="CEP"
                value={storeData.zipCode}
                onChangeText={text => setStoreData({...storeData, zipCode: text})}
                style={styles.input}
                mode="outlined"
                keyboardType="numeric"
              />

              <View style={styles.row}>
                <Button mode="outlined" onPress={() => setStep(1)} style={styles.halfButton}>Voltar</Button>
                <Button 
                  mode="contained" 
                  onPress={handleSubmit} 
                  loading={loading}
                  disabled={loading}
                  style={styles.halfButton}
                >
                  Finalizar
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: 'bold',
  },
  progress: {
    marginBottom: 24,
    height: 8,
    borderRadius: 4,
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  input: {
    marginBottom: 16,
  },
  nextButton: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  halfButton: {
    flex: 0.48,
  },
});
