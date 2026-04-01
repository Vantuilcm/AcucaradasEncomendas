// 🛡️ src/core/monitoring/ErrorBoundary.tsx
// Captura erros de UI e impede o crash total do app.

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { logError } from './logger';
import { handleSelfHeal } from '../selfHeal';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isRecovering: boolean;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false,
      isRecovering: false,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Atualiza o estado para que a próxima renderização mostre a UI de fallback.
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Tentar auto-correção para erros de UI (Etapa 5)
    this.attemptRecovery(error);

    // Log do erro no sistema de monitoramento (Etapa 9)
    logError('JS_ERROR', `UI_CRASH: ${error.message}`, {
      context: 'ErrorBoundary',
      metadata: { errorInfo, stack: error.stack },
      fatal: false,
    });
  }

  attemptRecovery = async (error: Error) => {
    if (this.state.retryCount >= 3) return;

    this.setState({ isRecovering: true });
    
    const success = await handleSelfHeal('UNKNOWN_ERROR', error);
    
    if (success) {
      this.setState(prevState => ({ 
        hasError: false, 
        error: undefined, 
        isRecovering: false,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      this.setState({ isRecovering: false });
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, retryCount: 0 });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.icon}>{this.state.isRecovering ? '🛠️' : '⚠️'}</Text>
          <Text style={styles.title}>
            {this.state.isRecovering ? 'Tentando recuperar...' : 'Ops! Algo deu errado.'}
          </Text>
          <Text style={styles.subtitle}>
            {this.state.isRecovering 
              ? 'Estamos tentando restaurar a interface automaticamente. Por favor, aguarde um momento.'
              : 'Encontramos um erro inesperado na interface, mas não se preocupe, o sistema de monitoramento já registrou a falha.'}
          </Text>
          
          {this.state.isRecovering ? (
            <ActivityIndicator size="large" color="#FF4FD8" />
          ) : (
            <TouchableOpacity style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#F9F7FF',
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B1230',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#FF4FD8',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
