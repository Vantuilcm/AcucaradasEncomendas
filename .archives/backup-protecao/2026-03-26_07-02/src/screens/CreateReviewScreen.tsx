import React, { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, TextInput, Button, Portal, Modal } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../contexts/AuthContext';
import { ErrorMessage } from '../components/ErrorMessage';
import { ReviewService } from '../services/ReviewService';
import { StarRating } from '../components/StarRating';

type CreateReviewNavigationProp = StackNavigationProp<RootStackParamList, 'CreateReview'>;
type CreateReviewRouteProp = RouteProp<RootStackParamList, 'CreateReview'>;

export function CreateReviewScreen() {
  const navigation = useNavigation<CreateReviewNavigationProp>();
  const route = useRoute<CreateReviewRouteProp>();
  const { orderId } = route.params;
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      setError('Usuário não autenticado');
      return;
    }

    if (!comment.trim()) {
      setError('Por favor, escreva um comentário');
      return;
    }
    
    // Verificar conteúdo do comentário para detectar possíveis ataques XSS
    const containsSuspiciousContent = /<script|javascript:|on\w+\s*=|data:/gi.test(comment);
    if (containsSuspiciousContent) {
      setError('Seu comentário contém elementos que não são permitidos. Por favor, remova scripts ou códigos HTML.');
      return;
    }
    
    // Validar tamanho do comentário
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
        comment: comment.trim(),
      });

      setShowSuccessModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar avaliação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {error && <ErrorMessage message={error} onRetry={handleSubmit} />}

        <View style={styles.content}>
          <Text variant="titleLarge" style={styles.title}>
            Avalie seu Pedido
          </Text>

          <View style={styles.ratingContainer}>
            <Text variant="titleMedium" style={styles.ratingLabel}>
              Sua Avaliação
            </Text>
            <StarRating rating={rating} size={32} onRatingChange={setRating} interactive={true} />
            <Text variant="bodyMedium" style={styles.ratingValue}>
              {rating} {rating === 1 ? 'estrela' : 'estrelas'}
            </Text>
          </View>

          <TextInput
            label="Seu Comentário"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={6}
            style={styles.commentInput}
          />

          <Button
            mode="contained"
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            style={styles.submitButton}
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
          <Text variant="titleLarge" style={styles.modalTitle}>
            Avaliação Enviada!
          </Text>
          <Text variant="bodyLarge" style={styles.modalMessage}>
            Obrigado por compartilhar sua experiência conosco.
          </Text>
          <Button
            mode="contained"
            onPress={() => {
              setShowSuccessModal(false);
              navigation.goBack();
            }}
            style={styles.modalButton}
          >
            Voltar
          </Button>
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
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    marginBottom: 24,
    textAlign: 'center',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    marginBottom: 8,
  },
  ratingValue: {
    marginTop: 8,
    color: '#666',
  },
  commentInput: {
    marginBottom: 24,
  },
  submitButton: {
    marginBottom: 16,
  },
  modal: {
    backgroundColor: '#fff',
    padding: 20,
    margin: 20,
    borderRadius: 8,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalMessage: {
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButton: {
    marginTop: 8,
  },
});
