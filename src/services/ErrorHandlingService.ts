import { Alert } from 'react-native';
import * as Sentry from '@sentry/react-native';

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = __DEV__;
  }

  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  public handleError(error: Error, context?: string): void {
    // Log do erro
    console.error(`[${context || 'App'}] Erro:`, error);

    // Em desenvolvimento, mostra o erro em um Alert
    if (this.isDevelopment) {
      Alert.alert(
        'Erro',
        `${error.message}\n\nContexto: ${context || 'App'}\n\nStack: ${error.stack}`
      );
    }

    // Envia para o Sentry em produção
    if (!this.isDevelopment) {
      Sentry.captureException(error, {
        tags: {
          context: context || 'App',
        },
      });
    }
  }

  public handleApiError(error: any, context?: string): void {
    const errorMessage = error.response?.data?.message || error.message;
    const errorCode = error.response?.status || 'UNKNOWN';

    // Log do erro
    console.error(`[${context || 'API'}] Erro ${errorCode}:`, errorMessage);

    // Em desenvolvimento, mostra o erro em um Alert
    if (this.isDevelopment) {
      Alert.alert(`Erro ${errorCode}`, `${errorMessage}\n\nContexto: ${context || 'API'}`);
    }

    // Envia para o Sentry em produção
    if (!this.isDevelopment) {
      Sentry.captureException(error, {
        tags: {
          context: context || 'API',
          errorCode: errorCode.toString(),
        },
      });
    }
  }

  public handleValidationError(errors: string[], context?: string): void {
    // Log do erro
    console.error(`[${context || 'Validation'}] Erros:`, errors);

    // Em desenvolvimento, mostra os erros em um Alert
    if (this.isDevelopment) {
      Alert.alert(
        'Erro de Validação',
        `${errors.join('\n')}\n\nContexto: ${context || 'Validation'}`
      );
    }

    // Envia para o Sentry em produção
    if (!this.isDevelopment) {
      Sentry.captureException(new Error(errors.join(', ')), {
        tags: {
          context: context || 'Validation',
          type: 'validation',
        },
      });
    }
  }

  public handleNetworkError(error: any, context?: string): void {
    const errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';

    // Log do erro
    console.error(`[${context || 'Network'}] Erro:`, error);

    // Mostra o erro em um Alert
    Alert.alert('Erro de Conexão', errorMessage);

    // Envia para o Sentry em produção
    if (!this.isDevelopment) {
      Sentry.captureException(error, {
        tags: {
          context: context || 'Network',
          type: 'network',
        },
      });
    }
  }
}
