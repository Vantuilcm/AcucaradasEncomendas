import DOMPurify from 'dompurify';

/**
 * UtilitÃ¡rio para sanitizaÃ§Ã£o de entradas contra ataques XSS
 */
export class XssSanitizer {
  /**
   * Sanitiza uma string para prevenir ataques XSS
   * @param input String a ser sanitizada
   * @returns String sanitizada segura para renderizaÃ§Ã£o
   */
  static sanitize(input: string): string {
    if (!input) return '';
    
    try {
      return DOMPurify.sanitize(input, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ['script', 'style', 'iframe', 'frame', 'object', 'embed'],
        FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
      });
    } catch (error) {
      console.error('Erro ao sanitizar entrada:', error);
      // Em caso de erro, retorna string vazia para evitar renderizaÃ§Ã£o de conteÃºdo potencialmente malicioso
      return '';
    }
  }

  /**
   * Sanitiza valores de objetos recursivamente
   * @param obj Objeto a ser sanitizado
   * @returns Objeto com valores sanitizados
   */
  static sanitizeObject(obj: any): any {
    if (!obj) return obj;
    
    if (typeof obj === 'string') {
      return this.sanitize(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          sanitized[key] = this.sanitizeObject(obj[key]);
        }
      }
      return sanitized;
    }
    
    return obj;
  }
}
