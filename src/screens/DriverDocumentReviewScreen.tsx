import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, Modal, Portal, Text, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RouteProp, useRoute } from '@react-navigation/native';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '../contexts/AuthContext';
import { db, f } from '../config/firebase';
import { DeliveryDriverService } from '../services/DeliveryDriverService';
import { DeliveryDriver } from '../types/DeliveryDriver';
import { useAppTheme } from '../components/ThemeProvider';

const { doc, updateDoc } = f;

type DriverDocumentReviewRouteProp = RouteProp<RootStackParamList, 'DriverDocumentReview'>;

type ReviewableDocumentKey = 'faceImage' | 'cnhImage' | 'vehicleDocument' | 'insurance';

type LocalDocumentReviewStatus = 'pending' | 'approved' | 'rejected';

interface LocalDocumentReview {
  status: LocalDocumentReviewStatus;
  rejectionReason?: string;
}

interface StoredDocumentReview {
  status: LocalDocumentReviewStatus;
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

type DriverWithDocumentReviews = DeliveryDriver & {
  documentReviews?: Partial<Record<ReviewableDocumentKey, StoredDocumentReview>>;
};

const REVIEWABLE_DOCUMENT_KEYS: ReviewableDocumentKey[] = [
  'faceImage',
  'cnhImage',
  'vehicleDocument',
  'insurance',
];

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

function mergeDocumentReviewsFromFirestore(
  firestoreReviews: Partial<Record<ReviewableDocumentKey, StoredDocumentReview>> | undefined
): Record<ReviewableDocumentKey, LocalDocumentReview> {
  const merged: Record<ReviewableDocumentKey, LocalDocumentReview> = {
    ...INITIAL_DOCUMENT_REVIEWS,
  };

  if (!firestoreReviews) {
    return merged;
  }

  for (const documentKey of REVIEWABLE_DOCUMENT_KEYS) {
    const stored = firestoreReviews[documentKey];
    if (!stored || !stored.status) {
      continue;
    }

    if (stored.status !== 'pending' && stored.status !== 'approved' && stored.status !== 'rejected') {
      continue;
    }

    merged[documentKey] = {
      status: stored.status,
      ...(stored.rejectionReason ? { rejectionReason: stored.rejectionReason } : {}),
    };
  }

  return merged;
}

async function persistDocumentReview(
  driverId: string,
  documentKey: ReviewableDocumentKey,
  review: StoredDocumentReview
): Promise<void> {
  const driverRef = doc(db, 'delivery_drivers', driverId);
  await updateDoc(driverRef, {
    [`documentReviews.${documentKey}`]: review,
  });
}

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

interface DocumentSlot {
  label: string;
  url: string;
}

function getUrlExtension(url: string | undefined): string | null {
  if (!url) {
    return null;
  }

  const decoded = decodeURIComponent(url);
  const match = decoded.match(/\.([a-zA-Z0-9]+)(?:\?|$|\/)/);
  return match ? match[1].toLowerCase() : null;
}

function isRasterImageExtension(extension: string | null): boolean {
  return extension === 'jpg' || extension === 'jpeg' || extension === 'png' || extension === 'gif' || extension === 'webp';
}

function isExternalOpenExtension(extension: string | null): boolean {
  return extension === 'heic' || extension === 'pdf';
}

function buildDocumentSlots(slots: Array<{ label: string; url?: string }>): DocumentSlot[] {
  const seenUrls = new Set<string>();
  const result: DocumentSlot[] = [];

  for (const slot of slots) {
    if (!isDisplayableHttpsDocumentUrl(slot.url) || seenUrls.has(slot.url)) {
      continue;
    }

    seenUrls.add(slot.url);
    result.push({ label: slot.label, url: slot.url });
  }

  return result;
}

function renderStatusBadge(status: LocalDocumentReviewStatus) {
  const isRejected = status === 'rejected';
  const isApproved = status === 'approved';

  return (
    <View
      style={[
        styles.statusBadge,
        isRejected
          ? styles.statusBadgeRejected
          : isApproved
            ? styles.statusBadgeApproved
            : styles.statusBadgePending,
      ]}
    >
      <Text
        style={[
          styles.statusBadgeText,
          isRejected
            ? styles.statusBadgeTextRejected
            : isApproved
              ? styles.statusBadgeTextApproved
              : styles.statusBadgeTextPending,
        ]}
      >
        {isRejected ? 'Reprovado' : isApproved ? 'Aprovado' : 'Pendente'}
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
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setDraft('');
    }
    wasVisibleRef.current = visible;
  }, [visible]);

  const handleConfirm = () => {
    const trimmedReason = draft.trim();
    if (!trimmedReason) {
      Alert.alert('Informe o motivo da reprovação.');
      return;
    }
    onConfirm(trimmedReason);
  };

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
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
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
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { theme } = useAppTheme();
  const driverService = useMemo(() => new DeliveryDriverService(), []);

  const [loading, setLoading] = useState(true);
  const [driver, setDriver] = useState<DeliveryDriver | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [imageLoadFailedKeys, setImageLoadFailedKeys] = useState<Record<string, boolean>>({});

  const [documentReviews, setDocumentReviews] =
    useState<Record<ReviewableDocumentKey, LocalDocumentReview>>(INITIAL_DOCUMENT_REVIEWS);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [activeDocumentKey, setActiveDocumentKey] = useState<ReviewableDocumentKey | null>(null);
  const activeDocumentKeyRef = useRef<ReviewableDocumentKey | null>(null);

  useEffect(() => {
    activeDocumentKeyRef.current = activeDocumentKey;
  }, [activeDocumentKey]);

  const loadDriver = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
    setDriver(null);
    setDocumentReviews(INITIAL_DOCUMENT_REVIEWS);

    try {
      const data = await driverService.getDriverById(driverId);
      if (!data) {
        setNotFound(true);
        return;
      }
      setDriver(data);
      const driverWithReviews = data as DriverWithDocumentReviews;
      setDocumentReviews(mergeDocumentReviewsFromFirestore(driverWithReviews.documentReviews));
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
    setImageLoadFailedKeys({});
  }, [
    driver?.id,
    driver?.documents?.faceImage,
    driver?.documents?.cnhImage,
    driver?.documents?.cnhFront,
    driver?.documents?.cnhBack,
    driver?.documents?.vehicleDocument,
    driver?.documents?.vehicleFront,
    driver?.documents?.vehicleBack,
    driver?.documents?.insurance,
    driver?.documents?.insuranceFront,
    driver?.documents?.insuranceBack,
  ]);

  const openDocumentUrl = useCallback(async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('Erro', 'Não foi possível abrir o documento.');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('Erro', 'Não foi possível abrir o documento.');
    }
  }, []);

  const markImageLoadFailed = useCallback((slotKey: string) => {
    setImageLoadFailedKeys((prev) => ({ ...prev, [slotKey]: true }));
  }, []);

  const handleApproveDocument = useCallback(
    async (documentKey: ReviewableDocumentKey) => {
      const adminUid = user?.uid;
      if (!adminUid) {
        Alert.alert('Erro', 'Usuário administrador não identificado.');
        return;
      }

      const reviewedAt = new Date().toISOString();
      let previousReviews: Record<ReviewableDocumentKey, LocalDocumentReview> | null = null;

      setDocumentReviews((prev) => {
        previousReviews = prev;
        return {
          ...prev,
          [documentKey]: { status: 'approved' },
        };
      });

      try {
        await persistDocumentReview(driverId, documentKey, {
          status: 'approved',
          reviewedAt,
          reviewedBy: adminUid,
        });
      } catch {
        if (previousReviews) {
          setDocumentReviews(previousReviews);
        }
        Alert.alert('Erro', 'Não foi possível salvar a aprovação. Tente novamente.');
      }
    },
    [driverId, user?.uid]
  );

  const openRejectModal = useCallback((documentKey: ReviewableDocumentKey) => {
    setActiveDocumentKey(documentKey);
    setRejectModalVisible(true);
  }, []);

  const closeRejectModal = useCallback(() => {
    setRejectModalVisible(false);
    setActiveDocumentKey(null);
  }, []);

  const handleRejectConfirm = useCallback(
    async (reason: string) => {
      const documentKey = activeDocumentKeyRef.current;
      if (!documentKey) {
        return;
      }

      const adminUid = user?.uid;
      if (!adminUid) {
        Alert.alert('Erro', 'Usuário administrador não identificado.');
        return;
      }

      const reviewedAt = new Date().toISOString();
      let previousReviews: Record<ReviewableDocumentKey, LocalDocumentReview> | null = null;

      setDocumentReviews((prev) => {
        previousReviews = prev;
        return {
          ...prev,
          [documentKey]: {
            status: 'rejected',
            rejectionReason: reason,
          },
        };
      });

      try {
        await persistDocumentReview(driverId, documentKey, {
          status: 'rejected',
          rejectionReason: reason,
          reviewedAt,
          reviewedBy: adminUid,
        });
        closeRejectModal();
      } catch {
        if (previousReviews) {
          setDocumentReviews(previousReviews);
        }
        Alert.alert('Erro', 'Não foi possível salvar a reprovação. Tente novamente.');
      }
    },
    [closeRejectModal, driverId, user?.uid]
  );

  const renderDocumentActions = (documentKey: ReviewableDocumentKey) => {
    const review = documentReviews[documentKey];

    if (review.status === 'rejected' && review.rejectionReason) {
      return (
        <View style={styles.rejectionReasonBox}>
          <Text style={styles.rejectionReasonLabel}>Motivo da reprovação:</Text>
          <Text style={styles.rejectionReasonText}>{review.rejectionReason}</Text>
        </View>
      );
    }

    if (review.status === 'approved') {
      return (
        <View style={styles.approvalReasonBox}>
          <Text style={styles.approvalReasonText}>Documento aprovado.</Text>
        </View>
      );
    }

    return (
      <View style={styles.documentActionsRow}>
        <Button
          mode="contained"
          style={styles.approveButton}
          onPress={() => handleApproveDocument(documentKey)}
        >
          Aprovar Documento
        </Button>
        <Button
          mode="outlined"
          style={styles.rejectButton}
          onPress={() => openRejectModal(documentKey)}
        >
          Reprovar Documento
        </Button>
      </View>
    );
  };

  const renderDocumentPreview = (
    slotKey: string,
    url: string,
    imageStyle: typeof styles.selfieImage | typeof styles.documentImage
  ) => {
    const extension = getUrlExtension(url);

    if (isExternalOpenExtension(extension)) {
      return (
        <View style={styles.externalFormatBox}>
          <Text style={styles.externalFormatText}>
            Arquivo enviado, mas este formato precisa ser aberto externamente.
          </Text>
          <Button mode="outlined" onPress={() => openDocumentUrl(url)} style={styles.openDocumentButton}>
            Abrir documento
          </Button>
        </View>
      );
    }

    if (isRasterImageExtension(extension) && !imageLoadFailedKeys[slotKey]) {
      return (
        <Image
          source={{ uri: url }}
          style={imageStyle}
          resizeMode="contain"
          onError={() => markImageLoadFailed(slotKey)}
        />
      );
    }

    if (isDisplayableHttpsDocumentUrl(url)) {
      return (
        <View style={styles.externalFormatBox}>
          <Text style={styles.externalFormatText}>
            Arquivo enviado, mas este formato precisa ser aberto externamente.
          </Text>
          <Button mode="outlined" onPress={() => openDocumentUrl(url)} style={styles.openDocumentButton}>
            Abrir documento
          </Button>
        </View>
      );
    }

    return <Text style={styles.fallbackText}>Documento não disponível</Text>;
  };

  const renderDocumentGroupCard = (
    documentKey: ReviewableDocumentKey,
    title: string,
    slots: DocumentSlot[],
    frontBackNote: string | null,
    imageStyle: typeof styles.selfieImage | typeof styles.documentImage
  ) => {
    const review = documentReviews[documentKey];
    const hasAnyDocument = slots.length > 0;

    return (
      <Card style={styles.card} key={documentKey}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
            {renderStatusBadge(review.status)}
          </View>

          {frontBackNote ? <Text style={styles.frontBackNote}>{frontBackNote}</Text> : null}

          {hasAnyDocument ? (
            slots.map((slot) => (
              <View key={`${documentKey}-${slot.label}`} style={styles.documentSlot}>
                <Text style={styles.documentSlotLabel}>{slot.label}</Text>
                {renderDocumentPreview(`${documentKey}-${slot.label}`, slot.url, imageStyle)}
              </View>
            ))
          ) : (
            <Text style={styles.fallbackText}>Documento não disponível</Text>
          )}

          {renderDocumentActions(documentKey)}
        </Card.Content>
      </Card>
    );
  };

  const renderSelfieCard = (faceImageUrl: string | undefined) => {
    const review = documentReviews.faceImage;
    const canShowSelfie =
      isDisplayableHttpsDocumentUrl(faceImageUrl) &&
      isRasterImageExtension(getUrlExtension(faceImageUrl)) &&
      !imageLoadFailedKeys.faceImage;

    return (
      <Card style={styles.card} key="faceImage">
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Selfie</Text>
            {renderStatusBadge(review.status)}
          </View>

          {canShowSelfie && faceImageUrl ? (
            <Image
              source={{ uri: faceImageUrl }}
              style={styles.selfieImage}
              resizeMode="contain"
              onError={() => markImageLoadFailed('faceImage')}
            />
          ) : isDisplayableHttpsDocumentUrl(faceImageUrl) ? (
            renderDocumentPreview('faceImage', faceImageUrl, styles.selfieImage)
          ) : (
            <Text style={styles.fallbackText}>Documento não disponível</Text>
          )}

          {renderDocumentActions('faceImage')}
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

  const cnhSlots = buildDocumentSlots([
    { label: 'Frente', url: driver.documents?.cnhFront },
    { label: 'Verso', url: driver.documents?.cnhBack },
    { label: 'Legado', url: driver.documents?.cnhImage },
  ]);

  const vehicleSlots = buildDocumentSlots([
    { label: 'Frente', url: driver.documents?.vehicleFront },
    { label: 'Verso', url: driver.documents?.vehicleBack },
    { label: 'Legado', url: driver.documents?.vehicleDocument },
  ]);

  const insuranceSlots = buildDocumentSlots([
    { label: 'Frente', url: driver.documents?.insuranceFront },
    { label: 'Verso', url: driver.documents?.insuranceBack },
    { label: 'Legado', url: driver.documents?.insurance },
  ]);

  const cnhFrontBackNote =
    isDisplayableHttpsDocumentUrl(driver.documents?.cnhFront) &&
    isDisplayableHttpsDocumentUrl(driver.documents?.cnhBack)
      ? 'CNH com frente e verso disponíveis.'
      : null;
  const vehicleFrontBackNote =
    isDisplayableHttpsDocumentUrl(driver.documents?.vehicleFront) &&
    isDisplayableHttpsDocumentUrl(driver.documents?.vehicleBack)
      ? 'Documento do veículo com frente e verso disponíveis.'
      : null;
  const insuranceFrontBackNote =
    isDisplayableHttpsDocumentUrl(driver.documents?.insuranceFront) &&
    isDisplayableHttpsDocumentUrl(driver.documents?.insuranceBack)
      ? 'Seguro com frente e verso disponíveis.'
      : null;

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

        {renderSelfieCard(faceImageUrl)}

        {renderDocumentGroupCard(
          'cnhImage',
          'CNH',
          cnhSlots,
          cnhFrontBackNote,
          styles.documentImage
        )}

        {renderDocumentGroupCard(
          'vehicleDocument',
          'Documento do Veículo',
          vehicleSlots,
          vehicleFrontBackNote,
          styles.documentImage
        )}

        {renderDocumentGroupCard(
          'insurance',
          'Seguro',
          insuranceSlots,
          insuranceFrontBackNote,
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
  statusBadgeApproved: {
    backgroundColor: '#E8F5E9',
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
  statusBadgeTextApproved: {
    color: '#2E7D32',
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
  frontBackNote: {
    fontSize: 13,
    color: '#1565C0',
    marginBottom: 12,
    fontWeight: '600',
  },
  documentSlot: {
    marginBottom: 16,
  },
  documentSlotLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  externalFormatBox: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  externalFormatText: {
    fontSize: 14,
    color: '#6D4C41',
    lineHeight: 20,
    marginBottom: 10,
  },
  openDocumentButton: {
    alignSelf: 'flex-start',
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
  approvalReasonBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F1F8E9',
    borderWidth: 1,
    borderColor: '#C5E1A5',
  },
  approvalReasonText: {
    fontSize: 14,
    color: '#33691E',
    lineHeight: 20,
  },
  documentActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  approveButton: {
    alignSelf: 'flex-start',
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
