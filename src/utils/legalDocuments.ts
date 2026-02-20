import { Linking } from 'react-native';
import Constants from 'expo-constants';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

/**
 * URLs dos documentos legais hospedados no site
 */
export const LEGAL_DOCUMENTS = {
  PRIVACY_POLICY:
    (Constants.expoConfig?.extra as any)?.privacyPolicyUrl ||
    'https://www.acucaradasencomendas.com.br/politica-privacidade.html',
  TERMS_OF_USE:
    (Constants.expoConfig?.extra as any)?.termsOfServiceUrl ||
    'https://www.acucaradasencomendas.com.br/termos-uso.html',
  ABOUT_US: 'https://www.acucaradasencomendas.com.br/sobre.html',
  WEBSITE: 'https://www.acucaradasencomendas.com.br',
};

/**
 * Abre a política de privacidade no navegador
 * @returns Promise que resolve quando a operação for completada
 */
export const openPrivacyPolicy = async (): Promise<void> => {
  await Linking.openURL(LEGAL_DOCUMENTS.PRIVACY_POLICY);
};

/**
 * Abre os termos de uso no navegador
 * @returns Promise que resolve quando a operação for completada
 */
export const openTermsOfUse = async (): Promise<void> => {
  await Linking.openURL(LEGAL_DOCUMENTS.TERMS_OF_USE);
};

/**
 * Abre a página Sobre Nós no navegador
 * @returns Promise que resolve quando a operação for completada
 */
export const openAboutUs = async (): Promise<void> => {
  await Linking.openURL(LEGAL_DOCUMENTS.ABOUT_US);
};

/**
 * Abre o site da Açucaradas no navegador
 * @returns Promise que resolve quando a operação for completada
 */
export const openWebsite = async (): Promise<void> => {
  await Linking.openURL(LEGAL_DOCUMENTS.WEBSITE);
};

/**
 * Verifica se os links dos documentos legais estão acessíveis
 * @returns Promise que resolve para um objeto com o status de cada link
 */
export const checkLegalDocumentsAvailability = async (): Promise<Record<string, boolean>> => {
  try {
    const results = await Promise.allSettled([
      fetch(LEGAL_DOCUMENTS.PRIVACY_POLICY, { method: 'HEAD' }),
      fetch(LEGAL_DOCUMENTS.TERMS_OF_USE, { method: 'HEAD' }),
      fetch(LEGAL_DOCUMENTS.ABOUT_US, { method: 'HEAD' }),
      fetch(LEGAL_DOCUMENTS.WEBSITE, { method: 'HEAD' }),
    ]);

    return {
      privacyPolicy: results[0].status === 'fulfilled',
      termsOfUse: results[1].status === 'fulfilled',
      aboutUs: results[2].status === 'fulfilled',
      website: results[3].status === 'fulfilled',
    };
  } catch (error) {
    logger.error('Erro ao verificar disponibilidade dos documentos legais:', error instanceof Error ? error : new Error(String(error)));
    return {
      privacyPolicy: false,
      termsOfUse: false,
      aboutUs: false,
      website: false,
    };
  }
};
