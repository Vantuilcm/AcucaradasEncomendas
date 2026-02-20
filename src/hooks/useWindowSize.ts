import { useState, useEffect } from 'react';
import { Dimensions } from 'react-native';
import { loggingService } from '../services/LoggingService';

interface WindowSize {
  width: number;
  height: number;
}

export function useWindowSize(): WindowSize {
  const [windowSize, setWindowSize] = useState<WindowSize>({
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  });

  useEffect(() => {
    const handleResize = ({ window }: { window: WindowSize }) => {
      setWindowSize({
        width: window.width,
        height: window.height,
      });
      loggingService.debug('Dimensões da janela atualizadas', {
        width: window.width,
        height: window.height,
      });
    };

    const subscription = Dimensions.addEventListener('change', handleResize);

    loggingService.debug('Monitor de dimensões da janela iniciado', windowSize);

    return () => {
      subscription.remove();
      loggingService.debug('Monitor de dimensões da janela removido');
    };
  }, []);

  return windowSize;
}
