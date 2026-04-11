import React, { useMemo, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { TextInput, Button, Avatar, Title, Caption, Divider, Text, ActivityIndicator } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { UserUtils } from '../utils/UserUtils';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { secureLoggingService } from '../services/SecureLoggingService';
import { useAppTheme } from '../components/ThemeProvider';
import { StoreService } from '../services/StoreService';
import { s } from '../config/firebase';

const EditProfileScreen = () => {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation();
  const { user, updateUser } = useAuth();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  
  // Novos campos para Produtor
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  useEffect(() => {
    // Carregar dados do usuário atual
    const loadStoreData = async () => {
      if (user) {
        setName(UserUtils.getUserName(user) || '');
        setEmail(UserUtils.getUserEmail(user) || '');
        setPhone((user as any).telefone || (user as any).phone || '');
        setAddress((user as any).endereco?.[0]?.logradouro || (user as any).address || '');
        
        if (user.role === 'produtor') {
          const storeService = new StoreService();
          const store = await storeService.getStoreByProducerId(user.id);
          if (store) {
            setStoreId(store.id);
            setStoreName(store.name || '');
            setStoreDescription(store.description || '');
            setLogo(store.logo || null);
            setBanner(store.banner || null);
          }
        }
      }
    };

    loadStoreData();
  }, [user]);

  const pickImage = async (type: 'logo' | 'banner') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: type === 'logo' ? [1, 1] : [16, 9],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0].uri) {
      handleUploadImage(result.assets[0].uri, type);
    }
  };

  const handleUploadImage = async (uri: string, type: 'logo' | 'banner') => {
    if (!user) return;
    
    try {
      setUploading(true);
      const response = await fetch(uri);
      const blob = await response.blob();
      
      const filename = `${type}_${Date.now()}.jpg`;
      const storagePath = `stores/${user.id}/${filename}`;
      
      const storageRef = s.ref(storagePath);
      
      await s.uploadBytes(storageRef, blob);
      const downloadURL = await s.getDownloadURL(storageRef);
      
      if (type === 'logo') setLogo(downloadURL);
      else setBanner(downloadURL);
      
      Alert.alert('Sucesso', `${type === 'logo' ? 'Logo' : 'Banner'} carregado com sucesso!`);
    } catch (err) {
      console.error('Erro no upload:', err);
      Alert.alert('Erro', 'Não foi possível carregar a imagem.');
    } finally {
      setUploading(false);
    }
  };

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
      
      // Dados para atualizar
      const updateData: any = {
        nome: name,
        email,
        telefone: phone,
        address
      };

      // Se for produtor, incluir dados da loja
      if (user?.role === 'produtor') {
        const storeService = new StoreService();
        const storeData = {
          name: storeName,
          description: storeDescription,
          logo: logo || '',
          banner: banner || '',
          producerId: user.id,
          isOpen: true,
          leadTime: 60,
          businessHours: {
            1: { open: '08:00', close: '18:00', isClosed: false },
            2: { open: '08:00', close: '18:00', isClosed: false },
            3: { open: '08:00', close: '18:00', isClosed: false },
            4: { open: '08:00', close: '18:00', isClosed: false },
            5: { open: '08:00', close: '18:00', isClosed: false },
          }
        };

        if (storeId) {
          await storeService.updateStore(storeId, storeData);
        } else {
          await storeService.createStore(storeData as any);
        }
      }
      
      // Atualizar perfil usando a função correta
      if (updateUser) {
        await updateUser(updateData);
      }
      
      // Registrar sucesso na atualização
      secureLoggingService.security('Perfil atualizado com sucesso', {
        userId: user?.id,
        email: email,
        fieldsUpdated: ['name', 'email', 'phone', 'address'],
        timestamp: new Date().toISOString()
      });
      
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
      navigation.goBack();
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao atualizar perfil';
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

          {user?.role === 'produtor' && (
            <>
              <Divider style={styles.divider} />
              <Title style={styles.sectionTitle}>Configurações da Loja</Title>
              <Caption>Informações que os clientes verão</Caption>
              
              <TextInput
                label="Nome da Loja"
                value={storeName}
                onChangeText={setStoreName}
                mode="outlined"
                style={styles.input}
                placeholder="Ex: Doces da Vovó"
              />
              
              <TextInput
                label="Descrição da Loja"
                value={storeDescription}
                onChangeText={setStoreDescription}
                mode="outlined"
                multiline
                numberOfLines={4}
                style={styles.input}
                placeholder="Conte um pouco sobre seus doces..."
              />
              
              <Title style={styles.sectionTitle}>Visual da Loja</Title>
              <View style={styles.imageSelectionContainer}>
                <View style={styles.imageSelectionBox}>
                  <Text variant="labelMedium">Logo da Loja</Text>
                  <TouchableOpacity onPress={() => pickImage('logo')} style={styles.imagePicker}>
                    {logo ? (
                      <Image source={{ uri: logo }} style={styles.previewLogo} />
                    ) : (
                      <Avatar.Icon size={60} icon="store" />
                    )}
                    <View style={styles.editIconBadge}>
                      <Avatar.Icon size={20} icon="pencil" />
                    </View>
                  </TouchableOpacity>
                </View>

                <View style={styles.imageSelectionBox}>
                  <Text variant="labelMedium">Banner da Loja</Text>
                  <TouchableOpacity onPress={() => pickImage('banner')} style={styles.imagePicker}>
                    {banner ? (
                      <Image source={{ uri: banner }} style={styles.previewBanner} />
                    ) : (
                      <View style={styles.placeholderBanner}>
                        <Avatar.Icon size={40} icon="image" />
                      </View>
                    )}
                    <View style={styles.editIconBadge}>
                      <Avatar.Icon size={20} icon="pencil" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {uploading && (
                <View style={styles.uploadingContainer}>
                  <ActivityIndicator animating={true} color={theme.colors.primary} />
                  <Text style={styles.uploadingText}>Enviando imagem...</Text>
                </View>
              )}
            </>
          )}
          
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

const createStyles = (theme: { colors: any }) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  sectionTitle: {
    marginTop: 8,
    fontSize: 18,
    color: theme.colors.primary,
  },
  imageSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 16,
  },
  imageSelectionBox: {
    alignItems: 'center',
    width: '48%',
  },
  imagePicker: {
    marginTop: 8,
    width: '100%',
    height: 100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    overflow: 'hidden',
  },
  previewLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  previewBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  placeholderBanner: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    elevation: 2,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(233, 30, 99, 0.05)',
    borderRadius: 8,
    marginBottom: 16,
  },
  uploadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.primary,
  },
  button: {
    marginVertical: 8,
  },
  errorText: {
    color: theme.colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  securityMessageText: {
    color: theme.colors.background,
    backgroundColor: theme.colors.error,
    padding: 10,
    marginBottom: 16,
    textAlign: 'center',
    borderRadius: 5,
    fontWeight: 'bold',
  },
});

export default EditProfileScreen;
