import React, { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Button, Switch, TextInput, Divider, ActivityIndicator, Surface, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { StoreService } from '../services/StoreService';
import { useAppTheme } from '../components/ThemeProvider';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { s } from '../config/firebase';

export const StoreHoursScreen = () => {
  const { user } = useAuth();
  const { theme } = useAppTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  
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
          setStoreName(store.name || '');
          setStoreDescription(store.description || '');
          setLogo(store.logo || null);
          setBanner(store.banner || null);
          if (store.businessHours) {
            setBusinessHours(store.businessHours);
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados da loja:', error);
      } finally {
        setLoading(false);
      }
    };
    loadHours();
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
      
      // Conversão robusta de URI para Blob (compatível com iOS/Android)
      const blob: Blob = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() { resolve(xhr.response); };
        xhr.onerror = function() { reject(new TypeError('Falha na conversão de imagem')); };
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });
      
      const filename = `${type}_${Date.now()}.jpg`;
      const storagePath = `stores/${user.id}/${filename}`;
      
      const storageRef = s.ref(storagePath);
      await s.uploadBytes(storageRef, blob);
      const downloadURL = await s.getDownloadURL(storageRef);
      
      if (type === 'logo') setLogo(downloadURL);
      else setBanner(downloadURL);
      
      // Salvar imediatamente na loja para evitar perda
      if (storeId) {
        await storeService.updateStore(storeId, { [type]: downloadURL });
      } else {
        // Se a loja não existe, criar com a imagem
        console.log('🚀 [STORE_HOURS] Loja não existe, criando via Upload');
        const newStoreId = await storeService.createStore({
          producerId: '', // Será preenchido pelo service usando Auth UID
          name: storeName || `Loja de ${user.nome || 'Produtor'}`,
          description: storeDescription,
          [type]: downloadURL,
          isOpen: true,
          leadTime: 60,
          businessHours
        } as any);
        if (newStoreId) setStoreId(newStoreId);
      }

      Alert.alert('Sucesso', `${type === 'logo' ? 'Logo' : 'Banner'} carregado com sucesso!`);
    } catch (err: any) {
      console.error('Erro no upload:', err);
      Alert.alert('Erro no Upload', `Não foi possível carregar a imagem. Detalhe: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setUploading(false);
    }
  };

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
    if (!user) {
      console.log("❌ [STORE_HOURS] Usuário não encontrado");
      return;
    }

    console.log("🚀 [STORE_HOURS] Iniciando salvamento", { storeId, businessHours });
    setSaving(true);
    try {
      if (storeId) {
        console.log("🚀 [STORE_HOURS] Atualizando loja existente:", storeId);
        await storeService.updateStore(storeId, { businessHours });
      } else {
        // Criar loja se não existir ao clicar em salvar
        console.log('🚀 [STORE_HOURS] Loja não existe, criando via Save');
        const newStoreId = await storeService.createStore({
          producerId: '', // Será preenchido pelo service usando Auth UID
          name: storeName || `Loja de ${user.nome || 'Produtor'}`,
          description: storeDescription,
          logo: logo || '',
          banner: banner || '',
          isOpen: true,
          leadTime: 60,
          businessHours
        } as any);
        console.log("✅ [STORE_HOURS] Nova loja criada:", newStoreId);
        if (newStoreId) setStoreId(newStoreId);
      }
      Alert.alert('Sucesso', 'Horários e dados atualizados com sucesso!');
    } catch (error: any) {
      console.error('❌ [STORE_HOURS] Erro ao salvar:', error);
      Alert.alert('Erro ao Salvar', `Não foi possível salvar os dados. Detalhe: ${error.message || 'Erro desconhecido'}`);
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
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Identidade Visual</Text>
          </View>
          
          <View style={styles.imageSelectionContainer}>
            <View style={styles.imageSelectionBox}>
              <Text variant="labelMedium" style={styles.imageLabel}>Logo (1:1)</Text>
              <TouchableOpacity onPress={() => pickImage('logo')} style={styles.imagePicker}>
                {logo ? (
                  <Image source={{ uri: logo }} style={styles.previewLogo} />
                ) : (
                  <Avatar.Icon size={60} icon="store" color="#fff" />
                )}
                <View style={styles.editIconBadge}>
                  <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.imageSelectionBox}>
              <Text variant="labelMedium" style={styles.imageLabel}>Banner (16:9)</Text>
              <TouchableOpacity onPress={() => pickImage('banner')} style={styles.imagePicker}>
                {banner ? (
                  <Image source={{ uri: banner }} style={styles.previewBanner} />
                ) : (
                  <View style={styles.placeholderBanner}>
                    <MaterialCommunityIcons name="image-plus" size={32} color="#999" />
                  </View>
                )}
                <View style={styles.editIconBadge}>
                  <MaterialCommunityIcons name="pencil" size={14} color="#fff" />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {uploading && (
            <View style={styles.uploadingContainer}>
              <ActivityIndicator animating={true} size="small" color={theme.colors.primary} />
              <Text style={styles.uploadingText}>Enviando imagem...</Text>
            </View>
          )}

          <Divider />

          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Grade de Horários</Text>
          </View>

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
  saveButtonContent: { height: 48 },
  sectionHeader: {
    padding: 16,
    backgroundColor: '#f1f3f5',
  },
  sectionTitle: {
    fontWeight: 'bold',
    color: '#333',
  },
  imageSelectionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  imageSelectionBox: {
    width: '48%',
    alignItems: 'center',
  },
  imageLabel: {
    marginBottom: 8,
    color: '#666',
  },
  imagePicker: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
  },
  previewLogo: {
    width: '100%',
    height: '100%',
  },
  previewBanner: {
    width: '100%',
    height: '100%',
  },
  placeholderBanner: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  editIconBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: '#E91E63',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: 'rgba(233, 30, 99, 0.05)',
  },
  uploadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#E91E63',
    fontWeight: '500',
  },
});
