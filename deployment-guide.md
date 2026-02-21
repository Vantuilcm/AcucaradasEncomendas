# Guia de Implantação - Sistema de Autenticação de Dois Fatores

Este guia contém as etapas necessárias para colocar o sistema de autenticação de dois fatores em produção.

## 1. Configuração Inicial do Firebase

Antes de começar, certifique-se de que o Firebase CLI está instalado e o projeto está inicializado:

```bash
# Instalar Firebase CLI globalmente (se ainda não estiver instalado)
npm install -g firebase-tools

# Fazer login no Firebase
firebase login

# Inicializar o projeto (se ainda não estiver inicializado)
firebase init

# Selecione as opções:
# - Selecione "Functions" quando perguntar quais recursos deseja configurar
# - Selecione seu projeto existente do Firebase
# - Escolha JavaScript para a linguagem
# - Escolha "Yes" para ESLint
# - Escolha "Yes" para instalar dependências com npm
```

## 2. Instalação de Dependências

Certifique-se de que todas as dependências do projeto estão instaladas:

```bash
# No diretório raiz do projeto
npm install firebase/functions

# No diretório functions
cd functions
npm install nodemailer --save
```

## 3. Configuração de Variáveis de Ambiente no Firebase

Configure as variáveis de ambiente necessárias para o serviço de email:

```bash
# Certifique-se de estar usando o projeto correto
firebase use seu-projeto-id

# Configure as variáveis de ambiente
firebase functions:config:set email.user="seu-email@gmail.com"
firebase functions:config:set email.password="sua-senha-de-app"
firebase functions:config:set email.sender="noreply@acucaradas.com"
```

### 3.1 Obter senha de app do Gmail

Para o Gmail, você deve usar uma "senha de app":

1. Acesse [sua conta Google](https://myaccount.google.com/)
2. Vá para "Segurança"
3. Em "Como fazer login no Google", ative a "Verificação em duas etapas"
4. Após ativar, clique em "Senhas de app"
5. Selecione "App" e "Outro (nome personalizado)"
6. Digite "Açucaradas Encomendas" e clique em "Gerar"
7. Use a senha gerada para configurar `email.password`

## 4. Verificar Configurações Locais

Verifique se as configurações foram aplicadas corretamente:

```bash
# Verificar as configurações atuais
firebase functions:config:get
```

Você deverá ver algo como:

```json
{
  "email": {
    "user": "seu-email@gmail.com",
    "password": "sua-senha-de-app",
    "sender": "noreply@acucaradas.com"
  }
}
```

## 5. Implantação das Cloud Functions

Implante as funções no Firebase:

```bash
# Para implantar todas as funções
firebase deploy --only functions

# Para implantar apenas a função de verificação
firebase deploy --only functions:sendVerificationCode --project seu-projeto-id
```

## 6. Verificação da Implantação

Após a implantação, verifique se a função está corretamente implantada:

1. Acesse o console do Firebase: [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Navegue até o projeto > Functions
3. Verifique se a função `sendVerificationCode` aparece na lista e está com status "Ativo"

## 7. Teste da Função

Teste o envio de código de verificação usando o console do Firebase:

1. No console do Firebase, acesse Funções > sendVerificationCode
2. Clique em "Testar função"
3. Insira um payload de teste:

```json
{
  "data": {
    "email": "seu-email-de-teste@gmail.com",
    "code": "123456"
  },
  "context": {
    "auth": {
      "uid": "um-uid-valido-do-seu-sistema"
    }
  }
}
```

4. Verifique se o email é recebido corretamente

## 8. Configuração no Aplicativo

Certifique-se de que o aplicativo está configurado para usar a nova Cloud Function:

1. Verifique se o Firebase está corretamente inicializado no app
2. Confirme que as dependências `firebase/functions` estão instaladas
3. Verifique se o método `generateAndSendVerificationCode` está utilizando a função cloud

## 9. Monitoramento e Logs

Configure o monitoramento para acompanhar o uso da função:

1. No console do Firebase, acesse Functions > sendVerificationCode > Logs
2. Verifique se os logs estão sendo registrados corretamente
3. Configure alertas para erros (opcional)

## 10. Configurações Adicionais (Opcional)

### 10.1 Configurar Domínio Personalizado para Emails

Para emails mais profissionais, você pode configurar um domínio personalizado:

1. Configure os registros DNS do seu domínio
2. Verifique a propriedade do domínio
3. Atualize a variável `email.sender` com seu domínio personalizado

### 10.2 Limites de Taxa

Para evitar abusos, considere implementar limites de taxa:

```javascript
// Adicione esta verificação à função sendVerificationCode
const rateLimits = admin.firestore().collection('rateLimits').doc(context.auth.uid);
const rateLimitDoc = await rateLimits.get();
const now = admin.firestore.Timestamp.now();
const fiveMinutesAgo = new admin.firestore.Timestamp(now.seconds - 300, now.nanoseconds);

if (
  rateLimitDoc.exists &&
  rateLimitDoc.data().lastSent &&
  rateLimitDoc.data().lastSent.toDate() > fiveMinutesAgo.toDate() &&
  rateLimitDoc.data().count >= 3
) {
  throw new functions.https.HttpsError(
    'resource-exhausted',
    'Muitas solicitações em um curto período. Tente novamente mais tarde.'
  );
}

// Atualizar contador de limites
await rateLimits.set(
  {
    lastSent: now,
    count: rateLimitDoc.exists ? (rateLimitDoc.data().count || 0) + 1 : 1,
  },
  { merge: true }
);
```

## 11. Considerações de Segurança

Recomendações para manter o sistema seguro:

1. Mantenha as credenciais de email seguras
2. Use senhas de app em vez de senhas normais
3. Monitore os logs regularmente para detectar abusos
4. Implemente limites de taxa para evitar ataques de força bruta
5. Considere a rotação periódica das senhas
6. Use HTTPS para todas as comunicações

## 12. Solução de Problemas

Problemas comuns e suas soluções:

### 12.1 Emails não estão sendo enviados

- Verifique se as credenciais estão corretas
- Confirme se o servidor SMTP está acessível
- Verifique os logs do Firebase Functions

### 12.2 Erros de autenticação

- Certifique-se de que está usando uma senha de app (para Gmail)
- Verifique se a conta de email não está bloqueada
- Confirme se o "acesso a apps menos seguros" está ativado (se aplicável)

### 12.3 Função não está sendo chamada

- Verifique a conectividade de rede do app
- Confirme se a função está corretamente implantada
- Verifique se há erros no console do Firebase

### 12.4 Erros de CORS

- Verifique se o CORS está configurado corretamente
- Adicione seu domínio à lista de origens permitidas
