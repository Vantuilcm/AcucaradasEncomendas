# Práticas Corretas de Tipagem em TypeScript

## Introdução

Este documento apresenta as melhores práticas de tipagem em TypeScript para o projeto Acucaradas Encomendas, visando evitar erros comuns e melhorar a segurança do código. A tipagem correta é fundamental para detectar problemas em tempo de compilação, antes que se tornem bugs em produção.

## Índice

1. [Erros Comuns de Tipagem](#erros-comuns-de-tipagem)
2. [Interfaces vs. Types](#interfaces-vs-types)
3. [Tratamento de Erros](#tratamento-de-erros)
4. [Tipagem de APIs e Serviços](#tipagem-de-apis-e-serviços)
5. [Componentes React](#componentes-react)
6. [Utilitários de Tipagem](#utilitários-de-tipagem)
7. [Checklist de Revisão](#checklist-de-revisão)

## Erros Comuns de Tipagem

### 1. Uso de `any`

**Problema**: O tipo `any` desativa a verificação de tipos, anulando os benefícios do TypeScript.

**Solução**: Evite usar `any`. Prefira:
- `unknown` para valores de tipo desconhecido
- Tipos específicos ou interfaces
- Tipos genéricos quando apropriado

**Exemplo incorreto**:
```typescript
function processData(data: any) {
  return data.value.toString(); // Pode falhar em runtime
}
```

**Exemplo correto**:
```typescript
interface DataWithValue {
  value: number | string;
}

function processData(data: DataWithValue) {
  return data.value.toString(); // Seguro
}
```

### 2. Tipagem Parcial

**Problema**: Definir apenas parte das propriedades de um objeto.

**Solução**: Defina interfaces completas para seus objetos.

**Exemplo incorreto**:
```typescript
interface User {
  name: string;
  // Faltam outras propriedades usadas no código
}

function getUserEmail(user: User) {
  return user.email; // Erro: 'email' não existe em 'User'
}
```

**Exemplo correto**:
```typescript
interface User {
  name: string;
  email: string;
  id: number;
}

function getUserEmail(user: User) {
  return user.email; // OK
}
```

## Interfaces vs. Types

### Quando usar Interface

- Para definir contratos de objetos que podem ser implementados ou estendidos
- Quando você precisa declarar a forma de um objeto
- Quando você quer permitir a extensão da interface (declaration merging)

```typescript
interface ErrorResponse {
  code: number;
  message: string;
}

// Pode ser estendido
interface DetailedErrorResponse extends ErrorResponse {
  details: string[];
  timestamp: Date;
}
```

### Quando usar Type

- Para aliases de tipos primitivos
- Para tipos de união ou interseção
- Para tipos que não serão estendidos

```typescript
type ID = string | number;

type ApiResponse<T> = {
  data: T;
  status: number;
  success: boolean;
};
```

## Tratamento de Erros

### Tipagem de Erros

Para garantir tratamento adequado de erros, crie interfaces específicas:

```typescript
interface ExtendedError extends Error {
  [key: string]: any;
  code?: string;
  status?: number;
  details?: string[];
}
```

### Conversão de Erros

Ao capturar erros, converta-os para o tipo correto:

```typescript
try {
  // código que pode lançar erro
} catch (error) {
  // Converter para ExtendedError
  const extError = error as ExtendedError;
  
  // Agora é seguro acessar propriedades adicionais
  loggingService.error('Erro na operação', {
    error: extError,
    code: extError.code,
    component: 'ComponentName'
  });
}
```

## Tipagem de APIs e Serviços

### Requests e Responses

Defina interfaces para requests e responses:

```typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

async function login(credentials: LoginRequest): Promise<LoginResponse> {
  // implementação
}
```

### Serviços

Use classes com métodos tipados para serviços:

```typescript
class AuthService {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // implementação
  }
  
  async logout(): Promise<void> {
    // implementação
  }
}
```

## Componentes React

### Props

Defina interfaces para props de componentes:

```typescript
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
}

const Button: React.FC<ButtonProps> = ({
  label,
  onClick,
  variant = 'primary',
  disabled = false,
  size = 'medium'
}) => {
  // implementação
};
```

### Estado

Tipe corretamente os estados:

```typescript
interface FormState {
  values: {
    name: string;
    email: string;
  };
  errors: {
    name?: string;
    email?: string;
  };
  isSubmitting: boolean;
}

const [formState, setFormState] = useState<FormState>({
  values: { name: '', email: '' },
  errors: {},
  isSubmitting: false
});
```

## Utilitários de Tipagem

### Tipos Utilitários

O TypeScript oferece tipos utilitários que facilitam operações comuns:

- `Partial<T>`: Torna todas as propriedades de T opcionais
- `Required<T>`: Torna todas as propriedades de T obrigatórias
- `Pick<T, K>`: Seleciona um subconjunto de propriedades K de T
- `Omit<T, K>`: Remove um subconjunto de propriedades K de T
- `Record<K, T>`: Cria um tipo com propriedades K e valores T

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
}

// Apenas id e email
type UserCredentials = Pick<User, 'id' | 'email'>;

// Todos os campos exceto phone
type UserBasicInfo = Omit<User, 'phone'>;

// Todos os campos opcionais
type PartialUser = Partial<User>;
```

## Checklist de Revisão

Ao revisar código TypeScript, verifique:

- [ ] Não há uso desnecessário de `any`
- [ ] Interfaces e tipos estão completos e bem definidos
- [ ] Erros são tratados com tipagem adequada
- [ ] Componentes React têm props tipadas corretamente
- [ ] Estados têm tipos explícitos
- [ ] Funções têm parâmetros e retornos tipados
- [ ] APIs e serviços têm requests e responses tipados
- [ ] Tipos utilitários são usados quando apropriado
- [ ] Não há erros de tipo ignorados com `@ts-ignore`
- [ ] Tipos genéricos são usados para componentes reutilizáveis

## Ferramentas Recomendadas

- **ESLint** com regras TypeScript para detectar problemas de tipagem
- **TypeScript Compiler** com configurações estritas (`strict: true`)
- **VSCode** com extensões para TypeScript
- **Testes unitários** que verificam tipos em tempo de compilação

## Conclusão

A tipagem correta em TypeScript é uma camada essencial de segurança que previne bugs e melhora a manutenibilidade do código. Seguindo estas práticas, podemos garantir um código mais robusto e seguro para o projeto Acucaradas Encomendas.