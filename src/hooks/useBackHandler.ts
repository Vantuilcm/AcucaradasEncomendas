import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { loggingService } from '../services/LoggingService';

export function useBackHandler(handler: () => boolean | null | undefined): void {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      try {
        const shouldPreventDefault = handler();

        if (shouldPreventDefault) {
          loggingService.debug('Ação do botão voltar interceptada');
          return true;
        }

        loggingService.debug('Ação do botão voltar executada normalmente');
        return false;
      } catch (err) {
        loggingService.error('Erro ao manipular botão voltar', { error: err });
        return false;
      }
    });

    loggingService.debug('Monitor do botão voltar iniciado');

    return () => {
      subscription.remove();
      loggingService.debug('Monitor do botão voltar removido');
    };
  }, [handler]);
}
