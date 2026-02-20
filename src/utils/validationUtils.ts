/**
 * Valida um endereço de email
 * @param email Email a ser validado
 * @returns true se o email for válido, false caso contrário
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida um número de telefone
 * @param phone Número de telefone a ser validado
 * @returns true se o telefone for válido, false caso contrário
 */
export const isValidPhone = (phone: string): boolean => {
  // Remove todos os caracteres não numéricos
  const cleanPhone = phone.replace(/\D/g, '');

  // Para Brasil, valida celular com DDD (10 ou 11 dígitos)
  if (cleanPhone.length < 10 || cleanPhone.length > 11) {
    return false;
  }

  // Se tiver 11 dígitos, o 3º dígito deve ser 9 (celular)
  if (cleanPhone.length === 11 && cleanPhone.charAt(2) !== '9') {
    return false;
  }

  return true;
};

/**
 * Valida um CPF
 * @param cpf CPF a ser validado
 * @returns true se o CPF for válido, false caso contrário
 */
export const isValidCPF = (cpf: string): boolean => {
  // Remove todos os caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');

  // CPF deve ter 11 dígitos
  if (cleanCPF.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1+$/.test(cleanCPF)) {
    return false;
  }

  // Validação pelo algoritmo do CPF
  let sum = 0;
  let remainder;

  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }

  remainder = (sum * 10) % 11;

  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }

  if (remainder !== parseInt(cleanCPF.substring(9, 10))) {
    return false;
  }

  // Segundo dígito verificador
  sum = 0;

  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }

  remainder = (sum * 10) % 11;

  if (remainder === 10 || remainder === 11) {
    remainder = 0;
  }

  if (remainder !== parseInt(cleanCPF.substring(10, 11))) {
    return false;
  }

  return true;
};

/**
 * Valida uma senha com base em critérios de segurança
 * @param password Senha a ser validada
 * @param minLength Comprimento mínimo da senha (default: 8)
 * @returns true se a senha atender aos critérios de segurança, false caso contrário
 */
export const isStrongPassword = (password: string, minLength = 8): boolean => {
  if (password.length < minLength) {
    return false;
  }

  // Deve conter pelo menos uma letra maiúscula
  if (!/[A-Z]/.test(password)) {
    return false;
  }

  // Deve conter pelo menos uma letra minúscula
  if (!/[a-z]/.test(password)) {
    return false;
  }

  // Deve conter pelo menos um número
  if (!/[0-9]/.test(password)) {
    return false;
  }

  // Deve conter pelo menos um caractere especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false;
  }

  return true;
};
