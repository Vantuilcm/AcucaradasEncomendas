import { Alert } from 'react-native';
import LoggingService from './LoggingService';

const logger = LoggingService.getInstance();

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = typeof window !== 'undefined' ? (window as any).__DEV__ ?? true : true;
  }

  public static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  public handleError(error: Error, context?: string): void {
    logger.error(`[${context || 'App'}] Erro:`, error);

    if (this.isDevelopment) {
      Alert.alert('Erro', `${error.message}`);
    }
  }

  public handleApiError(error: any, context?: string): void {
    const errorMessage = error?.response?.data?.message || error?.message || 'Erro';
    const errorCode = error?.response?.status || 'UNKNOWN';

    logger.error(`[${context || 'API'}] Erro ${errorCode}:`, error instanceof Error ? error : new Error(errorMessage), { errorCode });

    if (this.isDevelopment) {
      Alert.alert(`Erro ${errorCode}`, `${errorMessage}`);
    }
  }

  public handleValidationError(errors: string[], context?: string): void {
    logger.error(`[${context || 'Validation'}] Erros:`, new Error('Validation Error'), { errors });

    if (this.isDevelopment) {
      Alert.alert('Erro de Validação', `${errors.join('\n')}`);
    }
  }

  public handleNetworkError(error: any, context?: string): void {
    const errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';

    logger.error(`[${context || 'Network'}] Erro:`, error instanceof Error ? error : new Error(String(error)));

    Alert.alert('Erro de Conexão', errorMessage);
  }
}
