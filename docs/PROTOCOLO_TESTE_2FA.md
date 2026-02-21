# Protocolo de Teste da Autenticação em Dois Fatores (2FA)

Este documento descreve o protocolo de teste completo para verificar a implementação da autenticação em dois fatores (2FA) no aplicativo Açucaradas Encomendas. O objetivo é garantir que o sistema funcione corretamente em um ambiente similar ao de produção.

## 1. Pré-requisitos

Antes de iniciar os testes, verifique se os seguintes componentes estão configurados:

- ✅ **TwoFactorAuthService.ts**: Implementação completa e com tipagem correta
- ✅ **Firebase Functions**: Função `sendVerificationCode` implementada para envio de emails
- ✅ **Emuladores Firebase**: Funcionando e configurados para testes locais
- ✅ **Testes automatizados**: Disponíveis no diretório `/test`

## 2. Ambiente de Teste

Para testar em um ambiente próximo ao de produção, utilize um dos seguintes métodos:

### 2.1. Emuladores do Firebase (Recomendado para testes iniciais)

Execute os emuladores com o comando:

```bash
npx firebase emulators:start --only auth,firestore,functions
```

Vantagens:

- Ambiente isolado e controlado
- Não envia emails reais (útil para testes repetitivos)
- Não afeta dados reais

### 2.2. Ambiente de Staging (Para testes de integração completos)

Configure um projeto Firebase de staging:

1. Crie um projeto separado no Firebase Console
2. Configure as mesmas regras e funções do projeto principal
3. Utilize o arquivo de configuração do projeto de staging:

```bash
# Copiar arquivo de configuração de staging
cp google-services.staging.json google-services.json
cp GoogleService-Info.staging.plist ios/GoogleService-Info.plist
```

Vantagens:

- Testa integrações reais com serviços externos
- Envia emails reais para verificar o fluxo completo
- Mantém o ambiente de produção intacto

## 3. Testes Automatizados

Execute os testes automatizados para verificar a funcionalidade básica:

```bash
npm test test/TwoFactorAuth.test.js
```

Os testes automatizados verificam:

- Habilitação/desabilitação do 2FA
- Geração e verificação de códigos
- Funcionamento de códigos de backup
- Gerenciamento de sessão
- Fluxo completo de autenticação

## 4. Checklist de Testes Manuais

### 4.1. Processo de habilitação do 2FA

| Teste                          | Passos                                                         | Resultado Esperado                                                                 |
| ------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Habilitar 2FA                  | 1. Acessar configurações<br>2. Ativar 2FA                      | - Códigos de backup são gerados<br>- Mensagem de sucesso é exibida                 |
| Verificar email não verificado | 1. Usar conta com email não verificado<br>2. Tentar ativar 2FA | - Erro informando necessidade de verificar email<br>- Email de verificação enviado |
| Salvar códigos de backup       | 1. Ativar 2FA<br>2. Copiar códigos de backup                   | - 10 códigos são gerados<br>- Códigos seguem o formato XXXX-XXXX                   |

### 4.2. Processo de login com 2FA

| Teste                      | Passos                                                     | Resultado Esperado                                                                         |
| -------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Login com 2FA habilitado   | 1. Fazer login com usuário que tem 2FA<br>2. Inserir senha | - Redirecionado para tela de verificação 2FA<br>- Email com código enviado automaticamente |
| Verificar código correto   | 1. Inserir código correto na tela de verificação           | - Acesso concedido<br>- Redirecionado para tela principal                                  |
| Verificar código incorreto | 1. Inserir código incorreto                                | - Mensagem de erro<br>- Nova tentativa permitida                                           |
| Verificar código expirado  | 1. Esperar mais de 5 minutos<br>2. Inserir código          | - Mensagem de erro sobre código expirado                                                   |
| Reenviar código            | 1. Clicar em "Reenviar código"                             | - Novo código enviado<br>- Contador de espera iniciado                                     |

### 4.3. Códigos de backup

| Teste                              | Passos                                                           | Resultado Esperado                                             |
| ---------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| Usar código de backup              | 1. Na tela de verificação 2FA<br>2. Inserir um código de backup  | - Acesso concedido<br>- Mensagem sobre uso de código de backup |
| Usar código de backup já utilizado | 1. Tentar usar o mesmo código de backup novamente                | - Erro informando código inválido                              |
| Regenerar códigos de backup        | 1. Acessar configurações<br>2. Solicitar novos códigos de backup | - Novos códigos gerados<br>- Códigos antigos invalidados       |

### 4.4. Sessão 2FA

| Teste                  | Passos                                              | Resultado Esperado                  |
| ---------------------- | --------------------------------------------------- | ----------------------------------- |
| Persistência de sessão | 1. Fazer login com 2FA<br>2. Fechar e reabrir o app | - Não solicita nova verificação 2FA |
| Logout e novo login    | 1. Fazer logout<br>2. Fazer login novamente         | - Nova verificação 2FA solicitada   |

### 4.5. Desativação do 2FA

| Teste                  | Passos                                       | Resultado Esperado                                            |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------- |
| Desativar 2FA          | 1. Acessar configurações<br>2. Desativar 2FA | - 2FA desativado com sucesso<br>- Códigos de backup removidos |
| Login após desativação | 1. Fazer logout<br>2. Fazer login novamente  | - Acesso direto sem solicitação de código                     |

## 5. Teste de Integração com Função Cloud

Verifique se a função Cloud `sendVerificationCode` está funcionando corretamente:

1. Faça login com um usuário que tem 2FA habilitado
2. Acesse o Console do Firebase > Functions > Logs
3. Verifique se há logs da execução da função
4. Confirme se o email foi enviado para o endereço correto
5. Verifique se o código no email corresponde ao gerado pelo sistema

## 6. Testes de Resiliência

| Teste                               | Passos                                                         | Resultado Esperado                                                                |
| ----------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Falha no envio de email             | 1. Simular falha no serviço de email<br>2. Fazer login com 2FA | - Sistema informa sobre problema<br>- Permite uso de código de backup             |
| Perda de todos os códigos de backup | 1. Simular perda dos códigos de backup                         | - Processo de recuperação alternativo disponível                                  |
| Ataque de força bruta               | 1. Inserir códigos incorretos repetidamente                    | - Limites de tentativas aplicados<br>- Bloqueio temporário após muitas tentativas |

## 7. Finalização e Documentação

Após concluir os testes:

1. Documente quaisquer problemas encontrados em `test-2fa-issues.log`
2. Corrija os problemas identificados
3. Refaça os testes para validar as correções
4. Atualize a documentação do usuário sobre o 2FA

## 8. Execução Automatizada

Para facilitar a execução dos testes, utilize o script auxiliar:

```bash
node scripts/test-2fa-workflow.js
```

Este script guiará você pelo processo de teste, verificando pré-requisitos e apresentando um checklist interativo.

## Considerações Finais

- A segurança do sistema 2FA é fundamental para proteger as contas dos usuários
- Teste todas as condições de erro e casos extremos
- Garanta que o sistema seja resiliente a falhas
- Documente cuidadosamente os resultados dos testes

---

**Desenvolvido por:** Equipe de Desenvolvimento - Açucaradas Encomendas  
**Versão:** 1.0  
**Data:** Agosto de 2023
