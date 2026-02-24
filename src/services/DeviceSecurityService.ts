import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Application from 'expo-application';
import { loggingService } from './LoggingService';

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
      if (Platform.OS === 'android') {
        return await this.isAndroidRooted();
      } else if (Platform.OS === 'ios') {
        return await this.isIosJailbroken();
      }
      return false;
    } catch (error) {
      loggingService.error('Erro ao verificar segurança do dispositivo', { error });
      // Em caso de erro, assumimos que o dispositivo pode estar comprometido
      return true;
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
          const fileInfo = await FileSystem.getInfoAsync(path);
          if (fileInfo.exists) {
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
      loggingService.error('Erro ao verificar root no Android', { error });
      return true; // Em caso de erro, assumir que pode estar com root
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
          const fileInfo = await FileSystem.getInfoAsync(path);
          if (fileInfo.exists) {
            loggingService.warn('Dispositivo iOS com jailbreak detectado', { path });
            return true;
          }
        } catch (error) {
          // Ignorar erros de acesso a arquivos
        }
      }

      // Verificar se é possível escrever fora do sandbox (indicativo de jailbreak)
      // Esta verificação é limitada no ambiente React Native/Expo
      // Em uma implementação completa, seria necessário usar código nativo

      return false;
    } catch (error) {
      loggingService.error('Erro ao verificar jailbreak no iOS', { error });
      return true; // Em caso de erro, assumir que pode estar com jailbreak
    }
  }

  /**
   * Verifica se o dispositivo está executando um emulador
   * @returns Promise<boolean> - true se o dispositivo for um emulador
   */
  static async isEmulator(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        // Verificar características comuns de emuladores Android
        const deviceName = await Application.getDeviceNameAsync() || '';
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
        return false;
      }

      return false;
    } catch (error) {
      loggingService.error('Erro ao verificar emulador', { error });
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
      loggingService.error('Erro ao verificar modo de depuração', { error });
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