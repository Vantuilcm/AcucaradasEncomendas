import { useState, useEffect } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { loggingService } from '../services/LoggingService';

interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  details: NetInfoState['details'];
}

export function useNetwork(): NetworkState {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
    type: 'unknown',
    details: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
        details: state.details,
      });

      if (state.isConnected) {
        loggingService.info('Conexão estabelecida', {
          type: state.type,
          isInternetReachable: state.isInternetReachable,
        });
      } else {
        loggingService.warn('Conexão perdida', {
          type: state.type,
          isInternetReachable: state.isInternetReachable,
        });
      }
    });

    loggingService.debug('Monitor de conexão iniciado');

    return () => {
      unsubscribe();
      loggingService.debug('Monitor de conexão removido');
    };
  }, []);

  return networkState;
}
