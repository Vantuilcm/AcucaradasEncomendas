# Teste de Autenticação em Dois Fatores (2FA) - Açucaradas Encomendas

Este documento descreve o processo de teste para verificar a implementação da autenticação em dois fatores (2FA) no aplicativo Açucaradas Encomendas.

## 1. Visão Geral

A autenticação em dois fatores (2FA) é um recurso de segurança que adiciona uma camada adicional de proteção além da senha. No aplicativo Açucaradas Encomendas, o 2FA é implementado através de códigos enviados por email.

### 1.1. Componentes Principais

- **TwoFactorAuthService**: Serviço responsável pela lógica de 2FA
- **Firebase Functions**: Função Cloud para envio de emails com código de verificação
- **TwoFactorAuthScreen**: Tela para verificação do código de 2FA
- **useAuth Hook**: Gerenciamento do estado de autenticação e integração com 2FA

## 2. Pré-requisitos para Testes

Antes de iniciar os testes, verifique se você tem:

- Node.js instalado (versão 14 ou superior)
- npm ou yarn instalado
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Acesso ao projeto Firebase

## 3. Scripts de Teste Disponíveis

| Script                          | Descrição                                             |
| ------------------------------- | ----------------------------------------------------- |
| `scripts/setup-2fa-test-env.js` | Configura o ambiente para testes de 2FA               |
| `scripts/test-2fa-workflow.js`  | Script interativo para testar o fluxo completo de 2FA |
| `test/TwoFactorAuth.test.js`    | Testes automatizados para o serviço de 2FA            |

## 4. Instruções de Uso

### 4.1. Configuração do Ambiente de Teste

O primeiro passo é configurar o ambiente para testes de 2FA. Execute:

```bash
node scripts/setup-2fa-test-env.js
```

Este script irá:

- Verificar os pré-requisitos necessários
- Configurar as variáveis de ambiente para testes
- Configurar o Firebase para usar emuladores locais
- Iniciar os emuladores do Firebase (opcional)

### 4.2. Execução de Testes Automatizados

Para executar os testes automatizados, use:

```bash
npm test test/TwoFactorAuth.test.js
```

Estes testes verificam:

- Habilitação e desabilitação do 2FA
- Geração e verificação de códigos
- Funcionamento dos códigos de backup
- Validação de sessão
- Fluxo completo do processo de 2FA

### 4.3. Execução do Fluxo de Teste Manual

Para testar manualmente o fluxo completo de 2FA, execute:

```bash
node scripts/test-2fa-workflow.js
```

Este script interativo guiará você através do processo completo de teste do 2FA, incluindo:

- Verificação de pré-requisitos
- Execução de testes automatizados
- Configuração do ambiente de teste
- Checklist para testes manuais
- Verificação da função Cloud
- Documentação de problemas encontrados

## 5. Processo de Teste Completo

Para uma verificação completa da implementação do 2FA, siga estes passos:

1. **Configure o ambiente de teste**:

   ```bash
   node scripts/setup-2fa-test-env.js
   ```

2. **Execute os testes automatizados**:

   ```bash
   npm test test/TwoFactorAuth.test.js
   ```

3. **Teste o fluxo completo manualmente**:

   ```bash
   node scripts/test-2fa-workflow.js
   ```

4. **Documente quaisquer problemas** encontrados durante os testes.

5. **Verifique a documentação** em `docs/PROTOCOLO_TESTE_2FA.md` para garantir que todos os casos de teste foram cobertos.

## 6. Considerações para Teste em Produção

Ao testar em ambiente de produção, lembre-se:

1. **Use contas de teste** específicas para evitar afetar usuários reais.
2. **Monitore os logs** do Firebase Functions para verificar o envio de emails.
3. **Teste em múltiplos dispositivos** para garantir compatibilidade.
4. **Verifique o comportamento offline** para entender como o app se comporta sem conexão.
5. **Teste limites de taxa** para garantir que o sistema funcione mesmo com muitas solicitações.

## 7. Solucionando Problemas Comuns

### 7.1. Email não recebido

- Verifique os logs da função Cloud no Firebase Console
- Verifique se o email não está na pasta de spam
- Certifique-se de que o serviço de email está configurado corretamente

### 7.2. Código inválido

- Verifique se o código foi digitado corretamente
- Certifique-se de que o código não expirou (5 minutos de validade)
- Tente usar um código de backup

### 7.3. Emuladores não funcionam

- Verifique se o Firebase CLI está instalado e atualizado
- Verifique se as portas necessárias estão disponíveis (8080, 9099, 5001)
- Reinicie os emuladores com `npx firebase emulators:start --only auth,firestore,functions`

## 8. Recursos Adicionais

- [Documentação do Firebase Authentication](https://firebase.google.com/docs/auth)
- [Documentação do Firebase Cloud Functions](https://firebase.google.com/docs/functions)
- [Documentação do Firebase Emulator Suite](https://firebase.google.com/docs/emulator-suite)
- [Melhores práticas para 2FA](https://cloud.google.com/identity-platform/docs/web/mfa)

---

Desenvolvido por: Equipe de Desenvolvimento - Açucaradas Encomendas  
Versão: 1.0  
Data: Agosto de 2023
