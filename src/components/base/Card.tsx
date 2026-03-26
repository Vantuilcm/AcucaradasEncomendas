import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { spacing } from '../../utils/responsive';
import { useAppTheme } from '../ThemeProvider';

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
  variant = 'default',
}) => {
  const { theme } = useAppTheme();
  const CardContainer = (onPress ? TouchableOpacity : View) as React.ElementType;

  const getVariantStyles = () => {
    switch (variant) {
      case 'outlined':
        return {
          borderWidth: 1,
          borderColor: theme.colors.outline,
          backgroundColor: theme.colors.card,
          elevation: 0,
          shadowOpacity: 0,
        };
      case 'elevated':
        return {
          backgroundColor: theme.colors.card,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 6,
            },
            android: {
              elevation: 4,
            },
          }),
        };
      default:
        return {
          backgroundColor: theme.colors.card,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        };
    }
  };

  return (
    <CardContainer
      style={[styles.container, getVariantStyles(), style]}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={0.8}
    >
      {children}
    </CardContainer>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: spacing(16),
  },
});
