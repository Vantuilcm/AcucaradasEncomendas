import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tipos para o estado do Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
  retryCount: number;
}

// Props do Error Boundary
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, retry: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, errorId: string) => void;
  maxRetries?: number;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
  level?: 'app' | 'screen' | 'component';
}

// Serviço de logging de erros
class ErrorLogger {
  private static instance: ErrorLogger;

  static getInstance(): ErrorLogger {
    if (!ErrorLogger.instance) {
      ErrorLogger.instance = new ErrorLogger();
    }
    return ErrorLogger.instance;
  }

  logError(error: Error, errorInfo: ErrorInfo, errorId: string, level: string) {
    const errorData = {
      errorId,
      level,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location?.href || 'react-native-app',
    };

    // Em produção, enviar para serviço de monitoramento
    if (__DEV__) {
      console.group(`🚨 Error Boundary [${level}] - ${errorId}`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Error Data:', errorData);
      console.groupEnd();
    } else {
      // Enviar para Sentry, Crashlytics, etc.
      this.sendToMonitoringService(errorData);
    }
  }

  private sendToMonitoringService(errorData: any) {
    // Implementar integração com serviços de monitoramento
    // Exemplo: Sentry.captureException(errorData);
    try {
      // Placeholder para integração real
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      }).catch(() => {
        // Falha silenciosa para não causar loops de erro
      });
    } catch {
      // Falha silenciosa
    }
  }
}

// Componente Error Boundary principal
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;
  private errorLogger = ErrorLogger.getInstance();

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    return {
      hasError: true,
      error,
      errorId,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const { onError, level = 'component' } = this.props;
    const { errorId } = this.state;

    if (errorId) {
      // Log do erro
      this.errorLogger.logError(error, errorInfo, errorId, level);

      // Callback personalizado
      onError?.(error, errorInfo, errorId);

      // Atualizar estado com informações do erro
      this.setState({
        errorInfo,
      });
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    // Reset automático quando props mudam
    if (hasError && resetOnPropsChange && resetKeys) {
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => prevProps.resetKeys?.[index] !== key
      );

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

  resetErrorBoundary = () => {
    const { maxRetries = 3 } = this.props;
    const { retryCount } = this.state;

    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: retryCount + 1,
      });
    }
  };

  handleRetry = () => {
    this.resetErrorBoundary();
  };

  handleReload = () => {
    // Em React Native, podemos usar um callback para recarregar a tela
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload();
    } else {
      // Para React Native, resetar o estado
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: 0,
      });
    }
  };

  render() {
    const { hasError, error, errorInfo, retryCount } = this.state;
    const { children, fallback, maxRetries = 3, level = 'component' } = this.props;

    if (hasError && error && errorInfo) {
      // Usar fallback customizado se fornecido
      if (fallback) {
        return fallback(error, errorInfo, this.handleRetry);
      }

      // Fallback padrão baseado no nível
      return this.renderDefaultErrorUI(error, retryCount, maxRetries, level);
    }

    return children;
  }

  private renderDefaultErrorUI(
    error: Error,
    retryCount: number,
    maxRetries: number,
    level: string
  ) {
    const canRetry = retryCount < maxRetries;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.errorContainer}>
            {/* Ícone de erro */}
            <View style={styles.iconContainer}>
              <Text style={styles.errorIcon}>⚠️</Text>
            </View>

            {/* Título baseado no nível */}
            <Text style={styles.title}>{this.getErrorTitle(level)}</Text>

            {/* Mensagem de erro */}
            <Text style={styles.message}>{this.getErrorMessage(error, level)}</Text>

            {/* Informações técnicas (apenas em desenvolvimento) */}
            {__DEV__ && (
              <View style={styles.technicalInfo}>
                <Text style={styles.technicalTitle}>Informações Técnicas:</Text>
                <Text style={styles.technicalText}>{error.message}</Text>
                {error.stack && (
                  <Text style={styles.technicalText}>{error.stack.substring(0, 500)}...</Text>
                )}
              </View>
            )}

            {/* Botões de ação */}
            <View style={styles.buttonContainer}>
              {canRetry && (
                <TouchableOpacity
                  style={[styles.button, styles.retryButton]}
                  onPress={this.handleRetry}
                >
                  <Text style={styles.buttonText}>
                    Tentar Novamente ({maxRetries - retryCount} restantes)
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.button, styles.reloadButton]}
                onPress={this.handleReload}
              >
                <Text style={styles.buttonText}>Recarregar Aplicativo</Text>
              </TouchableOpacity>
            </View>

            {/* Informações de contato */}
            <View style={styles.contactInfo}>
              <Text style={styles.contactText}>
                Se o problema persistir, entre em contato com o suporte.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  private getErrorTitle(level: string): string {
    switch (level) {
      case 'app':
        return 'Ops! Algo deu errado';
      case 'screen':
        return 'Erro na tela';
      case 'component':
      default:
        return 'Erro no componente';
    }
  }

  private getErrorMessage(error: Error, level: string): string {
    if (__DEV__) {
      return error.message;
    }

    switch (level) {
      case 'app':
        return 'Ocorreu um erro inesperado no aplicativo. Tente novamente ou recarregue a página.';
      case 'screen':
        return 'Não foi possível carregar esta tela. Tente novamente.';
      case 'component':
      default:
        return 'Um componente encontrou um problema. Tente atualizar a página.';
    }
  }
}

// HOC para facilitar o uso
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook para usar Error Boundary programaticamente
export function useErrorHandler() {
  return React.useCallback((error: Error, errorInfo?: ErrorInfo) => {
    // Simular erro para acionar Error Boundary
    throw error;
  }, []);
}

// Estilos
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  iconContainer: {
    marginBottom: 16,
  },
  errorIcon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  technicalInfo: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  technicalTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#495057',
    marginBottom: 8,
  },
  technicalText: {
    fontSize: 12,
    color: '#6c757d',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryButton: {
    backgroundColor: '#007bff',
  },
  reloadButton: {
    backgroundColor: '#28a745',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactInfo: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  contactText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
});

export default ErrorBoundary;
