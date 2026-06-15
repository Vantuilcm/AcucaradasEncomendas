import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { f, s } from '../config/firebase';
import {
  useDriverOnboardingPersonalData,
  mergeDriverOnboardingPersonalDataFromFirestore,
} from '../hooks/driverOnboardingPersonalStore';
import { AppVersion } from '../utils/AppVersion';

type DriverOnboardingAddressData = {
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
};

type AddressFormState = {
  rg: string;
  birthDate: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

const emptyAddressForm = (): AddressFormState => ({
  rg: '',
  birthDate: '',
  cep: '',
  street: '',
  number: '',
  complement: '',
  neighborhood: '',
  city: '',
  state: '',
});

type UserPersonalFirestoreData = {
  nome?: string;
  name?: string;
  cpf?: string;
  telefone?: string;
  phone?: string;
  email?: string;
  driverOnboarding?: {
    faceImage?: string;
    updatedAt?: string;
    rg?: string;
    dataNascimento?: string;
    endereco?: DriverOnboardingAddressData;
  };
};

async function uploadSelfieToStorage(userId: string, uri: string): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const path = `delivery_drivers/${userId}/personal/face.jpg`;
  const storageRef = s.ref(path);
  await s.uploadBytes(storageRef, blob);
  return s.getDownloadURL(storageRef);
}

async function loadPersonalDataFromFirestore(
  userId: string,
  fallbackEmail?: string
): Promise<{
  name: string;
  cpf: string;
  phone: string;
  email: string;
  faceImage: string | null;
  addressForm: AddressFormState;
}> {
  const userRef = f.doc('users', userId);
  const userSnap = await f.getDoc(userRef);
  const data = (userSnap.exists() ? userSnap.data() : {}) as UserPersonalFirestoreData;
  const onboarding = data.driverOnboarding;
  const endereco = onboarding?.endereco;

  return {
    name: data.nome || data.name || '',
    cpf: data.cpf || '',
    phone: data.telefone || data.phone || '',
    email: data.email || fallbackEmail || '',
    faceImage: onboarding?.faceImage || null,
    addressForm: {
      rg: onboarding?.rg || '',
      birthDate: onboarding?.dataNascimento || '',
      cep: endereco?.cep || '',
      street: endereco?.rua || '',
      number: endereco?.numero || '',
      complement: endereco?.complemento || '',
      neighborhood: endereco?.bairro || '',
      city: endereco?.cidade || '',
      state: endereco?.estado || '',
    },
  };
}

async function savePersonalDataToFirestore(
  userId: string,
  personalData: { name: string; cpf: string; phone: string; email: string; faceImage: string | null },
  addressForm: AddressFormState
): Promise<string | null> {
  let faceImageUrl = personalData.faceImage;

  if (faceImageUrl && !faceImageUrl.startsWith('http')) {
    faceImageUrl = await uploadSelfieToStorage(userId, faceImageUrl);
  }

  const userRef = f.doc('users', userId);
  await f.setDoc(
    userRef,
    {
      nome: personalData.name,
      cpf: personalData.cpf,
      telefone: personalData.phone,
      email: personalData.email,
      driverOnboarding: {
        faceImage: faceImageUrl || '',
        updatedAt: new Date().toISOString(),
        rg: addressForm.rg,
        dataNascimento: addressForm.birthDate,
        endereco: {
          cep: addressForm.cep,
          rua: addressForm.street,
          numero: addressForm.number,
          complemento: addressForm.complement,
          bairro: addressForm.neighborhood,
          cidade: addressForm.city,
          estado: addressForm.state,
        },
      },
    },
    { merge: true }
  );

  return faceImageUrl;
}

type DocumentStatus = 'pending' | 'review' | 'approved';

type PersonalDocumentKey =
  | 'identity'
  | 'cpfDocument'
  | 'residenceProof'
  | 'criminalRecord';

const STATUS_LABELS: Record<DocumentStatus, string> = {
  pending: 'Pendente',
  review: 'Em análise',
  approved: 'Aprovado',
};

const STATUS_COLORS: Record<DocumentStatus, string> = {
  pending: '#F57C00',
  review: '#1976D2',
  approved: '#2E7D32',
};

const PERSONAL_DOCUMENTS: { key: PersonalDocumentKey; label: string }[] = [
  { key: 'identity', label: 'Enviar Documento de Identidade' },
  { key: 'cpfDocument', label: 'Enviar CPF' },
  { key: 'residenceProof', label: 'Enviar Comprovante de Residência' },
  { key: 'criminalRecord', label: 'Enviar Nada Consta' },
];

export default function DriverDocumentsScreen() {
  const { user } = useAuth();
  const [personalData, setPersonalData] = useDriverOnboardingPersonalData();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [overallStatus] = useState<DocumentStatus>('pending');
  const [selfieStatus, setSelfieStatus] = useState<DocumentStatus>(
    personalData.faceImage ? 'review' : 'pending'
  );
  const [documentStatuses, setDocumentStatuses] = useState<Record<PersonalDocumentKey, DocumentStatus>>({
    identity: 'pending',
    cpfDocument: 'pending',
    residenceProof: 'pending',
    criminalRecord: 'pending',
  });

  const [addressForm, setAddressForm] = useState<AddressFormState>(emptyAddressForm);

  const userId = user?.uid || (user as { id?: string })?.id;

  const loadFromFirestore = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const loaded = await loadPersonalDataFromFirestore(userId, user?.email || undefined);
      mergeDriverOnboardingPersonalDataFromFirestore({
        name: loaded.name,
        cpf: loaded.cpf,
        phone: loaded.phone,
        email: loaded.email,
        faceImage: loaded.faceImage,
      });
      setAddressForm(loaded.addressForm);
      setSelfieStatus(loaded.faceImage ? 'review' : 'pending');
    } catch (error) {
      console.error('Erro ao carregar dados pessoais do entregador:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus dados pessoais.');
    } finally {
      setLoading(false);
    }
  }, [userId, user?.email]);

  useEffect(() => {
    loadFromFirestore();
  }, [loadFromFirestore]);

  const handleSavePersonalData = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Você precisa estar autenticado para salvar seus dados.');
      return;
    }

    if (!personalData.name || !personalData.cpf || !personalData.phone || !personalData.email) {
      Alert.alert('Erro', 'Preencha nome, CPF, telefone e email antes de salvar.');
      return;
    }

    if (!personalData.faceImage) {
      Alert.alert('Atenção', 'Tire sua selfie antes de salvar seus dados.');
      return;
    }

    try {
      setSaving(true);
      const faceImageUrl = await savePersonalDataToFirestore(userId, personalData, addressForm);
      if (faceImageUrl) {
        setPersonalData({ faceImage: faceImageUrl });
        setSelfieStatus('review');
      }
      Alert.alert('Sucesso', 'Dados pessoais salvos com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar dados pessoais do entregador:', error);
      Alert.alert('Erro', 'Não foi possível salvar seus dados pessoais.');
    } finally {
      setSaving(false);
    }
  };

  const showComingSoon = () => {
    Alert.alert('Em breve', 'Esta etapa será ativada na próxima fase.');
  };

  const handleDocumentPress = (key: PersonalDocumentKey) => {
    showComingSoon();
    setDocumentStatuses(prev => ({
      ...prev,
      [key]: prev[key] === 'pending' ? 'review' : prev[key],
    }));
  };

  const handleSelfiePress = async () => {
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
        setPersonalData({ faceImage: result.assets[0].uri });
        setSelfieStatus('review');
        Alert.alert('Sucesso', 'Selfie capturada com sucesso!');
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível capturar a selfie.');
    }
  };

  const renderStatusBadge = (status: DocumentStatus) => (
    <View style={[styles.statusBadge, { backgroundColor: `${STATUS_COLORS[status]}22` }]}>
      <Text style={[styles.statusBadgeText, { color: STATUS_COLORS[status] }]}>
        {STATUS_LABELS[status]}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {loading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color="#4CAF50" />
            <Text style={styles.loadingText}>Carregando dados...</Text>
          </View>
        )}

        <Text style={styles.title}>Meus Documentos</Text>
        <Text style={styles.subtitle}>
          Documentação pessoal e de segurança do parceiro entregador.
        </Text>

        <View style={styles.overallStatusCard}>
          <Text style={styles.overallStatusLabel}>Status geral</Text>
          {renderStatusBadge(overallStatus)}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>👤 Dados Pessoais</Text>

          <TextInput
            style={styles.input}
            placeholder="Nome completo"
            value={personalData.name}
            onChangeText={name => setPersonalData({ name })}
          />
          <TextInput
            style={styles.input}
            placeholder="CPF"
            value={personalData.cpf}
            onChangeText={cpf => setPersonalData({ cpf })}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="RG"
            value={addressForm.rg}
            onChangeText={rg => setAddressForm(prev => ({ ...prev, rg }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Data de nascimento (DD/MM/AAAA)"
            value={addressForm.birthDate}
            onChangeText={birthDate => setAddressForm(prev => ({ ...prev, birthDate }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Telefone"
            value={personalData.phone}
            onChangeText={phone => setPersonalData({ phone })}
            keyboardType="phone-pad"
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={personalData.email}
            onChangeText={email => setPersonalData({ email })}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>🏠 Endereço</Text>

          <TextInput
            style={styles.input}
            placeholder="CEP"
            value={addressForm.cep}
            onChangeText={cep => setAddressForm(prev => ({ ...prev, cep }))}
            keyboardType="numeric"
          />
          <TextInput
            style={styles.input}
            placeholder="Rua"
            value={addressForm.street}
            onChangeText={street => setAddressForm(prev => ({ ...prev, street }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Número"
            value={addressForm.number}
            onChangeText={number => setAddressForm(prev => ({ ...prev, number }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Complemento"
            value={addressForm.complement}
            onChangeText={complement => setAddressForm(prev => ({ ...prev, complement }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Bairro"
            value={addressForm.neighborhood}
            onChangeText={neighborhood => setAddressForm(prev => ({ ...prev, neighborhood }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Cidade"
            value={addressForm.city}
            onChangeText={city => setAddressForm(prev => ({ ...prev, city }))}
          />
          <TextInput
            style={styles.input}
            placeholder="Estado"
            value={addressForm.state}
            onChangeText={state => setAddressForm(prev => ({ ...prev, state }))}
            autoCapitalize="characters"
            maxLength={2}
          />
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>📄 Documentos Pessoais</Text>

          {PERSONAL_DOCUMENTS.map(doc => (
            <View key={doc.key} style={styles.documentRow}>
              <TouchableOpacity
                style={styles.documentButton}
                onPress={() => handleDocumentPress(doc.key)}
              >
                <Text style={styles.documentButtonText}>{doc.label}</Text>
              </TouchableOpacity>
              {renderStatusBadge(documentStatuses[doc.key])}
            </View>
          ))}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>🤳 Selfie</Text>

          <View style={styles.documentRow}>
            <TouchableOpacity style={styles.selfieButton} onPress={handleSelfiePress}>
              {personalData.faceImage ? (
                <Image source={{ uri: personalData.faceImage }} style={styles.selfiePreview} />
              ) : (
                <Text style={styles.selfieButtonText}>Tirar Selfie</Text>
              )}
            </TouchableOpacity>
            {renderStatusBadge(selfieStatus)}
          </View>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSavePersonalData}
          disabled={saving || loading}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Dados</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.buildText}>{AppVersion.getDisplayString()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  overallStatusCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  overallStatusLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#424242',
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  sectionHeader: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  documentRow: {
    marginBottom: 12,
  },
  documentButton: {
    backgroundColor: '#E8F5E9',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 8,
  },
  documentButtonText: {
    color: '#2E7D32',
    fontWeight: '600',
    fontSize: 15,
  },
  selfieButton: {
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    minHeight: 120,
    overflow: 'hidden',
  },
  selfieButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  selfiePreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#1565C0',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buildText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 8,
  },
});
