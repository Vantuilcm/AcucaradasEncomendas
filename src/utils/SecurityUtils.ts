/**
 * Utilitários de segurança para prevenção de vulnerabilidades
 */
export class SecurityUtils {
  /**
   * Sanitiza strings HTML para prevenir ataques XSS
   * Remove tags HTML e scripts maliciosos
   * @param input String a ser sanitizada
   * @returns String sanitizada
   */
  public static sanitizeHTML(input: string): string {
    if (!input) return '';

    // Remover tags HTML potencialmente perigosas
    let sanitized = input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/`/g, '&#x60;')
      .replace(/\//g, '&#x2F;');

    // Remover padrões de script potencialmente perigosos
    sanitized = sanitized
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/data:/gi, '');

    return sanitized;
  }

  /**
   * Sanitiza entradas para prevenir injeção SQL
   * @param input String a ser sanitizada
   * @returns String sanitizada
   */
  public static sanitizeSQL(input: string): string {
    if (!input) return '';

    // Escapar caracteres especiais SQL
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '');
  }

  /**
   * Valida um email
   * @param email Email a ser validado
   * @returns Booleano indicando se o email é válido
   */
  public static validateEmail(email: string): boolean {
    if (!email) return false;
    
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  /**
   * Valida força de senha
   * @param password Senha a ser validada
   * @returns Objeto com resultado da validação e mensagem
   */
  public static validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password) return { valid: false, message: 'Senha não pode ser vazia' };
    
    if (password.length < 8) {
      return { valid: false, message: 'Senha deve ter pelo menos 8 caracteres' };
    }
    
    // Verificar complexidade da senha
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    if (!(hasUpperCase && hasLowerCase && hasNumbers)) {
      return { 
        valid: false, 
        message: 'Senha deve conter letras maiúsculas, minúsculas e números' 
      };
    }
    
    // Senha forte se tiver caracteres especiais
    if (!hasSpecialChars) {
      return { 
        valid: true, 
        message: 'Recomendação: adicione caracteres especiais para uma senha mais forte' 
      };
    }
    
    return { valid: true };
  }
}