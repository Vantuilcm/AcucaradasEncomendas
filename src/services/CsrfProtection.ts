import { v4 as uuidv4 } from 'uuid';

/**
 * ServiÃ§o de proteÃ§Ã£o contra ataques CSRF (Cross-Site Request Forgery)
 */
export class CsrfProtection {
  private static readonly TOKEN_KEY = 'csrf_token';
  private static readonly HEADER_NAME = 'X-CSRF-Token';
  
  /**
   * Gera um novo token CSRF e o armazena
   * @returns Token CSRF gerado
   */
  static generateToken(): string {
    const token = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem(this.TOKEN_KEY, token);
    }
    return token;
  }
  
  /**
   * ObtÃ©m o token CSRF atual ou gera um novo se nÃ£o existir
   * @returns Token CSRF atual
   */
  static getToken(): string {
    if (typeof window === 'undefined') return '';
    
    let token = localStorage.getItem(this.TOKEN_KEY);
    if (!token) {
      token = this.generateToken();
    }
    return token;
  }
  
  /**
   * Valida se o token fornecido corresponde ao token armazenado
   * @param token Token a ser validado
   * @returns Verdadeiro se o token for vÃ¡lido
   */
  static validateToken(token: string): boolean {
    if (typeof window === 'undefined') return false;
    if (!token) return false;
    
    const storedToken = localStorage.getItem(this.TOKEN_KEY);
    return token === storedToken;
  }
  
  /**
   * Adiciona o token CSRF aos cabeÃ§alhos de uma requisiÃ§Ã£o fetch
   * @param headers CabeÃ§alhos da requisiÃ§Ã£o
   * @returns CabeÃ§alhos com token CSRF adicionado
   */
  static addTokenToHeaders(headers: HeadersInit = {}): HeadersInit {
    const headersObj = headers instanceof Headers ? 
      Object.fromEntries(headers.entries()) : 
      { ...headers };
    
    return {
      ...headersObj,
      [this.HEADER_NAME]: this.getToken()
    };
  }
}
