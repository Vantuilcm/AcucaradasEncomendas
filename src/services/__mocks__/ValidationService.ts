// @ts-nocheck
export const validateFaceImage = jest.fn().mockResolvedValue(true);
export const validateDocument = jest.fn().mockResolvedValue(true);

export class ValidationService {
  private static instance: ValidationService;

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

  public validarTelefone(telefone: string | null): boolean {
    if (!telefone) return false;
    const regex = /^(\+55|0)?\s*\(?[1-9]{2}\)?\s*9?\d{4}[-\s]?\d{4}$/;
    return regex.test(telefone);
  }

  public validarCEP(cep: string | null): boolean {
    if (!cep) return false;
    const regex = /^\d{5}-?\d{3}$/;
    return regex.test(cep);
  }

  public validarCartao(cartao: any): boolean {
    if (!cartao) return false;
    if (!cartao.numero || !/^\d{16}$/.test(cartao.numero)) return false;
    if (!cartao.expiracao || !/^(0[1-9]|1[0-2])\/([0-9]{2})$/.test(cartao.expiracao)) return false;
    if (!cartao.cvv || !/^\d{3}$/.test(cartao.cvv)) return false;
    if (!cartao.nome || cartao.nome.trim() === '') return false;
    return true;
  }

  public validarEndereco(endereco: any): boolean {
    if (!endereco) return false;
    if (!endereco.rua || endereco.rua.trim() === '') return false;
    if (!endereco.numero || endereco.numero.trim() === '') return false;
    if (!endereco.bairro || endereco.bairro.trim() === '') return false;
    if (!endereco.cidade || endereco.cidade.trim() === '') return false;
    if (!endereco.estado || endereco.estado.trim() === '') return false;
    if (!this.validarCEP(endereco.cep)) return false;
    return true;
  }

  public validarCliente(cliente: any): boolean {
    if (!cliente) return false;
    if (!cliente.nome || cliente.nome.trim() === '') return false;
    if (!this.validarEmail(cliente.email)) return false;
    if (!this.validarTelefone(cliente.telefone)) return false;
    return true;
  }

  validateEmail = jest.fn().mockImplementation((email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  });

  validatePassword = jest
    .fn()
    .mockImplementation((password: string): { isValid: boolean; message: string } => {
      if (password.length < 8) {
        return { isValid: false, message: 'A senha deve ter no mínimo 8 caracteres' };
      }
      if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'A senha deve conter pelo menos uma letra maiúscula' };
      }
      if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'A senha deve conter pelo menos uma letra minúscula' };
      }
      if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'A senha deve conter pelo menos um número' };
      }
      if (!/[!@#$%^&*]/.test(password)) {
        return {
          isValid: false,
          message: 'A senha deve conter pelo menos um caractere especial (!@#$%^&*)',
        };
      }
      return { isValid: true, message: '' };
    });

  validatePhone = jest.fn().mockImplementation((phone: string): boolean => {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  });

  validateCPF = jest.fn().mockImplementation((cpf: string): boolean => {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    if (cleanCPF.length !== 11) return false;
    if (/^(\d)\1+$/.test(cleanCPF)) return false;
    return true;
  });

  validateCNPJ = jest.fn().mockImplementation((cnpj: string): boolean => {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    if (cleanCNPJ.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;
    return true;
  });

  formatPhone = jest.fn().mockImplementation((phone: string): string => {
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{5})(\d{4})$/);
    if (match) {
      return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return phone;
  });

  formatCPF = jest.fn().mockImplementation((cpf: string): string => {
    const cleaned = cpf.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{3})(\d{2})$/);
    if (match) {
      return match[1] + '.' + match[2] + '.' + match[3] + '-' + match[4];
    }
    return cpf;
  });

  formatCNPJ = jest.fn().mockImplementation((cnpj: string): string => {
    const cleaned = cnpj.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/);
    if (match) {
      return match[1] + '.' + match[2] + '.' + match[3] + '/' + match[4] + '-' + match[5];
    }
    return cnpj;
  });
}

export default ValidationService;
// Provide the same exported const used by real service
export const validationService = ValidationService.getInstance();
