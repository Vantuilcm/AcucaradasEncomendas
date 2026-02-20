import { secureLoggingService } from './SecureLoggingService';

// Tipos auxiliares para validação simplificada de JSON
export type FieldSchema = { type: string; maxLength?: number; [key: string]: any };

/**
 * Serviço responsável pela validação robusta de entradas do usuário
 * Implementa validações avançadas para prevenir injeções e outros ataques
 */
export class InputValidationService {
  // Expressões regulares para validações comuns
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private static readonly PHONE_REGEX = /^\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}$/;
  private static readonly URL_REGEX = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/;
  private static readonly CPF_REGEX = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
  private static readonly CNPJ_REGEX = /^\d{2}\.\d{3}\.\d{3}\/[\d]{4}-\d{2}$/;
  private static readonly CREDIT_CARD_REGEX = /^[0-9]{13,19}$/;
  private static readonly STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  // Lista de padrões de ataque comuns
  private static readonly ATTACK_PATTERNS = [
    // SQL Injection
    /('|\s)*(OR|AND)(\s|\()+('|\s)*\d+('|\s)*=('|\s)*\d+/i,
    /('|\s)*(UNION|SELECT|INSERT|UPDATE|DELETE|DROP)(\s|\()+/i,
    // XSS
    /<script[^>]*>[\s\S]*?<\/script>/i,
    /javascript:[\s\S]*\(/i,
    /on\w+\s*=\s*["']?[^"']*["']?/i,
    // Command Injection
    /;\s*(ls|dir|cat|rm|del|cp|mv|chmod|wget|curl)/i,
    // Path Traversal
    /\.\.(\/|\\)/,
  ];

  /**
   * Valida e sanitiza uma entrada de texto
   * @param input Texto a ser validado e sanitizado
   * @param options Opções de validação
   * @returns string - Texto sanitizado
   */
  static validateAndSanitizeInput(
    input: string,
    options?: {
      allowHtml?: boolean;
      maxLength?: number;
      type?: 'text' | 'email' | 'phone' | 'url' | 'cpf' | 'credit_card' | 'password';
    }
  ): string {
    if (!input) return '';

    try {
      let sanitized = input.trim();

      // Verificar comprimento máximo
      if (options?.maxLength && sanitized.length > options.maxLength) {
        sanitized = sanitized.substring(0, options.maxLength);
        secureLoggingService.security('Entrada truncada por exceder comprimento máximo', {
          original: input.length,
          truncated: options.maxLength,
          timestamp: new Date().toISOString(),
          severity: 'low',
        });
      }

      // Validar tipo específico
      if (options?.type) {
        this.validateInputType(sanitized, options.type);
      }

      // Detectar padrões de ataque
      if (this.detectAttackPatterns(sanitized)) {
        secureLoggingService.security('Padrão de ataque detectado na entrada', {
          input: sanitized,
          timestamp: new Date().toISOString(),
          severity: 'high',
        });
        throw new Error('Entrada inválida: contém padrões suspeitos');
      }

      // Sanitizar HTML se não for permitido
      if (!options?.allowHtml) {
        sanitized = this.sanitizeHtml(sanitized);
      }

      return sanitized;
    } catch (error) {
      secureLoggingService.security('Erro ao validar entrada', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        input,
        timestamp: new Date().toISOString(),
        severity: 'medium',
      });
      throw error;
    }
  }

  /**
   * Valida um tipo específico de entrada
   * @param input Texto a ser validado
   * @param type Tipo de validação
   * @returns boolean - true se a validação for bem-sucedida
   */
  static validateInputType(input: string, type: string): boolean {
    switch (type) {
      case 'email':
        if (!this.EMAIL_REGEX.test(input)) {
          throw new Error('Email inválido');
        }
        break;
      case 'phone':
        if (!this.PHONE_REGEX.test(input)) {
          throw new Error('Telefone inválido');
        }
        break;
      case 'url':
        if (!this.URL_REGEX.test(input)) {
          throw new Error('URL inválida');
        }
        break;
      case 'cpf':
        {
          const cleaned = input.replace(/\D/g, '');
          const validMasked = this.CPF_REGEX.test(input);
          const validDigits = this.isCPFValid(cleaned);
          if (!validMasked && !validDigits) {
            throw new Error('CPF inválido');
          }
        }
        break;
      case 'cnpj':
        {
          const cleaned = input.replace(/\D/g, '');
          const validMasked = this.CNPJ_REGEX.test(input);
          const validDigits = this.isCNPJValid(cleaned);
          if (!validMasked && !validDigits) {
            throw new Error('CNPJ inválido');
          }
        }
        break;
      case 'credit_card':
        if (!this.CREDIT_CARD_REGEX.test(input)) {
          throw new Error('Número de cartão de crédito inválido');
        }
        break;
      case 'password':
        if (!this.STRONG_PASSWORD_REGEX.test(input)) {
          throw new Error(
            'Senha deve conter pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais'
          );
        }
        break;
    }

    return true;
  }

  /**
   * Sanitiza HTML de uma string
   * @param input Texto a ser sanitizado
   * @returns string - Texto sanitizado
   */
  static sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Detecta padrões de ataque em uma string
   * @param input Texto a ser verificado
   * @returns boolean - true se algum padrão de ataque for detectado
   */
  static detectAttackPatterns(input: string): boolean {
    return this.ATTACK_PATTERNS.some(pattern => pattern.test(input));
  }

  /**
   * Valida um objeto JSON
   * @param json Objeto JSON a ser validado
   * @param schema Schema de validação
   * @returns boolean - true se a validação for bem-sucedida
   */
  static validateJson(json: any, schema: any): boolean {
    try {
      // Em uma implementação real, usaríamos uma biblioteca como Joi, Yup ou Zod
      // para validação de schema

      // Implementação simplificada para demonstração
      if (!json) {
        throw new Error('JSON inválido');
      }

      // Verificar propriedades obrigatórias
      if (schema && Array.isArray(schema.required)) {
        for (const field of schema.required) {
          if (json[field] === undefined) {
            throw new Error(`Campo obrigatório ausente: ${field}`);
          }
        }
      }

      // Verificar tipos de propriedades
      if (schema && schema.properties && typeof schema.properties === 'object') {
        const properties = schema.properties as Record<string, FieldSchema>;
        for (const [field, fieldSchema] of Object.entries(properties)) {
          if (json[field] !== undefined) {
            const fieldType = fieldSchema.type;
            const value = json[field];

            if (fieldType === 'array' && !Array.isArray(value)) {
              throw new Error(`Campo ${field} deve ser um array`);
            } else if (fieldType !== 'array' && typeof value !== fieldType) {
              throw new Error(`Campo ${field} deve ser do tipo ${fieldType}`);
            }

            // Validar comprimento máximo para strings
            if (
              fieldType === 'string' &&
              typeof value === 'string' &&
              fieldSchema.maxLength &&
              value.length > fieldSchema.maxLength
            ) {
              throw new Error(`Campo ${field} excede o comprimento máximo de ${fieldSchema.maxLength}`);
            }
          }
        }
      }

      return true;
    } catch (error) {
      secureLoggingService.security('Erro ao validar JSON', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium',
      });
      throw error;
    }
  }

  /**
   * Valida parâmetros de URL
   * @param params Parâmetros de URL
   * @returns object - Parâmetros sanitizados
   */
  static validateUrlParams(params: Record<string, string>): Record<string, string> {
    const sanitizedParams: Record<string, string> = {};

    for (const [key, value] of Object.entries(params)) {
      // Sanitizar chave e valor
      const sanitizedKey = this.validateAndSanitizeInput(key);
      const sanitizedValue = this.validateAndSanitizeInput(value);

      sanitizedParams[sanitizedKey] = sanitizedValue;
    }

    return sanitizedParams;
  }

  /**
   * Valida e sanitiza um objeto completo
   * @param obj Objeto a ser validado
   * @param options Opções de validação
   * @returns object - Objeto sanitizado
   */
  static validateAndSanitizeObject(
    obj: Record<string, any>,
    options?: {
      allowedFields?: string[];
      schema?: any;
    }
  ): Record<string, any> {
    const sanitizedObj: Record<string, any> = {};

    try {
      // Validar schema se fornecido
      if (options?.schema) {
        this.validateJson(obj, options.schema);
      }

      // Filtrar campos permitidos
      const fields = options?.allowedFields || Object.keys(obj);

      for (const field of fields) {
        if (obj[field] !== undefined) {
          if (typeof obj[field] === 'string') {
            sanitizedObj[field] = this.validateAndSanitizeInput(obj[field]);
          } else if (typeof obj[field] === 'object' && obj[field] !== null) {
            sanitizedObj[field] = this.validateAndSanitizeObject(obj[field]);
          } else {
            sanitizedObj[field] = obj[field];
          }
        }
      }

      return sanitizedObj;
    } catch (error) {
      secureLoggingService.security('Erro ao validar objeto', {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString(),
        severity: 'medium',
      });
      throw error;
    }
  }

  private static isCPFValid(cpfDigits: string): boolean {
    if (!cpfDigits || cpfDigits.length !== 11) {
      return false;
    }
    if (/^(\d)\1{10}$/.test(cpfDigits)) {
      return false;
    }
    const calc = (base: number[]): number => {
      const sum = base.reduce((acc, cur, idx) => acc + cur * (base.length + 1 - idx), 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const nums = cpfDigits.split('').map(n => parseInt(n, 10));
    const d1 = calc(nums.slice(0, 9));
    if (d1 !== nums[9]) {
      return false;
    }
    const d2 = calc(nums.slice(0, 10));
    return d2 === nums[10];
  }

  private static isCNPJValid(cnpjDigits: string): boolean {
    if (!cnpjDigits || cnpjDigits.length !== 14) {
      return false;
    }
    if (/^(\d)\1{13}$/.test(cnpjDigits)) {
      return false;
    }
    const nums = cnpjDigits.split('').map(n => parseInt(n, 10));
    const calc = (len: number): number => {
      const factors = len === 12 ? [5,4,3,2,9,8,7,6,5,4,3,2] : [6,5,4,3,2,9,8,7,6,5,4,3,2];
      const sum = nums.slice(0, len).reduce((acc, cur, idx) => acc + cur * factors[idx], 0);
      const mod = sum % 11;
      return mod < 2 ? 0 : 11 - mod;
    };
    const d1 = calc(12);
    if (d1 !== nums[12]) {
      return false;
    }
    const d2 = calc(13);
    return d2 === nums[13];
  }
}
