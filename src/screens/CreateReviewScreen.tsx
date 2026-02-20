import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text, TextInput, Button, useTheme, Portal, Modal, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { Review } from '../types/Review';
import { ReviewService } from '../services/ReviewService';
import { OrderService } from '../services/OrderService';
import { StarRating } from '../components/StarRating';
import { SecurityUtils } from '../utils/SecurityUtils';
import { Order } from '../types/Order';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

type RouteParams = {
  orderId: string;
};

export function CreateReviewScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute();
  const { orderId } = route.params as RouteParams;
  const { user } = useAuth();
  
  const [order, setOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [driverRating, setDriverRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingOrder, setFetchingOrder] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setFetchingOrder(true);
      const orderService = new OrderService();
      const orderData = await orderService.getOrderById(orderId);
      setOrder(orderData);
    } catch (err) {
      logger.error('Erro ao buscar detalhes do pedido:', err instanceof Error ? err : new Error(String(err)));
      setError('Não foi possível carregar os detalhes do pedido.');
    } finally {
      setFetchingOrder(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    if (!comment.trim()) {
      setError('Por favor, escreva um comentário');
      return;
    }
    
    // Validar conteúdo
    const containsSuspiciousContent = /<script|javascript:|on\w+\s*=|data:/gi.test(comment);
    if (containsSuspiciousContent) {
      setError('Seu comentário contém elementos que não são permitidos.');
      return;
    }
    
    if (comment.trim().length < 5 || comment.trim().length > 1000) {
      setError('O comentário deve ter entre 5 e 1000 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const reviewService = ReviewService.getInstance();
      await reviewService.createReview({
        userId: user.id,
        orderId,
        rating,
        driverRating: order?.deliveryDriver ? driverRating : undefined,
        comment: comment.trim(),
      });

      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar avaliação');
    } finally {
      setLoading(false);
    }
  };

  if (fetchingOrder) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ marginTop: 16 }}>Carregando dados do pedido...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} onRetry={handleSubmit} />}

        <View style={styles.content}>
          <Text variant="headlineSmall" style={styles.title}>
            Avalie seu Pedido
          </Text>
          
          {order && (
            <Text variant="bodyMedium" style={styles.orderSubtitle}>
              Pedido #{order.id.slice(-6).toUpperCase()} • {new Date(order.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          )}

          <View style={styles.ratingSection}>
            <Text variant="titleMedium" style={styles.ratingLabel}>
              O que achou dos produtos?
            </Text>
            <StarRating rating={rating} size={36} onRatingChange={setRating} readonly={false} />
            <Text variant="bodySmall" style={styles.ratingValue}>
              {rating === 5 ? 'Excelente' : rating === 4 ? 'Muito Bom' : rating === 3 ? 'Bom' : rating === 2 ? 'Regular' : 'Ruim'}
            </Text>
          </View>

          {order?.deliveryDriver && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.ratingSection}>
                <Text variant="titleMedium" style={styles.ratingLabel}>
                  Como foi a entrega por {order.deliveryDriver.name}?
                </Text>
                <StarRating rating={driverRating} size={36} onRatingChange={setDriverRating} readonly={false} />
                <Text variant="bodySmall" style={styles.ratingValue}>
                  {driverRating === 5 ? 'Excelente' : driverRating === 4 ? 'Muito Bom' : driverRating === 3 ? 'Bom' : driverRating === 2 ? 'Regular' : 'Ruim'}
                </Text>
              </View>
            </>
          )}

          <Divider style={styles.divider} />

          <TextInput
            label="Conte mais sobre sua experiência"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            mode="outlined"
            style={styles.commentInput}
            placeholder="O que você mais gostou? O que podemos melhorar?"
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
            contentStyle={{ paddingVertical: 8 }}
          >
            Enviar Avaliação
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Modal
          visible={showSuccessModal}
          onDismiss={() => {
            setShowSuccessModal(false);
            navigation.goBack();
          }}
          contentContainerStyle={styles.modal}
        >
          <View style={{ alignItems: 'center' }}>
            <Text variant="headlineSmall" style={styles.modalTitle}>
              Avaliação Enviada!
            </Text>
            <Text variant="bodyLarge" style={styles.modalMessage}>
              Obrigado por compartilhar sua experiência conosco. Suas avaliações nos ajudam a melhorar!
            </Text>
            <Button
              mode="contained"
              onPress={() => {
                setShowSuccessModal(false);
                navigation.goBack();
              }}
              style={styles.modalButton}
            >
              Concluir
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  orderSubtitle: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 24,
  },
  ratingSection: {
    alignItems: 'center',
    marginVertical: 16,
  },
  ratingLabel: {
    marginBottom: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  ratingValue: {
    marginTop: 8,
    color: '#666',
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
    height: 1,
  },
  commentInput: {
    marginBottom: 32,
    backgroundColor: '#f9f9f9',
  },
  submitButton: {
    marginBottom: 24,
    borderRadius: 8,
  },
  modal: {
    backgroundColor: '#fff',
    padding: 24,
    margin: 20,
    borderRadius: 16,
    elevation: 5,
  },
  modalTitle: {
    marginBottom: 12,
    textAlign: 'center',
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  modalMessage: {
    marginBottom: 24,
    textAlign: 'center',
    color: '#666',
    lineHeight: 22,
  },
  modalButton: {
    marginTop: 8,
    borderRadius: 8,
  },
});

