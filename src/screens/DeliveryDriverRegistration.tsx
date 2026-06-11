import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from '../compat/expoDocumentPicker';
import { s } from '../config/firebase';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { useAuth } from '../contexts/AuthContext';
import type { DeliveryVehicleType } from '../types/DeliveryDriver';

const VEHICLE_TYPE_OPTIONS: { label: string; value: DeliveryVehicleType }[] = [
  { label: 'A Pé', value: 'walking' },
  { label: 'Bicicleta', value: 'bicycle' },
  { label: 'Bicicleta Elétrica', value: 'electric_bicycle' },
  { label: 'Moto', value: 'motorcycle' },
  { label: 'Carro', value: 'car' },
];

const VALID_VEHICLE_TYPES = VEHICLE_TYPE_OPTIONS.map(option => option.value);

export default function DeliveryDriverRegistration() {
  const { user } = useAuth();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<{
    cnhImage: DocumentPicker.DocumentPickerAsset | null;
    vehicleDocument: DocumentPicker.DocumentPickerAsset | null;
    insurance: DocumentPicker.DocumentPickerAsset | null;
  }>({
    cnhImage: null,
    vehicleDocument: null,
    insurance: null,
  });
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    email: string;
    cpf: string;
    cnh: string;
    vehicleType: DeliveryVehicleType;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: string;
    vehiclePlate: string;
    vehicleColor: string;
  }>({
    name: '',
    phone: '',
    email: '',
    cpf: '',
    cnh: '',
    vehicleType: 'motorcycle',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    vehicleColor: '',
  });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        try {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          setHasPermission(status === 'granted');
        } catch (error) {
          console.error('Erro ao solicitar permissões da câmera:', error);
          setHasPermission(false);
        }
      })();
    } else {
      setHasPermission(true);
    }
  }, []);

  useEffect(() => {
    try {
      if (user) {
        setForm(prev => ({
          ...prev,
          email: user?.email || prev.email || '',
        }));
      }
    } catch (error) {
      console.error('Erro ao atualizar formulário com dados do usuário:', error);
    }
  }, [user]);

  const takePicture = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Aviso', 'A captura de foto não está disponível na versão web.');
      return;
    }

    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Erro', 'Permissão da câmera negada.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setFaceImage(result.assets[0].uri);
        validateFace(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível capturar a foto.');
    }
  };

  const validateFace = async (imageUri: string) => {
    try {
      if (!imageUri) {
        throw new Error('Imagem inválida');
      }
      Alert.alert('Sucesso', 'Foto facial validada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível validar a foto facial.');
    }
  };

  const pickDocument = async (
    documentType: 'cnhImage' | 'vehicleDocument' | 'insurance'
  ) => {
    if (Platform.OS === 'web') {
      Alert.alert('Aviso', 'O upload de documentos está disponível apenas no aplicativo móvel.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled) {
        setDocuments(prev => ({
          ...prev,
          [documentType]: result.assets[0],
        }));
        validateDocument(documentType, result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar o documento.');
    }
  };

  const validateDocument = async (
    type: 'cnhImage' | 'vehicleDocument' | 'insurance',
    document: DocumentPicker.DocumentPickerAsset
  ) => {
    if (!document?.uri) {
      return;
    }
    Alert.alert('Sucesso', `Documento ${type.toUpperCase()} enviado para validação!`);
  };

  const uploadFile = async (uri: string, path: string) => {
    const response = await fetch(uri);
    const blob = await response.blob();
    const storageRef = s.ref(path);
    await s.uploadBytes(storageRef, blob);
    return await s.getDownloadURL(storageRef);
  };

  const handleSubmit = async () => {
    const userId = user?.uid || (user as any)?.id;
    if (!userId) {
      Alert.alert('Erro', 'Você precisa estar autenticado para enviar o cadastro.');
      return;
    }

    if (
      !form.name ||
      !form.phone ||
      !form.email ||
      !form.cpf ||
      !form.cnh ||
      !form.vehicleBrand ||
      !form.vehicleModel ||
      !form.vehicleYear ||
      !form.vehiclePlate ||
      !form.vehicleColor
    ) {
      Alert.alert('Erro', 'Preencha todos os dados pessoais e do veículo.');
      return;
    }

    if (!VALID_VEHICLE_TYPES.includes(form.vehicleType)) {
      Alert.alert('Erro', 'Selecione um tipo de veículo válido.');
      return;
    }

    if (!faceImage || !documents.cnhImage || !documents.vehicleDocument || !documents.insurance) {
      Alert.alert('Erro', 'Por favor, complete todos os documentos necessários.');
      return;
    }

    try {
      setSubmitting(true);

      const timestamp = Date.now();
      const basePath = `delivery_drivers/${userId}/${timestamp}`;

      const [faceUrl, cnhUrl, vehicleDocUrl, insuranceUrl] = await Promise.all([
        uploadFile(faceImage, `${basePath}/face.jpg`),
        uploadFile(
          documents.cnhImage.uri,
          `${basePath}/cnh.${documents.cnhImage.name?.split('.').pop() || 'jpg'}`
        ),
        uploadFile(
          documents.vehicleDocument.uri,
          `${basePath}/vehicle_document.${documents.vehicleDocument.name?.split('.').pop() || 'jpg'}`
        ),
        uploadFile(
          documents.insurance.uri,
          `${basePath}/insurance.${documents.insurance.name?.split('.').pop() || 'jpg'}`
        ),
      ]);

      const driverService = new DeliveryDriverService();
      const existing = await driverService.getDriverByUserId(userId);

      const driverPayload = {
        userId,
        name: form.name,
        phone: form.phone,
        email: form.email,
        cpf: form.cpf,
        cnh: form.cnh,
        vehicle: {
          type: form.vehicleType,
          brand: form.vehicleBrand,
          model: form.vehicleModel,
          year: Number(form.vehicleYear),
          plate: form.vehiclePlate,
          color: form.vehicleColor,
        },
        documents: {
          cnhImage: cnhUrl,
          vehicleDocument: vehicleDocUrl,
          insurance: insuranceUrl,
          faceImage: faceUrl,
        },
        status: existing?.status || 'pending',
        rating: existing?.rating || 0,
        totalDeliveries: existing?.totalDeliveries || 0,
        totalEarnings: existing?.totalEarnings || 0,
        availability: existing?.availability || {
          isAvailable: false,
          workingHours: { start: '08:00', end: '18:00' },
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        },
      };

      if (existing) {
        await driverService.updateDriver(existing.id, driverPayload);
      } else {
        await driverService.createDriver(driverPayload);
      }

      Alert.alert('Sucesso', 'Cadastro enviado para análise!');
    } catch (error) {
      console.error('Erro ao enviar cadastro de entregador:', error);
      Alert.alert('Erro', 'Não foi possível enviar o cadastro. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (hasPermission === null) {
    return <View />;
  }
  if (hasPermission === false) {
    return <Text>Sem acesso à câmera</Text>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Cadastro de Entregador</Text>

      <TextInput
        style={styles.input}
        placeholder="Nome completo"
        value={form.name}
        onChangeText={name => setForm(prev => ({ ...prev, name }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Telefone"
        value={form.phone}
        onChangeText={phone => setForm(prev => ({ ...prev, phone }))}
        keyboardType="phone-pad"
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={form.email}
        onChangeText={email => setForm(prev => ({ ...prev, email }))}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="CPF"
        value={form.cpf}
        onChangeText={cpf => setForm(prev => ({ ...prev, cpf }))}
      />
      <TextInput
        style={styles.input}
        placeholder="CNH"
        value={form.cnh}
        onChangeText={cnh => setForm(prev => ({ ...prev, cnh }))}
      />
      <Text style={styles.sectionTitle}>Tipo de veículo</Text>
      <View style={styles.vehicleTypeSection}>
        {VEHICLE_TYPE_OPTIONS.map(option => {
          const selected = form.vehicleType === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.vehicleTypeOption, selected && styles.vehicleTypeOptionSelected]}
              onPress={() => setForm(prev => ({ ...prev, vehicleType: option.value }))}
            >
              <Text style={[styles.vehicleTypeOptionText, selected && styles.vehicleTypeOptionTextSelected]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Marca do veículo"
        value={form.vehicleBrand}
        onChangeText={vehicleBrand => setForm(prev => ({ ...prev, vehicleBrand }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Modelo do veículo"
        value={form.vehicleModel}
        onChangeText={vehicleModel => setForm(prev => ({ ...prev, vehicleModel }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Ano do veículo"
        value={form.vehicleYear}
        onChangeText={vehicleYear => setForm(prev => ({ ...prev, vehicleYear }))}
        keyboardType="numeric"
      />
      <TextInput
        style={styles.input}
        placeholder="Placa do veículo"
        value={form.vehiclePlate}
        onChangeText={vehiclePlate => setForm(prev => ({ ...prev, vehiclePlate }))}
      />
      <TextInput
        style={styles.input}
        placeholder="Cor do veículo"
        value={form.vehicleColor}
        onChangeText={vehicleColor => setForm(prev => ({ ...prev, vehicleColor }))}
      />

      <TouchableOpacity
        style={styles.photoButton}
        onPress={takePicture}
      >
        {faceImage ? (
          <Image source={{ uri: faceImage }} style={styles.preview} />
        ) : (
          <Text style={styles.buttonText}>
            {Platform.OS === 'web' ? 'Captura de foto disponível apenas no app' : 'Tirar Foto'}
          </Text>
        )}
      </TouchableOpacity>

      <View style={styles.documentSection}>
        <Text style={styles.sectionTitle}>Documentos Necessários:</Text>

        <TouchableOpacity style={styles.documentButton} onPress={() => pickDocument('cnhImage')}>
          <Text style={styles.buttonText}>
            {documents.cnhImage ? '✓ CNH Enviada' : 'Enviar CNH'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.documentButton} onPress={() => pickDocument('vehicleDocument')}>
          <Text style={styles.buttonText}>
            {documents.vehicleDocument ? '✓ Documento do Veículo Enviado' : 'Enviar Documento do Veículo'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.documentButton}
          onPress={() => pickDocument('insurance')}
        >
          <Text style={styles.buttonText}>
            {documents.insurance ? '✓ Seguro Enviado' : 'Enviar Seguro'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>
          {submitting ? 'Enviando...' : 'Enviar Cadastro'}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    height: 44,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  vehicleTypeSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  vehicleTypeOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
    backgroundColor: '#fff',
  },
  vehicleTypeOptionSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  vehicleTypeOptionText: {
    color: '#555',
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleTypeOptionTextSelected: {
    color: '#2E7D32',
  },
  photoButton: {
    height: 200,
    backgroundColor: '#ddd',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 20,
  },
  preview: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  documentSection: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  documentButton: {
    backgroundColor: '#ff69b4',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
