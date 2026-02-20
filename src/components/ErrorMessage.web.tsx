import React from 'react';
import { View, StyleSheet, Text, ViewStyle } from 'react-native';
import { Button } from './base/Button';
import { useAppTheme } from './ThemeProvider';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  retryText?: string;
  // Backwards-compatible alias used in some screens
  retryLabel?: string;
  style?: ViewStyle;
}

export function ErrorMessage({ message, onRetry, retryText, retryLabel, style }: ErrorMessageProps) {
  const { theme } = useAppTheme();
  const label = retryText ?? retryLabel ?? 'Tentar Novamente';

  return (
    <View style={[styles.container, { borderColor: theme.colors.notification }, style]}>
      <Text style={[styles.message, { color: theme.colors.notification }]}>{message}</Text>
      {onRetry && (
        <Button
          title={label}
          onPress={onRetry}
          variant="secondary"
          style={styles.retryButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff5f5',
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
  },
  message: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    marginTop: 8,
  },
});

export default ErrorMessage;