import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { usePermissions } from '../hooks/usePermissions';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { useAppTheme } from '../components/ThemeProvider';

type DriverDocumentReviewRouteProp = RouteProp<RootStackParamList, 'DriverDocumentReview'>;

type ReviewableDocumentKey = 'faceImage' | 'cnhImage' | 'vehicleDocument' | 'insurance';

type LocalDocumentReviewStatus = 'pending' | 'rejected';

interface LocalDocumentReview {
  status: LocalDocumentReviewStatus;
  rejectionReason?: string;
}

const INITIAL_DOCUMENT_REVIEWS: Record<ReviewableDocumentKey, LocalDocumentReview> = {
  faceImage: { status: 'pending' },
  cnhImage: { status: 'pending' },
  vehicleDocument: { status: 'pending' },
  insurance: { status: 'pending' },
};

const DOCUMENT_LABELS: Record<ReviewableDocumentKey, string> = {
  faceImage: 'Selfie',
  cnhImage: 'CNH',
  vehicleDocument: 'Documento do Veículo',
  insurance: 'Seguro',
};

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

function renderStatusBadge(status: LocalDocumentReviewStatus) {
  const isRejected = status === 'rejected';

  return (
    <View style={[styles.statusBadge, isRejected ? styles.statusBadgeRejected : styles.statusBadgePending]}>
      <Text style={[styles.statusBadgeText, isRejected ? styles.statusBadgeTextRejected : styles.statusBadgeTextPending]}>
        {isRejected ? 'Reprovado' : 'Pendente'}
      </Text>
    </View>
  );
}

interface RejectDocumentModalProps {
  visible: boolean;
  documentLabel: string;
  onDismiss: () => void;
  onConfirm: (reason: string) => void;
}

const RejectDocumentModal = React.memo(function RejectDocumentModal({
  visible,
  documentLabel,
  onDismiss,
  onConfirm,
}: RejectDocumentModalProps) {
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (visible) {
      setDraft('');
    }
  }, [visible, documentLabel]);

  const handleConfirm = () => {
    const trimmedReason = draft.trim();
    if (!trimmedReason) {
      Alert.alert('Informe o motivo da reprovação.');
      return;
    }
    onConfirm(trimmedReason);
  };

  if (!visible) {
    return null;
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalTitle}>Reprovar {documentLabel}</Text>
        <Text style={styles.modalLabel}>Motivo da reprovação</Text>
        <TextInput
          mode="outlined"
          multiline
          numberOfLines={4}
          value={draft}
          onChangeText={setDraft}
          placeholder="Descreva o motivo da reprovação"
          style={styles.reasonInput}
        />
        <View style={styles.modalActions}>
          <Button mode="outlined" onPress={onDismiss} style={styles.modalButton}>
            Cancelar
          </Button>
          <Button mode="contained" onPress={handleConfirm} style={styles.modalButton}>
            Confirmar
          </Button>
        </View>
      </Modal>
    </Portal>
  );
});

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
  const [insuranceLoadFailed, setInsuranceLoadFailed] = useState(false);

  const [documentReviews, setDocumentReviews] =
    useState<Record<ReviewableDocumentKey, LocalDocumentReview>>(INITIAL_DOCUMENT_REVIEWS);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [activeDocumentKey, setActiveDocumentKey] = useState<ReviewableDocumentKey | null>(null);

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
    setInsuranceLoadFailed(false);
  }, [
    driver?.id,
    driver?.documents?.faceImage,
    driver?.documents?.cnhImage,
    driver?.documents?.vehicleDocument,
    driver?.documents?.insurance,
  ]);

  const openRejectModal = useCallback((documentKey: ReviewableDocumentKey) => {
    setActiveDocumentKey(documentKey);
    setRejectModalVisible(true);
  }, []);

  const closeRejectModal = useCallback(() => {
    setRejectModalVisible(false);
    setActiveDocumentKey(null);
  }, []);

  const handleRejectConfirm = useCallback(
    (reason: string) => {
      if (!activeDocumentKey) {
        return;
      }

      setDocumentReviews((prev) => ({
        ...prev,
        [activeDocumentKey]: {
          status: 'rejected',
          rejectionReason: reason,
        },
      }));
      closeRejectModal();
    },
    [activeDocumentKey, closeRejectModal]
  );

  const renderDocumentCard = (
    documentKey: ReviewableDocumentKey,
    title: string,
    imageUrl: string | undefined,
    canShowImage: boolean,
    onImageError: () => void,
    imageStyle: typeof styles.selfieImage | typeof styles.documentImage
  ) => {
    const review = documentReviews[documentKey];

    return (
      <Card style={styles.card} key={documentKey}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
            {renderStatusBadge(review.status)}
          </View>

          {canShowImage ? (
            <Image
              source={{ uri: imageUrl }}
              style={imageStyle}
              resizeMode="contain"
              onError={onImageError}
            />
          ) : (
            <Text style={styles.fallbackText}>Documento não disponível</Text>
          )}

          {review.status === 'rejected' && review.rejectionReason ? (
            <View style={styles.rejectionReasonBox}>
              <Text style={styles.rejectionReasonLabel}>Motivo da reprovação:</Text>
              <Text style={styles.rejectionReasonText}>{review.rejectionReason}</Text>
            </View>
          ) : (
            <Button
              mode="outlined"
              style={styles.rejectButton}
              onPress={() => openRejectModal(documentKey)}
            >
              Reprovar Documento
            </Button>
          )}
        </Card.Content>
      </Card>
    );
  };

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
  const insuranceUrl = driver.documents?.insurance;
  const canShowSelfie = isDisplayableHttpsDocumentUrl(faceImageUrl) && !selfieLoadFailed;
  const canShowCnh = isDisplayableHttpsDocumentUrl(cnhImageUrl) && !cnhLoadFailed;
  const canShowVehicleDocument =
    isDisplayableHttpsDocumentUrl(vehicleDocumentUrl) && !vehicleDocumentLoadFailed;
  const canShowInsurance = isDisplayableHttpsDocumentUrl(insuranceUrl) && !insuranceLoadFailed;

  const activeDocumentLabel = activeDocumentKey ? DOCUMENT_LABELS[activeDocumentKey] : '';

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Dados do Entregador</Text>
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
          </Card.Content>
        </Card>

        {renderDocumentCard(
          'faceImage',
          'Selfie',
          faceImageUrl,
          canShowSelfie,
          () => setSelfieLoadFailed(true),
          styles.selfieImage
        )}

        {renderDocumentCard(
          'cnhImage',
          'CNH',
          cnhImageUrl,
          canShowCnh,
          () => setCnhLoadFailed(true),
          styles.documentImage
        )}

        {renderDocumentCard(
          'vehicleDocument',
          'Documento do Veículo',
          vehicleDocumentUrl,
          canShowVehicleDocument,
          () => setVehicleDocumentLoadFailed(true),
          styles.documentImage
        )}

        {renderDocumentCard(
          'insurance',
          'Seguro',
          insuranceUrl,
          canShowInsurance,
          () => setInsuranceLoadFailed(true),
          styles.documentImage
        )}
      </ScrollView>

      <RejectDocumentModal
        visible={rejectModalVisible}
        documentLabel={activeDocumentLabel}
        onDismiss={closeRejectModal}
        onConfirm={handleRejectConfirm}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    marginBottom: 12,
    borderRadius: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
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
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgePending: {
    backgroundColor: '#FFF3E0',
  },
  statusBadgeRejected: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadgeTextPending: {
    color: '#E65100',
  },
  statusBadgeTextRejected: {
    color: '#C62828',
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
  rejectionReasonBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF8F8',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  rejectionReasonLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#C62828',
    marginBottom: 4,
  },
  rejectionReasonText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  rejectButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 24,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#444',
    marginBottom: 8,
  },
  reasonInput: {
    minHeight: 120,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
  },
  modalButton: {
    marginLeft: 8,
    marginTop: 4,
  },
});
