import { ValidationService } from '../../services/validationService';
import { PerformanceService } from '../../services/PerformanceService';

// Mock para o PerformanceService
jest.mock('../../services/PerformanceService', () => ({
  PerformanceService: {
    getInstance: jest.fn().mockReturnValue({
      trackOperation: jest.fn().mockImplementation((name, callback) => callback()),
    }),
  },
}));

describe('ValidationService Integration Tests', () => {
  let validationService: ValidationService;
  let performanceService: any;

  beforeEach(() => {
    jest.clearAllMocks();
    validationService = ValidationService.getInstance();
    performanceService = PerformanceService.getInstance();
  });

  test('should validate email format correctly', () => {
    // Testar emails válidos
    const validEmails = [
      'usuario@exemplo.com',
      'usuario.nome@exemplo.com.br',
      'usuario+tag@exemplo.co',
      'usuario-nome@exemplo.org',
    ];

    validEmails.forEach(email => {
      expect(validationService.validateEmail(email)).toBe(true);
    });

    // Testar emails inválidos
    const invalidEmails = [
      'usuario@',
      'usuario@.com',
      '@exemplo.com',
      'usuario@exemplo.',
      'usuario@exemplo..com',
      'usuario@exemplo com',
      'usuário@exemplo.com', // com caractere acentuado
    ];

    invalidEmails.forEach(email => {
      expect(validationService.validateEmail(email)).toBe(false);
    });
  });

  test('should validate phone numbers correctly', () => {
    // Testar números de telefone válidos (formato brasileiro)
    const validPhones = [
      '(11) 98765-4321',
      '11987654321',
      '+55 11 98765-4321',
      '+5511987654321',
      '11 98765-4321',
    ];

    validPhones.forEach(phone => {
      expect(validationService.validatePhone(phone)).toBe(true);
    });

    // Testar números de telefone inválidos
    const invalidPhones = [
      '(11) 9876-4321', // faltando um dígito no celular
      '119876543', // faltando dígitos
      '(11) 98765-432A', // com letra
      '(11) 08765-4321', // celular começando com 0
      '11 5555-5555', // telefone fixo (se o sistema só aceitar celular)
    ];

    invalidPhones.forEach(phone => {
      expect(validationService.validatePhone(phone)).toBe(false);
    });
  });

  test('should validate CPF correctly', () => {
    // Testar CPFs válidos
    const validCPFs = ['123.456.789-09', '12345678909', '111.444.777-35'];

    validCPFs.forEach(cpf => {
      expect(validationService.validateCPF(cpf)).toBe(true);
    });

    // Testar CPFs inválidos
    const invalidCPFs = [
      '123.456.789-00', // dígito verificador inválido
      '111.111.111-11', // todos os dígitos iguais
      '123.456.789', // incompleto
      '123.456.789-0A', // com letra
    ];

    invalidCPFs.forEach(cpf => {
      expect(validationService.validateCPF(cpf)).toBe(false);
    });
  });

  test('should validate password strength correctly', () => {
    // Testar senhas fortes
    const strongPasswords = ['Senha@123', 'AbCd3f$G', 'P@ssw0rd!', 'Segura2023#'];

    strongPasswords.forEach(password => {
      expect(validationService.validatePasswordStrength(password)).toBe(true);
    });

    // Testar senhas fracas
    const weakPasswords = [
      'senha123', // sem maiúscula
      'SENHA123', // sem minúscula
      'Senhaabc', // sem número
      'Senha1', // muito curta
      'Senha123', // sem caractere especial
    ];

    weakPasswords.forEach(password => {
      expect(validationService.validatePasswordStrength(password)).toBe(false);
    });
  });

  test('should validate address correctly', () => {
    // Testar endereços válidos
    const validAddresses = [
      {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      },
      {
        street: 'Avenida Paulista',
        number: '1578',
        complement: 'Apto 45',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-200',
      },
    ];

    validAddresses.forEach(address => {
      expect(validationService.validateAddress(address)).toBe(true);
    });

    // Testar endereços inválidos
    const invalidAddresses = [
      {
        // Sem rua
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      },
      {
        street: 'Rua das Flores',
        // Sem número
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      },
      {
        street: 'Rua das Flores',
        number: '123',
        neighborhood: 'Centro',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '0123-567', // CEP inválido
      },
    ];

    invalidAddresses.forEach(address => {
      expect(validationService.validateAddress(address)).toBe(false);
    });
  });

  test('should integrate with PerformanceService for tracking', () => {
    // Validar um email com rastreamento de performance
    validationService.validateEmail('usuario@exemplo.com');

    // Verificar se o PerformanceService foi utilizado para rastrear a operação
    expect(performanceService.trackOperation).toHaveBeenCalledWith(
      'validation_email',
      expect.any(Function)
    );

    // Validar um CPF com rastreamento de performance
    validationService.validateCPF('123.456.789-09');

    // Verificar se o PerformanceService foi utilizado para rastrear a operação
    expect(performanceService.trackOperation).toHaveBeenCalledWith(
      'validation_cpf',
      expect.any(Function)
    );
  });

  test('should handle validation errors gracefully', () => {
    // Espionar console.error
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Forçar um erro durante a validação
    const invalidInput = null;

    // A operação não deve lançar exceção
    const result = validationService.validateEmail(invalidInput as any);

    // Verificar se o resultado é false para entrada inválida
    expect(result).toBe(false);

    // Verificar se o erro foi registrado
    expect(consoleErrorSpy).toHaveBeenCalledWith('Error validating email:', expect.any(Error));

    // Restaurar console.error
    consoleErrorSpy.mockRestore();
  });
});
