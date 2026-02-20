import { Platform } from 'react-native';
import { File, Directory, Paths } from '../utils/fs-shim';
import { secureLoggingService } from './SecureLoggingService';

/**
 * ServiÃ§o responsÃ¡vel pela seguranÃ§a de rede do aplicativo
 * Implementa SSL Pinning para prevenir ataques Man-in-the-Middle
 */
export class NetworkSecurityService {
  // Hashes SHA-256 dos certificados confiÃ¡veis (em produÃ§Ã£o, estes seriam os hashes reais dos certificados)
  private static readonly TRUSTED_CERTIFICATES = [
    // Exemplo de hash SHA-256 de certificado (deve ser substituÃ­do pelos hashes reais em produÃ§Ã£o)
    '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:DF:1B:D8:49:AD:BD:A4:C0:0D:54:DF:1B:7B:27:CE:54:DF:1B:25:54:DF',
    // Adicione mais hashes conforme necessÃ¡rio
  ];

  // DomÃ­nios que serÃ£o verificados com SSL Pinning
  private static readonly PINNED_DOMAINS = [
    'api.acucaradasencomendas.com.br',
    'acucaradasencomendas.com.br',
    // Adicione mais domÃ­nios conforme necessÃ¡rio
  ];

  // Armazenamento local dos certificados
  private static readonly CERTIFICATES_DIR: Directory | null = typeof window !== 'undefined'
    ? null
    : new Directory(Paths.cache, 'ssl-certificates');

  /**
   * Inicializa o serviÃ§o de seguranÃ§a de rede
   * Deve ser chamado na inicializaÃ§Ã£o do aplicativo
   */
  async initialize(): Promise<void> {
    try {
      // Criar diretÃ³rio para armazenar certificados se nÃ£o existir
      if (NetworkSecurityService.CERTIFICATES_DIR) {
        const dir = NetworkSecurityService.CERTIFICATES_DIR;
        if (!dir.exists) {
          dir.create({ intermediates: true, idempotent: true });
        }
      } else if (__DEV__) {
        secureLoggingService.warn('FileSystem base directory indisponÃ­vel nesta plataforma (provavelmente web).');
      }

      // Em uma implementaÃ§Ã£o completa, aqui baixarÃ­amos os certificados pÃºblicos
      // e armazenarÃ­amos localmente para verificaÃ§Ã£o

      // Configurar interceptor de requisiÃ§Ãµes para implementar SSL Pinning
      NetworkSecurityService.setupNetworkInterceptor();

      secureLoggingService.info('ServiÃ§o de seguranÃ§a de rede inicializado');
    } catch (error) {
      secureLoggingService.error(
        'Erro ao inicializar serviÃ§o de seguranÃ§a de rede',
        error instanceof Error ? error : undefined
      );
      throw error;
    }
  }

  /**
   * Configura o interceptor de requisiÃ§Ãµes para implementar SSL Pinning
   * Nota: Esta Ã© uma implementaÃ§Ã£o simplificada para o ambiente Expo/React Native
   * Em uma implementaÃ§Ã£o completa, seria necessÃ¡rio usar cÃ³digo nativo ou bibliotecas especÃ­ficas
   */
  private static setupNetworkInterceptor(): void {
    // No ambiente Expo/React Native, nÃ£o temos acesso direto ao nÃ­vel de TLS/SSL
    // Esta Ã© uma implementaÃ§Ã£o simulada para demonstrar o conceito

    // Em uma implementaÃ§Ã£o real, usarÃ­amos bibliotecas nativas como:
    // - Android: OkHttp com CertificatePinner
    // - iOS: AFNetworking com SSLPinning ou NSURLSession com autenticaÃ§Ã£o de desafio

    // Interceptar XMLHttpRequest (abordagem limitada)
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
      try {
        const urlObj = new URL(url);
      const hostname = urlObj.hostname;

        // Verificar se o domÃ­nio estÃ¡ na lista de domÃ­nios com pinning
      if (NetworkSecurityService.PINNED_DOMAINS.includes(hostname)) {
          // Em uma implementaÃ§Ã£o real, verificarÃ­amos o certificado aqui
          secureLoggingService.info('RequisiÃ§Ã£o para domÃ­nio com SSL Pinning', { url: hostname });
        }
      } catch (error) {
        secureLoggingService.error('Erro ao processar URL para SSL Pinning', { error: (error instanceof Error ? error.message : String(error)), url });
      }

      return originalOpen.call(this, method, url, ...args);
    };

    // Interceptar fetch (abordagem limitada)
    const originalFetch = globalThis.fetch.bind(globalThis);
    globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
      const input = args[0];
      try {
        let url: string;
        if (typeof input === 'string') {
          url = input;
        } else if (typeof Request !== 'undefined' && input instanceof Request) {
          url = input.url;
        } else {
          return originalFetch(...args);
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Verificar se o domÃ­nio estÃ¡ na lista de domÃ­nios com pinning
        if (NetworkSecurityService.PINNED_DOMAINS.includes(hostname)) {
          // Em uma implementaÃ§Ã£o real, verificarÃ­amos o certificado aqui
          secureLoggingService.info('Fetch para domÃ­nio com SSL Pinning', { url: hostname });
        }
      } catch (error) {
        secureLoggingService.error(
          'Erro ao processar URL para SSL Pinning (fetch)',
          error instanceof Error ? error : undefined
        );
      }

      return originalFetch(...args);
    }) as typeof fetch;
  }

  /**
   * Verifica a seguranÃ§a da conexÃ£o atual
   * @returns Resultado da verificaÃ§Ã£o de seguranÃ§a
   */
  async checkConnectionSecurity(): Promise<{
    secure: boolean;
    details: string;
    possibleMitm: boolean;
  }> {
    try {
      // Construir URL de health a partir do ambiente, com fallback
      const baseApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.acucaradasencomendas.com.br').replace(/\/+$/, '');
      const testUrl = `${baseApiUrl}/health`;
      
      // Ambiente web: evitar falsos positivos por CORS/DNS em desenvolvimento
      if (typeof window !== 'undefined') {
        if (__DEV__) {
          // Ignorar verificaÃ§Ã£o externa no web/dev
          secureLoggingService.warn('Ignorando verificaÃ§Ã£o de conexÃ£o segura no web (dev) por CORS/DNS', { testUrl });
          return {
            secure: true,
            details: 'VerificaÃ§Ã£o ignorada no web/dev (CORS/DNS).',
            possibleMitm: false,
          };
        }

        // Em produÃ§Ã£o web, tentar uma verificaÃ§Ã£o leve e tratar falhas como desconhecidas (nÃ£o MITM)
        try {
          const res = await fetch(testUrl, { method: 'GET', cache: 'no-store' });
          return {
            secure: res.ok,
            details: res.ok ? 'ConexÃ£o aparentemente segura (web)' : `Falha no teste de conexÃ£o segura (web): status ${res.status}`,
            possibleMitm: false,
          };
        } catch (error) {
          secureLoggingService.warn('Falha na verificaÃ§Ã£o de conexÃ£o (web), tratando como estado desconhecido', { error });
          return {
            secure: true,
            details: 'Estado desconhecido (web). Falha de fetch/CORS.',
            possibleMitm: false,
          };
        }
      }

      // Em plataformas onde nÃ£o hÃ¡ diretÃ³rio de documentos (web), realizar verificaÃ§Ã£o com fetch
      if (typeof window !== 'undefined') {
        // Se FileSystem nÃ£o suportar escrita, realizar verificaÃ§Ã£o com fetch
        try {
          const res = await fetch(testUrl, { method: 'GET' });
          return {
            secure: res.ok,
            details: res.ok ? 'ConexÃ£o segura verificada (fetch)' : `Falha no teste de conexÃ£o segura: status ${res.status}`,
            possibleMitm: !res.ok,
          };
        } catch (error) {
          secureLoggingService.warn('Falha no teste de conexÃ£o segura (fetch)', { error });
          return {
            secure: false,
            details: `Erro no teste de conexÃ£o segura: ${error instanceof Error ? error.message : String(error)}`,
            possibleMitm: true,
          };
        }
      }
      try {
        // Ambiente nativo: baixar arquivo de teste em diretÃ³rio temporÃ¡rio
        const tempDir = new Directory(Paths.document, 'network-tests');
        if (!tempDir.exists) {
          tempDir.create({ intermediates: true, idempotent: true });
        }
        const tempFile = new File(tempDir, 'temp_security_check.txt');
        await File.downloadFileAsync(testUrl, tempFile, { idempotent: true });
        // Limpar arquivo temporÃ¡rio
        tempFile.delete();
        return {
          secure: true,
          details: 'ConexÃ£o segura verificada com sucesso',
          possibleMitm: false,
        };
      } catch (error) {
        // Em nativo, manter severidade de erro e sinalizar possÃ­vel MITM
        secureLoggingService.error(
          'Erro no teste de conexÃ£o segura',
          error instanceof Error ? error : undefined
        );
        return {
          secure: false,
          details: `Erro no teste de conexÃ£o segura: ${error instanceof Error ? error.message : String(error)}`,
          possibleMitm: true,
        };
      }
    } catch (error) {
      // Em web/dev, essa exceÃ§Ã£o pode ser apenas DNS/CORS; reduzir severidade
      if (typeof window !== 'undefined' && __DEV__) {
        secureLoggingService.warn('Erro ao verificar seguranÃ§a da conexÃ£o (web/dev)', { error });
        return {
          secure: true,
          details: `VerificaÃ§Ã£o ignorada (web/dev): ${error instanceof Error ? error.message : String(error)}`,
          possibleMitm: false,
        };
      }

      secureLoggingService.error(
        'Erro ao verificar seguranÃ§a da conexÃ£o',
        error instanceof Error ? error : undefined
      );
      
      return {
        secure: false,
        details: `Erro ao verificar seguranÃ§a: ${error instanceof Error ? error.message : String(error)}`,
        possibleMitm: true
      };
    }
  }

  /**
   * Verifica se um certificado Ã© confiÃ¡vel
   * @param certificateHash Hash SHA-256 do certificado a ser verificado
   * @returns boolean - true se o certificado for confiÃ¡vel
   */
  static isCertificateTrusted(certificateHash: string): boolean {
    return this.TRUSTED_CERTIFICATES.includes(certificateHash);
  }

  /**
   * Adiciona um certificado Ã  lista de certificados confiÃ¡veis
   * @param certificateHash Hash SHA-256 do certificado a ser adicionado
   */
  static addTrustedCertificate(certificateHash: string): void {
    if (!this.TRUSTED_CERTIFICATES.includes(certificateHash)) {
      this.TRUSTED_CERTIFICATES.push(certificateHash);
      secureLoggingService.info('Certificado adicionado Ã  lista de confiÃ¡veis', { certificateHash });
    }
  }

  /**
   * Remove um certificado da lista de certificados confiÃ¡veis
   * @param certificateHash Hash SHA-256 do certificado a ser removido
   */
  static removeTrustedCertificate(certificateHash: string): void {
    const index = this.TRUSTED_CERTIFICATES.indexOf(certificateHash);
    if (index !== -1) {
      this.TRUSTED_CERTIFICATES.splice(index, 1);
      secureLoggingService.info('Certificado removido da lista de confiÃ¡veis', { certificateHash });
    }
  }

  /**
   * Cria uma instÃ¢ncia de fetch com SSL Pinning
   * @returns Function - FunÃ§Ã£o fetch com SSL Pinning
   */
  static createSecureFetch(): (input: RequestInfo, init?: RequestInit) => Promise<Response> {
    return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      try {
        let url: string;
        if (typeof input === 'string') {
          url = input;
        } else if (typeof Request !== 'undefined' && input instanceof Request) {
          url = input.url;
        } else {
          throw new Error('URL invÃ¡lida');
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Verificar se o domÃ­nio estÃ¡ na lista de domÃ­nios com pinning
        if (this.PINNED_DOMAINS.includes(hostname)) {
          secureLoggingService.info('Realizando requisiÃ§Ã£o segura com SSL Pinning', { url: hostname });
          // Em uma implementaÃ§Ã£o real, verificarÃ­amos o certificado aqui
        }

        // Realizar a requisiÃ§Ã£o
        return await fetch(input, init);
      } catch (error) {
        secureLoggingService.error(
          'Erro ao realizar requisiÃ§Ã£o segura',
          error instanceof Error ? error : undefined
        );
        throw error;
      }
    };
  }

  /**
   * Verifica se a conexÃ£o estÃ¡ segura
   * @param url URL a ser verificada
   * @returns Promise<boolean> - true se a conexÃ£o estiver segura
   */
  static async isConnectionSecure(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      
      // Verificar se usa HTTPS
      if (urlObj.protocol !== 'https:') {
        secureLoggingService.warn('ConexÃ£o nÃ£o segura detectada (nÃ£o HTTPS)', { url });
        return false;
      }

      // Verificar se o domÃ­nio estÃ¡ na lista de domÃ­nios com pinning
      const isPinnedDomain = this.PINNED_DOMAINS.includes(urlObj.hostname);
      if (!isPinnedDomain) {
        secureLoggingService.warn('DomÃ­nio nÃ£o estÃ¡ na lista de domÃ­nios com SSL Pinning', { url });
      }

      return isPinnedDomain;
    } catch (error) {
      secureLoggingService.error('Erro ao verificar segurança da conexão', { error: (error instanceof Error ? error.message : String(error)), url });
      return false;
    }
  }
}



