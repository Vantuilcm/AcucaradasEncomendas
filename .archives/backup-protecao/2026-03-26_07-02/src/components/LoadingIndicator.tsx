import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { useAppTheme } from './ThemeProvider';

interface LoadingIndicatorProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  style?: ViewStyle;
  variant?: 'dots' | 'spinner' | 'pulse';
}

export function LoadingIndicator({
  size = 'medium',
  color,
  style,
  variant = 'dots',
}: LoadingIndicatorProps) {
  const { theme } = useAppTheme();

  // Definir tamanho baseado na prop size
  const getSize = () => {
    switch (size) {
      case 'small':
        return 8;
      case 'large':
        return 16;
      default:
        return 12;
    }
  };

  // Definir a cor baseada na prop color ou usar o tema
  const getColor = () => {
    return color || theme.colors.primary;
  };

  const dotSize = getSize();
  const dotColor = getColor();

  // Implementação de diferentes variantes
  switch (variant) {
    case 'spinner':
      return <SpinnerIndicator size={dotSize} color={dotColor} style={style} />;
    case 'pulse':
      return <PulseIndicator size={dotSize} color={dotColor} style={style} />;
    case 'dots':
    default:
      return <DotsIndicator size={dotSize} color={dotColor} style={style} />;
  }
}

// Indicador de carregamento com pontos pulsantes
function DotsIndicator({ size, color, style }: { size: number; color: string; style?: ViewStyle }) {
  const dot1Scale = useSharedValue(1);
  const dot2Scale = useSharedValue(1);
  const dot3Scale = useSharedValue(1);

  useEffect(() => {
    const animationConfig = {
      duration: 600,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    };

    dot1Scale.value = withRepeat(
      withSequence(withTiming(1.5, animationConfig), withTiming(1, animationConfig)),
      -1,
      false
    );

    dot2Scale.value = withDelay(
      150,
      withRepeat(
        withSequence(withTiming(1.5, animationConfig), withTiming(1, animationConfig)),
        -1,
        false
      )
    );

    dot3Scale.value = withDelay(
      300,
      withRepeat(
        withSequence(withTiming(1.5, animationConfig), withTiming(1, animationConfig)),
        -1,
        false
      )
    );

    return () => {
      cancelAnimation(dot1Scale);
      cancelAnimation(dot2Scale);
      cancelAnimation(dot3Scale);
    };
  }, []);

  const dot1Style = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dot1Scale.value }],
    };
  });

  const dot2Style = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dot2Scale.value }],
    };
  });

  const dot3Style = useAnimatedStyle(() => {
    return {
      transform: [{ scale: dot3Scale.value }],
    };
  });

  return (
    <View style={[styles.dotsContainer, style]}>
      <Animated.View
        style={[
          styles.dot,
          { width: size, height: size, backgroundColor: color, marginHorizontal: size / 2 },
          dot1Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { width: size, height: size, backgroundColor: color, marginHorizontal: size / 2 },
          dot2Style,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { width: size, height: size, backgroundColor: color, marginHorizontal: size / 2 },
          dot3Style,
        ]}
      />
    </View>
  );
}

// Indicador de carregamento girando
function SpinnerIndicator({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: ViewStyle;
}) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: 1000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(rotation);
    };
  }, []);

  const spinnerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotation.value}deg` }],
    };
  });

  return (
    <View style={[styles.spinnerContainer, style]}>
      <Animated.View
        style={[
          styles.spinner,
          {
            width: size * 3,
            height: size * 3,
            borderWidth: size / 4,
            borderColor: color,
            borderTopColor: 'transparent',
          },
          spinnerStyle,
        ]}
      />
    </View>
  );
}

// Indicador de carregamento com pulso
function PulseIndicator({
  size,
  color,
  style,
}: {
  size: number;
  color: string;
  style?: ViewStyle;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(2, {
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      -1,
      false
    );

    opacity.value = withRepeat(
      withTiming(0, {
        duration: 1000,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      -1,
      false
    );

    return () => {
      cancelAnimation(scale);
      cancelAnimation(opacity);
    };
  }, []);

  const pulseStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  return (
    <View style={[styles.pulseContainer, style]}>
      <View
        style={[
          styles.pulse,
          {
            width: size * 2,
            height: size * 2,
            backgroundColor: color,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pulseRing,
          {
            width: size * 2,
            height: size * 2,
            borderColor: color,
            borderWidth: size / 4,
          },
          pulseStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    borderRadius: 50,
  },
  spinnerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    borderRadius: 100,
  },
  pulseContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulse: {
    borderRadius: 100,
  },
  pulseRing: {
    borderRadius: 100,
    position: 'absolute',
  },
});
