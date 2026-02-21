# Guia Passo a Passo: Finalizando Integração iOS

Este guia descreve em detalhes como criar sua conta no Apple Developer Portal, gerar os certificados necessários (em especial o APNs para push notifications) e configurar o aplicativo no App Store Connect.

---

## 1. Criar Conta no Apple Developer Portal

1. Acesse https://developer.apple.com/ e clique em **Account**.
2. Faça login com seu Apple ID existente ou crie um novo Apple ID.
3. Após login, aceite os termos e preencha as informações de registro (nome, endereço, CPF/CNPJ).
4. Pague a anuidade (US$ 99/ano) para ativar sua conta de desenvolvedor.

## 2. Configurar Certificate, Identifiers & Profiles

### 2.1. Criar App ID

1. No painel do Apple Developer, acesse **Certificates, Identifiers & Profiles > Identifiers**.
2. Clique em **+** e escolha **App IDs > App**.
3. Informe o **Description** (ex: Açucaradas iOS) e o **Bundle ID** (`com.acucaradas.encomendas`).
4. Marque as **Capabilities**:
   - **Push Notifications**
   - **Sign In with Apple** (opcional)
5. Clique em **Continue** e **Register**.

### 2.2. Gerar Certificado de Desenvolvimento (iOS Development)

1. Em **Certificates, Identifiers & Profiles > Certificates**, clique em **+**.
2. Selecione **Apple Development** e clique em **Continue**.
3. No seu Mac, abra o **Keychain Access > Certificate Assistant > Request a Certificate From a Certificate Authority...**.
4. Gere um CSR (.certSigningRequest) e faça upload no portal.
5. Baixe o certificado `.cer` gerado e dê um duplo-clique para instalar no Keychain.

### 2.3. Gerar Certificado de Distribuição (Apple Distribution)

1. Ainda em **Certificates**, clique em **+**.
2. Selecione **Apple Distribution** e repita o mesmo processo de CSR.
3. Baixe o `.cer` e instale no Keychain.

### 2.4. Gerar Certificado APNs (Push Notification)

1. Em **Certificates**, clique em **+**.
2. Selecione **Apple Push Notification service SSL (Sandbox & Production)**.
3. Escolha o App ID `com.acucaradas.encomendas` e faça upload do CSR.
4. Baixe o `.cer`, instale no Keychain e exporte o certificado como **.p12** (Keychain Access > Export Items).

## 3. Criar Provisioning Profiles

### 3.1. Development Provisioning Profile

1. Vá em **Profiles** e clique em **+**.
2. Selecione **iOS App Development**, associe ao App ID, escolha o certificado de desenvolvimento e dispositivos de teste.
3. Nomeie (ex: acucaradas-dev), gere e baixe o arquivo `.mobileprovision`.

### 3.2. App Store Distribution Profile

1. Em **Profiles**, clique em **+** novamente.
2. Selecione **App Store**, associe ao App ID e ao certificado de distribuição.
3. Nomeie (ex: acucaradas-prod), gere e baixe o `.mobileprovision`.

## 4. Instalar Perfis e Certificados no Projeto

1. No macOS, copie os arquivos `.p12` e `.mobileprovision` para a pasta `ios/certs/`.
2. No `eas.json`, configure:

```json
"ios": {
  "credentialsSource": "local",
  "distributionCertificate": {
    "path": "ios/certs/dist-cert.p12",
    "password": "SUA_SENHA_DO_P12"
  },
  "provisioningProfilePath": "ios/certs/acucaradas-prod.mobileprovision"
}
```

## 5. Configurar App Store Connect

1. Acesse https://appstoreconnect.apple.com/ e faça login.
2. Em **My Apps**, clique em **+** e selecione **New App**.
3. Preencha:
   - **Platform**: iOS
   - **Name**: Açucaradas Encomendas
   - **Primary Language**: Português (Brazil)
   - **Bundle ID**: `com.acucaradas.encomendas`
   - **SKU**: um identificador interno (ex: AE-001)
4. Clique em **Create**.

### 5.1. Preencher Metadados

- **App Information**: descrição curta e longa, categoria, palavras-chave.
- **Privacy Policy URL**: link para `politica_privacidade.md`.
- **Support URL**: link para `termos_uso.md` ou página de suporte.

### 5.2. Adicionar Screenshots e App Previews

- Carregue as imagens geradas em `/store_assets/screenshots_ios/`.
- Verifique resoluções para cada formato (iPhone 6.5", iPad 12.9" etc.).

### 5.3. Definir Preço e Disponibilidade

- Escolha faixa de preço.
- Selecione países onde o app será distribuído.

## 6. Enviar Build para Revisão

1. Certifique-se de ter configurado o `Apple Connect API Key` no EAS CLI:

```bash
eas credentials:manager
# ou eas secret:create para tokens
```

2. Execute o build e submit:

```bash
# Build
eas build --platform ios --profile production

# Submit
eas submit -p ios --profile production
```

3. Acompanhe o status em App Store Connect > Activity > All Builds.

## 7. Testes Finais e Submissão

1. Após aprovação interna, clique em **Submit for Review** no App Store Connect.
2. Aguarde validação da Apple (pode levar até 2 dias úteis).
3. Monitore feedback e corrija eventuais falhas.

---

Com isso, a integração do iOS estará completamente finalizada, desde a criação de conta até o envio para revisão na App Store.
