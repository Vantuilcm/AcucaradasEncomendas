# Instruções para Preparação do App para Produção

Este documento detalha os passos necessários para preparar o aplicativo Açucaradas Encomendas para produção e distribuição nas lojas de aplicativos.

## 1. Configuração do Firebase para Produção

### 1.1 Substituir arquivo google-services.json

O arquivo `google-services.json` atual contém configurações de desenvolvimento. Para a versão de produção:

```bash
# Execute este comando no terminal
cp google-services.prod.json google-services.json
```

### 1.2 Aplicar Regras de Segurança do Firestore

As regras de segurança mais restritivas para produção estão no arquivo `src/config/firebase.rules.prod.js`.

1. Acesse o [Console do Firebase](https://console.firebase.google.com/)
2. Selecione o projeto de produção `acucaradas-encomendas-prod`
3. No menu à esquerda, vá para Firestore Database > Regras
4. Copie o conteúdo da variável `firestoreRulesProd` do arquivo `src/config/firebase.rules.prod.js`
5. Cole as regras no editor do Firebase e clique em "Publicar"

## 2. Configuração das Variáveis de Ambiente

### 2.1 Usar arquivo .env.production

```bash
# Execute este comando para copiar o arquivo .env.production para .env
cp .env.production .env
```

### 2.2 Preencher com chaves reais de produção

Edite o arquivo `.env` e preencha os valores reais para:

- `STRIPE_PUBLISHABLE_KEY_PROD`: Chave publicável do Stripe (modo produção)
- `STRIPE_SECRET_KEY_PROD`: Chave secreta do Stripe (modo produção)
- `STRIPE_WEBHOOK_SECRET`: Chave secreta do webhook do Stripe
- `ONESIGNAL_APP_ID`: ID do app no OneSignal para produção

## 3. Configuração Específica para iOS

### 3.1 Configurar arquivo GoogleService-Info.plist

O arquivo de configuração do Firebase para iOS precisa ser adicionado ao projeto:

```bash
# Crie a pasta ios se ela não existir
mkdir -p ios

# Copie o arquivo para a pasta correta
cp GoogleService-Info.prod.plist ios/GoogleService-Info.plist
```

### 3.2 Configurar Notificações Push para iOS

1. Acesse o [Apple Developer Portal](https://developer.apple.com/)
2. Vá para "Certificates, Identifiers & Profiles"
3. Gere um certificado APNs (Apple Push Notification service)
4. Faça upload deste certificado no console do Firebase e OneSignal

### 3.3 Atualizar eas.json para inclusão do arquivo .plist

Certifique-se que o arquivo `eas.json` inclua configuração para adicionar o arquivo GoogleService-Info.plist durante o build:

```json
{
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "prebuildCommand": "./scripts/prebuild-ios.sh"
    }
  }
}
```

Crie o script `prebuild-ios.sh`:

```bash
#!/bin/bash
# Copiar GoogleService-Info.plist para o local correto
mkdir -p ios
cp GoogleService-Info.prod.plist ios/GoogleService-Info.plist
```

E dê permissão de execução:

```bash
chmod +x scripts/prebuild-ios.sh
```

### 3.4 Verificar entitlements para iOS

1. Crie um arquivo chamado `ios/my-app.entitlements` (se não existir) com o seguinte conteúdo:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>aps-environment</key>
	<string>production</string>
</dict>
</plist>
```

2. Adicione referência a esse arquivo no app.json:

```json
{
  "expo": {
    "ios": {
      "entitlements": {
        "com.apple.developer.applesignin": ["Default"]
      }
    }
  }
}
```

## 4. Preparação para Build de Produção

### 4.1 Verificar app.json

Certifique-se de que o arquivo `app.json` tem a versão correta:

```json
{
  "expo": {
    "version": "1.0.0",
    "android": {
      "versionCode": 1
    },
    "ios": {
      "buildNumber": "1.0.0"
    }
  }
}
```

### 4.2 Comandos de Build EAS

Para Android:

```bash
eas build --platform android --profile production
```

Para iOS:

```bash
eas build --platform ios --profile production
```

Para ambos:

```bash
eas build --platform all --profile production
```

## 5. Envio para as Lojas

### 5.1 Google Play Store

```bash
eas submit -p android --latest
```

### 5.2 Apple App Store

```bash
eas submit -p ios --latest
```

## 6. Verificações Finais Após Publicação

- Testar login em ambiente de produção
- Verificar funcionamento do processo de compra
- Verificar recebimento de notificações push
- Verificar funções específicas de administradores

## 7. Rollback (em caso de problemas)

Para reverter para configurações de desenvolvimento:

```bash
cp google-services.json.bak google-services.json
cp GoogleService-Info.dev.plist ios/GoogleService-Info.plist
cp .env.development .env
```

## 5. Precauções Adicionais

### 5.1. Sensibilidade a Maiúsculas e Minúsculas

Antes de publicar o aplicativo, é importante verificar se todos os imports estão corretamente referenciando os arquivos com a nomenclatura exata, respeitando maiúsculas e minúsculas. Isso é particularmente importante porque:

- O desenvolvimento em Windows pode ocultar problemas de case-sensitivity
- Ambientes de produção em Linux ou macOS são sensíveis a maiúsculas e minúsculas
- Erros de case-sensitivity causam falhas em tempo de execução difíceis de identificar

Uma verificação relacionada a este problema já foi realizada e documentada no arquivo `CORRECAO_CASO_SENSIBILIDADE_ARQUIVOS.md`.

**Comando para verificar inconsistências**: Para verificar se existem outros problemas semelhantes, execute:

```
npx case-sensitive-paths-webpack-plugin
```

---

**Importante**: Mantenha cópias de backup dos arquivos de configuração originais antes de substituí-los.

APP_ENV=production
EXPO_PUBLIC_APP_ENV=production
STRIPE_PUBLISHABLE_KEY=pk_live_51R83kwP3V81jclQkVaVnARH82yqXsxyXIQfEXTcij3DpITlJIkS5Vyw3z02ijC1fG2TGeTiQ3VBlIbwHNJHIVJxr00KkaXYQa2
STRIPE_SECRET_KEY=sk_live_seu_codigo_aqui
STRIPE_WEBHOOK_SECRET=whsec_seu_codigo_aqui
ONESIGNAL_APP_ID=seu_app_id_aqui
EXPO_PROJECT_ID=6090106b-e327-4744-bce5-9ddb0d037045
NODE_ENV=production
API_URL=https://api.acucaradas.com.br

## 8. Notas Adicionais

### 8.1 Sobre o aviso da API_URL

Durante a verificação de configuração de produção, você pode encontrar o seguinte aviso:

```
⚠ Não foi possível determinar se API_URL está configurado para produção
```

Este é apenas um aviso de verificação manual e não um problema crítico. A API_URL já está configurada corretamente como `https://api.acucaradas.com.br`, que é o endpoint de produção.

Se desejar eliminar este aviso, você pode renomear a variável para algo que contenha explicitamente a palavra "production", como:

```
API_URL_PRODUCTION=https://api.acucaradas.com.br
```

E atualizar todas as referências a esta variável em seu código.
