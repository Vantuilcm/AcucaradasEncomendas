# Firebase Cloud Functions - Açucaradas Encomendas

Este diretório contém as funções do Firebase Cloud Functions para o aplicativo Açucaradas Encomendas.

## Configuração

### Requisitos

- Node.js 18 ou superior
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Projeto do Firebase configurado

### Variáveis de ambiente

Antes de implantar as funções, você precisa configurar as variáveis de ambiente necessárias para o funcionamento correto das funções, especialmente para o serviço de email.

Execute os seguintes comandos no terminal para configurar as variáveis de ambiente:

```bash
# Variáveis para o serviço de email
firebase functions:config:set email.user="seu-email@gmail.com"
firebase functions:config:set email.password="sua-senha-de-app"
firebase functions:config:set email.sender="noreply@acucaradas.com"

# Variáveis para o Stripe (se aplicável)
firebase functions:config:set stripe.secret_key="sk_test_seu_stripe_secret_key"
firebase functions:config:set stripe.webhook_secret="whsec_seu_stripe_webhook_secret"
```

### Nota sobre senhas de email

Para serviços como o Gmail, você deve usar uma "senha de app" em vez da senha normal da sua conta. Siga os passos abaixo para criar uma senha de app:

1. Acesse sua conta do Google
2. Vá para "Segurança"
3. Em "Como fazer login no Google", ative a "Verificação em duas etapas"
4. Após ativar, clique em "Senhas de app"
5. Selecione "App" e "Outro (nome personalizado)"
6. Digite "Açucaradas Encomendas" e clique em "Gerar"
7. Use a senha gerada para configurar a variável de ambiente `email.password`

## Funções disponíveis

### sendVerificationCode

Esta função envia um código de verificação por email para autenticação de dois fatores.

Parâmetros:

- `email`: O endereço de email do usuário
- `code`: O código de verificação a ser enviado

Exemplo de uso no app:

```javascript
const sendVerificationCode = httpsCallable(functions, 'sendVerificationCode');
const result = await sendVerificationCode({
  email: 'usuario@exemplo.com',
  code: '123456',
});
```

## Implantação

Para implantar as funções, execute:

```bash
npm run deploy
```

Ou se quiser implantar uma função específica:

```bash
firebase deploy --only functions:sendVerificationCode
```
