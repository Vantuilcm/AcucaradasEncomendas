import { useState, useEffect } from 'react';
import { Keyboard, KeyboardEventListener } from 'react-native';
import { loggingService } from '../services/LoggingService';

interface KeyboardState {
  keyboardShown: boolean;
  keyboardHeight: number;
}

export function useKeyboard(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    keyboardShown: false,
    keyboardHeight: 0,
  });

  useEffect(() => {
    const keyboardWillShow: KeyboardEventListener = event => {
      setKeyboardState({
        keyboardShown: true,
        keyboardHeight: event.endCoordinates.height,
      });
      loggingService.debug('Teclado exibido', { height: event.endCoordinates.height });
    };

    const keyboardWillHide: KeyboardEventListener = () => {
      setKeyboardState({
        keyboardShown: false,
        keyboardHeight: 0,
      });
      loggingService.debug('Teclado ocultado');
    };

    const showSubscription = Keyboard.addListener('keyboardWillShow', keyboardWillShow);
    const hideSubscription = Keyboard.addListener('keyboardWillHide', keyboardWillHide);

    loggingService.debug('Monitor de teclado iniciado');

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
      loggingService.debug('Monitor de teclado removido');
    };
  }, []);

  return keyboardState;
}
