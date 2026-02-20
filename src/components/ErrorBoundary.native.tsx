import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform, Linking } from 'react-native';
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
    // Atualiza o state para mostrar a UI de erro
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Gerar ID único para o erro
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.setState({
      errorInfo,
      errorId,
    });

    // Log estruturado do erro
    this.logError(error, errorInfo, errorId);

    // Callback personalizado
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset automático quando props mudam
    if (hasError && resetOnPropsChange) {
      if (resetKeys) {
        const hasResetKeyChanged = resetKeys.some(
          (resetKey, idx) => prevProps.resetKeys?.[idx] !== resetKey
        );
        if (hasResetKeyChanged) {
          this.resetErrorBoundary();
        }
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
      const ctx: Record<string, any> = {
        errorId,
        errorMessage: error.message,
        errorStack: error.stack,
        componentStack: errorInfo.componentStack,
        props: this.sanitizeProps(this.props),
        timestamp: new Date().toISOString(),
        platform: Platform.OS,
      };

      try {
        const ua = typeof navigator !== 'undefined' ? (navigator as any)?.userAgent : undefined;
        if (ua) ctx.userAgent = ua;
      } catch {}

      try {
        const url = typeof window !== 'undefined' ? (window as any)?.location?.href : undefined;
        if (url) ctx.url = url;
      } catch {}

      loggingService.error(
        'ErrorBoundary: Component error caught',
        error,
        ctx
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
    // Remove children e funções para evitar referências circulares
    const { children, onError, ...sanitizedProps } = props;
    return {
      ...sanitizedProps,
      hasChildren: !!children,
      hasOnError: !!onError,
    };
  };

  private resetErrorBoundary = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  private handleRetry = () => {
    this.resetErrorBoundary();
  };

  private handleReload = () => {
    try {
      const isTestEnv =
        typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);

      if (isTestEnv) {
        return;
      }

      const Updates = require('expo-updates');
      if (Updates && typeof Updates.reloadAsync === 'function') {
        Updates.reloadAsync();
      }
    } catch (error) {
      loggingService.error('ErrorBoundary: Failed to reload app', error as any);
    }
  };

  private handleReportIssue = () => {
    const { error, errorId } = this.state;

    if (error && errorId) {
      const issueUrl = `mailto:support@acucaradasencomendas.com.br?subject=Error Report - ${errorId}&body=Error ID: ${errorId}%0AError: ${encodeURIComponent(error.message)}`;

      try {
        Linking.openURL(issueUrl);
      } catch (linkError) {
        loggingService.error('ErrorBoundary: Failed to open mail client', linkError as any);
      }
    }
  };

  private renderErrorDetails = () => {
    const { error, errorInfo, errorId } = this.state;

    // Em produção, mostramos apenas o ID e a mensagem básica para ajudar no suporte
    // Em desenvolvimento, mostramos o stack trace completo
    return (
      <ScrollView style={styles.errorDetails}>
        <Text style={styles.errorDetailsTitle}>
          {__DEV__ ? 'Detalhes do Erro (Desenvolvimento)' : 'Informações de Suporte'}
        </Text>

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

        {__DEV__ && error?.stack && (
          <View style={styles.errorSection}>
            <Text style={styles.errorSectionTitle}>Stack Trace:</Text>
            <Text style={styles.errorText}>{error.stack}</Text>
          </View>
        )}

        {__DEV__ && errorInfo?.componentStack && (
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
      // Renderizar fallback customizado se fornecido
      if (fallback) {
        return fallback;
      }

      // UI de erro padrão
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

    return children;
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: '#007bff',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  errorDetails: {
    marginTop: 24,
    maxHeight: 200,
    backgroundColor: '#f1f3f5',
    borderRadius: 8,
    padding: 12,
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 12,
  },
  errorSection: {
    marginBottom: 12,
  },
  errorSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#868e96',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    color: '#212529',
  },
});

export default ErrorBoundary;
