import { Platform } from 'react-native';
import { File } from '../utils/fs-shim';
// Prefer expo-device for device information; fallback gracefully if unavailable
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Device: any = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('expo-device');
  } catch {
    return null;
  }
})();
import { loggingService } from './LoggingService';

const ENABLE_DEVICE_SECURITY_CHECKS = process.env.EXPO_PUBLIC_ENABLE_DEVICE_SECURITY_CHECKS === 'true'

/**
 * Serviço responsável por verificar a segurança do dispositivo
 * Detecta se o dispositivo está com root (Android) ou jailbreak (iOS)
 */
export class DeviceSecurityService {
  // Lista de aplicativos comuns de root no Android
  private static readonly ANDROID_ROOT_APPS = [
    'com.noshufou.android.su',
    'com.noshufou.android.su.elite',
    'eu.chainfire.supersu',
    'com.koushikdutta.superuser',
    'com.thirdparty.superuser',
    'com.yellowes.su',
    'com.topjohnwu.magisk',
    'com.kingroot.kinguser',
    'com.kingo.root',
    'com.smedialink.oneclickroot',
    'com.zhiqupk.root.global',
    'com.alephzain.framaroot',
  ];

  // Lista de caminhos comuns de binários de root no Android
  private static readonly ANDROID_ROOT_PATHS = [
    '/system/app/Superuser.apk',
    '/system/xbin/su',
    '/system/bin/su',
    '/sbin/su',
    '/system/su',
    '/system/bin/.ext/.su',
    '/system/usr/we-need-root/su',
    '/system/xbin/mu',
    '/data/local/xbin/su',
    '/data/local/bin/su',
    '/system/sd/xbin/su',
    '/system/bin/failsafe/su',
    '/su/bin/su',
  ];

  // Lista de caminhos comuns de aplicativos de jailbreak no iOS
  private static readonly IOS_JAILBREAK_PATHS = [
    '/Applications/Cydia.app',
    '/Applications/blackra1n.app',
    '/Applications/FakeCarrier.app',
    '/Applications/Icy.app',
    '/Applications/IntelliScreen.app',
    '/Applications/MxTube.app',
    '/Applications/RockApp.app',
    '/Applications/SBSettings.app',
    '/Applications/WinterBoard.app',
    '/Library/MobileSubstrate/MobileSubstrate.dylib',
    '/Library/MobileSubstrate/DynamicLibraries/LiveClock.plist',
    '/Library/MobileSubstrate/DynamicLibraries/Veency.plist',
    '/private/var/lib/apt',
    '/private/var/lib/cydia',
    '/private/var/mobile/Library/SBSettings/Themes',
    '/private/var/stash',
    '/private/var/tmp/cydia.log',
    '/var/lib/cydia',
  ];

  /**
   * Verifica se o dispositivo está com root (Android) ou jailbreak (iOS)
   * @returns Promise<boolean> - true se o dispositivo estiver comprometido
   */
  static async isDeviceCompromised(): Promise<boolean> {
    try {
      const isTestEnv =
        typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
      if (isTestEnv) return false;
      if (!ENABLE_DEVICE_SECURITY_CHECKS) return false

      if (Platform.OS === 'android') {
        return await this.isAndroidRooted()
      }

      if (Platform.OS === 'ios') {
        return await this.isIosJailbroken()
      }

      return false
    } catch (error) {
      loggingService.error(
        'Erro ao verificar segurança do dispositivo',
        error instanceof Error ? error : undefined
      );
      return false;
    }
  }

  /**
   * Verifica se o dispositivo Android está com root
   * @returns Promise<boolean> - true se o dispositivo estiver com root
   */
  private static async isAndroidRooted(): Promise<boolean> {
    try {
      // Verificar caminhos de binários de root
      for (const path of this.ANDROID_ROOT_PATHS) {
        try {
          const f = new File(path);
          if (await f.refresh()) {
            loggingService.warn('Dispositivo Android com root detectado', { path });
            return true;
          }
        } catch (error) {
          // Ignorar erros de acesso a arquivos
        }
      }

      // Verificar se o dispositivo tem permissões de root
      // Esta verificação é limitada no ambiente React Native/Expo
      // Em uma implementação completa, seria necessário usar código nativo

      return false;
    } catch (error) {
      loggingService.error(
        'Erro ao verificar root no Android',
        error instanceof Error ? error : undefined
      );
      return false; // Em caso de erro, NÃO assumir que está com root
    }
  }

  /**
   * Verifica se o dispositivo iOS está com jailbreak
   * @returns Promise<boolean> - true se o dispositivo estiver com jailbreak
   */
  private static async isIosJailbroken(): Promise<boolean> {
    try {
      // Verificar caminhos de aplicativos de jailbreak
      for (const path of this.IOS_JAILBREAK_PATHS) {
        try {
          const f = new File(path);
          // Usar um timeout ou verificação mais segura se necessário
          // No iOS, acessar caminhos fora do sandbox pode causar problemas dependendo da versão do OS
          const exists = await f.refresh().catch(() => false);
          if (exists) {
            loggingService.warn('Dispositivo iOS com jailbreak detectado', { path });
            return true;
          }
        } catch (error) {
          // Ignorar erros de acesso a arquivos
        }
      }

      return false;
    } catch (error) {
      loggingService.error(
        'Erro ao verificar jailbreak no iOS',
        error instanceof Error ? error : undefined
      );
      // NÃO assumir que está com jailbreak em caso de erro de verificação no iOS
      // para evitar falsos positivos que bloqueiam o app em produção
      return false; 
    }
  }

  /**
   * Verifica se o dispositivo está executando um emulador
   * @returns Promise<boolean> - true se o dispositivo for um emulador
   */
  static async isEmulator(): Promise<boolean> {
    try {
      const isTestEnv =
        typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
      if (isTestEnv) return false;
      if (Platform.OS === 'android') {
        // Verificar características comuns de emuladores Android
        const deviceName = (Device && Device.getDeviceNameAsync)
          ? await Device.getDeviceNameAsync()
          : (Device && Device.deviceName) || '';
        const isEmulator = [
          'google_sdk',
          'emulator',
          'android sdk built for',
          'sdk',
          'simulator',
          'genymotion',
        ].some(term => deviceName.toLowerCase().includes(term));

        if (isEmulator) {
          loggingService.info('Emulador Android detectado', { deviceName });
        }

        return isEmulator;
      } else if (Platform.OS === 'ios') {
        // Verificar características comuns de simuladores iOS
        // Esta verificação é limitada no ambiente React Native/Expo
        // Em uma implementação completa, seria necessário usar código nativo
        const deviceName = (Device && (Device.deviceName || Device.modelName)) || '';
        const isEmulator = [
          'simulator',
          'xcode',
        ].some(term => deviceName.toLowerCase().includes(term));
        return isEmulator;
      }

      return false;
    } catch (error) {
      loggingService.error(
        'Erro ao verificar emulador',
        error instanceof Error ? error : undefined
      );
      return false;
    }
  }

  /**
   * Verifica se o dispositivo está em modo de depuração
   * @returns Promise<boolean> - true se o dispositivo estiver em modo de depuração
   */
  static async isDebuggingEnabled(): Promise<boolean> {
    try {
      // Esta verificação é limitada no ambiente React Native/Expo
      // Em uma implementação completa, seria necessário usar código nativo
      return __DEV__ === true;
    } catch (error) {
      loggingService.error(
        'Erro ao verificar modo de depuração',
        error instanceof Error ? error : undefined
      );
      return false;
    }
  }

  /**
   * Realiza uma verificação completa de segurança do dispositivo
   * @returns Promise<{compromised: boolean, emulator: boolean, debugging: boolean}>
   */
  static async performSecurityCheck(): Promise<{
    compromised: boolean;
    emulator: boolean;
    debugging: boolean;
  }> {
    const isTestEnv =
      typeof process !== 'undefined' &&
      (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
    if (isTestEnv) {
      return {
        compromised: false,
        emulator: false,
        debugging: false,
      };
    }

    const compromised = await this.isDeviceCompromised();
    const emulator = await this.isEmulator();
    const debugging = await this.isDebuggingEnabled();

    if (compromised) {
      loggingService.warn('Dispositivo comprometido detectado', {
        compromised,
        emulator,
        debugging,
      });
    }

    return {
      compromised,
      emulator,
      debugging,
    };
  }
}
