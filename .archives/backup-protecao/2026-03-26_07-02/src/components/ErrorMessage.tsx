import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  actionLabel?: string;
}

export function ErrorMessage({
  message,
  onRetry,
  retryLabel,
  actionLabel,
}: ErrorMessageProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Text variant="bodyLarge" style={[styles.message, { color: theme.colors.error }]}>
        {message}
      </Text>
      {onRetry && (
        <Button
          mode="contained"
          onPress={onRetry}
          style={[styles.retryButton, { backgroundColor: theme.colors.error }]}
        >
          {retryLabel || actionLabel || 'Tentar Novamente'}
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
