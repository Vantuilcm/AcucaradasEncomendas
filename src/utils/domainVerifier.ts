import { LEGAL_DOCUMENTS } from './legalDocuments';

interface DomainVerificationResult {
  status: 'success' | 'warning' | 'error';
  message: string;
  details: {
    websiteAccessible: boolean;
    privacyPolicyAccessible: boolean;
    termsOfUseAccessible: boolean;
    responseTimeMs: number;
  };
}

/**
 * Verifica se o domínio acucaradas.com.br está corretamente configurado
 * e se as URLs dos documentos legais estão acessíveis
 *
 * @returns Resultado detalhado da verificação
 */
export const verifyDomainConfiguration = async (): Promise<DomainVerificationResult> => {
  const startTime = Date.now();
  let websiteAccessible = false;
  let privacyPolicyAccessible = false;
  let termsOfUseAccessible = false;

  try {
    // Verificar acesso ao site principal
    const websiteResponse = await fetch(LEGAL_DOCUMENTS.WEBSITE, {
      method: 'HEAD',
      timeout: 5000,
    }).catch(() => null);

    websiteAccessible = !!websiteResponse && websiteResponse.ok;

    if (websiteAccessible) {
      // Verificar acesso aos documentos legais
      const [privacyResponse, termsResponse] = await Promise.all([
        fetch(LEGAL_DOCUMENTS.PRIVACY_POLICY, { method: 'HEAD', timeout: 5000 }).catch(() => null),
        fetch(LEGAL_DOCUMENTS.TERMS_OF_USE, { method: 'HEAD', timeout: 5000 }).catch(() => null),
      ]);

      privacyPolicyAccessible = !!privacyResponse && privacyResponse.ok;
      termsOfUseAccessible = !!termsResponse && termsResponse.ok;
    }

    const responseTimeMs = Date.now() - startTime;

    // Determinar status e mensagem
    let status: 'success' | 'warning' | 'error' = 'success';
    let message = 'Configuração de domínio verificada com sucesso.';

    if (!websiteAccessible) {
      status = 'error';
      message = 'Não foi possível acessar o site da Açucaradas.';
    } else if (!privacyPolicyAccessible && !termsOfUseAccessible) {
      status = 'error';
      message = 'Os documentos legais não estão acessíveis.';
    } else if (!privacyPolicyAccessible) {
      status = 'warning';
      message = 'A Política de Privacidade não está acessível.';
    } else if (!termsOfUseAccessible) {
      status = 'warning';
      message = 'Os Termos de Uso não estão acessíveis.';
    } else if (responseTimeMs > 2000) {
      status = 'warning';
      message = `Site acessível, mas com tempo de resposta elevado (${responseTimeMs}ms).`;
    }

    return {
      status,
      message,
      details: {
        websiteAccessible,
        privacyPolicyAccessible,
        termsOfUseAccessible,
        responseTimeMs,
      },
    };
  } catch (error) {
    console.error('Erro ao verificar configuração do domínio:', error);

    return {
      status: 'error',
      message: 'Ocorreu um erro ao verificar a configuração do domínio.',
      details: {
        websiteAccessible: false,
        privacyPolicyAccessible: false,
        termsOfUseAccessible: false,
        responseTimeMs: Date.now() - startTime,
      },
    };
  }
};

/**
 * Realiza um teste completo do domínio e URLs, incluindo tempo de resposta e validação de conteúdo
 * @returns Relatório detalhado da verificação
 */
export const runDomainDiagnostics = async (): Promise<Record<string, any>> => {
  try {
    const basicVerification = await verifyDomainConfiguration();

    // Se o site não estiver acessível, não prosseguir com os testes adicionais
    if (!basicVerification.details.websiteAccessible) {
      return {
        ...basicVerification,
        diagnosticTime: new Date().toISOString(),
        additionalTests: 'Não realizados: site principal não acessível',
      };
    }

    // Verificar conteúdo dos documentos legais
    const contentVerification = await Promise.all([
      fetch(LEGAL_DOCUMENTS.PRIVACY_POLICY).catch(() => null),
      fetch(LEGAL_DOCUMENTS.TERMS_OF_USE).catch(() => null),
    ]);

    const [privacyContent, termsContent] = await Promise.all([
      contentVerification[0]?.text().catch(() => null),
      contentVerification[1]?.text().catch(() => null),
    ]);

    // Verificar se o conteúdo dos documentos contém textos esperados
    const privacyValid =
      typeof privacyContent === 'string' &&
      privacyContent.includes('Política de Privacidade') &&
      privacyContent.includes('Açucaradas Encomendas');

    const termsValid =
      typeof termsContent === 'string' &&
      termsContent.includes('Termos de Uso') &&
      termsContent.includes('Açucaradas Encomendas');

    // Verificar DNS e configuração HTTPS
    const dnsLookup = new URL(LEGAL_DOCUMENTS.WEBSITE).hostname;
    const isHttps = LEGAL_DOCUMENTS.WEBSITE.startsWith('https://');

    return {
      ...basicVerification,
      diagnosticTime: new Date().toISOString(),
      additionalTests: {
        contentValidation: {
          privacyPolicyValid: privacyValid,
          termsOfUseValid: termsValid,
        },
        securityCheck: {
          isHttps,
          domain: dnsLookup,
        },
        contentSize: {
          privacyPolicy: privacyContent?.length || 0,
          termsOfUse: termsContent?.length || 0,
        },
      },
    };
  } catch (error) {
    console.error('Erro ao executar diagnóstico completo:', error);
    return {
      status: 'error',
      message: 'Falha ao executar diagnóstico completo do domínio',
      diagnosticTime: new Date().toISOString(),
      error: String(error),
    };
  }
};
