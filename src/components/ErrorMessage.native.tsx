import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
  // Backwards-compatible alias used in some screens
  retryLabel?: string;
  style?: ViewStyle;
}

export function ErrorMessage({
  message,
  onRetry,
  retryText,
  retryLabel,
  style,
}: ErrorMessageProps) {
  const theme = useTheme();
  const label = retryText ?? retryLabel ?? 'Tentar Novamente';

  return (
    <View style={[styles.container, style]}>
      <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.error }]}>
        {message}
      </Text>
      {onRetry && (
        <Button
          mode="contained"
          onPress={onRetry}
          style={[styles.retryButton, { backgroundColor: theme.colors.error }]}
        >
          {label}
        </Button>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffebee',
    borderRadius: 8,
    marginVertical: 8,
  },
  message: {
    marginBottom: 8,
  },
  retryButton: {
    marginTop: 8,
  },
});
