import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tipos para o componente Loading
export interface LoadingSpinnerProps {
  visible?: boolean;
  message?: string;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  overlay?: boolean;
  timeout?: number;
  onTimeout?: () => void;
  type?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  testID?: string;
}

// Configurações de tamanho
const SIZES: Record<string, { width: number; height: number; fontSize: number }> = {
  small: { width: 24, height: 24, fontSize: 12 },
  medium: { width: 40, height: 40, fontSize: 14 },
  large: { width: 60, height: 60, fontSize: 16 },
};

// Componente Spinner animado
const SpinnerAnimation: React.FC<{
  size: keyof typeof SIZES;
  color: string;
}> = React.memo(({ size, color }) => {
  const spinValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const spinAnimation = Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    );
    
    spinAnimation.start();
    
    return () => spinAnimation.stop();
  }, [spinValue]);
  
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });
  
  return (
    <Animated.View
      style={[
        styles.spinner,
        {
          width: SIZES[size].width,
          height: SIZES[size].height,
          borderColor: `${color}20`,
          borderTopColor: color,
          transform: [{ rotate: spin }],
        },
      ]}
    />
  );
});

// Componente Dots animado
const DotsAnimation: React.FC<{
  size: keyof typeof SIZES;
  color: string;
}> = React.memo(({ size, color }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const createDotAnimation = (animatedValue: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };
    
    const animations = [
      createDotAnimation(dot1, 0),
      createDotAnimation(dot2, 200),
      createDotAnimation(dot3, 400),
    ];
    
    animations.forEach(animation => animation.start());
    
    return () => animations.forEach(animation => animation.stop());
  }, [dot1, dot2, dot3]);
  
  const dotSize = SIZES[size].width / 3;
  
  const renderDot = (animatedValue: Animated.Value, key: number) => {
    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.8, 1.2],
    });
    
    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    });
    
    return (
      <Animated.View
        key={key}
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
            marginHorizontal: 4,
          },
        ]}
      />
    );
  };
  
  return (
    <View style={styles.dotsContainer}>
      {renderDot(dot1, 1)}
      {renderDot(dot2, 2)}
      {renderDot(dot3, 3)}
    </View>
  );
});

// Componente Pulse animado
const PulseAnimation: React.FC<{
  size: keyof typeof SIZES;
  color: string;
}> = React.memo(({ size, color }) => {
  const pulseValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    
    pulseAnimation.start();
    
    return () => pulseAnimation.stop();
  }, [pulseValue]);
  
  const scale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });
  
  const opacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });
  
  return (
    <Animated.View
      style={[
        styles.pulse,
        {
          width: SIZES[size].width,
          height: SIZES[size].height,
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
});

// Componente Skeleton animado
const SkeletonAnimation: React.FC<{
  size: keyof typeof SIZES;
  color: string;
}> = React.memo(({ size, color }) => {
  const shimmerValue = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.timing(shimmerValue, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    
    shimmerAnimation.start();
    
    return () => shimmerAnimation.stop();
  }, [shimmerValue]);
  
  const translateX = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-100, 100],
  });
  
  return (
    <View style={[styles.skeleton, { width: SIZES[size].width * 2, height: SIZES[size].height }]}>
      <View style={[styles.skeletonBase, { backgroundColor: `${color}20` }]} />
      <Animated.View
        style={[
          styles.skeletonShimmer,
          {
            backgroundColor: `${color}40`,
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
});

// Componente principal LoadingSpinner
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  visible = true,
  message,
  size = 'medium',
  color = '#007bff',
  backgroundColor = 'rgba(0, 0, 0, 0.5)',
  overlay = true,
  timeout,
  onTimeout,
  type = 'spinner',
  testID = 'loading-spinner',
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (visible) {
      // Fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Configurar timeout se especificado
      if (timeout && onTimeout) {
        timeoutRef.current = setTimeout(() => {
          try {
            onTimeout();
          } catch (error) {
            console.warn('Erro no callback de timeout do LoadingSpinner:', error);
          }
        }, timeout);
      }
    } else {
      // Fade out
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Limpar timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, fadeAnim, timeout, onTimeout]);
  
  if (!visible) {
    return null;
  }
  
  const renderAnimation = () => {
    switch (type) {
      case 'dots':
        return <DotsAnimation size={size} color={color} />;
      case 'pulse':
        return <PulseAnimation size={size} color={color} />;
      case 'skeleton':
        return <SkeletonAnimation size={size} color={color} />;
      case 'spinner':
      default:
        return <SpinnerAnimation size={size} color={color} />;
    }
  };
  
  const content = (
    <Animated.View
      style={[
        styles.container,
        overlay && styles.overlay,
        { backgroundColor: overlay ? backgroundColor : 'transparent' },
        { opacity: fadeAnim },
      ]}
      testID={testID}
    >
      <View style={styles.content}>
        {renderAnimation()}
        {message && (
          <Text
            style={[
              styles.message,
              {
                fontSize: SIZES[size].fontSize,
                color: overlay ? '#ffffff' : color,
              },
            ]}
          >
            {message}
          </Text>
        )}
      </View>
    </Animated.View>
  );
  
  if (overlay) {
    return (
      <SafeAreaView style={styles.safeArea}>
        {content}
      </SafeAreaView>
    );
  }
  
  return content;
};

// Hook para controlar loading state
export const useLoading = (initialState = false) => {
  const [isLoading, setIsLoading] = useState(initialState);
  const [message, setMessage] = useState<string | undefined>();
  
  const showLoading = useCallback((loadingMessage?: string) => {
    setMessage(loadingMessage);
    setIsLoading(true);
  }, []);
  
  const hideLoading = useCallback(() => {
    setIsLoading(false);
    setMessage(undefined);
  }, []);
  
  const withLoading = useCallback(
    async <T,>(promise: Promise<T>, loadingMessage?: string): Promise<T> => {
      try {
        showLoading(loadingMessage);
        const result = await promise;
        return result;
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );
  
  return {
    isLoading,
    message,
    showLoading,
    hideLoading,
    withLoading,
  };
};

// Estilos
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
  },
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  spinner: {
    borderWidth: 3,
    borderRadius: 50,
    borderStyle: 'solid',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 50,
  },
  pulse: {
    borderRadius: 50,
  },
  skeleton: {
    borderRadius: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  skeletonBase: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '50%',
  },
  message: {
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
});

// Exportação padrão para compatibilidade
export default LoadingSpinner;