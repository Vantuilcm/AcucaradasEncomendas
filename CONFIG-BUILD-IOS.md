# Configuração de Build para iOS - Açucaradas Encomendas

## Pré-requisitos

- Conta Apple Developer Program ativa ($99/ano)
- Node.js instalado
- Expo CLI instalado: `npm install -g expo-cli`
- EAS CLI instalado: `npm install -g eas-cli`
- Conta Expo configurada

## Passos para Build

### 1. Login no Expo

```bash
eas login
```

### 2. Verificar app.json

Confirmar configurações iOS:
- bundleIdentifier: com.acucaradasencomendas
- buildNumber: 1
- infoPlist configurado
- permissões necessárias

### 3. Configurar Certificados e Perfis

```bash
eas credentials
```

Seguir as instruções para:
- Criar certificado de distribuição
- Configurar perfil de provisionamento

### 4. Executar Build

```bash
eas build --platform ios --profile production
```

### 5. Preparar para TestFlight (Recomendado)

```bash
eas submit --platform ios --profile production
```

### 6. Configurar App Store Connect

1. Acessar App Store Connect
2. Criar novo aplicativo
3. Configurar metadados e informações

## Solução de Problemas

- **Erro de Certificado**: Use `eas credentials` para redefinir
- **Erro de Provisioning Profile**: Verifique permissões da conta Apple Developer
- **Rejeição por Privacidade**: Verifique justificativas para permissões