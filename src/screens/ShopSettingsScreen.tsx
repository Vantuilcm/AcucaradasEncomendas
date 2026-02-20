import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity, Linking } from 'react-native';
import {
  Text,
  TextInput,
  Button,
  Card,
  Switch,
  Checkbox,
  useTheme,
  Divider,
  HelperText,
  Avatar,
  IconButton,
  List,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { ref, uploadBytes, uploadString, getDownloadURL } from 'firebase/storage';
import { doc, setDoc } from 'firebase/firestore';
import { firebaseAvailable, storage, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';
import { ProducerService } from '../services/ProducerService';
import { Producer } from '../types/Producer';
import { loggingService } from '../services/LoggingService';
import { StripeService } from '../services/StripeService';
import { LocationService } from '../services/LocationService';

export function ShopSettingsScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [producer, setProducer] = useState<Producer | null>(null);

  // Estados locais para edição
  const [workingDays, setWorkingDays] = useState<number[]>([]);
  const [startHour, setStartHour] = useState('08:00');
  const [endHour, setEndHour] = useState('18:00');
  const [maxDaysInAdvance, setMaxDaysInAdvance] = useState('30');
  const [minLeadTimeHours, setMinLeadTimeHours] = useState('2');
  const [slotInterval, setSlotInterval] = useState('60');
  const [allowSpecificTime, setAllowSpecificTime] = useState(true);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [brandImageUrl, setBrandImageUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [stripeAccountStatus, setStripeAccountStatus] = useState<'not_started' | 'pending' | 'active'>('not_started');
  const locationService = new LocationService();

  const daysOfWeek = [
    { label: 'Dom', value: 0 },
    { label: 'Seg', value: 1 },
    { label: 'Ter', value: 2 },
    { label: 'Qua', value: 3 },
    { label: 'Qui', value: 4 },
    { label: 'Sex', value: 5 },
    { label: 'Sáb', value: 6 },
  ];

  useEffect(() => {
    loadProducerData();
  }, []);

  const syncPublicStore = async (
    baseProducer?: Producer | null,
    openHour?: string,
    closeHour?: string
  ) => {
    try {
      if (!firebaseAvailable) return;
      const currentProducer = baseProducer ?? producer;
      if (!currentProducer || !currentProducer.address) return;

      const parts = [
        currentProducer.address.street,
        currentProducer.address.number,
        currentProducer.address.neighborhood,
        currentProducer.address.city,
        currentProducer.address.state,
      ].filter(Boolean);
      const addressText = parts.join(', ');
      if (!addressText) return;

      let coordinates: any = (currentProducer as any).coordinates;
      if (!coordinates) {
        const coords = await locationService.getCoordinatesFromAddress(addressText);
        if (coords) {
          coordinates = coords;
        }
      }

      if (!coordinates) {
        const currentLocation = await locationService.getCurrentLocation();
        if (currentLocation) {
          coordinates = currentLocation;
        }
      }

      if (!coordinates) return;

      const storeRef = doc(db, 'stores', currentProducer.id);
      await setDoc(
        storeRef,
        {
          name: currentProducer.name,
          address: addressText,
          coordinates,
          userId: currentProducer.userId,
          logoUrl: currentProducer.logoUrl || null,
          bannerUrl: currentProducer.bannerUrl || null,
          isOpen:
            currentProducer.isActive !== false && currentProducer.status !== 'blocked',
          openingHours: {
            default: {
              open: openHour || startHour,
              close: closeHour || endHour,
            },
          },
        },
        { merge: true } as any
      );
    } catch (error) {
      loggingService.error(
        'Erro ao sincronizar loja pública',
        error instanceof Error ? error : undefined
      );
    }
  };

  const loadProducerData = async () => {
    try {
      if (!user) return;
      const data = await ProducerService.getInstance().getProducerByUserId(user.id);
      if (data) {
        let normalizedProducer = data;
        if (
          (!data.address || !data.address.street || !data.address.city || !data.address.state) &&
          user
        ) {
          const rawAddress = Array.isArray(user.endereco)
            ? user.endereco[0]
            : (user.address as any);
          if (rawAddress) {
            const fixedAddress = {
              street: rawAddress.rua || rawAddress.street || '',
              number: rawAddress.numero || rawAddress.number || '',
              complement: rawAddress.complemento || rawAddress.complement || '',
              neighborhood: rawAddress.bairro || rawAddress.neighborhood || '',
              city: rawAddress.cidade || rawAddress.city || '',
              state: rawAddress.estado || rawAddress.state || '',
              zipCode: rawAddress.cep || rawAddress.zipCode || '',
            };
            normalizedProducer = { ...data, address: fixedAddress };
            try {
              await ProducerService.getInstance().updateProducer(data.id, {
                address: fixedAddress,
              });
            } catch {}
          }
        }

        setProducer(normalizedProducer);
        setWorkingDays(normalizedProducer.availability?.workingDays || [1, 2, 3, 4, 5]);
        const open = normalizedProducer.availability?.workingHours?.start || '08:00';
        const close = normalizedProducer.availability?.workingHours?.end || '18:00';
        setStartHour(open);
        setEndHour(close);
        setMaxDaysInAdvance(
          normalizedProducer.schedulingConfig?.maxDaysInAdvance?.toString() || '30'
        );
        setMinLeadTimeHours(
          normalizedProducer.schedulingConfig?.minLeadTimeHours?.toString() || '2'
        );
        setSlotInterval(
          normalizedProducer.schedulingConfig?.slotIntervalMinutes?.toString() || '60'
        );
        setAllowSpecificTime(normalizedProducer.schedulingConfig?.allowSpecificTime ?? true);
        setLogoUrl(normalizedProducer.logoUrl || null);
        setBannerUrl(normalizedProducer.bannerUrl || null);
        setBrandImageUrl(normalizedProducer.brandImageUrl || null);
        
        // Verificar status do Stripe
        if (data.stripeAccountId) {
          const status = await StripeService.getInstance().getAccountStatus(
            data.stripeAccountId
          );
          setStripeAccountStatus(status);
        } else {
          setStripeAccountStatus('not_started');
        }

        await syncPublicStore(normalizedProducer, open, close);
      } else if (user.producerProfile?.storeName) {
        const rawAddress = Array.isArray(user.endereco) ? user.endereco[0] : (user.address as any);
        const address = {
          street: rawAddress?.rua || rawAddress?.street || '',
          number: rawAddress?.numero || rawAddress?.number || '',
          complement: rawAddress?.complemento || rawAddress?.complement || '',
          neighborhood: rawAddress?.bairro || rawAddress?.neighborhood || '',
          city: rawAddress?.cidade || rawAddress?.city || '',
          state: rawAddress?.estado || rawAddress?.state || '',
          zipCode: rawAddress?.cep || rawAddress?.zipCode || '',
        };
        const created = await ProducerService.getInstance().createProducer({
          userId: user.id,
          name: user.producerProfile?.storeName || user.displayName || user.name || user.nome || 'Loja do Produtor',
          email: user.email || '',
          phone: user.telefone || user.phone || '',
          cnpj: user.producerProfile?.cnpj || undefined,
          cpf: user.producerProfile?.cpf || user.cpf || undefined,
          address,
          isActive: false,
          status: 'pending',
        });
        setProducer(created);
        Alert.alert('Perfil de produtor criado', 'Seu cadastro de produtor foi criado automaticamente. Agora você pode enviar imagens da loja.');
      }
    } catch (error) {
      loggingService.error('Erro ao carregar dados do produtor', error instanceof Error ? error : undefined);
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setWorkingDays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
    );
  };

  const pickImage = async (type: 'logo' | 'banner' | 'brand') => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permissão necessária', 'Permita o acesso à galeria para selecionar imagens.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'logo' ? [1, 1] : [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        await uploadStoreImage(uri, type);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const uploadStoreImage = async (uri: string, type: 'logo' | 'banner' | 'brand') => {
    if (!user) {
      Alert.alert('Erro', 'Usuário não identificado. Faça login novamente e tente de novo.');
      return;
    }
    if (!firebaseAvailable || !storage) {
      Alert.alert('Erro', 'Firebase Storage não está configurado neste build.');
      return;
    }
    setUploadingImage(true);
    try {
      let activeProducer = producer;
      if (!activeProducer) {
        const existing = await ProducerService.getInstance().getProducerByUserId(user.id);
        if (existing) {
          activeProducer = existing;
          setProducer(existing);
        } else {
          const rawAddress = Array.isArray(user.endereco) ? user.endereco[0] : (user.address as any);
          const address = {
            street: rawAddress?.rua || rawAddress?.street || '',
            number: rawAddress?.numero || rawAddress?.number || '',
            complement: rawAddress?.complemento || rawAddress?.complement || '',
            neighborhood: rawAddress?.bairro || rawAddress?.neighborhood || '',
            city: rawAddress?.cidade || rawAddress?.city || '',
            state: rawAddress?.estado || rawAddress?.state || '',
            zipCode: rawAddress?.cep || rawAddress?.zipCode || '',
          };
          const created = await ProducerService.getInstance().createProducer({
            userId: user.id,
            name: user.producerProfile?.storeName || user.displayName || user.name || user.nome || 'Loja do Produtor',
            email: user.email || '',
            phone: user.telefone || user.phone || '',
            cnpj: user.producerProfile?.cnpj || undefined,
            cpf: user.producerProfile?.cpf || user.cpf || undefined,
            address,
            isActive: false,
            status: 'pending',
          });
          activeProducer = created;
          setProducer(created);
        }
      }

      if (!activeProducer) {
        Alert.alert('Erro', 'Perfil de produtor não encontrado. Atualize a página e tente novamente.');
        return;
      }

      // Otimizar imagem
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: type === 'logo' ? 400 : 1200 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      const fileName = `store_${type}_${activeProducer.id}_${Date.now()}.jpg`;
      const storagePath = `store_assets/${activeProducer.id}/${fileName}`;
      const storageRef = ref(storage, storagePath);

      let uploadCompleted = false;
      try {
        const res = await fetch(manipulated.uri);
        if (!res.ok) {
          throw new Error('Falha ao ler a imagem selecionada');
        }
        const blob = await res.blob();
        await uploadBytes(storageRef, blob);
        uploadCompleted = true;
      } catch {
        const base64 = await FileSystem.readAsStringAsync(manipulated.uri, { encoding: 'base64' });
        await uploadString(storageRef, base64, 'base64', { contentType: 'image/jpeg' });
        uploadCompleted = true;
      }
      if (!uploadCompleted) {
        throw new Error('Falha ao enviar a imagem');
      }
      const url = await getDownloadURL(storageRef);

      if (type === 'logo') {
        setLogoUrl(url);
      } else if (type === 'banner') {
        setBannerUrl(url);
      } else {
        setBrandImageUrl(url);
      }

      // Atualizar imediatamente no banco para garantir consistência
      await ProducerService.getInstance().updateProducer(activeProducer.id, {
        [type === 'logo' ? 'logoUrl' : type === 'banner' ? 'bannerUrl' : 'brandImageUrl']: url
      });

      const updatedProducer = {
        ...activeProducer,
        logoUrl: type === 'logo' ? url : activeProducer.logoUrl,
        bannerUrl: type === 'banner' ? url : activeProducer.bannerUrl,
        brandImageUrl: type === 'brand' ? url : activeProducer.brandImageUrl,
      };

      setProducer(updatedProducer);

      await syncPublicStore(updatedProducer);

      Alert.alert('Sucesso', `${type === 'logo' ? 'Logo' : type === 'banner' ? 'Banner' : 'Imagem da Marca'} atualizada com sucesso!`);
    } catch (error) {
      loggingService.error(`Erro ao subir ${type}`, error instanceof Error ? error : undefined);
      Alert.alert('Erro', 'Não foi possível enviar a imagem.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!producer) return;
    setSaving(true);
    try {
      await ProducerService.getInstance().updateProducer(producer.id, {
        availability: {
          workingDays,
          workingHours: {
            start: startHour,
            end: endHour,
          },
        },
        schedulingConfig: {
          maxDaysInAdvance: parseInt(maxDaysInAdvance) || 30,
          minLeadTimeHours: parseInt(minLeadTimeHours) || 2,
          slotIntervalMinutes: parseInt(slotInterval) || 60,
          allowSpecificTime,
        },
        logoUrl: logoUrl || undefined,
        bannerUrl: bannerUrl || undefined,
        brandImageUrl: brandImageUrl || undefined,
      });
      await syncPublicStore(producer, startHour, endHour);
      Alert.alert('Sucesso', 'Configurações da loja atualizadas!');
    } catch (error) {
      loggingService.error('Erro ao salvar configurações', error instanceof Error ? error : undefined);
      Alert.alert('Erro', 'Não foi possível salvar as configurações.');
    } finally {
      setSaving(false);
    }
  };

  const handleStripeOnboarding = async () => {
    if (!producer || !user) return;
    
    setStripeLoading(true);
    try {
      const url = await StripeService.getInstance().getOnboardingLink(producer.id, user.email || '', 'producer');
      await Linking.openURL(url);
      setStripeAccountStatus('pending');

      Alert.alert(
        'Configuração iniciada',
        'Abrimos a página de cadastro de recebimentos. Após concluir, retorne ao app.'
      );
    } catch (error) {
      loggingService.error('Erro ao iniciar configuração de recebimentos', error instanceof Error ? error : undefined);
      Alert.alert('Erro', 'Não foi possível iniciar a configuração dos seus recebimentos. Verifique sua conexão ou tente novamente mais tarde.');
    } finally {
      setStripeLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text>Carregando...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Configurações da Loja</Text>
      <Text variant="bodyMedium" style={styles.subtitle}>
        Defina sua disponibilidade e regras para encomendas agendadas.
      </Text>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Pagamentos e Recebimentos</Text>
          <Text variant="bodySmall" style={{ marginBottom: 16 }}>
            Configure como você receberá pelas suas vendas aqui no app.
          </Text>

          <View style={styles.stripeStatusContainer}>
            <View style={styles.stripeStatusInfo}>
              <MaterialCommunityIcons 
                name={stripeAccountStatus === 'active' ? "check-circle" : "alert-circle"} 
                size={24} 
                color={stripeAccountStatus === 'active' ? "#4CAF50" : "#FF9800"} 
              />
              <View style={{ marginLeft: 12 }}>
                <Text variant="titleSmall">
                  {stripeAccountStatus === 'active' ? "Conta de recebimentos ativa" : "Configuração pendente"}
                </Text>
                <Text variant="bodySmall">
                  {stripeAccountStatus === 'active' 
                    ? "Sua conta está pronta para receber pagamentos." 
                    : "Você precisa concluir o cadastro para receber pelas vendas."}
                </Text>
              </View>
            </View>

            <Button
              mode={stripeAccountStatus === 'active' ? "outlined" : "contained"}
              onPress={handleStripeOnboarding}
              loading={stripeLoading}
              disabled={stripeLoading}
              style={styles.stripeButton}
            >
              {stripeAccountStatus === 'active' ? "Ver configurações de recebimento" : "Configurar recebimentos"}
            </Button>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Identidade Visual da Loja</Text>
          <Text variant="bodySmall" style={{ marginBottom: 4 }}>
            Sua logo e banner ajudam a construir a autoridade da sua marca.
          </Text>
          <Text variant="bodySmall" style={{ marginBottom: 12, color: '#757575' }}>
            Logo (recomendado: 400x400px, imagem quadrada). Banner (recomendado: 1200x675px, proporção 16:9).
          </Text>

          <View style={styles.bannerContainer}>
            <View style={{ flex: 1 }}>
              <TouchableOpacity onPress={() => pickImage('banner')} style={styles.bannerPicker}>
                {bannerUrl ? (
                  <Image source={{ uri: bannerUrl as string }} style={styles.bannerImage} />
                ) : (
                  <View style={styles.bannerPlaceholder}>
                    <IconButton icon="image-plus" size={40} />
                    <Text>Adicionar Banner (16:9)</Text>
                  </View>
                )}
              </TouchableOpacity>
              {bannerUrl && (
                <Button
                  mode="text"
                  onPress={() => setBannerUrl('')}
                  compact
                  style={{ alignSelf: 'flex-start', marginTop: 4 }}
                >
                  Remover banner
                </Button>
              )}
            </View>

            <View style={styles.logoWrapper}>
              <TouchableOpacity onPress={() => pickImage('logo')} style={styles.logoPicker}>
                {logoUrl ? (
                  <Avatar.Image size={80} source={{ uri: logoUrl as string }} />
                ) : (
                  <Avatar.Icon size={80} icon="store" />
                )}
                <View style={styles.logoEditBadge}>
                  <IconButton icon="camera" size={16} iconColor="white" />
                </View>
              </TouchableOpacity>
              {logoUrl && (
                <Button
                  mode="text"
                  onPress={() => setLogoUrl('')}
                  compact
                  style={{ marginTop: 4 }}
                >
                  Remover logo
                </Button>
              )}
            </View>
          </View>
          
          {uploadingImage && <HelperText type="info">Enviando imagem...</HelperText>}

          <Divider style={styles.divider} />

          <Text variant="titleSmall" style={{ marginBottom: 8 }}>Imagem de Autoridade da Marca</Text>
          <TouchableOpacity onPress={() => pickImage('brand')} style={styles.brandPicker}>
            {brandImageUrl ? (
              <Image source={{ uri: brandImageUrl as string }} style={styles.brandImage} />
            ) : (
              <View style={styles.brandPlaceholder}>
                <IconButton icon="certificate-outline" size={32} />
                <Text variant="bodySmall">Adicionar imagem de autoridade</Text>
              </View>
            )}
          </TouchableOpacity>
          {brandImageUrl && (
            <Button
              mode="text"
              onPress={() => setBrandImageUrl('')}
              compact
              style={{ alignSelf: 'flex-start', marginTop: 4 }}
            >
              Remover imagem
            </Button>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Dias de Funcionamento</Text>
          <View style={styles.daysContainer}>
            {daysOfWeek.map(day => (
              <TouchableOpacity
                key={day.value}
                onPress={() => toggleDay(day.value)}
                activeOpacity={0.7}
                style={styles.dayItem}
              >
                <Checkbox
                  status={workingDays.includes(day.value) ? 'checked' : 'unchecked'}
                  onPress={() => toggleDay(day.value)}
                  color={theme.colors.primary}
                />
                <Text>{day.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Divider style={styles.divider} />

          <Text variant="titleMedium" style={styles.sectionTitle}>Horário de Funcionamento</Text>
          <View style={styles.row}>
            <TextInput
              label="Abertura"
              value={startHour}
              onChangeText={setStartHour}
              style={[styles.input, { flex: 1, marginRight: 8 }]}
              mode="outlined"
              placeholder="08:00"
            />
            <TextInput
              label="Fechamento"
              value={endHour}
              onChangeText={setEndHour}
              style={[styles.input, { flex: 1 }]}
              mode="outlined"
              placeholder="18:00"
            />
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Regras de Agendamento</Text>
          
          <TextInput
            label="Encomendas com antecedência máxima (dias)"
            value={maxDaysInAdvance}
            onChangeText={setMaxDaysInAdvance}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />

          <TextInput
            label="Tempo de antecedência mínima (horas)"
            value={minLeadTimeHours}
            onChangeText={setMinLeadTimeHours}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />
          <HelperText type="info" style={{ marginBottom: 12 }}>
            Ex: 24 horas para que o cliente possa agendar
          </HelperText>

          <TextInput
            label="Intervalo das Janelas (minutos)"
            value={slotInterval}
            onChangeText={setSlotInterval}
            style={styles.input}
            mode="outlined"
            keyboardType="numeric"
          />

          <View style={styles.switchRow}>
            <Text>Permitir horário específico</Text>
            <Switch
              value={allowSpecificTime}
              onValueChange={setAllowSpecificTime}
              color={theme.colors.primary}
            />
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={handleSave}
        loading={saving}
        disabled={saving}
        style={styles.saveButton}
      >
        Salvar Configurações
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    color: '#666',
    marginBottom: 24,
  },
  bannerContainer: {
    height: 210,
    marginBottom: 20,
    position: 'relative',
  },
  bannerPicker: {
    width: '100%',
    height: 150,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e1e1e1',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPicker: {
    position: 'absolute',
    bottom: 0,
    left: 20,
    borderWidth: 4,
    borderColor: 'white',
    borderRadius: 44,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  logoWrapper: {
    justifyContent: 'flex-start',
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FF69B4',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandPicker: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ccc',
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
  },
  brandImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  brandPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  dayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '30%',
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  input: {
    marginBottom: 12,
  },
  divider: {
    marginVertical: 16,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  saveButton: {
    marginTop: 16,
    paddingVertical: 8,
  },
  stripeStatusContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    padding: 16,
  },
  stripeStatusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  stripeButton: {
    marginTop: 8,
  },
});
