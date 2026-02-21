import { LEGAL_DOCUMENTS } from './legalDocuments';

/**
 * Interface para o resultado da verificação de status
 */
interface WebsiteStatusResult {
  isOnline: boolean;
  documentsAvailable: {
    privacyPolicy: boolean;
    termsOfUse: boolean;
  };
  message: string;
}

/**
 * Verifica se o site e os documentos legais estão acessíveis
 * @returns Promise com o resultado da verificação
 */
export const checkWebsiteStatus = async (): Promise<WebsiteStatusResult> => {
  try {
    // Testar o site principal primeiro
    const websiteResponse = await fetch(LEGAL_DOCUMENTS.WEBSITE, {
      method: 'HEAD',
      timeout: 5000,
    }).catch(() => null);

    const isWebsiteOnline = websiteResponse && websiteResponse.ok;

    if (!isWebsiteOnline) {
      return {
        isOnline: false,
        documentsAvailable: {
          privacyPolicy: false,
          termsOfUse: false,
        },
        message:
          'O site da Açucaradas não está acessível no momento. Verifique sua conexão com a internet ou tente novamente mais tarde.',
      };
    }

    // Testar os documentos legais
    const [privacyResponse, termsResponse] = await Promise.all([
      fetch(LEGAL_DOCUMENTS.PRIVACY_POLICY, { method: 'HEAD', timeout: 5000 }).catch(() => null),
      fetch(LEGAL_DOCUMENTS.TERMS_OF_USE, { method: 'HEAD', timeout: 5000 }).catch(() => null),
    ]);

    const isPrivacyAvailable = privacyResponse && privacyResponse.ok;
    const isTermsAvailable = termsResponse && termsResponse.ok;

    let message = '';

    if (!isPrivacyAvailable && !isTermsAvailable) {
      message = 'Os documentos legais não estão acessíveis no momento.';
    } else if (!isPrivacyAvailable) {
      message = 'A Política de Privacidade não está acessível no momento.';
    } else if (!isTermsAvailable) {
      message = 'Os Termos de Uso não estão acessíveis no momento.';
    } else {
      message = 'O site e os documentos legais estão acessíveis.';
    }

    return {
      isOnline: true,
      documentsAvailable: {
        privacyPolicy: isPrivacyAvailable,
        termsOfUse: isTermsAvailable,
      },
      message,
    };
  } catch (error) {
    console.error('Erro ao verificar status do site:', error);
    return {
      isOnline: false,
      documentsAvailable: {
        privacyPolicy: false,
        termsOfUse: false,
      },
      message:
        'Ocorreu um erro ao verificar o status do site. Verifique sua conexão com a internet.',
    };
  }
};

/**
 * Verifica periodicamente se o site está online (para uso em debug)
 * @param intervalInMinutes Intervalo entre as verificações em minutos
 * @param callback Função de callback chamada com o resultado da verificação
 * @returns Função para cancelar a verificação periódica
 */
export const startPeriodicWebsiteCheck = (
  intervalInMinutes: number = 60,
  callback: (result: WebsiteStatusResult) => void
): (() => void) => {
  const intervalMs = intervalInMinutes * 60 * 1000;

  // Verificação inicial
  checkWebsiteStatus().then(callback);

  // Configurar verificação periódica
  const intervalId = setInterval(async () => {
    const result = await checkWebsiteStatus();
    callback(result);
  }, intervalMs);

  // Retornar função para cancelar a verificação
  return () => clearInterval(intervalId);
};
