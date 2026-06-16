import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  TextInput,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as DocumentPicker from '../compat/expoDocumentPicker';
import { f, s } from '../config/firebase';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { useAuth } from '../contexts/AuthContext';
import {
  useDriverOnboardingPersonalData,
  getDriverOnboardingPersonalData,
  mergeDriverOnboardingPersonalDataFromFirestore,
} from '../hooks/driverOnboardingPersonalStore';
import type { DeliveryVehicleType } from '../types/DeliveryDriver';
import { AppVersion } from '../utils/AppVersion';
import * as FileSystem from 'expo-file-system';
import Constants from 'expo-constants';

const isDriverSubmitDiagnosticEnv =
  __DEV__ ||
  process.env.EXPO_PUBLIC_APP_ENV === 'preview' ||
  process.env.APP_ENV === 'preview' ||
  Constants.expoConfig?.extra?.env === 'preview';

const VEHICLE_TYPE_OPTIONS: { label: string; value: DeliveryVehicleType }[] = [
  { label: 'A Pé', value: 'walking' },
  { label: 'Bicicleta', value: 'bicycle' },
  { label: 'Bicicleta Elétrica', value: 'electric_bicycle' },
  { label: 'Moto', value: 'motorcycle' },
  { label: 'Carro', value: 'car' },
];

const VALID_VEHICLE_TYPES = VEHICLE_TYPE_OPTIONS.map(option => option.value);

type RegistrationFieldRequirements = {
  vehicleBrand: boolean;
  vehicleModel: boolean;
  vehicleYear: boolean;
  vehiclePlate: boolean;
  vehicleColor: boolean;
  cnh: boolean;
  cnhImage: boolean;
  vehicleDocument: boolean;
  insurance: boolean;
};

function getRegistrationFieldRequirements(vehicleType: DeliveryVehicleType): RegistrationFieldRequirements {
  const showVehicleFields = vehicleType !== 'walking';
  const showPlate = vehicleType === 'motorcycle' || vehicleType === 'car';
  const showVehicleDocuments = vehicleType === 'motorcycle' || vehicleType === 'car';

  return {
    vehicleBrand: showVehicleFields,
    vehicleModel: showVehicleFields,
    vehicleYear: showVehicleFields,
    vehiclePlate: showPlate,
    vehicleColor: showVehicleFields,
    cnh: showVehicleDocuments,
    cnhImage: showVehicleDocuments,
    vehicleDocument: showVehicleDocuments,
    insurance: showVehicleDocuments,
  };
}

type RegistrationScrollTarget = 'vehicle' | 'documents';

type DeliveryDriverRegistrationParams = {
  scrollTo?: RegistrationScrollTarget;
};

type UserPersonalFirestoreData = {
  nome?: string;
  name?: string;
  cpf?: string;
  telefone?: string;
  phone?: string;
  email?: string;
  driverOnboarding?: {
    faceImage?: string;
  };
};

function inferUploadContentType(path: string, contentTypeHint?: string): string {
  if (contentTypeHint?.trim()) {
    return contentTypeHint;
  }

  const extension = path.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'heic':
      return 'image/heic';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    default:
      return 'application/octet-stream';
  }
}

function base64ToBlob(base64: string, contentType: string): Blob {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: contentType });
}

async function loadUploadBlob(uri: string, contentType: string): Promise<Blob> {
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Falha ao ler arquivo remoto (${response.status})`);
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Arquivo remoto vazio');
    }
    if (blob.type) {
      return blob;
    }
    return new Blob([await blob.arrayBuffer()], { type: contentType });
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    if (!base64) {
      throw new Error('Arquivo local vazio');
    }
    const blob = base64ToBlob(base64, contentType);
    if (blob.size === 0) {
      throw new Error('Arquivo local ilegível');
    }
    return blob;
  } catch (localReadError) {
    const response = await fetch(uri);
    if (!response.ok) {
      const localMessage =
        localReadError instanceof Error ? localReadError.message : String(localReadError);
      throw new Error(
        `Falha ao ler arquivo local (${response.status}). ${localMessage}`
      );
    }
    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error('Arquivo local vazio após fallback');
    }
    if (blob.type) {
      return blob;
    }
    return new Blob([await blob.arrayBuffer()], { type: contentType });
  }
}

async function uploadFile(uri: string, path: string, contentTypeHint?: string): Promise<string> {
  const contentType = inferUploadContentType(path, contentTypeHint);

  try {
    const blob = await loadUploadBlob(uri, contentType);
    const storageRef = s.ref(path);
    const { uploadBytes } = require('firebase/storage');
    await uploadBytes(storageRef, blob, { contentType });
    return await s.getDownloadURL(storageRef);
  } catch (error) {
    const uploadError = error as Error & { code?: string };
    console.error('[DriverRegistration] uploadFile failed', {
      path,
      contentType,
      message: uploadError?.message,
      code: uploadError?.code,
      stack: uploadError?.stack,
    });
    throw error;
  }
}

export default function DeliveryDriverRegistration() {
  const { user } = useAuth();
  const [personalData] = useDriverOnboardingPersonalData();
  const route = useRoute<RouteProp<{ DeliveryDriverRegistration: DeliveryDriverRegistrationParams }, 'DeliveryDriverRegistration'>>();
  const scrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Partial<Record<RegistrationScrollTarget, number>>>({});

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
    cnh: string;
    vehicleType: DeliveryVehicleType;
    vehicleBrand: string;
    vehicleModel: string;
    vehicleYear: string;
    vehiclePlate: string;
    vehicleColor: string;
  }>({
    cnh: '',
    vehicleType: 'motorcycle',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    vehicleColor: '',
  });

  const vehicleType = form.vehicleType;
  const fieldRequirements = getRegistrationFieldRequirements(vehicleType);
  const showVehicleFields = fieldRequirements.vehicleBrand;
  const showPlate = fieldRequirements.vehiclePlate;
  const showVehicleDocuments = fieldRequirements.cnhImage;

  const registerSectionOffset = useCallback((key: RegistrationScrollTarget, y: number) => {
    sectionOffsets.current[key] = y;
  }, []);

  useEffect(() => {
    const userId = user?.uid || (user as { id?: string })?.id;
    if (!userId) return;

    let cancelled = false;

    (async () => {
      try {
        const userRef = f.doc('users', userId);
        const userSnap = await f.getDoc(userRef);
        if (cancelled) return;

        const data = (userSnap.exists() ? userSnap.data() : {}) as UserPersonalFirestoreData;
        mergeDriverOnboardingPersonalDataFromFirestore({
          name: data.nome || data.name || '',
          cpf: data.cpf || '',
          phone: data.telefone || data.phone || '',
          email: data.email || user?.email || '',
          faceImage: data.driverOnboarding?.faceImage || null,
        });

        const hydrated = getDriverOnboardingPersonalData();
        console.log('[DriverRegistration] personal data hydrated', {
          name: hydrated.name,
          cpf: hydrated.cpf,
          phone: hydrated.phone,
          email: hydrated.email,
          faceImage: hydrated.faceImage,
        });
      } catch (error) {
        console.error('[DriverRegistration] failed to hydrate personal data from Firestore', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const scrollTo = route.params?.scrollTo;
    if (!scrollTo) return;

    const timer = setTimeout(() => {
      const offset = sectionOffsets.current[scrollTo];
      if (offset != null) {
        scrollRef.current?.scrollTo({ y: Math.max(0, offset - 12), animated: true });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [route.params?.scrollTo]);

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

  const validateRegistrationForm = (requirements: RegistrationFieldRequirements): string | null => {
    if (!personalData.name || !personalData.phone || !personalData.email || !personalData.cpf) {
      return 'Preencha todos os dados pessoais em Meus Documentos.';
    }

    if (!personalData.faceImage) {
      return 'Envie sua selfie em Meus Documentos.';
    }

    if (!VALID_VEHICLE_TYPES.includes(form.vehicleType)) {
      return 'Selecione um tipo de veículo válido.';
    }

    if (requirements.vehicleBrand && !form.vehicleBrand) {
      return 'Informe a marca do veículo.';
    }
    if (requirements.vehicleModel && !form.vehicleModel) {
      return 'Informe o modelo do veículo.';
    }
    if (requirements.vehicleYear && !form.vehicleYear) {
      return 'Informe o ano do veículo.';
    }
    if (requirements.vehiclePlate && !form.vehiclePlate) {
      return 'Informe a placa do veículo.';
    }
    if (requirements.vehicleColor && !form.vehicleColor) {
      return 'Informe a cor do veículo.';
    }
    if (requirements.cnh && !form.cnh) {
      return 'Informe o número da CNH.';
    }
    if (requirements.cnhImage && !documents.cnhImage) {
      return 'Envie a CNH.';
    }
    if (requirements.vehicleDocument && !documents.vehicleDocument) {
      return 'Envie o documento do veículo.';
    }
    if (requirements.insurance && !documents.insurance) {
      return 'Envie o seguro do veículo.';
    }

    return null;
  };

  const handleSubmit = async () => {
    const userId = user?.uid || (user as any)?.id;
    if (!userId) {
      Alert.alert('Erro', 'Você precisa estar autenticado para enviar o cadastro.');
      return;
    }

    const requirements = getRegistrationFieldRequirements(form.vehicleType);
    const validationError = validateRegistrationForm(requirements);
    if (validationError) {
      console.error('[DRIVER-VALIDATION-RUNTIME]', {
        validationError,
        vehicleType: form.vehicleType,
        userId,
        personalData: {
          name: !!personalData.name,
          phone: !!personalData.phone,
          email: !!personalData.email,
          cpf: !!personalData.cpf,
          faceImage: !!personalData.faceImage,
        },
        vehicleData: {
          vehicleBrand: !!form.vehicleBrand,
          vehicleModel: !!form.vehicleModel,
          vehicleYear: !!form.vehicleYear,
          vehiclePlate: !!form.vehiclePlate,
          vehicleColor: !!form.vehicleColor,
          cnh: !!form.cnh,
        },
        documents: {
          cnhImage: !!documents.cnhImage,
          vehicleDocument: !!documents.vehicleDocument,
          insurance: !!documents.insurance,
        },
      });
      Alert.alert('Erro', validationError);
      return;
    }

    let submitPhase = 'init';

    try {
      setSubmitting(true);

      submitPhase = 'getDriverByUserId';
      const driverService = new DeliveryDriverService();
      const existing = await driverService.getDriverByUserId(userId);

      const timestamp = Date.now();
      const basePath = `delivery_drivers/${userId}/${timestamp}`;

      submitPhase = 'upload_face';
      const faceUrl = personalData.faceImage!.startsWith('http')
        ? personalData.faceImage!
        : await uploadFile(personalData.faceImage!, `${basePath}/face.jpg`, 'image/jpeg');

      submitPhase = 'upload_cnh';
      const cnhUrl =
        requirements.cnhImage && documents.cnhImage
          ? await uploadFile(
              documents.cnhImage.uri,
              `${basePath}/cnh.${documents.cnhImage.name?.split('.').pop() || 'jpg'}`,
              documents.cnhImage.mimeType
            )
          : existing?.documents?.cnhImage || '';

      submitPhase = 'upload_vehicle_document';
      const vehicleDocUrl =
        requirements.vehicleDocument && documents.vehicleDocument
          ? await uploadFile(
              documents.vehicleDocument.uri,
              `${basePath}/vehicle_document.${documents.vehicleDocument.name?.split('.').pop() || 'jpg'}`,
              documents.vehicleDocument.mimeType
            )
          : existing?.documents?.vehicleDocument || '';

      submitPhase = 'upload_insurance';
      const insuranceUrl =
        requirements.insurance && documents.insurance
          ? await uploadFile(
              documents.insurance.uri,
              `${basePath}/insurance.${documents.insurance.name?.split('.').pop() || 'jpg'}`,
              documents.insurance.mimeType
            )
          : existing?.documents?.insurance || '';

      submitPhase = 'build_payload';
      const driverPayload = {
        userId,
        name: personalData.name,
        phone: personalData.phone,
        email: personalData.email,
        cpf: personalData.cpf,
        cnh: requirements.cnh ? form.cnh : existing?.cnh || '',
        vehicle: {
          type: form.vehicleType,
          brand: requirements.vehicleBrand ? form.vehicleBrand : existing?.vehicle?.brand || '',
          model: requirements.vehicleModel ? form.vehicleModel : existing?.vehicle?.model || '',
          year: requirements.vehicleYear
            ? Number(form.vehicleYear)
            : existing?.vehicle?.year || 0,
          plate: requirements.vehiclePlate ? form.vehiclePlate : existing?.vehicle?.plate || '',
          color: requirements.vehicleColor ? form.vehicleColor : existing?.vehicle?.color || '',
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
        submitPhase = 'updateDriver';
        await driverService.updateDriver(existing.id, driverPayload);
      } else {
        submitPhase = 'createDriver';
        await driverService.createDriver(driverPayload);
      }

      Alert.alert('Sucesso', 'Cadastro enviado para análise!');
    } catch (error) {
      const submitError = error as Error & { code?: string };
      console.error('Erro ao enviar cadastro de entregador:', {
        phase: submitPhase,
        message: submitError?.message,
        code: submitError?.code,
        stack: submitError?.stack,
        error,
      });
      if (isDriverSubmitDiagnosticEnv) {
        Alert.alert(
          'Erro técnico',
          `Fase: ${submitPhase}\nCódigo: ${submitError?.code ?? '-'}\nMensagem: ${submitError?.message ?? '-'}`
        );
      } else {
        Alert.alert('Erro', 'Não foi possível enviar o cadastro. Tente novamente.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView ref={scrollRef} style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Meu Veículo</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoCardText}>
          Os dados pessoais e documentos do parceiro são gerenciados em Meus Documentos.
        </Text>
      </View>

      <View
        onLayout={event => registerSectionOffset('vehicle', event.nativeEvent.layout.y)}
        style={styles.sectionCard}
      >
        <Text style={styles.sectionHeader}>🚗 Dados do Veículo</Text>

        <Text style={styles.fieldLabel}>Tipo de veículo</Text>
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

        {showVehicleFields && (
          <>
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
            {showPlate && (
              <TextInput
                style={styles.input}
                placeholder="Placa do veículo"
                value={form.vehiclePlate}
                onChangeText={vehiclePlate => setForm(prev => ({ ...prev, vehiclePlate }))}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Cor do veículo"
              value={form.vehicleColor}
              onChangeText={vehicleColor => setForm(prev => ({ ...prev, vehicleColor }))}
            />
          </>
        )}
      </View>

      {showVehicleDocuments && (
        <View
          onLayout={event => registerSectionOffset('documents', event.nativeEvent.layout.y)}
          style={styles.sectionCard}
        >
          <Text style={styles.sectionHeader}>📄 Documentos do Veículo</Text>

          <TextInput
            style={styles.input}
            placeholder="Número da CNH"
            value={form.cnh}
            onChangeText={cnh => setForm(prev => ({ ...prev, cnh }))}
          />

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

          <TouchableOpacity style={styles.documentButton} onPress={() => pickDocument('insurance')}>
            <Text style={styles.buttonText}>
              {documents.insurance ? '✓ Seguro Enviado' : 'Enviar Seguro'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>
          {submitting ? 'Enviando...' : 'Enviar Cadastro'}
        </Text>
      </TouchableOpacity>

      <Text style={styles.buildText}>{AppVersion.getDisplayString()}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBDEFB',
  },
  infoCardText: {
    fontSize: 14,
    color: '#1565C0',
    lineHeight: 20,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
    color: '#333',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
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
    backgroundColor: '#fafafa',
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
    marginTop: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  buildText: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 16,
  },
});
