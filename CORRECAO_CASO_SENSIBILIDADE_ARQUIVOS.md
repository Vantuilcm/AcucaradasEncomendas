# Correção de Sensibilidade a Maiúsculas e Minúsculas nos Imports

## Problema Identificado

Foi identificado um problema de inconsistência nos imports do arquivo `validationService.ts`. Este arquivo estava sendo importado como `ValidationService.ts` (com 'V' maiúsculo) em vários locais do código, mesmo estando fisicamente salvo com 'v' minúsculo no sistema de arquivos.

Embora isso possa funcionar em sistemas operacionais insensíveis a maiúsculas e minúsculas (como Windows), ao fazer deploy para ambientes de produção que utilizam sistemas operacionais sensíveis a maiúsculas e minúsculas (como Linux ou macOS), isso causaria erros de compilação e execução.

## Arquivos Afetados

Os seguintes arquivos tiveram imports corrigidos:

1. `src/screens/CheckoutScreen.tsx`
2. `src/services/PaymentService.ts`
3. `src/services/AuthService.ts`
4. `src/screens/AddressFormScreen.tsx`
5. `jest.setup.ts`
6. `src/services/__tests__/validation.test.ts`
7. `src/services/__tests__/ValidationService.test.ts`
8. `src/services/__mocks__/AuthService.ts`
9. `src/services/__tests__/AuthService.test.ts`

## Correção Aplicada

Em todos os arquivos, o import foi alterado de:

```typescript
import { ValidationService } from '../services/ValidationService';
```

para:

```typescript
import { ValidationService } from '../services/validationService';
```

Além disso, nos arquivos de teste, foram corrigidas as referências aos arquivos mockados.

## Recomendações para Evitar Problemas Semelhantes

1. **Padronização de Nomenclatura de Arquivos**: Adotar uma convenção consistente para nomenclatura de arquivos (como camelCase ou kebab-case) e seguir essa convenção rigorosamente.

2. **Configuração de ESLint/TSLint**: Implementar regras de linting que alertem sobre inconsistências em imports.

3. **Testes em Ambientes Case-Sensitive**: Realizar testes de compilação e execução em ambientes sensíveis a maiúsculas e minúsculas antes do deploy para produção.

4. **Scripts de Verificação**: Criar scripts que validem a correspondência entre os nomes de arquivos referenciados e os arquivos reais no sistema de arquivos.

## Impacto da Correção

Esta correção garante que o aplicativo possa ser compilado e executado corretamente em todos os ambientes, independentemente da sensibilidade a maiúsculas e minúsculas do sistema operacional de produção.

É importante notar que, como esta correção altera apenas os imports e não a funcionalidade do código, não há risco de regressão funcional.
