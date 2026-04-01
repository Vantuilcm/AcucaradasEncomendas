// 🛡️ src/core/monitoring/redact.ts
// Utilitário para sanitização de dados sensíveis em logs.

const SENSITIVE_KEYS = [
  'token',
  'auth',
  'authorization',
  'apiKey',
  'api_key',
  'password',
  'secret',
  'cvv',
  'cardNumber',
  'card_number',
  'email',
];

/**
 * Remove ou mascara dados sensíveis de um objeto ou string.
 */
export function redact(data: any): any {
  if (!data) return data;

  if (typeof data === 'string') {
    // Mascarar emails
    const emailRegex = /([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    return data.replace(emailRegex, () => '[REDACTED]');
  }

  if (Array.isArray(data)) {
    return data.map(item => redact(item));
  }

  if (typeof data === 'object') {
    const redacted: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        const lowerKey = key.toLowerCase();
        
        // Se a chave for sensível, mascarar
        if (SENSITIVE_KEYS.some(sk => lowerKey.includes(sk))) {
          redacted[key] = '[REDACTED]';
        } else {
          redacted[key] = redact(data[key]);
        }
      }
    }
    return redacted;
  }

  return data;
}
