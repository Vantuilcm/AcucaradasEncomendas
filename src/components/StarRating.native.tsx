import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { wp, fontSize, spacing } from '../utils/responsive';

interface StarRatingProps {
  rating: number;
  size?: number;
  maxStars?: number;
  activeColor?: string;
  inactiveColor?: string;
  interactive?: boolean;
  // Alias prop used by some screens; when provided, component should be non-interactive
  readonly?: boolean;
  onRatingChange?: (rating: number) => void;
  style?: any;
}

export function StarRating({
  rating,
  size = 24,
  maxStars = 5,
  activeColor = '#FFD700',
  inactiveColor = '#E0E0E0',
  interactive = false,
  readonly,
  onRatingChange,
  style,
}: StarRatingProps) {
  // Usar wp para tornar o tamanho responsivo baseado na largura da tela
  const responsiveSize = wp(size);
  const starsScale = useSharedValue(Array(maxStars).fill(1));

  // Gera um array com a quantidade de estrelas
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  // Função para animar a estrela ao ser clicada
  const animateStar = (index: number) => {
    const newScale = [...starsScale.value];
    newScale[index] = withSequence(
      withTiming(1.3, { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(1, { duration: 150, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
    );
    starsScale.value = newScale;
  };

  // Se readonly for explicitamente true, não é interativo. 
  // Se interactive for true, é interativo.
  const isInteractive = readonly === true ? false : (interactive || readonly === false);

  const handleRatingChange = (newRating: number) => {
    if (isInteractive && onRatingChange) {
      animateStar(newRating - 1);
      onRatingChange(newRating);
    }
  };

  return (
    <View style={[styles.container, style]}>
      {stars.map(star => {
        const isFilled = star <= Math.round(rating);

        // Criar estilo animado para cada estrela
        const animatedStyle = useAnimatedStyle(() => {
          return {
            transform: [{ scale: starsScale.value[star - 1] }],
          };
        });

        if (isInteractive) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => handleRatingChange(star)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            >
              <Animated.View style={animatedStyle}>
                <Star
                  size={responsiveSize}
                  filled={isFilled}
                  activeColor={activeColor}
                  inactiveColor={inactiveColor}
                />
              </Animated.View>
            </TouchableOpacity>
          );
        }

        return (
          <Animated.View key={star} style={animatedStyle}>
            <Star
              size={responsiveSize}
              filled={isFilled}
              activeColor={activeColor}
              inactiveColor={inactiveColor}
            />
          </Animated.View>
        );
      })}
    </View>
  );
}

interface StarProps {
  size: number;
  filled: boolean;
  activeColor: string;
  inactiveColor: string;
}

// Componente da estrela
function Star({ size, filled, activeColor, inactiveColor }: StarProps) {
  return (
    <View style={{ width: size, height: size, margin: spacing(2) }}>
      <View style={styles.starContainer}>
        <SVGStar size={size} color={filled ? activeColor : inactiveColor} />
      </View>
    </View>
  );
}

// SVG da estrela
function SVGStar({ size, color }: { size: number; color: string }) {
  // Calcular pontos para desenhar a estrela
  const width = size;
  const height = size;
  const centerX = width / 2;
  const centerY = height / 2;
  const outerRadius = width / 2;
  const innerRadius = outerRadius * 0.4;
  const points = [];

  // Criar pontos da estrela
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);
    points.push(`${x},${y}`);
  }

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Polygon points={points.join(' ')} fill={color} stroke={color} strokeWidth={1} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
