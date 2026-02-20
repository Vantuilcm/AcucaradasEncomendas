import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

// Tipos para diferentes estados de loading
type LoadingType = 'spinner' | 'dots' | 'pulse' | 'skeleton' | 'progress';
type LoadingSize = 'small' | 'medium' | 'large';
type LoadingVariant = 'primary' | 'secondary' | 'light' | 'dark';

interface LoadingComponentProps {
  type?: LoadingType;
  size?: LoadingSize;
  variant?: LoadingVariant;
  message?: string;
  subMessage?: string;
  progress?: number; // 0-100 para tipo 'progress'
  overlay?: boolean;
  transparent?: boolean;
  fullScreen?: boolean;
  color?: string;
  backgroundColor?: string;
  testID?: string;
}

// Componente de Spinner animado
const SpinnerLoader: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
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

  const sizeMap = {
    small: 20,
    medium: 40,
    large: 60,
  };

  return (
    <Animated.View
      style={[
        styles.spinner,
        {
          width: sizeMap[size],
          height: sizeMap[size],
          borderColor: color,
          transform: [{ rotate: spin }],
        },
      ]}
    />
  );
};

// Componente de Dots animados
const DotsLoader: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const animations = [animateDot(dot1, 0), animateDot(dot2, 200), animateDot(dot3, 400)];

    animations.forEach(anim => anim.start());

    return () => animations.forEach(anim => anim.stop());
  }, [dot1, dot2, dot3]);

  const sizeMap = {
    small: 6,
    medium: 10,
    large: 14,
  };

  const dotSize = sizeMap[size];

  const renderDot = (animatedValue: Animated.Value, index: number) => {
    const scale = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1.2],
    });

    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <Animated.View
        key={index}
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            backgroundColor: color,
            transform: [{ scale }],
            opacity,
          },
        ]}
      />
    );
  };

  return (
    <View style={styles.dotsContainer}>
      {renderDot(dot1, 0)}
      {renderDot(dot2, 1)}
      {renderDot(dot3, 2)}
    </View>
  );
};

// Componente de Pulse animado
const PulseLoader: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
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

  const sizeMap = {
    small: 30,
    medium: 50,
    large: 70,
  };

  const scale = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 1.2],
  });

  const opacity = pulseValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 1],
  });

  return (
    <Animated.View
      style={[
        styles.pulse,
        {
          width: sizeMap[size],
          height: sizeMap[size],
          backgroundColor: color,
          transform: [{ scale }],
          opacity,
        },
      ]}
    />
  );
};

// Componente de Skeleton
const SkeletonLoader: React.FC<{ size: LoadingSize; color: string }> = ({ size, color }) => {
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

  const sizeMap = {
    small: { width: 150, height: 80 },
    medium: { width: 200, height: 120 },
    large: { width: 250, height: 160 },
  };

  const { width: skeletonWidth, height: skeletonHeight } = sizeMap[size];

  return (
    <View style={styles.skeletonContainer}>
      {/* Linha principal */}
      <View
        style={[
          styles.skeletonLine,
          {
            width: skeletonWidth,
            height: 20,
            backgroundColor: color,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.skeletonShimmer,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </View>

      {/* Linha secundária */}
      <View
        style={[
          styles.skeletonLine,
          {
            width: skeletonWidth * 0.7,
            height: 16,
            backgroundColor: color,
            marginTop: 8,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.skeletonShimmer,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </View>

      {/* Linha terciária */}
      <View
        style={[
          styles.skeletonLine,
          {
            width: skeletonWidth * 0.5,
            height: 16,
            backgroundColor: color,
            marginTop: 8,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.skeletonShimmer,
            {
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
    </View>
  );
};

// Componente de Progress Bar
const ProgressLoader: React.FC<{
  size: LoadingSize;
  color: string;
  progress: number;
  backgroundColor: string;
}> = ({ size, color, progress, backgroundColor }) => {
  const progressValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progressValue, {
      toValue: progress / 100,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressValue]);

  const sizeMap = {
    small: { width: 150, height: 4 },
    medium: { width: 200, height: 6 },
    large: { width: 250, height: 8 },
  };

  const { width: progressWidth, height: progressHeight } = sizeMap[size];

  const animatedWidth = progressValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, progressWidth],
  });

  return (
    <View style={styles.progressContainer}>
      <View
        style={[
          styles.progressTrack,
          {
            width: progressWidth,
            height: progressHeight,
            backgroundColor,
          },
        ]}
      >
        <Animated.View
          style={[
            styles.progressFill,
            {
              width: animatedWidth,
              height: progressHeight,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      <Text style={[styles.progressText, { color }]}>{Math.round(progress)}%</Text>
    </View>
  );
};

// Componente principal de Loading
export const LoadingComponent: React.FC<LoadingComponentProps> = ({
  type = 'spinner',
  size = 'medium',
  variant = 'primary',
  message,
  subMessage,
  progress = 0,
  overlay = false,
  transparent = false,
  fullScreen = false,
  color,
  backgroundColor,
  testID = 'loading-component',
}) => {
  // Cores baseadas na variante
  const getColors = () => {
    const variants = {
      primary: {
        color: color || '#007bff',
        backgroundColor:
          backgroundColor || (transparent ? 'transparent' : 'rgba(255, 255, 255, 0.95)'),
      },
      secondary: {
        color: color || '#6c757d',
        backgroundColor:
          backgroundColor || (transparent ? 'transparent' : 'rgba(248, 249, 250, 0.95)'),
      },
      light: {
        color: color || '#f8f9fa',
        backgroundColor: backgroundColor || (transparent ? 'transparent' : 'rgba(0, 0, 0, 0.8)'),
      },
      dark: {
        color: color || '#212529',
        backgroundColor:
          backgroundColor || (transparent ? 'transparent' : 'rgba(255, 255, 255, 0.95)'),
      },
    };

    return variants[variant];
  };

  const colors = getColors();

  // Renderizar o loader baseado no tipo
  const renderLoader = () => {
    switch (type) {
      case 'dots':
        return <DotsLoader size={size} color={colors.color} />;
      case 'pulse':
        return <PulseLoader size={size} color={colors.color} />;
      case 'skeleton':
        return <SkeletonLoader size={size} color={colors.color} />;
      case 'progress':
        return (
          <ProgressLoader
            size={size}
            color={colors.color}
            progress={progress}
            backgroundColor={colors.backgroundColor}
          />
        );
      case 'spinner':
      default:
        return <SpinnerLoader size={size} color={colors.color} />;
    }
  };

  // Container baseado nas props
  const Container = fullScreen ? SafeAreaView : View;

  const containerStyle = [
    overlay || fullScreen ? styles.overlay : styles.inline,
    fullScreen && styles.fullScreen,
    {
      backgroundColor: overlay || fullScreen ? colors.backgroundColor : 'transparent',
    },
  ];

  return (
    <Container style={containerStyle} testID={testID}>
      <View style={styles.content}>
        {renderLoader()}

        {message && <Text style={[styles.message, { color: colors.color }]}>{message}</Text>}

        {subMessage && (
          <Text style={[styles.subMessage, { color: colors.color }]}>{subMessage}</Text>
        )}
      </View>
    </Container>
  );
};

// Hook para controlar loading global
export const useLoading = () => {
  const [loading, setLoading] = React.useState(false);
  const [loadingConfig, setLoadingConfig] = React.useState<Partial<LoadingComponentProps>>({});

  const showLoading = React.useCallback((config?: Partial<LoadingComponentProps>) => {
    setLoadingConfig(config || {});
    setLoading(true);
  }, []);

  const hideLoading = React.useCallback(() => {
    setLoading(false);
    setLoadingConfig({});
  }, []);

  const updateProgress = React.useCallback((progress: number) => {
    setLoadingConfig(prev => ({ ...prev, progress }));
  }, []);

  return {
    loading,
    loadingConfig,
    showLoading,
    hideLoading,
    updateProgress,
  };
};

// Estilos
const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  fullScreen: {
    width,
    height,
  },
  inline: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinner: {
    borderWidth: 3,
    borderTopColor: 'transparent',
    borderRightColor: 'transparent',
    borderRadius: 50,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    borderRadius: 50,
  },
  pulse: {
    borderRadius: 50,
  },
  skeletonContainer: {
    alignItems: 'flex-start',
  },
  skeletonLine: {
    borderRadius: 4,
    overflow: 'hidden',
    opacity: 0.3,
  },
  skeletonShimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  progressContainer: {
    alignItems: 'center',
    gap: 8,
  },
  progressTrack: {
    borderRadius: 10,
    overflow: 'hidden',
    opacity: 0.3,
  },
  progressFill: {
    borderRadius: 10,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  message: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
  },
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.7,
  },
});

export default LoadingComponent;
