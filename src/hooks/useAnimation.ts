import { useRef, useCallback } from 'react';
import { Animated, Easing } from 'react-native';
import { loggingService } from '../services/LoggingService';

interface AnimationConfig {
  duration?: number;
  delay?: number;
  easing?: (value: number) => number;
  useNativeDriver?: boolean;
}

interface AnimationHandlers {
  fadeIn: (config?: AnimationConfig) => Promise<void>;
  fadeOut: (config?: AnimationConfig) => Promise<void>;
  slideIn: (config?: AnimationConfig) => Promise<void>;
  slideOut: (config?: AnimationConfig) => Promise<void>;
  scale: (toValue: number, config?: AnimationConfig) => Promise<void>;
  rotate: (toValue: string, config?: AnimationConfig) => Promise<void>;
  reset: () => void;
  value: Animated.Value;
}

export function useAnimation(initialValue = 0): AnimationHandlers {
  const animatedValue = useRef(new Animated.Value(initialValue)).current;

  const animate = useCallback(
    (toValue: number, config: AnimationConfig = {}): Promise<void> => {
      const { duration = 300, delay = 0, easing = Easing.ease, useNativeDriver = true } = config;

      return new Promise(resolve => {
        Animated.timing(animatedValue, {
          toValue,
          duration,
          delay,
          easing,
          useNativeDriver,
        }).start(({ finished }) => {
          if (finished) {
            loggingService.debug('Animação concluída', { toValue, config });
            resolve();
          }
        });
      });
    },
    [animatedValue]
  );

  const fadeIn = useCallback(
    async (config?: AnimationConfig) => {
      try {
        await animate(1, config);
        loggingService.debug('Animação fadeIn executada');
      } catch (err) {
        loggingService.error('Erro ao executar fadeIn', err as Error);
      }
    },
    [animate]
  );

  const fadeOut = useCallback(
    async (config?: AnimationConfig) => {
      try {
        await animate(0, config);
        loggingService.debug('Animação fadeOut executada');
      } catch (err) {
        loggingService.error('Erro ao executar fadeOut', err as Error);
      }
    },
    [animate]
  );

  const slideIn = useCallback(
    async (config?: AnimationConfig) => {
      try {
        await animate(1, {
          ...config,
          useNativeDriver: true,
        });
        loggingService.debug('Animação slideIn executada');
      } catch (err) {
        loggingService.error('Erro ao executar slideIn', err as Error);
      }
    },
    [animate]
  );

  const slideOut = useCallback(
    async (config?: AnimationConfig) => {
      try {
        await animate(0, {
          ...config,
          useNativeDriver: true,
        });
        loggingService.debug('Animação slideOut executada');
      } catch (err) {
        loggingService.error('Erro ao executar slideOut', err as Error);
      }
    },
    [animate]
  );

  const scale = useCallback(
    async (toValue: number, config?: AnimationConfig) => {
      try {
        await animate(toValue, {
          ...config,
          useNativeDriver: true,
        });
        loggingService.debug('Animação scale executada', { toValue });
      } catch (err) {
        loggingService.error('Erro ao executar scale', err as Error);
      }
    },
    [animate]
  );

  const rotate = useCallback(
    async (toValue: string, config?: AnimationConfig) => {
      try {
        await animate(1, {
          ...config,
          useNativeDriver: true,
        });
        loggingService.debug('Animação rotate executada', { toValue });
      } catch (err) {
        loggingService.error('Erro ao executar rotate', err as Error);
      }
    },
    [animate]
  );

  const reset = useCallback(() => {
    animatedValue.setValue(initialValue);
    loggingService.debug('Animação resetada', { initialValue });
  }, [animatedValue, initialValue]);

  return {
    fadeIn,
    fadeOut,
    slideIn,
    slideOut,
    scale,
    rotate,
    reset,
    value: animatedValue,
  };
}
