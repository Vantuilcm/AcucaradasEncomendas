import { PerformanceService } from './PerformanceService';
import { LoggingService } from './LoggingService';

const logger = LoggingService.getInstance();

export const validateFaceImage = async (imageBase64: string) => {
  try {
    if (typeof imageBase64 !== 'string') {
      throw new Error('Imagem inválida');
    }
    const trimmed = imageBase64.trim();
    const looksLikeDataUrl = trimmed.startsWith('data:image/') && trimmed.includes(';base64,');
    if (!looksLikeDataUrl || trimmed.length < 32) {
      throw new Error('Imagem inválida');
    }
    return true;
  } catch (error: any) {
    logger.error('Erro na validação facial', error);
    throw error;
  }
};

export const validateDocument = async (documentType: string, documentFile: any) => {
  try {
    if (typeof documentType !== 'string' || documentType.trim() === '') {
      throw new Error('Tipo de documento inválido');
    }
    const allowed = new Set(['RG', 'CPF', 'CNH', 'CNPJ']);
    if (!allowed.has(documentType)) {
      throw new Error('Tipo de documento inválido');
    }
    if (!documentFile) {
      throw new Error('Documento inválido');
    }
    const hasBuffer = typeof (documentFile as any).buffer !== 'undefined';
    const hasUri = typeof (documentFile as any).uri === 'string';
    if (!hasBuffer && !hasUri) {
      throw new Error('Documento inválido');
    }
    return true;
  } catch (error: any) {
    logger.error('Erro na validação do documento', { documentType, error });
    throw error;
  }
};

export interface CartaoCredito {
  number: string;
  expMonth: number; // 1..12
  expYear: number;  // ano com 4 dígitos
  cvc: string;      // 3 ou 4 dígitos
  holderName?: string;
}

export class ValidationService {
  private static instance: ValidationService;
  private static readonly TWO_DIGIT_YEAR_BASE = 2000;
  private constructor() {}

  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  public validarEmail(email: string | null): boolean {
    if (!email) return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }

  public validateEmail(email: string): boolean {
    const perf = (PerformanceService as any).getInstance?.() || undefined;
    const compute = () => {
      if (typeof email !== 'string') {
        throw new Error('Invalid email input');
      }
      const pattern = /^(?!.*\.\.)[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
      return pattern.test(email);
    };
    try {
      if (perf && typeof perf.trackOperation === 'function') {
        const maybeResult = perf.trackOperation('validation_email', compute);
        if (typeof maybeResult === 'boolean') return maybeResult;
        return compute();
      }
      const opId = perf && typeof perf.startOperation === 'function' ? perf.startOperation('validation_email', 'validation') : undefined;
      const result = compute();
      if (opId && typeof perf?.endOperation === 'function') {
        perf.endOperation(opId, true);
      }
      return result;
    } catch (error) {
      const opId = undefined;
      if (opId && typeof perf?.endOperation === 'function') {
        perf.endOperation(opId, false, { error: String((error as any)?.message || error) });
      }
      const err = error instanceof Error ? error : new Error(String(error));
      const isTestEnv =
        typeof process !== 'undefined' &&
        (process.env.NODE_ENV === 'test' || !!process.env.JEST_WORKER_ID);
      if (isTestEnv) console.error('Error validating email:', err);
      logger.error('Error validating email', err as any);
      return false;
    }
  }

  public validatePassword(password: string): { isValid: boolean; message: string } {
    if (password.length < 6) return { isValid: false, message: 'A senha deve ter no mínimo 6 caracteres' };
    return { isValid: true, message: '' };
  }

  public validarTelefone(telefone: string | null): boolean {
    if (!telefone) return false;
    const regex = /^(\+55|0)?\s*\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4}$/;
    return regex.test(telefone);
  }

  public validatePhone(phone: string): boolean {
    if (typeof phone !== 'string') return false;
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) {
      digits = digits.slice(2);
    }
    if (digits.length !== 11) return false;
    if (digits[0] === '0') return false;
    if (digits[2] !== '9') return false;
    return /^\d{11}$/.test(digits);
  }

  public validateCPF(cpf: string): boolean {
    const perf = (PerformanceService as any).getInstance?.() || undefined;
    const compute = () => {
      const clean = cpf.replace(/[^\d]/g, '');
      if (clean.length !== 11) return false;
      if (/^(\d)\1+$/.test(clean)) return false;
      const calcDV = (base: string, factorStart: number) => {
        let sum = 0;
        for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * (factorStart - i);
        const rest = sum % 11;
        return rest < 2 ? 0 : 11 - rest;
      };
      const dv1 = calcDV(clean.slice(0, 9), 10);
      const dv2 = calcDV(clean.slice(0, 10), 11);
      return clean.endsWith(`${dv1}${dv2}`);
    };
    try {
      if (perf && typeof perf.trackOperation === 'function') {
        return perf.trackOperation('validation_cpf', compute);
      }
      const opId = perf && typeof perf.startOperation === 'function' ? perf.startOperation('validation_cpf', 'validation') : undefined;
      const result = compute();
      if (opId && typeof perf?.endOperation === 'function') {
        perf.endOperation(opId, result);
      }
      return result;
    } catch (error) {
      const opId = undefined;
      if (opId && typeof perf?.endOperation === 'function') {
        perf.endOperation(opId, false, { error: String((error as any)?.message || error) });
      }
      logger.error('Error validating CPF', error as any);
      return false;
    }
  }

  public validateCNPJ(cnpj: string): boolean {
    const clean = cnpj.replace(/[^\d]/g, '');
    if (clean.length !== 14) return false;
    if (/^(\d)\1+$/.test(clean)) return false;
    const calcDV = (base: string, factors: number[]) => {
      let sum = 0;
      for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * factors[i % factors.length];
      const rest = sum % 11;
      return rest < 2 ? 0 : 11 - rest;
    };
    const dv1 = calcDV(clean.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
    const dv2 = calcDV(clean.slice(0, 13), [6,5,4,3,2,9,8,7,6,5,4,3,2]);
    return clean.endsWith(`${dv1}${dv2}`);
  }

  public validarCEP(cep: string | null): boolean {
    if (!cep) return false;
    const regex = /^\d{5}-?\d{3}$/;
    return regex.test(cep);
  }

  public validateZipCode(zip: string): boolean {
    return this.validarCEP(zip);
  }

  public validarEndereco(endereco: { rua?: string; numero?: string; bairro?: string; cidade?: string; estado?: string; cep?: string } | null): boolean {
    if (!endereco) return false;
    if (!endereco.rua || endereco.rua.trim() === '') return false;
    if (!endereco.numero || endereco.numero.trim() === '') return false;
    if (!endereco.bairro || endereco.bairro.trim() === '') return false;
    if (!endereco.cidade || endereco.cidade.trim() === '') return false;
    if (!endereco.estado || endereco.estado.trim() === '') return false;
    if (!this.validarCEP(endereco.cep || '')) return false;
    return true;
  }

  public formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
    return phone;
  }

  public formatCPF(cpf: string): string {
    const cleaned = cpf.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) return `${match[1]}.${match[2]}.${match[3]}-${match[4]}`;
    return cpf;
  }

  public formatCNPJ(cnpj: string): string {
    const cleaned = cnpj.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
    if (match) return `${match[1]}.${match[2]}.${match[3]}/${match[4]}-${match[5]}`;
    return cnpj;
  }

  public formatZipCode(zip: string): string {
    const cleaned = zip.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{5})(\d{3})$/);
    if (match) return `${match[1]}-${match[2]}`;
    return zip;
  }

  // Validação de cartão de crédito (Luhn + validade)
  public validarCartao(cartao: any): boolean {
    if (!cartao) return false;
    const normalized: CartaoCredito = {
      number: typeof cartao.number === 'string' ? cartao.number : typeof cartao.numero === 'string' ? cartao.numero : '',
      expMonth: typeof cartao.expMonth === 'number' ? cartao.expMonth : 0,
      expYear: typeof cartao.expYear === 'number' ? cartao.expYear : 0,
      cvc: typeof cartao.cvc === 'string' ? cartao.cvc : typeof cartao.cvv === 'string' ? cartao.cvv : '',
      holderName: typeof cartao.holderName === 'string' ? cartao.holderName : typeof cartao.nome === 'string' ? cartao.nome : undefined,
    };

    if ((!normalized.expMonth || !normalized.expYear) && typeof cartao.expiracao === 'string') {
      const [mmRaw, yyRaw] = cartao.expiracao.split('/');
      const mm = parseInt(String(mmRaw || ''), 10);
      const yy = parseInt(String(yyRaw || ''), 10);
      if (!Number.isNaN(mm) && !Number.isNaN(yy)) {
        normalized.expMonth = mm;
        normalized.expYear = yy < 100 ? ValidationService.TWO_DIGIT_YEAR_BASE + yy : yy;
      }
    }

    if (!normalized.holderName || normalized.holderName.trim() === '') return false;
    if (!normalized.number || !normalized.cvc) return false;
    const num = normalized.number.replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(num)) return false;
    // Luhn
    let sum = 0; let shouldDouble = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let digit = parseInt(num[i], 10);
      if (shouldDouble) { digit *= 2; if (digit > 9) digit -= 9; }
      sum += digit; shouldDouble = !shouldDouble;
    }
    const luhnValid = sum % 10 === 0;
    if (!luhnValid) return false;
    if (normalized.expMonth < 1 || normalized.expMonth > 12) return false;
    const now = new Date();
    const exp = new Date(normalized.expYear, normalized.expMonth - 1, 1);
    const lastDayOfMonth = new Date(normalized.expYear, normalized.expMonth, 0);
    if (lastDayOfMonth < now) return false;
    if (!/^\d{3,4}$/.test(normalized.cvc)) return false;
    return true;
  }

  public validarCliente(cliente: { nome?: string; email?: string | null; telefone?: string | null } | null): boolean {
    if (!cliente) return false;
    if (!cliente.nome || cliente.nome.trim() === '') return false;
    if (!this.validarEmail(cliente.email ?? null)) return false;
    if (!this.validarTelefone(cliente.telefone ?? null)) return false;
    return true;
  }
  public validatePasswordStrength(password: string): boolean {
    if (typeof password !== 'string') return false;
    const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
    return strong.test(password);
  }
  public validateAddress(address: any): boolean {
    if (!address) return false;
    // Mapeia campos em português para compatibilidade com validarEndereco
    const endereco = {
      rua: address?.street,
      numero: address?.number,
      bairro: address?.neighborhood,
      cidade: address?.city,
      estado: address?.state,
      cep: address?.zipCode,
    };
    return this.validarEndereco(endereco);
  }
}

export default ValidationService;
export const validationService = ValidationService.getInstance();
