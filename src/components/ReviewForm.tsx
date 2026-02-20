import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Keyboard, Alert } from 'react-native';
import Animated, {
  SlideInUp,
  SlideOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { StarRating } from './StarRating';
import { Button } from './base/Button';
import { ReviewFormData } from '../models/Review';
import { wp, hp, fontSize, spacing } from '../utils/responsive';

interface ReviewFormProps {
  onSubmit: (data: ReviewFormData) => void;
  onCancel: () => void;
  initialData?: Partial<ReviewFormData>;
  isVisible: boolean;
  style?: any;
}

export const ReviewForm: React.FC<ReviewFormProps> = ({
  onSubmit,
  onCancel,
  initialData = { rating: 0, comment: '' },
  isVisible,
  style,
}) => {
  const [rating, setRating] = useState(initialData.rating || 0);
  const [comment, setComment] = useState(initialData.comment || '');

  // Valores animados
  const formScale = useSharedValue(1);
  const buttonScale = useSharedValue(1);

  // Estilos animados
  const formAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: formScale.value }],
    };
  });

  const buttonAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: buttonScale.value }],
    };
  });

  // Validação do formulário
  const isFormValid = rating > 0 && comment.trim().length >= 5;


  // Função para lidar com envio
  const handleSubmit = () => {
    if (!isFormValid) {
      Alert.alert(
        'Formulário incompleto',
        'Por favor, dê uma avaliação (1-5 estrelas) e escreva um comentário com pelo menos 5 caracteres.'
      );

      // Animar o formulário para indicar erro
      formScale.value = withSequence(
        withTiming(0.95, { duration: 100 }),
        withTiming(1.02, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );

      return;
    }
    
    // Verificar conteúdo do comentário para detectar possíveis ataques XSS
    const containsSuspiciousContent = /<script|javascript:|on\w+\s*=|data:/gi.test(comment);
    if (containsSuspiciousContent) {
      Alert.alert(
        'Conteúdo não permitido',
        'Seu comentário contém elementos que não são permitidos. Por favor, remova scripts ou códigos HTML.'
      );
      return;
    }

    // Enviar dados e esconder teclado
    onSubmit({ rating, comment });
    Keyboard.dismiss();
  };

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[styles.container, style]}
      entering={SlideInUp.duration(300)}
      exiting={SlideOutDown.duration(300)}
    >
      <Animated.View style={[styles.formContainer, formAnimatedStyle]}>
        <View style={styles.header}>
          <Text style={styles.title}>Adicionar Avaliação</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onCancel}>
            <Text style={styles.closeButtonText}>X</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.ratingContainer}>
          <Text style={styles.label}>Sua avaliação:</Text>
          <StarRating rating={rating} size={30} onRatingChange={setRating} interactive={true} />
          <Text style={styles.ratingText}>
            {rating > 0 ? `${rating} estrelas` : 'Toque nas estrelas para avaliar'}
          </Text>
        </View>

        <View style={styles.commentContainer}>
          <Text style={styles.label}>Seu comentário:</Text>
          <TextInput
            style={styles.commentInput}
            placeholder="Compartilhe sua experiência com este produto..."
            value={comment}
            onChangeText={setComment}
            multiline={true}
            maxLength={500}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{comment.length}/500 caracteres</Text>
        </View>

        <Animated.View style={[styles.buttonContainer, buttonAnimatedStyle]}>
          <Button
            title="Enviar Avaliação"
            onPress={handleSubmit}
            disabled={!isFormValid}
            variant={isFormValid ? 'primary' : 'outline'}
            style={styles.submitButton}
          />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing(16),
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    borderRadius: wp(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  formContainer: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(16),
  },
  title: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    width: wp(24),
    height: wp(24),
    borderRadius: wp(12),
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: fontSize(14),
    fontWeight: 'bold',
    color: '#666',
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: spacing(16),
  },
  label: {
    fontSize: fontSize(16),
    fontWeight: '500',
    color: '#333',
    marginBottom: spacing(8),
    alignSelf: 'flex-start',
  },
  ratingText: {
    marginTop: spacing(8),
    fontSize: fontSize(14),
    color: '#666',
  },
  commentContainer: {
    marginBottom: spacing(16),
  },
  commentInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: wp(8),
    padding: spacing(12),
    minHeight: hp(120),
    fontSize: fontSize(16),
  },
  characterCount: {
    alignSelf: 'flex-end',
    marginTop: spacing(4),
    fontSize: fontSize(12),
    color: '#888',
  },
  buttonContainer: {
    alignItems: 'center',
  },
  submitButton: {
    width: '100%',
  },
});
