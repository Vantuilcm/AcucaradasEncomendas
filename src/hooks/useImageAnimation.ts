import { useState, useCallback, useRef } from 'react';
import { Animated, Easing } from 'react-native';
import { loggingService } from '../services/LoggingService';

interface ImageAnimationState {
  scale: Animated.Value;
  opacity: Animated.Value;
  rotation: Animated.Value;
  translateX: Animated.Value;
  translateY: Animated.Value;
  isAnimating: boolean;
  error: Error | null;
}

interface ImageAnimationHandlers {
  animate: (options?: AnimationOptions) => Promise<void>;
  reset: () => void;
  stop: () => void;
}

interface AnimationOptions {
  scale?: number;
  opacity?: number;
  rotation?: number;
  translateX?: number;
  translateY?: number;
  duration?: number;
  easing?: (value: number) => number;
  delay?: number;
  useNativeDriver?: boolean;
}

const DEFAULT_OPTIONS: AnimationOptions = {
  scale: 1,
  opacity: 1,
  rotation: 0,
  translateX: 0,
  translateY: 0,
  duration: 300,
  easing: Easing.inOut(Easing.ease),
  delay: 0,
  useNativeDriver: true,
};

export function useImageAnimation(): [ImageAnimationState, ImageAnimationHandlers] {
  const [state, setState] = useState<ImageAnimationState>({
    scale: new Animated.Value(1),
    opacity: new Animated.Value(1),
    rotation: new Animated.Value(0),
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    isAnimating: false,
    error: null,
  });

  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const animate = useCallback(
    async (options: AnimationOptions = {}) => {
      try {
        setState(prev => ({ ...prev, isAnimating: true, error: null }));
        const finalOptions = { ...DEFAULT_OPTIONS, ...options };

        // Cria as animações individuais
        const animations = [
          Animated.timing(state.scale, {
            toValue: finalOptions.scale ?? DEFAULT_OPTIONS.scale!,
            duration: finalOptions.duration,
            easing: finalOptions.easing,
            delay: finalOptions.delay,
            useNativeDriver: finalOptions.useNativeDriver ?? DEFAULT_OPTIONS.useNativeDriver!,
          }),
          Animated.timing(state.opacity, {
            toValue: finalOptions.opacity ?? DEFAULT_OPTIONS.opacity!,
            duration: finalOptions.duration,
            easing: finalOptions.easing,
            delay: finalOptions.delay,
            useNativeDriver: finalOptions.useNativeDriver ?? DEFAULT_OPTIONS.useNativeDriver!,
          }),
          Animated.timing(state.rotation, {
            toValue: finalOptions.rotation ?? DEFAULT_OPTIONS.rotation!,
            duration: finalOptions.duration,
            easing: finalOptions.easing,
            delay: finalOptions.delay,
            useNativeDriver: finalOptions.useNativeDriver ?? DEFAULT_OPTIONS.useNativeDriver!,
          }),
          Animated.timing(state.translateX, {
            toValue: finalOptions.translateX ?? DEFAULT_OPTIONS.translateX!,
            duration: finalOptions.duration,
            easing: finalOptions.easing,
            delay: finalOptions.delay,
            useNativeDriver: finalOptions.useNativeDriver ?? DEFAULT_OPTIONS.useNativeDriver!,
          }),
          Animated.timing(state.translateY, {
            toValue: finalOptions.translateY ?? DEFAULT_OPTIONS.translateY!,
            duration: finalOptions.duration,
            easing: finalOptions.easing,
            delay: finalOptions.delay,
            useNativeDriver: finalOptions.useNativeDriver ?? DEFAULT_OPTIONS.useNativeDriver!,
          }),
        ];

        // Executa todas as animações em paralelo
        animationRef.current = Animated.parallel(animations);

        await new Promise<void>((resolve, reject) => {
          if (!animationRef.current) {
            reject(new Error('Animação não iniciada'));
            return;
          }

          animationRef.current.start(({ finished }) => {
            if (finished) {
              setState(prev => ({ ...prev, isAnimating: false }));
              loggingService.info('Animação concluída com sucesso', { options: finalOptions });
              resolve();
            }
          });
        });
      } catch (err) {
        setState(prev => ({
          ...prev,
          isAnimating: false,
          error: err as Error,
        }));
        loggingService.error('Erro ao executar animação', { error: err });
        throw err;
      }
    },
    [state.scale, state.opacity, state.rotation, state.translateX, state.translateY]
  );

  const reset = useCallback(() => {
    try {
      if (animationRef.current) {
        animationRef.current.stop();
      }

      setState(prev => ({
        ...prev,
        scale: new Animated.Value(1),
        opacity: new Animated.Value(1),
        rotation: new Animated.Value(0),
        translateX: new Animated.Value(0),
        translateY: new Animated.Value(0),
        isAnimating: false,
        error: null,
      }));

      loggingService.info('Animação resetada');
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err as Error,
      }));
      loggingService.error('Erro ao resetar animação', { error: err });
    }
  }, []);

  const stop = useCallback(() => {
    try {
      if (animationRef.current) {
        animationRef.current.stop();
        setState(prev => ({ ...prev, isAnimating: false }));
        loggingService.info('Animação interrompida');
      }
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err as Error,
      }));
      loggingService.error('Erro ao interromper animação', { error: err });
    }
  }, []);

  return [
    state,
    {
      animate,
      reset,
      stop,
    },
  ];
}
