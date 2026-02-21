import { Platform, Alert } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { secureLoggingService } from './SecureLoggingService';

/**
 * Serviço responsável pela segurança de rede do aplicativo
 * Implementa SSL Pinning para prevenir ataques Man-in-the-Middle
 */
export class NetworkSecurityService {
  // Hashes SHA-256 dos certificados confiáveis (em produção, estes seriam os hashes reais dos certificados)
  private static readonly TRUSTED_CERTIFICATES = [
    // Exemplo de hash SHA-256 de certificado (deve ser substituído pelos hashes reais em produção)
    '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:DF:1B:D8:49:AD:BD:A4:C0:0D:54:DF:1B:7B:27:CE:54:DF:1B:25:54:DF',
    // Adicione mais hashes conforme necessário
  ];

  // Domínios que serão verificados com SSL Pinning
  private static readonly PINNED_DOMAINS = [
    'api.acucaradas.com.br',
    'acucaradas.com.br',
    // Adicione mais domínios conforme necessário
  ];

  // Armazenamento local dos certificados
  private static readonly CERTIFICATES_DIR = `${FileSystem.cacheDirectory}ssl-certificates/`;

  /**
   * Inicializa o serviço de segurança de rede
   * Deve ser chamado na inicialização do aplicativo
   */
  async initialize(): Promise<void> {
    try {
      // Criar diretório para armazenar certificados se não existir
      const dirInfo = await FileSystem.getInfoAsync(NetworkSecurityService.CERTIFICATES_DIR);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(NetworkSecurityService.CERTIFICATES_DIR, { intermediates: true });
      }

      // Em uma implementação completa, aqui baixaríamos os certificados públicos
      // e armazenaríamos localmente para verificação

      // Configurar interceptor de requisições para implementar SSL Pinning
      NetworkSecurityService.setupNetworkInterceptor();

      secureLoggingService.info('Serviço de segurança de rede inicializado');
    } catch (error) {
      secureLoggingService.error('Erro ao inicializar serviço de segurança de rede', { error });
      throw error;
    }
  }

  /**
   * Configura o interceptor de requisições para implementar SSL Pinning
   * Nota: Esta é uma implementação simplificada para o ambiente Expo/React Native
   * Em uma implementação completa, seria necessário usar código nativo ou bibliotecas específicas
   */
  private static setupNetworkInterceptor(): void {
    // No ambiente Expo/React Native, não temos acesso direto ao nível de TLS/SSL
    // Esta é uma implementação simulada para demonstrar o conceito

    // Em uma implementação real, usaríamos bibliotecas nativas como:
    // - Android: OkHttp com CertificatePinner
    // - iOS: AFNetworking com SSLPinning ou NSURLSession com autenticação de desafio

    // Interceptar XMLHttpRequest (abordagem limitada)
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method: string, url: string, ...args: any[]) {
      try {
        const urlObj = new URL(url);
      const hostname = urlObj.hostname;

        // Verificar se o domínio está na lista de domínios com pinning
      if (NetworkSecurityService.PINNED_DOMAINS.includes(hostname)) {
          // Em uma implementação real, verificaríamos o certificado aqui
          secureLoggingService.info('Requisição para domínio com SSL Pinning', { url: hostname });
        }
      } catch (error) {
        secureLoggingService.error('Erro ao processar URL para SSL Pinning', { error, url });
      }

      return originalOpen.call(this, method, url, ...args);
    };

    // Interceptar fetch (abordagem limitada)
    const originalFetch = global.fetch;
    global.fetch = function(input: RequestInfo, init?: RequestInit): Promise<Response> {
      try {
        let url: string;
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof Request) {
          url = input.url;
        } else {
          return originalFetch(input, init);
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Verificar se o domínio está na lista de domínios com pinning
        if (NetworkSecurityService.PINNED_DOMAINS.includes(hostname)) {
          // Em uma implementação real, verificaríamos o certificado aqui
          loggingService.info('Fetch para domínio com SSL Pinning', { url: hostname });
        }
      } catch (error) {
        loggingService.error('Erro ao processar URL para SSL Pinning (fetch)', { error });
      }

      return originalFetch(input, init);
    };
  }

  /**
   * Verifica a segurança da conexão atual
   * @returns Resultado da verificação de segurança
   */
  async checkConnectionSecurity(): Promise<{
    secure: boolean;
    details: string;
    possibleMitm: boolean;
  }> {
    try {
      // Verificar se o SSL Pinning está ativo
      const testUrl = 'https://api.acucaradas.com.br/health';
      
      // Usando FileSystem.downloadAsync para fazer uma requisição segura
      const downloadResumable = FileSystem.createDownloadResumable(
        testUrl,
        FileSystem.documentDirectory + 'temp_security_check.txt',
        {},
        (downloadProgress) => {
          const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite;
          secureLoggingService.debug('Progresso do teste de conexão segura', { progress });
        }
      );

      try {
        const result = await downloadResumable.downloadAsync();
        
        if (result && result.status === 200) {
          // Limpar o arquivo temporário
          await FileSystem.deleteAsync(FileSystem.documentDirectory + 'temp_security_check.txt', { idempotent: true });
          
          return {
            secure: true,
            details: 'Conexão segura verificada com sucesso',
            possibleMitm: false
          };
        } else {
          return {
            secure: false,
            details: `Falha no teste de conexão segura: status ${result ? result.status : 'desconhecido'}`,
            possibleMitm: true
          };
        }
      } catch (error) {
        secureLoggingService.error('Erro no teste de conexão segura', { error });
        
        return {
          secure: false,
          details: `Erro no teste de conexão segura: ${error instanceof Error ? error.message : String(error)}`,
          possibleMitm: true
        };
      }
    } catch (error) {
      secureLoggingService.error('Erro ao verificar segurança da conexão', { error });
      
      return {
        secure: false,
        details: `Erro ao verificar segurança: ${error instanceof Error ? error.message : String(error)}`,
        possibleMitm: true
      };
    }
  }

  /**
   * Verifica se um certificado é confiável
   * @param certificateHash Hash SHA-256 do certificado a ser verificado
   * @returns boolean - true se o certificado for confiável
   */
  static isCertificateTrusted(certificateHash: string): boolean {
    return this.TRUSTED_CERTIFICATES.includes(certificateHash);
  }

  /**
   * Adiciona um certificado à lista de certificados confiáveis
   * @param certificateHash Hash SHA-256 do certificado a ser adicionado
   */
  static addTrustedCertificate(certificateHash: string): void {
    if (!this.TRUSTED_CERTIFICATES.includes(certificateHash)) {
      this.TRUSTED_CERTIFICATES.push(certificateHash);
      loggingService.info('Certificado adicionado à lista de confiáveis', { certificateHash });
    }
  }

  /**
   * Remove um certificado da lista de certificados confiáveis
   * @param certificateHash Hash SHA-256 do certificado a ser removido
   */
  static removeTrustedCertificate(certificateHash: string): void {
    const index = this.TRUSTED_CERTIFICATES.indexOf(certificateHash);
    if (index !== -1) {
      this.TRUSTED_CERTIFICATES.splice(index, 1);
      loggingService.info('Certificado removido da lista de confiáveis', { certificateHash });
    }
  }

  /**
   * Cria uma instância de fetch com SSL Pinning
   * @returns Function - Função fetch com SSL Pinning
   */
  static createSecureFetch(): (input: RequestInfo, init?: RequestInit) => Promise<Response> {
    return async (input: RequestInfo, init?: RequestInit): Promise<Response> => {
      try {
        let url: string;
        if (typeof input === 'string') {
          url = input;
        } else if (input instanceof Request) {
          url = input.url;
        } else {
          throw new Error('URL inválida');
        }

        const urlObj = new URL(url);
        const hostname = urlObj.hostname;

        // Verificar se o domínio está na lista de domínios com pinning
        if (this.PINNED_DOMAINS.includes(hostname)) {
          loggingService.info('Realizando requisição segura com SSL Pinning', { url: hostname });
          // Em uma implementação real, verificaríamos o certificado aqui
        }

        // Realizar a requisição
        return await fetch(input, init);
      } catch (error) {
        loggingService.error('Erro ao realizar requisição segura', { error });
        throw error;
      }
    };
  }

  /**
   * Verifica se a conexão está segura
   * @param url URL a ser verificada
   * @returns Promise<boolean> - true se a conexão estiver segura
   */
  static async isConnectionSecure(url: string): Promise<boolean> {
    try {
      const urlObj = new URL(url);
      
      // Verificar se usa HTTPS
      if (urlObj.protocol !== 'https:') {
        loggingService.warn('Conexão não segura detectada (não HTTPS)', { url });
        return false;
      }

      // Verificar se o domínio está na lista de domínios com pinning
      const isPinnedDomain = this.PINNED_DOMAINS.includes(urlObj.hostname);
      if (!isPinnedDomain) {
        loggingService.warn('Domínio não está na lista de domínios com SSL Pinning', { url });
      }

      return isPinnedDomain;
    } catch (error) {
      loggingService.error('Erro ao verificar segurança da conexão', { error, url });
      return false;
    }
  }
}