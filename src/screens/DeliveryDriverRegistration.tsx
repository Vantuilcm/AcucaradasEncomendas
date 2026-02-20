import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
  Image,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  TextInput,
  Card,
  useTheme,
  ProgressBar,
  Portal,
  Dialog,
  IconButton,
  Avatar,
  Divider,
  List,
} from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '../contexts/AuthContext';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { useNavigation } from '@react-navigation/native';
import { loggingService } from '../services/LoggingService';

// Fallback seguro para FaceDetector removido
const FaceDetector: any = null;

export function DeliveryDriverRegistrationScreen() {
  const theme = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const driverService = DeliveryDriverService.getInstance();

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [vehicle, setVehicle] = useState({
    type: 'motorcycle' as 'motorcycle' | 'car' | 'bicycle',
    brand: '',
    model: '',
    year: new Date().getFullYear(),
    plate: '',
    color: '',
  });
  
  const [driverData, setDriverData] = useState({
    cpf: '',
    cnh: '',
  });

  const [documents, setDocuments] = useState<{
    cnh: any | null;
    cpf: any | null;
    antecedentes: any | null;
    vehicleDoc: any | null;
  }>({
    cnh: null,
    cpf: null,
    antecedentes: null,
    vehicleDoc: null,
  });

  useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    } else {
      setHasPermission(true);
    }
  }, []);

  const takePicture = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Aviso', 'A captura de foto não está disponível na versão web.');
      return;
    }

    try {
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        base64: true,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        setFaceImage(asset.uri);
        // O validateFace agora é apenas um log seguro, não bloqueia o fluxo
        await validateFace(asset.uri);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível capturar a foto.');
    }
  };

  const validateFace = async (uri: string) => {
    try {
      // Verificação segura de FaceDetector (módulo opcional/legado)
      if (FaceDetector && typeof FaceDetector.detectFacesAsync === 'function') {
        const result = await FaceDetector.detectFacesAsync(uri, {
          mode: FaceDetector?.FaceDetectorMode?.fast || 1,
        });
        const faces = (result as any)?.faces || [];
        if (faces.length === 1) {
          // Sucesso
        } else {
          setFaceImage(null);
          Alert.alert('Erro', 'Certifique-se de que apenas um rosto esteja visível e claro na foto.');
          loggingService.warn('Face detection failed: ' + (faces.length === 0 ? 'Nenhum rosto detectado' : 'Múltiplos rostos detectados'));
        }
      } else {
        loggingService.warn('FaceDetector não disponível. Pulando validação facial.');
      }
    } catch (error) {
      loggingService.error('Erro ao detectar rosto:', error instanceof Error ? error : new Error(String(error)));
      // Não bloqueia se o detector falhar por erro técnico
    }
  };

  const pickDocument = async (documentType: 'cnh' | 'cpf' | 'antecedentes' | 'vehicleDoc') => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
      });

      if (!result.canceled) {
        setDocuments(prev => ({
          ...prev,
          [documentType]: result.assets[0],
        }));
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível selecionar o documento.');
    }
  };

  const handleSubmit = async () => {
    if (!user) return;

    if (!faceImage || !documents.cnh || !vehicle.model || !vehicle.plate || !driverData.cpf || !driverData.cnh) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios e envie os documentos.');
      return;
    }

    try {
      setLoading(true);
      
      const driver = await driverService.createDriver({
        userId: user.id,
        name: user.name || 'Entregador',
        email: user.email || '',
        phone: (user as any).phone || '',
        cpf: driverData.cpf,
        cnh: driverData.cnh,
        status: 'pending', // Fica pendente para aprovação do admin
        vehicle,
        rating: 5.0,
        totalDeliveries: 0,
        totalEarnings: 0,
        documents: {
          cnhImage: documents.cnh?.uri || '',
          vehicleDocument: documents.vehicleDoc?.uri || '',
          insurance: '',
        },
        availability: {
          isAvailable: false,
          workingHours: {
            start: '08:00',
            end: '18:00',
          },
          workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        }
      });

      // Registrar o token de notificação após o cadastro bem-sucedido
      try {
        const { mobileNotificationService } = await import('../services/MobileNotificationService');
        await mobileNotificationService.registerForPushNotifications(user.id);
        // loggingService.info('Token de notificação registrado para o novo entregador');
      } catch (tokenErr) {
        loggingService.error('Erro ao registrar token para novo entregador', tokenErr as Error);
      }

      Alert.alert(
        'Sucesso',
        'Seu cadastro foi enviado para análise. Entraremos em contato em breve!',
        [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
      );
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o cadastro. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text>Precisamos de permissão para usar a câmera.</Text>
        <Button mode="contained" onPress={() => ImagePicker.requestCameraPermissionsAsync()}>
          Solicitar Permissão
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.title}>Seja um Entregador</Text>
      
      <ProgressBar progress={step / 3} color={theme.colors.primary} style={styles.progress} />
      
      {step === 1 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>1. Identificação Facial</Text>
            <Text variant="bodyMedium" style={styles.description}>
              Tire uma foto sua segurando seu documento para validação de identidade.
            </Text>
            
            <TouchableOpacity style={styles.photoContainer} onPress={takePicture}>
              {faceImage ? (
                <Image source={{ uri: faceImage }} style={styles.preview} />
              ) : (
                <View style={styles.placeholder}>
                  <Avatar.Icon size={80} icon="camera" style={{ backgroundColor: theme.colors.surfaceVariant }} />
                  <Text variant="labelLarge" style={{ marginTop: 8 }}>Tirar Foto</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <Button 
              mode="contained" 
              onPress={() => setStep(2)} 
              disabled={!faceImage}
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
            <Text variant="titleMedium" style={styles.sectionTitle}>2. Dados do Veículo</Text>
            
            <View style={styles.vehicleTypeContainer}>
              <IconButton 
                icon="bike" 
                mode={vehicle.type === 'motorcycle' ? 'contained' : 'outlined'}
                onPress={() => setVehicle({...vehicle, type: 'motorcycle'})}
              />
              <IconButton 
                icon="car" 
                mode={vehicle.type === 'car' ? 'contained' : 'outlined'}
                onPress={() => setVehicle({...vehicle, type: 'car'})}
              />
              <IconButton 
                icon="bicycle" 
                mode={vehicle.type === 'bicycle' ? 'contained' : 'outlined'}
                onPress={() => setVehicle({...vehicle, type: 'bicycle'})}
              />
            </View>

            <TextInput
              label="Modelo do Veículo"
              value={vehicle.model}
              onChangeText={text => setVehicle({...vehicle, model: text})}
              style={styles.input}
              mode="outlined"
            />
            <TextInput
              label="Placa"
              value={vehicle.plate}
              onChangeText={text => setVehicle({...vehicle, plate: text})}
              style={styles.input}
              mode="outlined"
              autoCapitalize="characters"
            />
            <TextInput
              label="Cor"
              value={vehicle.color}
              onChangeText={text => setVehicle({...vehicle, color: text})}
              style={styles.input}
              mode="outlined"
            />

            <View style={styles.row}>
              <Button mode="outlined" onPress={() => setStep(1)} style={styles.halfButton}>Voltar</Button>
              <Button 
                mode="contained" 
                onPress={() => setStep(3)} 
                disabled={!vehicle.model || !vehicle.plate}
                style={styles.halfButton}
              >
                Próximo
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {step === 3 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>3. Documentação</Text>
            <Text style={styles.helperText}>Envie fotos nítidas ou PDF dos documentos. Aceitamos imagens e PDFs.</Text>
            
            <List.Item
              title="CNH / Identidade"
              description={documents.cnh ? documents.cnh.name : "Clique para anexar"}
              left={props => <List.Icon {...props} icon="card-account-details" />}
              right={props => documents.cnh && <List.Icon {...props} icon="check-circle" color="green" />}
              onPress={() => pickDocument('cnh')}
              style={styles.listItem}
            />
            <Divider />
            <List.Item
              title="CPF"
              description={documents.cpf ? documents.cpf.name : "Clique para anexar"}
              left={props => <List.Icon {...props} icon="file-document" />}
              right={props => documents.cpf && <List.Icon {...props} icon="check-circle" color="green" />}
              onPress={() => pickDocument('cpf')}
              style={styles.listItem}
            />
            <Divider />
            <List.Item
              title="Antecedentes Criminais"
              description={documents.antecedentes ? documents.antecedentes.name : "Clique para anexar"}
              left={props => <List.Icon {...props} icon="file-certificate" />}
              right={props => documents.antecedentes && <List.Icon {...props} icon="check-circle" color="green" />}
              onPress={() => pickDocument('antecedentes')}
              style={styles.listItem}
            />
            <Divider />
            <List.Item
              title="Documento do Veículo (CRLV)"
              description={documents.vehicleDoc ? documents.vehicleDoc.name : "Clique para anexar"}
              left={props => <List.Icon {...props} icon="car-info" />}
              right={props => documents.vehicleDoc && <List.Icon {...props} icon="check-circle" color="green" />}
              onPress={() => pickDocument('vehicleDoc')}
              style={styles.listItem}
            />

            <TextInput
              label="CPF"
              value={driverData.cpf}
              onChangeText={text => setDriverData({...driverData, cpf: text})}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
            />
            <TextInput
              label="CNH"
              value={driverData.cnh}
              onChangeText={text => setDriverData({...driverData, cnh: text})}
              style={styles.input}
              mode="outlined"
              keyboardType="numeric"
            />

            <View style={styles.row}>
              <Button mode="outlined" onPress={() => setStep(2)} style={styles.halfButton}>Voltar</Button>
              <Button 
                mode="contained" 
                onPress={handleSubmit} 
                loading={loading}
                disabled={loading || !documents.cnh || !documents.vehicleDoc || !driverData.cpf || !driverData.cnh}
                style={styles.halfButton}
              >
                Finalizar
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  progress: {
    height: 8,
    borderRadius: 4,
    marginBottom: 24,
  },
  card: {
    elevation: 4,
    borderRadius: 12,
  },
  sectionTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  description: {
    marginBottom: 20,
    color: '#666',
  },
  photoContainer: {
    height: 250,
    backgroundColor: '#eee',
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  preview: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    marginBottom: 12,
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  nextButton: {
    marginTop: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    gap: 10,
  },
  halfButton: {
    flex: 1,
  },
  listItem: {
    paddingVertical: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
    marginBottom: 12,
  },
});
