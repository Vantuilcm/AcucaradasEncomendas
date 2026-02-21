export const validateFaceImage = async (imageBase64: string) => {
  try {
    // Aqui você implementaria a chamada para um serviço de reconhecimento facial
    // Exemplo usando Azure Face API:
    /*
    const response = await fetch('https://seu-endpoint-azure.com/face/v1.0/detect', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': 'sua-chave-api',
      },
      body: JSON.stringify({
        image: imageBase64,
      }),
    });
    
    const data = await response.json();
    return data;
    */

    // Por enquanto, retornamos true para simulação
    return true;
  } catch (error) {
    console.error('Erro na validação facial:', error);
    throw error;
  }
};

export const validateDocument = async (documentType: string, documentFile: any) => {
  try {
    // Aqui você implementaria a validação do documento
    // Exemplo:
    /*
    const formData = new FormData();
    formData.append('document', documentFile);
    
    const response = await fetch('https://sua-api.com/validate-document', {
      method: 'POST',
      body: formData,
    });
    
    const data = await response.json();
    return data;
    */

    // Por enquanto, retornamos true para simulação
    return true;
  } catch (error) {
    console.error('Erro na validação do documento:', error);
    throw error;
  }
};

class ValidationService {
  private static instance: ValidationService;

  private constructor() {}

  public static getInstance(): ValidationService {
    if (!ValidationService.instance) {
      ValidationService.instance = new ValidationService();
    }
    return ValidationService.instance;
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validatePassword(password: string): { isValid: boolean; message: string } {
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
  }

  validatePhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    return phoneRegex.test(phone);
  }

  validateCPF(cpf: string): boolean {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    if (cleanCPF.length !== 11) return false;

    // Verifica CPFs com números iguais
    if (/^(\d)\1+$/.test(cleanCPF)) return false;

    // Validação do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(9))) return false;

    // Validação do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cleanCPF.charAt(10))) return false;

    return true;
  }

  validateCNPJ(cnpj: string): boolean {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    if (cleanCNPJ.length !== 14) return false;

    // Verifica CNPJs com números iguais
    if (/^(\d)\1+$/.test(cleanCNPJ)) return false;

    // Validação do primeiro dígito verificador
    let sum = 0;
    let weight = 5;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleanCNPJ.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    let digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cleanCNPJ.charAt(12))) return false;

    // Validação do segundo dígito verificador
    sum = 0;
    weight = 6;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleanCNPJ.charAt(i)) * weight;
      weight = weight === 2 ? 9 : weight - 1;
    }
    digit = 11 - (sum % 11);
    if (digit > 9) digit = 0;
    if (digit !== parseInt(cleanCNPJ.charAt(13))) return false;

    return true;
  }

  validateZipCode(zipCode: string): boolean {
    if (!zipCode) return false;
    // Regex para validar CEP no formato 00000-000 ou 00000000
    const zipCodeRegex = /^\d{5}-?\d{3}$/;
    return zipCodeRegex.test(zipCode);
  }

  validateAddress(address: any): boolean {
    if (!address) return false;

    // Verifica se os campos obrigatórios existem e não estão vazios
    if (!address.street || address.street.trim() === '') return false;
    if (!address.number || address.number.trim() === '') return false;
    if (!address.neighborhood || address.neighborhood.trim() === '') return false;
    if (!address.city || address.city.trim() === '') return false;
    if (!address.state || address.state.trim() === '') return false;

    // Valida o CEP usando a função específica
    if (!address.zipCode || !this.validateZipCode(address.zipCode)) return false;

    return true;
  }

  formatPhone(phone: string): string {
    const cleanPhone = phone.replace(/[^\d]/g, '');
    if (cleanPhone.length === 11) {
      return `(${cleanPhone.slice(0, 2)}) ${cleanPhone.slice(2, 7)}-${cleanPhone.slice(7)}`;
    }
    return phone;
  }

  formatCPF(cpf: string): string {
    const cleanCPF = cpf.replace(/[^\d]/g, '');
    if (cleanCPF.length === 11) {
      return `${cleanCPF.slice(0, 3)}.${cleanCPF.slice(3, 6)}.${cleanCPF.slice(6, 9)}-${cleanCPF.slice(9)}`;
    }
    return cpf;
  }

  formatCNPJ(cnpj: string): string {
    const cleanCNPJ = cnpj.replace(/[^\d]/g, '');
    if (cleanCNPJ.length === 14) {
      return `${cleanCNPJ.slice(0, 2)}.${cleanCNPJ.slice(2, 5)}.${cleanCNPJ.slice(5, 8)}/${cleanCNPJ.slice(8, 12)}-${cleanCNPJ.slice(12)}`;
    }
    return cnpj;
  }

  formatZipCode(zipCode: string): string {
    const cleanZipCode = zipCode.replace(/[^\d]/g, '');
    if (cleanZipCode.length === 8) {
      return `${cleanZipCode.slice(0, 5)}-${cleanZipCode.slice(5)}`;
    }
    return zipCode;
  }
}

export const validationService = ValidationService.getInstance();
