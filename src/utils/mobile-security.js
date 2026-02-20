/**
 * Utilitário para segurança em aplicações mobile
 * 
 * Este módulo implementa funções para verificação de permissões, armazenamento
 * seguro e proteção contra engenharia reversa em aplicações mobile.
 */

// Importações necessárias para React Native
// Nota: Este código assume que o projeto usa React Native/Expo
// As importações devem ser ajustadas conforme as bibliotecas disponíveis no projeto

import { LoggingService } from '../services/LoggingService';

const logger = LoggingService.getInstance();

/**
 * Verifica se uma permissão específica está concedida
 * @param {string} permission - Nome da permissão a ser verificada
 * @returns {Promise<boolean>} Verdadeiro se a permissão estiver concedida
 */
async function checkPermission(permission) {
  try {
    // Verifica se estamos em ambiente mobile
    if (typeof Permissions === 'undefined') {
      logger.warn('Módulo de permissões não disponível neste ambiente');
      return false;
    }
    
    const { status } = await Permissions.getAsync(permission);
    return status === 'granted';
  } catch (error) {
    logger.error(`Erro ao verificar permissão ${permission}`, error);
    return false;
  }
}

/**
 * Solicita uma permissão específica
 * @param {string} permission - Nome da permissão a ser solicitada
 * @returns {Promise<boolean>} Verdadeiro se a permissão for concedida
 */
async function requestPermission(permission) {
  try {
    // Verifica se estamos em ambiente mobile
    if (typeof Permissions === 'undefined') {
      logger.warn('Módulo de permissões não disponível neste ambiente');
      return false;
    }
    
    const { status } = await Permissions.askAsync(permission);
    return status === 'granted';
  } catch (error) {
    logger.error(`Erro ao solicitar permissão ${permission}`, error);
    return false;
  }
}

/**
 * Verifica e solicita múltiplas permissões
 * @param {Array<string>} permissions - Lista de permissões a serem verificadas/solicitadas
 * @returns {Promise<Object>} Objeto com o status de cada permissão
 */
async function checkAndRequestPermissions(permissions) {
  const result = {};
  
  for (const permission of permissions) {
    // Verifica se a permissão já está concedida
    let isGranted = await checkPermission(permission);
    
    // Se não estiver concedida, solicita
    if (!isGranted) {
      isGranted = await requestPermission(permission);
    }
    
    result[permission] = isGranted;
  }
  
  return result;
}

/**
 * Armazena dados de forma segura usando SecureStore
 * @param {string} key - Chave para armazenar o valor
 * @param {string} value - Valor a ser armazenado
 * @returns {Promise<boolean>} Verdadeiro se o armazenamento for bem-sucedido
 */
async function secureStore(key, value) {
  try {
    // Verifica se estamos em ambiente mobile com SecureStore
    if (typeof SecureStore === 'undefined') {
      logger.warn('SecureStore não disponível neste ambiente');
      return false;
    }
    
    await SecureStore.setItemAsync(key, value);
    return true;
  } catch (error) {
    logger.error(`Erro ao armazenar ${key} de forma segura`, error);
    return false;
  }
}

/**
 * Recupera dados armazenados de forma segura
 * @param {string} key - Chave do valor a ser recuperado
 * @returns {Promise<string|null>} Valor recuperado ou null se não encontrado
 */
async function secureRetrieve(key) {
  try {
    // Verifica se estamos em ambiente mobile com SecureStore
    if (typeof SecureStore === 'undefined') {
      logger.warn('SecureStore não disponível neste ambiente');
      return null;
    }
    
    return await SecureStore.getItemAsync(key);
  } catch (error) {
    logger.error(`Erro ao recuperar ${key} do armazenamento seguro`, error);
    return null;
  }
}

/**
 * Verifica se o dispositivo está rooteado/jailbroken
 * @returns {Promise<boolean>} Verdadeiro se o dispositivo estiver comprometido
 */
async function isDeviceRooted() {
  try {
    // Verifica se estamos em ambiente mobile
    if (typeof Platform === 'undefined') {
      logger.warn('Detecção de root/jailbreak não disponível neste ambiente');
      return false;
    }
    
    // Implementação básica - em produção, use bibliotecas específicas
    // como react-native-device-info ou expo-device
    
    // Para Android, verifica arquivos comuns em dispositivos rooteados
    if (Platform.OS === 'android') {
      // Esta é uma implementação simplificada
      // Em produção, use bibliotecas específicas para detecção mais robusta
      return false;
    }
    
    // Para iOS, verifica aplicativos comuns em dispositivos com jailbreak
    if (Platform.OS === 'ios') {
      // Esta é uma implementação simplificada
      // Em produção, use bibliotecas específicas para detecção mais robusta
      return false;
    }
    
    return false;
  } catch (error) {
    logger.error('Erro ao verificar se o dispositivo está rooteado/jailbroken', error);
    return false;
  }
}

/**
 * Verifica se o aplicativo está sendo executado em um emulador
 * @returns {Promise<boolean>} Verdadeiro se estiver em um emulador
 */
async function isRunningOnEmulator() {
  try {
    // Verifica se estamos em ambiente mobile
    if (typeof Platform === 'undefined') {
      logger.warn('Detecção de emulador não disponível neste ambiente');
      return false;
    }
    
    // Implementação básica - em produção, use bibliotecas específicas
    // como react-native-device-info ou expo-device
    
    return false;
  } catch (error) {
    logger.error('Erro ao verificar se está rodando em um emulador', error);
    return false;
  }
}

/**
 * Verifica se o aplicativo está sendo depurado
 * @returns {Promise<boolean>} Verdadeiro se estiver sendo depurado
 */
async function isBeingDebugged() {
  try {
    // Verifica se estamos em ambiente mobile
    if (typeof Platform === 'undefined') {
      logger.warn('Detecção de depuração não disponível neste ambiente');
      return false;
    }
    
    // Implementação básica - em produção, use bibliotecas específicas
    // como react-native-device-info ou expo-device
    
    return false;
  } catch (error) {
    logger.error('Erro ao verificar se está sendo depurado', error);
    return false;
  }
}

/**
 * Verifica se a captura de tela está habilitada e tenta desabilitá-la
 * @returns {Promise<boolean>} Verdadeiro se a captura de tela foi desabilitada
 */
async function preventScreenCapture() {
  try {
    // Verifica se estamos em ambiente mobile com ScreenCapture
    if (typeof ScreenCapture === 'undefined') {
      logger.warn('Prevenção de captura de tela não disponível neste ambiente');
      return false;
    }
    
    await ScreenCapture.preventScreenCaptureAsync();
    return true;
  } catch (error) {
    logger.error('Erro ao prevenir captura de tela', error);
    return false;
  }
}

/**
 * Realiza uma verificação completa de segurança do dispositivo
 * @returns {Promise<Object>} Resultado da verificação de segurança
 */
async function performSecurityCheck() {
  const results = {
    isRooted: await isDeviceRooted(),
    isEmulator: await isRunningOnEmulator(),
    isBeingDebugged: await isBeingDebugged(),
    screenCaptureDisabled: await preventScreenCapture(),
    secureStoreAvailable: typeof SecureStore !== 'undefined',
  };
  
  // Verifica se há algum problema de segurança
  const hasSecurityIssues = results.isRooted || 
                            results.isEmulator || 
                            results.isBeingDebugged || 
                            !results.screenCaptureDisabled || 
                            !results.secureStoreAvailable;
  
  return {
    ...results,
    hasSecurityIssues,
  };
}

module.exports = {
  checkPermission,
  requestPermission,
  checkAndRequestPermissions,
  secureStore,
  secureRetrieve,
  isDeviceRooted,
  isRunningOnEmulator,
  isBeingDebugged,
  preventScreenCapture,
  performSecurityCheck,
};