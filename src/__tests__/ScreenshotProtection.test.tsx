import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import * as ScreenCapture from 'expo-screen-capture';
import { loggingService } from '../services/LoggingService';
import { AppState } from 'react-native';

// Mock das dependências externas
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  allowScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  addScreenshotListener: jest.fn().mockImplementation((callback) => {
    // Armazenar o callback para poder disparar eventos de screenshot manualmente nos testes
    (global as any).triggerScreenshotEvent = callback;
    return { remove: jest.fn() };
  }),
}));

// Mock do AppState
jest.mock('react-native', () => {
  const reactNative = jest.requireActual('react-native');
  return {
    ...reactNative,
    AppState: {
      ...reactNative.AppState,
      addEventListener: jest.fn().mockImplementation((event, callback) => {
        // Armazenar o callback para poder disparar eventos de mudança de estado manualmente
        if (event === 'change') {
          (global as any).triggerAppStateChange = callback;
        }
        return { remove: jest.fn() };
      }),
      currentState: 'active',
    },
  };
});

jest.mock('../services/LoggingService', () => ({
  loggingService: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock do fetch para testar reportToServer
global.fetch = jest.fn().mockImplementation(() => Promise.resolve({
  ok: true,
  json: () => Promise.resolve({}),
}));

describe('ScreenshotProtection Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Limpar o trigger de screenshot entre os testes
    (global as any).triggerScreenshotEvent = undefined;
  });

  it('deve ativar a proteção contra capturas de tela ao montar', async () => {
    render(
      <ScreenshotProtection>
        <></>  
      </ScreenshotProtection>
    );

    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalled();
  });

  it('não deve ativar a proteção se enabled=false', async () => {
    render(
      <ScreenshotProtection enabled={false}>
        <></>
      </ScreenshotProtection>
    );

    expect(ScreenCapture.preventScreenCaptureAsync).not.toHaveBeenCalled();
  });

  it('deve registrar log quando uma captura de tela é detectada', async () => {
    render(
      <ScreenshotProtection logAttempts={true}>
        <></>
      </ScreenshotProtection>
    );

    // Simular uma captura de tela
    act(() => {
      if ((global as any).triggerScreenshotEvent) {
        (global as any).triggerScreenshotEvent();
      }
    });

    expect(loggingService.warn).toHaveBeenCalledWith(
      'Captura de tela detectada em conteúdo protegido',
      expect.objectContaining({
        component: 'ScreenshotProtection',
        securityEvent: 'screenshot_attempt',
      })
    );
  });

  it('deve chamar onScreenshotDetected quando uma captura é detectada', async () => {
    const mockCallback = jest.fn();
    
    render(
      <ScreenshotProtection onScreenshotDetected={mockCallback}>
        <></>
      </ScreenshotProtection>
    );

    // Simular uma captura de tela
    act(() => {
      if ((global as any).triggerScreenshotEvent) {
        (global as any).triggerScreenshotEvent();
      }
    });

    expect(mockCallback).toHaveBeenCalled();
  });
  
  it('deve enviar relatório ao servidor quando reportToServer=true', async () => {
    render(
      <ScreenshotProtection reportToServer={true}>
        <></>
      </ScreenshotProtection>
    );

    // Simular uma captura de tela
    act(() => {
      if ((global as any).triggerScreenshotEvent) {
        (global as any).triggerScreenshotEvent();
      }
    });

    // Verificar se fetch foi chamado para enviar o relatório
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/security/report'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json'
        }),
        body: expect.any(String)
      })
    );
  });
  
  it('deve desativar a proteção quando o app vai para background e reativar quando volta', async () => {
    render(
      <ScreenshotProtection>
        <></>
      </ScreenshotProtection>
    );

    // Verificar que a proteção foi ativada inicialmente
    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(1);
    
    // Simular app indo para background
    act(() => {
      if ((global as any).triggerAppStateChange) {
        (global as any).triggerAppStateChange('background');
      }
    });
    
    // Verificar que a proteção foi desativada
    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledTimes(1);
    
    // Simular app voltando para foreground
    act(() => {
      if ((global as any).triggerAppStateChange) {
        (global as any).triggerAppStateChange('active');
      }
    });
    
    // Verificar que a proteção foi reativada
    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(2);
  });
  
  it('deve lidar corretamente com erros ao ativar a proteção', async () => {
    // Simular um erro ao ativar a proteção
    (ScreenCapture.preventScreenCaptureAsync as jest.Mock).mockRejectedValueOnce(new Error('Erro ao ativar proteção'));
    
    render(
      <ScreenshotProtection>
        <></>
      </ScreenshotProtection>
    );
    
    // Aguardar a rejeição da Promise
    await waitFor(() => {
      expect(loggingService.error).toHaveBeenCalledWith(
        expect.stringContaining('Erro ao ativar proteção contra capturas de tela'),
        expect.objectContaining({
          error: expect.any(Object),
          component: 'ScreenshotProtection'
        })
      );
    });
  });

  it('deve enviar relatório para o servidor quando reportToServer=true', async () => {
    render(
      <ScreenshotProtection reportToServer={true}>
        <></>
      </ScreenshotProtection>
    );

    // Simular uma captura de tela
    act(() => {
      if ((global as any).triggerScreenshotEvent) {
        (global as any).triggerScreenshotEvent();
      }
    });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/security/report-event',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('screenshot_attempt'),
      })
    );
  });

  it('deve lidar com erros na API de captura de tela', async () => {
    // Simular falha na API
    (ScreenCapture.preventScreenCaptureAsync as jest.Mock).mockRejectedValueOnce(
      new Error('API Error')
    );

    render(
      <ScreenshotProtection>
        <></>
      </ScreenshotProtection>
    );

    await waitFor(() => {
      expect(loggingService.error).toHaveBeenCalledWith(
        'Erro ao ativar proteção contra capturas de tela',
        expect.objectContaining({
          error: expect.any(Error),
        })
      );
    });
  });

  it('deve limpar os listeners ao desmontar', async () => {
    const { unmount } = render(
      <ScreenshotProtection>
        <></>
      </ScreenshotProtection>
    );

    const mockRemove = (ScreenCapture.addScreenshotListener as jest.Mock).mock.results[0].value.remove;
    
    unmount();

    expect(mockRemove).toHaveBeenCalled();
    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalled();
  });
});