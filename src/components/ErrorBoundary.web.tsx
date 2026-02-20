import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { loggingService } from '../services/LoggingService';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.setState({ errorInfo, errorId });

    this.logError(error, errorInfo, errorId);

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    // Sem integração com Sentry na web
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some((resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey);
      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  private logError = (error: Error, errorInfo: ErrorInfo, errorId: string) => {
    try {
      loggingService.error(
        'ErrorBoundary (web): Component error caught',
        error,
        {
          errorId,
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: errorInfo.componentStack,
          props: this.sanitizeProps(this.props),
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location?.href,
        }
      );
    } catch (loggingError) {
      // Fallback se o logging falhar
      if (__DEV__) {
        const logger = require('../services/LoggingService').default.getInstance();
        logger.error('Failed to log error in ErrorBoundary fallback', loggingError instanceof Error ? loggingError : new Error(String(loggingError)));
        logger.error('Original error caught by ErrorBoundary', error instanceof Error ? error : new Error(String(error)));
      }
    }
  };

  private sanitizeProps = (props: Props): any => {
    const { children, onError, ...sanitizedProps } = props;
    return { ...sanitizedProps, hasChildren: !!children, hasOnError: !!onError };
  };

  private resetErrorBoundary = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  private handleReportIssue = () => {
    const { error, errorId } = this.state;
    if (error && errorId) {
      const issueUrl = `mailto:support@acucaradasencomendas.com.br?subject=Error Report - ${errorId}&body=Error ID: ${errorId}%0AError: ${encodeURIComponent(error.message)}`;
      window.open(issueUrl, '_blank');
    }
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;
    if (!__DEV__) return null;
    return (
      <ScrollView style={styles.errorDetails}>
        <Text style={styles.errorDetailsTitle}>Detalhes do Erro (Desenvolvimento)</Text>
        {errorId && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>ID do Erro:</Text>
            <Text style={styles.errorText}>{errorId}</Text>
          </View>
        )}
        {error && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>Mensagem:</Text>
            <Text style={styles.errorText}>{error.message}</Text>
          </View>
        )}
        {error?.stack && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>Stack Trace:</Text>
            <Text style={styles.errorText}>{error.stack}</Text>
          </View>
        )}
        {errorInfo?.componentStack && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>Component Stack:</Text>
            <Text style={styles.errorText}>{errorInfo.componentStack}</Text>
          </View>
        )}
      </ScrollView>
    );
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;
    if (hasError) {
      if (fallback) return fallback;
      return (
        <View style={styles.container}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorTitle}>Oops! Algo deu errado</Text>
            <Text style={styles.errorMessage}>
              Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para
              resolver o problema.
            </Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.primaryButton} onPress={this.handleRetry}>
                <Text style={styles.primaryButtonText}>Tentar Novamente</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={this.handleReload}>
                <Text style={styles.secondaryButtonText}>Recarregar App</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.tertiaryButton} onPress={this.handleReportIssue}>
                <Text style={styles.tertiaryButtonText}>Reportar Problema</Text>
              </TouchableOpacity>
            </View>
            {this.renderErrorDetails()}
          </View>
        </View>
      );
    }
    return children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorIcon: { fontSize: 48, textAlign: 'center', marginBottom: 16 },
  errorTitle: { fontSize: 24, fontWeight: 'bold', color: '#dc3545', textAlign: 'center', marginBottom: 12 },
  errorMessage: { fontSize: 16, color: '#6c757d', textAlign: 'center', lineHeight: 24, marginBottom: 24 },
  buttonContainer: { gap: 12 },
  primaryButton: { backgroundColor: '#FF69B4', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  primaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  secondaryButton: { backgroundColor: '#6c757d', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center' },
  secondaryButtonText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
  tertiaryButton: { backgroundColor: 'transparent', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#dee2e6' },
  tertiaryButtonText: { color: '#6c757d', fontSize: 16, fontWeight: '600' },
  errorDetails: { marginTop: 24, maxHeight: 200, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 12 },
  errorDetailsTitle: { fontSize: 14, fontWeight: 'bold', color: '#495057', marginBottom: 12 },
  errorSection: { marginBottom: 12 },
  errorSectionTitle: { fontSize: 12, fontWeight: '600', color: '#6c757d', marginBottom: 4 },
  errorText: { fontSize: 11, color: '#495057', fontFamily: 'monospace', lineHeight: 16 },
});

export default ErrorBoundary;
export type { Props as ErrorBoundaryProps };
