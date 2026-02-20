import { Easing, WithTimingConfig, WithSpringConfig } from 'react-native-reanimated';

/**
 * Configurações padrão para animações de timing
 */
export const DEFAULT_TIMING_CONFIG: WithTimingConfig = {
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1),
};

/**
 * Configurações para animações de entrada
 */
export const ENTRANCE_TIMING_CONFIG: WithTimingConfig = {
  duration: 500,
  easing: Easing.bezier(0.16, 1, 0.3, 1), // Ease out
};

/**
 * Configurações para animações de saída
 */
export const EXIT_TIMING_CONFIG: WithTimingConfig = {
  duration: 250,
  easing: Easing.bezier(0.5, 0, 0.75, 0), // Ease in
};

/**
 * Configurações para animações de toque em botões
 */
export const BUTTON_SPRING_CONFIG: WithSpringConfig = {
  damping: 10,
  stiffness: 100,
  mass: 1,
  overshootClamping: false,
};

/**
 * Configurações para animações de toque em cards
 */
export const CARD_SPRING_CONFIG: WithSpringConfig = {
  damping: 12,
  stiffness: 120,
  mass: 1,
  overshootClamping: false,
};

/**
 * Configurações para animações de feedback de erro
 */
export const ERROR_SPRING_CONFIG: WithSpringConfig = {
  damping: 8,
  stiffness: 300,
  mass: 1,
  overshootClamping: false,
};

/**
 * Configurações para animações de lista
 */
export const LIST_STAGGER_DELAY = 50; // Delay em ms entre itens

/**
 * Easing padrão para transições de navegação
 */
export const NAVIGATION_EASING = Easing.bezier(0.25, 0.1, 0.25, 1);

/**
 * Gera um atraso baseado no índice para animações de lista
 * @param index Índice do item na lista
 * @param baseDelay Delay base em ms
 * @returns Delay em ms
 */
export const getStaggeredDelay = (index: number, baseDelay = LIST_STAGGER_DELAY): number => {
  return index * baseDelay;
};

/**
 * Duração para animações lentas (splash screens, etc)
 */
export const SLOW_DURATION = 800;

/**
 * Duração para animações rápidas (feedback, etc)
 */
export const FAST_DURATION = 150;
