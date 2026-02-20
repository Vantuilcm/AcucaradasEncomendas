import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { wp, spacing } from '../utils/responsive';

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
  const responsiveSize = wp(size);
  const starsScale = useSharedValue(Array(maxStars).fill(1));
  const stars = Array.from({ length: maxStars }, (_, i) => i + 1);

  const animateStar = (index: number) => {
    const newScale = [...starsScale.value];
    newScale[index] = withSequence(
      withTiming(1.2, { duration: 120, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
      withTiming(1, { duration: 120, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
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
        const animatedStyle = useAnimatedStyle(() => ({
          transform: [{ scale: starsScale.value[star - 1] }],
        }));

        const StarChar = (
          <Text
            style={{
              fontSize: responsiveSize,
              color: isFilled ? activeColor : inactiveColor,
              lineHeight: responsiveSize,
            }}
          >
            {isFilled ? '★' : '☆'}
          </Text>
        );

        if (isInteractive) {
          return (
            <TouchableOpacity
              key={star}
              onPress={() => handleRatingChange(star)}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 5, right: 5 }}
            >
              <Animated.View style={[styles.starContainer, animatedStyle]}>{StarChar}</Animated.View>
            </TouchableOpacity>
          );
        }

        return (
          <Animated.View key={star} style={[styles.starContainer, animatedStyle]}>
            {StarChar}
          </Animated.View>
        );
      })}
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
    margin: spacing(2),
  },
});