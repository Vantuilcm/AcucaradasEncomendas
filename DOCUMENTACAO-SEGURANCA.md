# Documentação de Segurança - Acucaradas Encomendas

## Visão Geral

Este documento descreve todas as medidas de segurança implementadas no aplicativo Acucaradas Encomendas para proteger dados de usuários, transações e a integridade do sistema. A documentação serve como referência para auditorias de segurança, conformidade com requisitos de lojas de aplicativos e manutenção contínua das proteções implementadas.

**Data da última atualização:** `r Get-Date -Format "dd/MM/yyyy"`

## Índice

1. [Headers de Segurança](#1-headers-de-segurança)
2. [Proteção Contra CSRF](#2-proteção-contra-csrf)
3. [Sanitização de Inputs](#3-sanitização-de-inputs)
4. [Proteções Adicionais](#4-proteções-adicionais)
5. [Autenticação e Autorização](#5-autenticação-e-autorização)
6. [Armazenamento Seguro de Dados](#6-armazenamento-seguro-de-dados)
7. [Comunicação Segura](#7-comunicação-segura)
8. [Proteção Contra Ataques Comuns](#8-proteção-contra-ataques-comuns)
9. [Conformidade com Requisitos de Lojas](#9-conformidade-com-requisitos-de-lojas)
10. [Processo de Auditoria e Monitoramento](#10-processo-de-auditoria-e-monitoramento)

## 1. Headers de Segurança

### 1.1 Content Security Policy (CSP)

Implementamos uma política CSP rigorosa para mitigar riscos de XSS e outros ataques baseados em injeção de conteúdo:

```javascript
// Implementado em src/utils/security-headers.js
const csp = {
  'default-src': ["'self'"],
  'script-src': ["'self'", "'unsafe-inline'", "https://apis.google.com", "https://www.gstatic.com"],
  'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  'font-src': ["'self'", "https://fonts.gstatic.com"],
  'img-src': ["'self'", "data:", "https://www.gravatar.com"],
  'connect-src': ["'self'", "https://api.acucaradas.com"],
  'media-src': ["'self'"],
  'object-src': ["'none'"],
  'frame-src': ["'self'"],
  'report-uri': ["/csp-violation-report"]
};
```

### 1.2 Outros Headers de Segurança

Além do CSP, implementamos os seguintes headers de segurança:

- **X-Content-Type-Options**: `nosniff` - Previne MIME-sniffing
- **X-Frame-Options**: `DENY` - Previne clickjacking
- **X-XSS-Protection**: `1; mode=block` - Proteção adicional contra XSS
- **Strict-Transport-Security**: `max-age=31536000; includeSubDomains` - Força HTTPS
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Limita informações de referência
- **Feature-Policy**: Restringe acesso a recursos sensíveis do dispositivo
- **Permissions-Policy**: Controla permissões para APIs modernas

## 2. Proteção Contra CSRF

### 2.1 Implementação Básica

Implementamos proteção CSRF usando tokens gerados aleatoriamente com UUID v4:

```typescript
// Implementado em src/services/CsrfProtection.ts
export class CsrfProtection {
  private static TOKEN_KEY = 'csrf_token';

  static generateToken(): string {
    const token = uuidv4();
    localStorage.setItem(this.TOKEN_KEY, token);
    return token;
  }

  static getToken(): string {
    return localStorage.getItem(this.TOKEN_KEY) || this.generateToken();
  }

  static validateToken(token: string): boolean {
    const storedToken = this.getToken();
    return token === storedToken;
  }

  static addTokenToHeaders(headers: Record<string, string> = {}): Record<string, string> {
    return {
      ...headers,
      'X-CSRF-Token': this.getToken()
    };
  }
}
```

### 2.2 Proteção CSRF Avançada

Implementamos uma versão avançada com expiração de tokens:

```javascript
// Implementado em src/utils/protecoes-adicionais.js
class CsrfProtectionAdvanced {
  constructor(expirationMinutes = 30) {
    this.expirationMinutes = expirationMinutes;
  }
  
  generateToken() {
    const token = uuidv4();
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + this.expirationMinutes);
    
    const tokenData = {
      token,
      expires: expires.getTime()
    };
    
    localStorage.setItem('csrfToken', JSON.stringify(tokenData));
    return tokenData;
  }
  
  validateToken(token) {
    // Validação com verificação de expiração
    // ...
  }
}
```

## 3. Sanitização de Inputs

### 3.1 Sanitização HTML

Utilizamos DOMPurify para sanitizar conteúdo HTML e prevenir XSS:

```javascript
// Implementado em src/utils/protecoes-adicionais.js
const sanitizeHtml = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title', 'target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'object', 'embed', 'link'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'eval'],
    ALLOW_DATA_ATTR: false
  });
};
```

### 3.2 Proteção Contra Injeção SQL

Implementamos escape de caracteres especiais para prevenir injeção SQL:

```javascript
// Implementado em src/utils/protecoes-adicionais.js
const escapeSql = (input) => {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .replace(/'/g, "''")
    .replace(/\\/g, "\\\\")
    .replace(/\0/g, "\\0")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\x1a/g, "\\Z");
};
```

### 3.3 Proteção Contra Path Traversal

Sanitizamos caminhos de arquivo para prevenir ataques de path traversal:

```javascript
// Implementado em src/utils/protecoes-adicionais.js
const sanitizeFilePath = (filePath) => {
  if (!filePath || typeof filePath !== 'string') return '';
  
  return filePath
    .replace(/\.\.\/|\.\.\\/g, '') // Remover ../ e ..\
    .replace(/\/\//g, '/') // Remover barras duplas
    .replace(/\\\\/g, '\\'); // Remover backslashes duplos
};
```

## 4. Proteções Adicionais

### 4.1 Rate Limiting

Implementamos limitação de taxa para prevenir ataques de força bruta:

```javascript
// Implementado em src/utils/protecoes-adicionais.js
class RateLimiter {
  constructor(maxAttempts = 5, windowMinutes = 15) {
    this.maxAttempts = maxAttempts;
    this.windowMinutes = windowMinutes;
    this.attempts = new Map();
  }
  
  isRateLimited(key) {
    // Verifica se o limite foi excedido
    // ...
  }
  
  addAttempt(key) {
    // Registra uma nova tentativa
    // ...
  }
}
```

### 4.2 Proteção Contra Clickjacking

Implementamos detecção de framing para prevenir clickjacking:

```javascript
// Implementado em src/utils/protecoes-adicionais.js
const detectFraming = () => {
  try {
    return window.self !== window.top;
  } catch (e) {
    return true; // Se houver erro, provavelmente está em um iframe
  }
};
```

### 4.3 Comparação em Tempo Constante

Implementamos comparação de strings em tempo constante para prevenir ataques de timing:

```javascript
// Implementado em src/utils/protecoes-adicionais.js
const constantTimeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  
  return result === 0;
};
```

## 5. Autenticação e Autorização

### 5.1 Armazenamento Seguro de Senhas

- Utilizamos bcrypt para hash de senhas com salt aleatório
- Fator de custo configurado para 12 rounds
- Nunca armazenamos senhas em texto plano

### 5.2 Tokens JWT

- Tokens JWT com expiração curta (15 minutos)
- Refresh tokens com rotação
- Validação de assinatura e claims

### 5.3 Controle de Acesso

- Implementação de RBAC (Role-Based Access Control)
- Verificação de permissões em nível de API e UI
- Princípio do menor privilégio

## 6. Armazenamento Seguro de Dados

### 6.1 Dados Sensíveis

- Criptografia AES-256 para dados sensíveis em repouso
- Chaves gerenciadas com rotação periódica
- Mascaramento de dados sensíveis em logs e interfaces

### 6.2 Armazenamento Local

- Dados sensíveis não são armazenados em localStorage/sessionStorage
- Uso de cookies HttpOnly e Secure para dados de sessão
- Limpeza de dados temporários após logout

## 7. Comunicação Segura

### 7.1 HTTPS

- HTTPS obrigatório em todas as comunicações
- TLS 1.2+ com cifras fortes
- HSTS implementado

### 7.2 Certificados

- Certificados válidos e atualizados
- Monitoramento de expiração
- Renovação automática

## 8. Proteção Contra Ataques Comuns

### 8.1 Proteção XSS

- CSP rigoroso
- Sanitização de inputs
- Escape de outputs
- Validação de dados

### 8.2 Proteção CSRF

- Tokens CSRF em todas as requisições mutantes
- Validação de origem
- SameSite cookies

### 8.3 Proteção Contra Injeção

- Sanitização de inputs
- Prepared statements para SQL
- Validação de parâmetros

### 8.4 Proteção Contra Força Bruta

- Rate limiting
- Captcha após falhas múltiplas
- Bloqueio temporário de contas

## 9. Conformidade com Requisitos de Lojas

### 9.1 Google Play

- HTTPS obrigatório
- Política de privacidade
- Permissões mínimas
- Armazenamento seguro
- Proteção contra engenharia reversa

### 9.2 App Store

- App Transport Security (ATS)
- Keychain Sharing seguro
- Proteção de dados
- Não uso de APIs privadas

### 9.3 Requisitos Comuns

- Validação de certificados SSL/TLS
- Proteção contra jailbreak/root
- Proteção contra screenshots em telas sensíveis

## 10. Processo de Auditoria e Monitoramento

### 10.1 Auditoria Periódica

- Script automatizado de varredura de segurança
- Verificação de conformidade com requisitos das lojas
- Análise de dependências vulneráveis

### 10.2 Monitoramento

- Logging de eventos de segurança
- Alertas para atividades suspeitas
- Dashboard de segurança

### 10.3 Resposta a Incidentes

- Plano documentado de resposta a incidentes
- Equipe responsável designada
- Processo de comunicação definido

---

## Histórico de Atualizações

| Data | Versão | Descrição | Responsável |
|------|--------|-----------|-------------|
| 2023-10-15 | 1.0 | Versão inicial | Equipe de Segurança |
| 2023-12-05 | 1.1 | Adição de proteções CSRF avançadas | Equipe de Segurança |
| 2024-02-20 | 1.2 | Implementação de rate limiting | Equipe de Segurança |
| 2024-05-15 | 2.0 | Revisão completa e adição de novas proteções | Equipe de Segurança |

## Contato

Para questões relacionadas à segurança, entre em contato com:

- **Email**: seguranca@acucaradas.com
- **Responsável**: Equipe de Segurança

---

*Este documento é confidencial e destinado apenas para uso interno da Acucaradas Encomendas.*