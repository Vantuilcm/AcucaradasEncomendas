import Constants from 'expo-constants';

/**
 * Utilitário de Versionamento Unificado
 * Sincroniza informações visuais com os metadados reais do build (app.json)
 */
export const AppVersion = {
  // Versão de marketing (ex: 1.1.8)
  version: Constants.expoConfig?.version || '1.1.8',
  
  // Número de Build (ex: 1142)
  // No Android é o versionCode, no iOS é o buildNumber
  build: Constants.expoConfig?.ios?.buildNumber || 
         Constants.expoConfig?.android?.versionCode?.toString() || 
         '1142',

  /**
   * Retorna a string formatada para exibição em rodapés e perfis
   * Exemplo: "Versão 1.1.8 (Build 1142)"
   */
  getDisplayString: () => {
    const v = AppVersion.version;
    const b = AppVersion.build;
    return `Versão ${v} (Build ${b})`;
  }
};
