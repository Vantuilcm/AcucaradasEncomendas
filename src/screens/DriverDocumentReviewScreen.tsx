import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { usePermissions } from '../hooks/usePermissions';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { useAppTheme } from '../components/ThemeProvider';

type DriverDocumentReviewRouteProp = RouteProp<RootStackParamList, 'DriverDocumentReview'>;

function isDisplayableHttpsDocumentUrl(url: string | undefined): url is string {
  if (!url || typeof url !== 'string') {
    return false;
  }

  const trimmed = url.trim();
  if (!trimmed || trimmed.startsWith('file://')) {
    return false;
  }

  return trimmed.startsWith('https://');
}

export default function DriverDocumentReviewScreen() {
  const route = useRoute<DriverDocumentReviewRouteProp>();
  const { driverId } = route.params;
  const { isAdmin } = usePermissions();
  const { theme } = useAppTheme();
  const driverService = useMemo(() => new DeliveryDriverService(), []);

  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selfieLoadFailed, setSelfieLoadFailed] = useState(false);
  const [cnhLoadFailed, setCnhLoadFailed] = useState(false);
  const [vehicleDocumentLoadFailed, setVehicleDocumentLoadFailed] = useState(false);

  const loadDriver = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setDriver(null);

    try {
      const data = await driverService.getDriverById(driverId);
      if (!data) {
        setNotFound(true);
        return;
      }
      setDriver(data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [driverId, driverService]);

  useEffect(() => {
    if (!isAdmin) {
      return;
    }
    loadDriver();
  }, [isAdmin, loadDriver]);

  useEffect(() => {
    setSelfieLoadFailed(false);
    setCnhLoadFailed(false);
    setVehicleDocumentLoadFailed(false);
  }, [
    driver?.id,
    driver?.documents?.faceImage,
    driver?.documents?.cnhImage,
    driver?.documents?.vehicleDocument,
  ]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Acesso restrito a administradores.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando dados do entregador...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !driver) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text>Entregador não encontrado</Text>
        </View>
      </SafeAreaView>
    );
  }

  const faceImageUrl = driver.documents?.faceImage;
  const cnhImageUrl = driver.documents?.cnhImage;
  const vehicleDocumentUrl = driver.documents?.vehicleDocument;
  const canShowSelfie = isDisplayableHttpsDocumentUrl(faceImageUrl) && !selfieLoadFailed;
  const canShowCnh = isDisplayableHttpsDocumentUrl(cnhImageUrl) && !cnhLoadFailed;
  const canShowVehicleDocument =
    isDisplayableHttpsDocumentUrl(vehicleDocumentUrl) && !vehicleDocumentLoadFailed;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.label}>Nome:</Text>
        <Text style={styles.value}>{driver.name}</Text>

        <Text style={styles.label}>Email:</Text>
        <Text style={styles.value}>{driver.email}</Text>

        <Text style={styles.label}>Telefone:</Text>
        <Text style={styles.value}>{driver.phone || '—'}</Text>

        <Text style={styles.label}>Status:</Text>
        <Text style={styles.value}>{driver.status}</Text>

        <Text style={styles.label}>Driver ID:</Text>
        <Text style={styles.value}>{driverId}</Text>

        <Text style={styles.sectionTitle}>SELFIE</Text>
        {canShowSelfie ? (
          <Image
            source={{ uri: faceImageUrl }}
            style={styles.selfieImage}
            resizeMode="contain"
            onError={() => setSelfieLoadFailed(true)}
          />
        ) : (
          <Text style={styles.fallbackText}>Documento não disponível</Text>
        )}

        <Text style={styles.sectionTitle}>CNH</Text>
        {canShowCnh ? (
          <Image
            source={{ uri: cnhImageUrl }}
            style={styles.documentImage}
            resizeMode="contain"
            onError={() => setCnhLoadFailed(true)}
          />
        ) : (
          <Text style={styles.fallbackText}>Documento não disponível</Text>
        )}

        <Text style={styles.sectionTitle}>Documento do Veículo</Text>
        {canShowVehicleDocument ? (
          <Image
            source={{ uri: vehicleDocumentUrl }}
            style={styles.documentImage}
            resizeMode="contain"
            onError={() => setVehicleDocumentLoadFailed(true)}
          />
        ) : (
          <Text style={styles.fallbackText}>Documento não disponível</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 16,
  },
  value: {
    fontSize: 16,
    color: '#1a1a1a',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginTop: 24,
    marginBottom: 12,
  },
  selfieImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#EEE',
  },
  documentImage: {
    width: '100%',
    height: 280,
    borderRadius: 12,
    backgroundColor: '#EEE',
  },
  fallbackText: {
    fontSize: 14,
    color: '#888',
  },
});
