/**
 * Utilitários de segurança para iOS (Stub/Implementação Segura)
 */
export class SecurityUtils {
  public static sanitizeHTML(input: string): string {
    if (!input) return '';
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/`/g, '&#x60;')
      .replace(/\//g, '&#x2F;');
  }

  public static sanitizeSQL(input: string): string {
    if (!input) return '';
    return input.replace(/'/g, "''").replace(/\\/g, '\\\\').replace(/;/g, '');
  }

  public static validateEmail(email: string): boolean {
    if (!email) return false;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  }

  public static validatePassword(password: string): { valid: boolean; message?: string } {
    if (!password) return { valid: false, message: 'Senha não pode ser vazia' };
    if (password.length < 8) return { valid: false, message: 'Senha deve ter pelo menos 8 caracteres' };
    return { valid: true };
  }
}
