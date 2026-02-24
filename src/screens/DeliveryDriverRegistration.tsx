import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Camera } from 'expo-camera';
import * as FaceDetector from 'expo-face-detector';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';

export default function DeliveryDriverRegistration() {
  const [hasPermission, setHasPermission] = useState(null);
  const [faceImage, setFaceImage] = useState(null);
  const [documents, setDocuments] = useState({
    cnh: null,
    cpf: null,
    antecedentes: null,
  });
  const [isCameraActive, setIsCameraActive] = useState(false);
  const cameraRef = useRef(null);

  React.useEffect(() => {
    if (Platform.OS !== 'web') {
      (async () => {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      })();
    } else {
      setHasPermission(true);
    }
  }, []);

  const handleFaceDetection = ({ faces }) => {
    if (faces.length === 1) {
      takePicture();
    }
  };

  const takePicture = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Aviso', 'A captura de foto não está disponível na versão web.');
      return;
    }

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 1,
          base64: true,
        });
        setFaceImage(photo.uri);
        setIsCameraActive(false);
        validateFace(photo.base64);
      } catch (error) {
        Alert.alert('Erro', 'Não foi possível capturar a foto.');
      }
    }
  };

  const validateFace = async base64Image => {
    try {
      Alert.alert('Sucesso', 'Foto facial validada com sucesso!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível validar a foto facial.');
    }
  };

  const pickDocument = async documentType => {
    if (Platform.OS === 'web') {
      Alert.alert('Aviso', 'O upload de documentos está disponível apenas no aplicativo móvel.');
      return;
    }

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
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

  const validateDocument = async (type, document) => {
    Alert.alert('Sucesso', `Documento ${type.toUpperCase()} enviado para validação!`);
  };

  const handleSubmit = async () => {
    if (!faceImage || !documents.cnh || !documents.cpf || !documents.antecedentes) {
      Alert.alert('Erro', 'Por favor, complete todos os documentos necessários.');
      return;
    }

    try {
      Alert.alert('Sucesso', 'Cadastro enviado para análise!');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o cadastro.');
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

      {Platform.OS !== 'web' && isCameraActive ? (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          type={Camera.Constants.Type.front}
          onFacesDetected={handleFaceDetection}
          faceDetectorSettings={{
            mode: FaceDetector.FaceDetectorMode.fast,
            detectLandmarks: FaceDetector.FaceDetectorLandmarks.none,
            runClassifications: FaceDetector.FaceDetectorClassifications.none,
            minDetectionInterval: 100,
            tracking: true,
          }}
        >
          <View style={styles.cameraOverlay}>
            <Text style={styles.cameraText}>Posicione seu rosto no centro</Text>
          </View>
        </Camera>
      ) : (
        <TouchableOpacity
          style={styles.photoButton}
          onPress={() => Platform.OS !== 'web' && setIsCameraActive(true)}
        >
          {faceImage ? (
            <Image source={{ uri: faceImage }} style={styles.preview} />
          ) : (
            <Text style={styles.buttonText}>
              {Platform.OS === 'web' ? 'Captura de foto disponível apenas no app' : 'Tirar Foto'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.documentSection}>
        <Text style={styles.sectionTitle}>Documentos Necessários:</Text>

        <TouchableOpacity style={styles.documentButton} onPress={() => pickDocument('cnh')}>
          <Text style={styles.buttonText}>{documents.cnh ? '✓ CNH Enviada' : 'Enviar CNH'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.documentButton} onPress={() => pickDocument('cpf')}>
          <Text style={styles.buttonText}>{documents.cpf ? '✓ CPF Enviado' : 'Enviar CPF'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.documentButton}
          onPress={() => pickDocument('antecedentes')}
        >
          <Text style={styles.buttonText}>
            {documents.antecedentes ? '✓ Antecedentes Enviado' : 'Enviar Antecedentes Criminais'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Enviar Cadastro</Text>
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
  camera: {
    height: 400,
    borderRadius: 20,
    marginBottom: 20,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
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
