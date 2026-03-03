import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  TouchableWithoutFeedback,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Tipos de animações
export enum FeedbackType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
}

// Props para o componente Toast
interface ToastProps {
  visible: boolean;
  message: string;
  type?: FeedbackType;
  duration?: number;
  position?: 'top' | 'bottom';
  onHide?: () => void;
}

// Props para o componente de botão com feedback
interface FeedbackButtonProps {
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  activeScale?: number;
  feedbackType?: 'scale' | 'opacity' | 'both';
  hapticFeedback?: boolean;
  hapticType?: 'light' | 'medium' | 'heavy';
  children: React.ReactNode;
  disabled?: boolean;
}

// Props para o componente de efeito de sucesso
interface SuccessEffectProps {
  visible: boolean;
  size?: number;
  color?: string;
  onAnimationComplete?: () => void;
}

// Props para animação de item adicionado ao carrinho
interface CartAddEffectProps {
  startPosition: { x: number; y: number };
  endPosition: { x: number; y: number };
  onAnimationComplete?: () => void;
}

/**
 * Toast para feedback de ações
 */
export const Toast = ({
  visible,
  message,
  type = FeedbackType.INFO,
  duration = 3000,
  position = 'bottom',
  onHide,
}: ToastProps) => {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(position === 'top' ? -20 : 20)).current;

  // Definir cores e ícones baseados no tipo
  const getTypeStyles = () => {
    switch (type) {
      case FeedbackType.SUCCESS:
        return {
          backgroundColor: '#4CAF50',
          icon: 'checkmark-circle',
        };
      case FeedbackType.ERROR:
        return {
          backgroundColor: '#F44336',
          icon: 'close-circle',
        };
      case FeedbackType.WARNING:
        return {
          backgroundColor: '#FF9800',
          icon: 'warning',
        };
      case FeedbackType.INFO:
      default:
        return {
          backgroundColor: theme.colors.primary,
          icon: 'information-circle',
        };
    }
  };

  const { backgroundColor, icon } = getTypeStyles();

  useEffect(() => {
    if (visible) {
      // Iniciar a animação de entrada
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Configurar timer para esconder o toast
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: position === 'top' ? -20 : 20,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          if (onHide) onHide();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, opacity, translateY, position, onHide]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor,
          opacity,
          transform: [{ translateY }],
          bottom: position === 'bottom' ? 50 : undefined,
          top: position === 'top' ? 50 : undefined,
        },
      ]}
    >
      <Ionicons name={icon} size={20} color="white" style={styles.icon} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  );
};

/**
 * Botão com feedback visual e tátil
 */
export const FeedbackButton = ({
  onPress,
  style,
  textStyle,
  activeScale = 0.95,
  feedbackType = 'both',
  hapticFeedback = true,
  hapticType = 'light',
  children,
  disabled = false,
}: FeedbackButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (disabled) return;

    // Animação ao pressionar
    if (feedbackType === 'scale' || feedbackType === 'both') {
      Animated.timing(scale, {
        toValue: activeScale,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start();
    }

    if (feedbackType === 'opacity' || feedbackType === 'both') {
      Animated.timing(opacity, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePressOut = () => {
    if (disabled) return;

    // Animação ao soltar
    if (feedbackType === 'scale' || feedbackType === 'both') {
      Animated.timing(scale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start();
    }

    if (feedbackType === 'opacity' || feedbackType === 'both') {
      Animated.timing(opacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const handlePress = () => {
    if (disabled) return;

    // Feedback tátil
    if (hapticFeedback) {
      switch (hapticType) {
        case 'light':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
      }
    }

    onPress();
  };

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled}
    >
      <Animated.View
        style={[
          styles.button,
          style,
          {
            transform: [{ scale }],
            opacity,
            ...(disabled ? { opacity: 0.5 } : {}),
          },
        ]}
      >
        {children}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

/**
 * Efeito visual para ações de sucesso (check animation)
 */
export const SuccessEffect = ({
  visible,
  size = 80,
  color = '#4CAF50',
  onAnimationComplete,
}: SuccessEffectProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.3)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Sequência de animações
      Animated.sequence([
        // Animação do círculo
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
            easing: Easing.elastic(1),
          }),
        ]),
        // Animação do check
        Animated.parallel([
          Animated.timing(checkOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(checkScale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
            easing: Easing.back(1.5),
          }),
        ]),
      ]).start(() => {
        // Manter visível por um tempo antes de completar
        setTimeout(() => {
          if (onAnimationComplete) onAnimationComplete();
        }, 1000);
      });
    } else {
      // Resetar animações
      opacity.setValue(0);
      scale.setValue(0.3);
      checkOpacity.setValue(0);
      checkScale.setValue(0);
    }
  }, [visible, opacity, scale, checkOpacity, checkScale, onAnimationComplete]);

  if (!visible) return null;

  return (
    <View style={styles.successContainer}>
      <Animated.View
        style={[
          styles.successCircle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity,
            transform: [{ scale }],
          },
        ]}
      >
        <Animated.View
          style={{
            opacity: checkOpacity,
            transform: [{ scale: checkScale }],
          }}
        >
          <Ionicons name="checkmark" size={size * 0.6} color="white" />
        </Animated.View>
      </Animated.View>
    </View>
  );
};

/**
 * Animação para quando um item é adicionado ao carrinho
 */
export const CartAddEffect = ({
  startPosition,
  endPosition,
  onAnimationComplete,
}: CartAddEffectProps) => {
  const translateX = useRef(new Animated.Value(startPosition.x)).current;
  const translateY = useRef(new Animated.Value(startPosition.y)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Sequência de animação para o efeito de "item voando para o carrinho"
    Animated.sequence([
      // Pequeno delay para dar tempo de perceber o item sendo adicionado
      Animated.delay(100),
      // Animação de "voo" do item
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: endPosition.x,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.bezier(0.2, 1, 0.3, 1),
        }),
        Animated.timing(translateY, {
          toValue: endPosition.y,
          duration: 700,
          useNativeDriver: true,
          easing: Easing.bezier(0.2, 1, 0.3, 1),
        }),
        Animated.timing(scale, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 700,
          useNativeDriver: true,
          delay: 400,
        }),
      ]),
    ]).start(() => {
      if (onAnimationComplete) onAnimationComplete();
    });
  }, [translateX, translateY, scale, opacity, startPosition, endPosition, onAnimationComplete]);

  return (
    <Animated.View
      style={[
        styles.cartItemEffect,
        {
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <View style={styles.cartItemEffectInner}>
        <Ionicons name="cart" size={24} color="white" />
      </View>
    </Animated.View>
  );
};

// Interface para o componente de micro-interação para o botão de curtir/favoritar
interface HeartButtonProps {
  isLiked: boolean;
  onToggle: () => void;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  style?: ViewStyle;
}

/**
 * Botão de curtir com micro-interação
 */
export const HeartButton = ({
  isLiked,
  onToggle,
  size = 28,
  activeColor = '#FF69B4',
  inactiveColor = '#CCCCCC',
  style,
}: HeartButtonProps) => {
  const scale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isLiked) {
      // Efeito de "pulsar" quando curtido
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.ease,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
          easing: Easing.bounce,
        }),
      ]).start();

      // Efeito de vibração tátil
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else {
      // Efeito de "rotação" ao descurtir
      Animated.timing(rotation, {
        toValue: 1, // Rotacionar 360 graus
        duration: 300,
        useNativeDriver: true,
        easing: Easing.ease,
      }).start(() => rotation.setValue(0));
    }
  }, [isLiked, scale, rotation]);

  // Converter rotação para graus
  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <TouchableWithoutFeedback onPress={onToggle}>
      <Animated.View
        style={[
          styles.heartButton,
          style,
          {
            transform: [{ scale }, { rotate: spin }],
          },
        ]}
      >
        <Ionicons
          name={isLiked ? 'heart' : 'heart-outline'}
          size={size}
          color={isLiked ? activeColor : inactiveColor}
        />
      </Animated.View>
    </TouchableWithoutFeedback>
  );
};

// Estilos
const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 999,
  },
  icon: {
    marginRight: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '500',
    flex: 1,
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  successContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  successCircle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartItemEffect: {
    position: 'absolute',
    width: 40,
    height: 40,
    zIndex: 999,
  },
  cartItemEffectInner: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    backgroundColor: '#FF69B4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heartButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
