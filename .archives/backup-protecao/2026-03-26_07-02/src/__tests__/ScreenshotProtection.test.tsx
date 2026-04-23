import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { AppState } from 'react-native';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { loggingService } from '../services/LoggingService';
import * as ScreenCapture from '../compat/expoScreenCapture';

// Mock das dependências
jest.mock('../services/LoggingService');

jest.mock('../compat/expoScreenCapture', () => ({
  preventScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  allowScreenCaptureAsync: jest.fn().mockResolvedValue(undefined),
  addScreenshotListener: jest.fn().mockImplementation((callback) => {
    (global as any).triggerScreenshotEvent = callback;
    return { remove: jest.fn() };
  }),
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

    // Mock AppState
    (global as any).triggerAppStateChange = null;
    
    // Tentativa de mock direto se o spy falhar
    if (AppState.addEventListener) {
       jest.spyOn(AppState, 'addEventListener').mockImplementation((event, handler) => {
        (global as any).triggerAppStateChange = handler;
        return { remove: jest.fn() } as any;
      });
    } else {
      console.warn('AppState.addEventListener not found!');
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('deve ativar a proteção contra capturas de tela ao montar', async () => {
    render(<ScreenshotProtection><></></ScreenshotProtection>);
    await waitFor(() => expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(1));
  });

  it('não deve ativar a proteção se enabled=false', () => {
    render(<ScreenshotProtection enabled={false}><></></ScreenshotProtection>);
    expect(ScreenCapture.preventScreenCaptureAsync).not.toHaveBeenCalled();
  });

  it('deve registrar log quando uma captura de tela é detectada', async () => {
    render(<ScreenshotProtection logAttempts={true}><></></ScreenshotProtection>);
    
    // Aguardar o listener ser registrado
    await waitFor(() => expect((global as any).triggerScreenshotEvent).toBeTruthy());

    // Simular evento de screenshot
    act(() => (global as any).triggerScreenshotEvent());
    
    await waitFor(() => {
      expect(loggingService.warn).toHaveBeenCalledWith(
        expect.stringContaining('Captura de tela detectada'),
        expect.anything()
      );
    });
  });

  it('deve chamar onScreenshotDetected quando uma captura é detectada', async () => {
    const onScreenshotDetected = jest.fn();
    render(<ScreenshotProtection onScreenshotDetected={onScreenshotDetected}><></></ScreenshotProtection>);
    
    // Aguardar o listener ser registrado
    await waitFor(() => expect((global as any).triggerScreenshotEvent).toBeTruthy());
    
    act(() => (global as any).triggerScreenshotEvent());
    
    await waitFor(() => expect(onScreenshotDetected).toHaveBeenCalled());
  });

  it('deve enviar relatório ao servidor quando reportToServer=true', async () => {
    // Mock fetch global
    global.fetch = jest.fn().mockResolvedValue({ ok: true } as any);
    
    render(<ScreenshotProtection reportToServer={true}><></></ScreenshotProtection>);
    
    // Aguardar o listener ser registrado
    await waitFor(() => expect((global as any).triggerScreenshotEvent).toBeTruthy());
    
    act(() => (global as any).triggerScreenshotEvent());
    
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/security/report-event',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('screenshot_attempt')
        })
      );
    });
  });

  it('deve desativar a proteção quando o app vai para background e reativar quando volta', async () => {
    render(<ScreenshotProtection><></></ScreenshotProtection>);
    await waitFor(() => expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(1));
    
    // Aguardar o listener ser registrado (pois é async dentro do useEffect)
    await waitFor(() => expect((global as any).triggerAppStateChange).toBeTruthy());

    act(() => (global as any).triggerAppStateChange('background'));
    await waitFor(() => expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledTimes(1));
    
    act(() => (global as any).triggerAppStateChange('active'));
    await waitFor(() => expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(2));
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

    // Aguardar a ativação da proteção
    await waitFor(() => expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalled());
    await waitFor(() => expect(ScreenCapture.addScreenshotListener).toHaveBeenCalled());

    // Simular uma captura de tela
    act(() => {
      if ((global as any).triggerScreenshotEvent) {
        (global as any).triggerScreenshotEvent();
      }
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/security/report-event',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('screenshot_attempt'),
        })
      );
    });
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

    // Aguardar a ativação da proteção e adição dos listeners
    await waitFor(() => expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalled());
    await waitFor(() => expect(ScreenCapture.addScreenshotListener).toHaveBeenCalled());

    const mockRemove = (ScreenCapture.addScreenshotListener as jest.Mock).mock.results[0].value.remove;
    
    unmount();

    expect(mockRemove).toHaveBeenCalled();
    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalled();
  });
});