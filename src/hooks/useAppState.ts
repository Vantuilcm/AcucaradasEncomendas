import { useState, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { loggingService } from '../services/LoggingService';

interface AppStateInfo {
  currentState: AppStateStatus;
  previousState: AppStateStatus | null;
}

export function useAppState(): AppStateInfo {
  const [appState, setAppState] = useState<AppStateInfo>({
    currentState: AppState.currentState,
    previousState: null,
  });

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(prevState => ({
        previousState: prevState.currentState,
        currentState: nextAppState,
      }));

      switch (nextAppState) {
        case 'active':
          loggingService.info('Aplicativo ativado');
          break;
        case 'background':
          loggingService.info('Aplicativo em background');
          break;
        case 'inactive':
          loggingService.info('Aplicativo inativo');
          break;
        default:
          loggingService.debug('Estado do aplicativo alterado', { state: nextAppState });
      }
    });

    loggingService.debug('Monitor de estado do aplicativo iniciado');

    return () => {
      subscription.remove();
      loggingService.debug('Monitor de estado do aplicativo removido');
    };
  }, []);

  return appState;
}
