import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { spacing } from '../../utils/responsive';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  animationDelay?: number;
  variant?: 'default' | 'elevated' | 'outlined';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  onPressIn,
  onPressOut,
  animationDelay,
  variant = 'default',
}) => {
  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={[styles.container, style]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
    >
      {children}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: spacing(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
