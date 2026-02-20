import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Avatar, Title, Caption, Divider, Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';

const EditProfileScreen = () => {
  const navigation = useNavigation<any>();
  const { user, updateUserProfile } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  useEffect(() => {
    // Carregar dados do usuário atual
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      setAddress(user.address || '');
    }
  }, [user]);

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Registrar tentativa de atualização de perfil
      secureLoggingService.security('Tentativa de atualização de perfil', {
        userId: user?.id,
        email: user?.email,
        timestamp: new Date().toISOString()
      });
      
      // Validações básicas
      if (!name.trim()) {
        throw new Error('Nome é obrigatório');
      }
      
      if (!email.trim()) {
        throw new Error('Email é obrigatório');
      }
      
      // Atualizar perfil
      await updateUserProfile({
        name,
        email,
        phone,
        address
      });
      
      // Registrar sucesso na atualização
      secureLoggingService.security('Perfil atualizado com sucesso', {
        userId: user?.id,
        email: email,
        fieldsUpdated: ['name', 'email', 'phone', 'address'],
        timestamp: new Date().toISOString()
      });
      
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      navigation.goBack();
    } catch (err) {
      const errorMessage = (err instanceof Error ? err.message : 'Erro ao atualizar perfil');
      setError(errorMessage);
      
      // Registrar falha na atualização
      secureLoggingService.security('Falha na atualização de perfil', {
        userId: user?.id,
        email: user?.email,
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenshotProtection
      enabled={true}
      blurContent={true}
      onScreenshotDetected={() => {
        setSecurityMessage('Captura de tela detectada! Por motivos de segurança, esta ação não é permitida.');
        secureLoggingService.security('Tentativa de captura de tela na tela de edição de perfil', { 
          userId: user?.id,
          timestamp: new Date().toISOString(),
          severity: 'high'
        });
        
        // Limpar a mensagem após 5 segundos
        setTimeout(() => setSecurityMessage(null), 5000);
      }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="account" />
          <Title style={styles.title}>Editar Perfil</Title>
          <Caption>Atualize suas informações pessoais</Caption>
        </View>
        
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {securityMessage ? <Text style={styles.securityMessageText}>{securityMessage}</Text> : null}
        
        <View style={styles.form}>
          <TextInput
            label="Nome completo"
            value={name}
            onChangeText={setName}
            mode="outlined"
            style={styles.input}
          />
          
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            mode="outlined"
            keyboardType="email-address"
            style={styles.input}
          />
          
          <TextInput
            label="Telefone"
            value={phone}
            onChangeText={setPhone}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
          />
          
          <TextInput
            label="Endereço"
            value={address}
            onChangeText={setAddress}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
          />
          
          <Divider style={styles.divider} />
          
          <Button 
            mode="contained" 
            onPress={handleSaveProfile}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Salvar Alterações
          </Button>
          
          <Button 
            mode="outlined" 
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Cancelar
          </Button>
        </View>
        </ScrollView>
      </SafeAreaView>
    </ScreenshotProtection>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    marginTop: 8,
    fontSize: 22,
  },
  form: {
    marginTop: 16,
  },
  input: {
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  button: {
    marginVertical: 8,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
    textAlign: 'center',
  },
  securityMessageText: {
    color: 'white',
    backgroundColor: '#FF6B6B',
    padding: 10,
    marginBottom: 16,
    textAlign: 'center',
    borderRadius: 5,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;

