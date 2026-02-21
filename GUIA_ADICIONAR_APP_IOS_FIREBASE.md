# Guia Detalhado: Adicionar Aplicativo iOS ao Firebase

Este guia fornece instruções passo a passo para adicionar um aplicativo iOS ao projeto Firebase do Açucaradas Encomendas e configurar corretamente o arquivo GoogleService-Info.plist com o EAS Build.

## 1. Acessar o Console do Firebase

1. Abra seu navegador e acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Faça login com sua conta Google associada ao projeto
3. Selecione o projeto "Açucaradas Encomendas" na lista de projetos
4. Você será direcionado para o painel principal do projeto

## 2. Adicionar Aplicativo iOS

1. Na página inicial do projeto, localize a seção "Comece adicionando o Firebase ao seu aplicativo"
2. Clique no ícone do iOS (símbolo da Apple)
   ![Ícone iOS no Firebase](https://firebase.google.com/static/images/platform_logos/apple.svg)
3. Alternativamente, você pode clicar no ícone de engrenagem (⚙️) ao lado de "Visão geral do projeto" e selecionar "Configurações do projeto", depois ir para a aba "Seus aplicativos" e clicar em "Adicionar aplicativo" > "iOS"

## 3. Registrar o Aplicativo

1. No formulário de registro, preencha os seguintes campos:

   - **Bundle ID**: Digite exatamente `com.acucaradas.encomendas`
     > **Importante**: O Bundle ID deve corresponder exatamente ao que está configurado no arquivo app.json/app.config.ts do seu projeto Expo
   - **Apelido do aplicativo (opcional)**: Digite "Açucaradas iOS"
     > Este nome é apenas para identificação interna no Firebase e não afeta o aplicativo
   - **App Store ID (opcional)**: Deixe em branco por enquanto, você pode adicionar depois quando o app for publicado na App Store

2. Clique no botão "Registrar aplicativo"

## 4. Baixar o Arquivo de Configuração

1. Após o registro, o Firebase gerará automaticamente um arquivo de configuração chamado `GoogleService-Info.plist`
2. Clique no botão "Baixar GoogleService-Info.plist"
3. Salve o arquivo em um local seguro no seu computador
   > **Atenção**: Este arquivo contém informações sensíveis de configuração. Não o compartilhe publicamente ou o inclua em repositórios públicos

## 5. Configurar o Arquivo com EAS Build

Para projetos Expo que usam EAS Build, você precisa configurar o arquivo GoogleService-Info.plist de uma maneira específica:

### 5.1. Adicionar o Arquivo ao Projeto

1. Crie uma pasta chamada `ios` na raiz do projeto (se ainda não existir)
2. Copie o arquivo `GoogleService-Info.plist` para esta pasta

### 5.2. Configurar o EAS Build para Incluir o Arquivo

1. Abra o arquivo `eas.json` na raiz do projeto
2. Certifique-se de que a configuração para builds iOS inclua o arquivo GoogleService-Info.plist
3. Adicione ou modifique a configuração conforme necessário:

```json
{
  "build": {
    "production": {
      "ios": {
        "credentialsSource": "remote",
        "distributionCertificate": {
          "path": "ios/certs/dist-cert.p12",
          "password": "DISTRIBUTION_CERTIFICATE_PASSWORD"
        },
        "provisioningProfilePath": "ios/certs/profile.mobileprovision"
      },
      "android": {
        "buildType": "app-bundle"
      }
    },
    "development": {
      "ios": {
        "simulator": true
      },
      "android": {
        "buildType": "apk"
      },
      "developmentClient": true
    }
  }
}
```

### 5.3. Método Alternativo: Usando Secrets do EAS

Para maior segurança, você pode usar os secrets do EAS para armazenar o conteúdo do arquivo GoogleService-Info.plist:

1. Instale a CLI do EAS se ainda não tiver instalado:

   ```bash
   npm install -g eas-cli
   ```

2. Faça login na sua conta Expo:

   ```bash
   eas login
   ```

3. Converta o arquivo GoogleService-Info.plist para base64:

   - No Windows (PowerShell):
     ```powershell
     [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("caminho/para/GoogleService-Info.plist"))
     ```
   - No macOS/Linux:
     ```bash
     base64 -i caminho/para/GoogleService-Info.plist
     ```

4. Adicione o conteúdo base64 como um secret do EAS:

   ```bash
   eas secret:create --scope project --name GOOGLE_SERVICE_INFO_PLIST --value "conteúdo_base64_aqui"
   ```

5. Modifique o arquivo `app.config.js` ou `app.config.ts` para usar este secret durante o build:

```javascript
export default {
  // ... outras configurações
  hooks: {
    postPublish: [
      {
        file: 'sentry-expo/upload-sourcemaps',
        config: {
          organization: 'your-sentry-org',
          project: 'your-sentry-project',
        },
      },
    ],
    prebuild: [
      {
        command: 'echo $GOOGLE_SERVICE_INFO_PLIST | base64 --decode > ios/GoogleService-Info.plist',
        stdout: 'pipe',
      },
    ],
  },
  // ... outras configurações
};
```

## 6. Configurar o SDK do Firebase no Código

1. Certifique-se de que as dependências do Firebase estão instaladas no projeto:

   ```bash
   npm install @react-native-firebase/app @react-native-firebase/auth @react-native-firebase/firestore @react-native-firebase/storage
   ```

2. Verifique se o arquivo `src/config/firebase.ts` está configurado corretamente para iOS:

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};

// Inicializar Firebase
let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Exportar serviços do Firebase
export const auth = getAuth(app);
export const firestore = getFirestore(app);
export const storage = getStorage(app);
export default app;
```

## 7. Verificar a Configuração

1. Execute um build de teste para iOS usando o EAS Build:

   ```bash
   eas build --platform ios --profile development
   ```

2. Após o build ser concluído, verifique os logs para garantir que não houve erros relacionados ao Firebase

3. Instale o aplicativo em um dispositivo iOS ou simulador e teste as funcionalidades do Firebase:
   - Autenticação
   - Leitura/escrita no Firestore
   - Upload/download de arquivos no Storage

## 8. Solução de Problemas Comuns

### Erro: "No Firebase App '[DEFAULT]' has been created"

- Verifique se o arquivo GoogleService-Info.plist está sendo corretamente incluído no build
- Confirme que a inicialização do Firebase está ocorrendo antes de qualquer chamada aos serviços do Firebase

### Erro: "The bundle identifier for your app does not match"

- Certifique-se de que o Bundle ID no Firebase corresponde exatamente ao Bundle ID no arquivo app.json/app.config.ts

### Erro: "API key not valid"

- Verifique se o arquivo GoogleService-Info.plist baixado é o mais recente
- Confirme que você está usando o arquivo correto para o ambiente (desenvolvimento/produção)

---

Seguindo este guia detalhado, você terá configurado com sucesso o aplicativo iOS no Firebase para o projeto Açucaradas Encomendas. Lembre-se de manter o arquivo GoogleService-Info.plist seguro e não compartilhá-lo em repositórios públicos.
