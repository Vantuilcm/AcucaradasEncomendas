import { Alert } from 'react-native';
import { LoggingService } from './LoggingService';
import { captureException } from '../config/sentry';

const logger = LoggingService.getInstance();

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
    logger.error(`[${context || 'App'}] Erro`, error);

    // Em desenvolvimento, mostra o erro em um Alert
    if (this.isDevelopment) {
      Alert.alert(
        'Erro',
        `${error.message}\n\nContexto: ${context || 'App'}\n\nStack: ${error.stack}`
      );
    }

    if (!this.isDevelopment) {
      captureException(error, { context: context || 'App' } as any);
    }
  }

  public handleApiError(error: any, context?: string): void {
    const errorMessage = error.response?.data?.message || error.message;
    const errorCode = error.response?.status || 'UNKNOWN';

    // Log do erro
    logger.error(`[${context || 'API'}] Erro ${errorCode}`, { message: errorMessage, error });

    // Em desenvolvimento, mostra o erro em um Alert
    if (this.isDevelopment) {
      Alert.alert(`Erro ${errorCode}`, `${errorMessage}\n\nContexto: ${context || 'API'}`);
    }

    if (!this.isDevelopment) {
      captureException(error, { context: context || 'API', errorCode: errorCode.toString() } as any);
    }
  }

  public handleValidationError(errors: string[], context?: string): void {
    // Log do erro
    logger.error(`[${context || 'Validation'}] Erros de validação`, { errors });

    // Em desenvolvimento, mostra os erros em um Alert
    if (this.isDevelopment) {
      Alert.alert(
        'Erro de Validação',
        `${errors.join('\n')}\n\nContexto: ${context || 'Validation'}`
      );
    }

    if (!this.isDevelopment) {
      captureException(new Error(errors.join(', ')), { context: context || 'Validation', type: 'validation' } as any);
    }
  }

  public handleNetworkError(error: any, context?: string): void {
    const errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';

    // Log do erro
    logger.error(`[${context || 'Network'}] Erro de rede`, error);

    // Mostra o erro em um Alert
    Alert.alert('Erro de Conexão', errorMessage);

    if (!this.isDevelopment) {
      captureException(error, { context: context || 'Network', type: 'network' } as any);
    }
  }
}
