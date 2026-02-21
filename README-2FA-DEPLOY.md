# Guia de Implantação - Autenticação de Dois Fatores (2FA)

## Pré-requisitos

- Node.js instalado (versão 18 ou superior)
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Conta no Firebase com um projeto criado

## 1. Configuração do Projeto

### 1.1 Inicializar o Firebase (se ainda não estiver configurado)

```bash
# Fazer login no Firebase
firebase login

# Inicializar o projeto
firebase init
```

Selecione as seguintes opções:

- Firestore
- Functions
- Hosting
- Storage

### 1.2 Associar o projeto ao seu ID do Firebase

Edite o arquivo `.firebaserc` e substitua "seu-projeto-id" pelo ID do seu projeto:

```json
{
  "projects": {
    "default": "seu-projeto-id"
  }
}
```

Ou use o comando:

```bash
firebase use seu-projeto-id
```

## 2. Configuração de Variáveis de Ambiente

### 2.1 Configurar credenciais de email

Crie uma senha de aplicativo no Gmail (se estiver usando Gmail):

1. Acesse sua Conta Google
2. Selecione "Segurança"
3. Em "Como fazer login no Google", selecione "Verificação em duas etapas"
4. Na parte inferior da página, selecione "Senhas de app"
5. Crie uma nova senha para o aplicativo

Então, configure as variáveis de ambiente:

```bash
firebase functions:config:set email.user="seu-email@gmail.com" email.password="sua-senha-de-app" email.sender="noreply@acucaradas.com"
```

### 2.2 Verificar as configurações atuais

```bash
firebase functions:config:get
```

## 3. Implantação

### 3.1 Preparar para implantação

```bash
cd functions
npm install
cd ..
```

### 3.2 Implantar a função

```bash
firebase deploy --only functions:sendVerificationCode
```

Para implantar todas as funções:

```bash
firebase deploy --only functions
```

## 4. Teste da Função

### 4.1 Testar no console do Firebase

1. Acesse o Console do Firebase
2. Vá para "Functions" > "sendVerificationCode"
3. Clique em "Test function"
4. Insira um payload de teste:

```json
{
  "email": "seu-email@gmail.com",
  "code": "123456"
}
```

### 4.2 Testar no aplicativo

1. Certifique-se de que a função `generateAndSendVerificationCode` no serviço `TwoFactorAuthService` está chamando a função Cloud correta
2. Execute seu aplicativo e teste o fluxo completo de autenticação de dois fatores
3. Verifique o recebimento dos emails com os códigos de verificação

## 5. Solução de Problemas

### 5.1 Visualizar logs

```bash
firebase functions:log
```

### 5.2 Testar localmente

```bash
firebase emulators:start
```

### 5.3 Problemas comuns

- **Erro de autenticação do Gmail**: Certifique-se de que você está usando uma senha de aplicativo e não sua senha normal
- **Usuário não autenticado**: A função requer que o usuário esteja autenticado no Firebase
- **Código não recebido**: Verifique a pasta de spam ou se o email está correto
- **Erro de CORS**: Certifique-se de que seu domínio está configurado nas origens permitidas

## 6. Considerações de Segurança

- As senhas e tokens são armazenados apenas nas variáveis de ambiente do Firebase, não no código
- O sistema verifica se o email informado corresponde ao usuário autenticado
- Os códigos expiram após 5 minutos
- Os códigos de backup são armazenados com hash para maior segurança

## 7. Manutenção

Atualize regularmente as dependências para evitar problemas de segurança:

```bash
cd functions
npm update
cd ..
firebase deploy --only functions
```
