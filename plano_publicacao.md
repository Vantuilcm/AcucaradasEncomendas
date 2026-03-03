# Plano de Publicação - Açucaradas Encomendas

## 1. Configuração do Ambiente de Build

### 1.1 Configuração do EAS (Expo Application Services)

- Criar arquivo `eas.json` na raiz do projeto com as seguintes configurações:

```json
{
  "cli": {
    "version": ">= 3.13.3"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "image": "latest"
      }
    }
  },
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "production"
      },
      "ios": {
        "appleId": "SEU_APPLE_ID",
        "ascAppId": "ID_DO_APP_NA_APP_STORE_CONNECT",
        "appleTeamId": "SEU_TEAM_ID"
      }
    }
  }
}
```

- Instalar EAS CLI: `npm install -g eas-cli`
- Fazer login no Expo: `eas login`
- Configurar o projeto: `eas build:configure`

### 1.2 Configuração do app.json

- Atualizar o arquivo `app.json` com informações de versão, identificadores e permissões:

```json
{
  "expo": {
    "name": "Açucaradas Encomendas",
    "slug": "acucaradas-encomendas",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "updates": {
      "fallbackToCacheTimeout": 0
    },
    "assetBundlePatterns": ["**/*"],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.acucaradas.encomendas",
      "buildNumber": "1.0.0",
      "infoPlist": {
        "NSCameraUsageDescription": "Este aplicativo usa a câmera para escanear códigos QR de pagamento.",
        "NSLocationWhenInUseUsageDescription": "Este aplicativo usa sua localização para calcular o frete e tempo de entrega."
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#FFFFFF"
      },
      "package": "com.acucaradas.encomendas",
      "versionCode": 1,
      "permissions": ["CAMERA", "ACCESS_FINE_LOCATION"]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": ["expo-notifications"]
  }
}
```

## 2. Preparação de Assets Gráficos

### 2.1 Ícones e Splash Screens

- **Ícone do aplicativo**:

  - Android: 512x512px (PNG)
  - iOS: 1024x1024px (PNG)
  - Ícone adaptativo Android: 108x108px (foreground e background)

- **Splash Screen**:

  - Resolução base: 1242x2436px (PNG)
  - Proporção 16:9 para Android
  - Várias resoluções para iOS (consultar documentação do Expo)

- **Screenshots**:
  - Android: 1080x1920px (mínimo 2 screenshots)
  - iOS: 1242x2688px (iPhone XS Max), 1125x2436px (iPhone X/XS), 1242x2208px (iPhone 8 Plus)
  - Mínimo 3 screenshots por plataforma

### 2.2 Banners e Imagens Promocionais

- **Feature Graphic (Android)**: 1024x500px
- **App Preview Video**: 15-30 segundos, demonstrando principais funcionalidades
- **Banner promocional para Google Play**: 1024x500px

## 3. Textos de Marketing e Descrições

### 3.1 Google Play Store

- **Título**: "Açucaradas Encomendas - Confeitaria Delivery"
- **Descrição curta**: "Encomende deliciosos doces e bolos artesanais com entrega rápida e personalizada!"
- **Descrição completa**: (limite de 4000 caracteres)

  ```
  O aplicativo Açucaradas Encomendas traz toda a magia da confeitaria artesanal para o seu smartphone! Faça pedidos de bolos, doces, tortas e sobremesas especiais com apenas alguns toques.

  PRINCIPAIS FUNCIONALIDADES:

  ✓ Catálogo completo de produtos com fotos e descrições detalhadas
  ✓ Personalização de encomendas para ocasiões especiais
  ✓ Acompanhamento em tempo real do status do seu pedido
  ✓ Múltiplas opções de pagamento (cartão, boleto, PIX)
  ✓ Programa de fidelidade com descontos exclusivos
  ✓ Notificações sobre promoções e novidades

  Ideal para aniversários, casamentos, eventos corporativos ou simplesmente para adoçar seu dia!

  Baixe agora e experimente o sabor da felicidade entregue na sua porta.
  ```

### 3.2 Apple App Store

- **Título**: "Açucaradas Encomendas"
- **Subtítulo**: "Confeitaria Delivery"
- **Descrição promocional**: (limite de 170 caracteres)
  ```
  Encomende doces artesanais, bolos personalizados e sobremesas especiais com entrega rápida e segura!
  ```
- **Palavras-chave**: confeitaria, doces, bolos, encomendas, delivery, sobremesas, tortas, brigadeiros

## 4. Políticas e Documentação Legal

### 4.1 Política de Privacidade

- Criar documento de política de privacidade abordando:
  - Dados coletados e finalidade
  - Compartilhamento de informações
  - Armazenamento e segurança
  - Direitos do usuário
  - Uso de cookies e tecnologias similares
  - Contato para dúvidas sobre privacidade

### 4.2 Termos de Uso

- Criar documento de termos de uso abordando:
  - Regras de utilização do aplicativo
  - Responsabilidades do usuário
  - Propriedade intelectual
  - Limitações de responsabilidade
  - Política de cancelamento e reembolso
  - Resolução de disputas

### 4.3 Classificação Indicativa

- Google Play: Livre
- App Store: 4+

## 5. Verificação de Integrações Externas

### 5.1 Firebase

- Configurar projeto Firebase para produção
- Verificar configuração do Firebase Authentication
- Configurar regras de segurança do Firestore
- Verificar limites de uso do plano gratuito ou fazer upgrade
- Testar integrações em ambiente de produção

### 5.2 Stripe

- Migrar de chaves de teste para chaves de produção
- Configurar webhook para notificações de pagamento
- Testar fluxo completo de pagamento em ambiente de produção
- Verificar conformidade com requisitos de segurança (PCI DSS)

### 5.3 OneSignal

- Configurar aplicativo para ambiente de produção
- Criar segmentos de usuários para notificações
- Testar envio de notificações push
- Configurar automações de notificações

## 6. Testes Finais

### 6.1 Testes de Funcionalidade

- Testar fluxo completo de compra
- Verificar funcionamento de todas as telas
- Testar diferentes perfis de usuário (cliente, administrador)
- Verificar integração com métodos de pagamento
- Testar notificações push

### 6.2 Testes de Performance

- Verificar tempo de carregamento das telas
- Testar consumo de memória e bateria
- Verificar comportamento offline
- Testar em diferentes dispositivos e tamanhos de tela

### 6.3 Testes de Segurança

- Verificar proteção de dados sensíveis
- Testar autenticação e autorização
- Verificar validação de entradas do usuário
- Testar proteção contra ataques comuns

## 7. Processo de Submissão

### 7.1 Google Play Store

- Criar conta de desenvolvedor (US$ 25, pagamento único)
- Preencher informações da ficha do aplicativo
- Fazer upload do APK/AAB via Google Play Console ou EAS Submit
- Preencher questionário de classificação de conteúdo
- Aguardar revisão (geralmente 1-3 dias úteis)

### 7.2 Apple App Store

- Criar conta no Apple Developer Program (US$ 99/ano)
- Configurar certificados e perfis de provisionamento
- Fazer upload do build via App Store Connect ou EAS Submit
- Preencher informações da ficha do aplicativo
- Preparar para revisão da App Store (TestFlight)
- Aguardar revisão (geralmente 1-3 dias úteis)

## 8. Pós-Lançamento

### 8.1 Monitoramento

- Configurar Firebase Crashlytics para monitoramento de erros
- Implementar analytics para acompanhar uso do aplicativo
- Monitorar avaliações e comentários nas lojas

### 8.2 Atualizações

- Planejar ciclo de atualizações regulares
- Preparar hotfixes para problemas críticos
- Utilizar atualizações OTA do Expo quando possível

### 8.3 Marketing

- Implementar estratégia de ASO (App Store Optimization)
- Planejar campanhas de divulgação
- Considerar programa de indicação de usuários

## 9. Checklist Final Pré-Submissão

- [ ] Versão e build number atualizados
- [ ] Todos os assets gráficos preparados nas dimensões corretas
- [ ] Textos de marketing e descrições finalizados
- [ ] Política de privacidade e termos de uso publicados
- [ ] Integrações externas configuradas para produção
- [ ] Testes finais concluídos e bugs críticos corrigidos
- [ ] Informações de contato atualizadas
- [ ] Contas de desenvolvedor ativas nas lojas
- [ ] Método de pagamento para taxas das lojas configurado

---

Este plano de publicação serve como guia completo para preparar o aplicativo Açucaradas Encomendas para lançamento nas lojas de aplicativos. Cada etapa deve ser verificada e concluída para garantir um processo de submissão tranquilo e aprovação rápida.
