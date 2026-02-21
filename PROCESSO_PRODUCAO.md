# Processo de Preparação para Produção - Açucaradas Encomendas

Este documento descreve detalhadamente todo o processo de preparação do aplicativo Açucaradas Encomendas para produção.

## 1. Monitoramento de Erros com Sentry

O aplicativo está configurado com Sentry para monitoramento de erros em tempo real. A configuração é feita em `src/config/sentry.ts`.

### Configuração do Sentry

1. Criar uma conta em [Sentry.io](https://sentry.io)
2. Criar um projeto para React Native
3. Obter o DSN do projeto
4. Configurar o DSN no arquivo `app.config.ts`
5. Configurar o token de autenticação nos secrets do GitHub Actions

### Verificação de Funcionamento

Para verificar se o Sentry está funcionando corretamente:

```javascript
// Teste de erro
try {
  throw new Error('Teste de erro do Sentry');
} catch (error) {
  sentryService.captureException(error);
}
```

## 2. Remoção de console.logs

Para manter o aplicativo otimizado em produção, todos os `console.log` são removidos automaticamente antes do build final, utilizando o script `scripts/remove-console-logs.js`.

O script pode ser executado manualmente:

```bash
npm run clean-logs
```

Ou é executado automaticamente como parte do processo de build:

```bash
npm run build:android
npm run build:ios
```

## 3. Preparação de Assets para Diferentes Tamanhos de Tela

Os assets do aplicativo são preparados para diferentes tamanhos de tela utilizando o script `scripts/generate-responsive-assets.js`.

### Processo de Geração dos Assets

1. Os ícones e imagens originais ficam na pasta `assets/icons`
2. O script gera versões para diferentes densidades de pixel para Android e iOS
3. As versões geradas são salvas em `assets/generated`

Para executar o processo:

```bash
npm run generate-assets
```

### Utilização de Assets Responsivos

Utilizar o utilitário de responsividade `src/utils/responsive.ts` para garantir que a UI seja adaptada corretamente para todos os dispositivos:

```javascript
import responsive from '../utils/responsive';

// Exemplos de uso
const styles = StyleSheet.create({
  container: {
    padding: responsive.spacing(16),
  },
  text: {
    fontSize: responsive.fontSize(14),
  },
  image: {
    width: responsive.wp(100),
    height: responsive.hp(100),
  },
});
```

## 4. Entrega Contínua (CD) para Versões Beta

O projeto utiliza EAS (Expo Application Services) e GitHub Actions para automatizar a entrega contínua.

### Configuração de Ambientes

Três ambientes estão configurados:

1. **Development** - `develop` branch - para testes durante o desenvolvimento
2. **Staging** - `main` branch - para testes de release candidate
3. **Production** - tags `v*` - para releases de produção

### Fluxo de Trabalho

1. Desenvolvimento ocorre na branch `develop`
2. Pull requests são feitos para a branch `main` para staging
3. Releases de produção são criadas com tags no formato `v1.0.0`

### Comandos para Release

```bash
# Preparar nova versão
npm version patch|minor|major

# Criar tag e publicar
git push && git push --tags
```

### Configurações Específicas para Cada Ambiente

#### Development

- APKs de desenvolvimento com Expo Dev Client
- Updates OTA frequentes
- Sentry com amostragem completa de erros

#### Staging

- APKs internos para testes
- Build distribuído via TestFlight e Google Play Beta
- Configuração semelhante à produção

#### Production

- Builds para lojas oficiais
- Configurações otimizadas
- Monitoramento completo com Sentry

## 5. Secrets e Variáveis de Ambiente

As seguintes secrets precisam ser configuradas no repositório do GitHub:

1. `EXPO_TOKEN` - Token de acesso ao Expo
2. `GOOGLE_SERVICES_DEV` - Arquivo google-services.json para dev (base64)
3. `GOOGLE_SERVICES_STAGING` - Arquivo google-services.json para staging (base64)
4. `GOOGLE_SERVICES_PROD` - Arquivo google-services.json para produção (base64)
5. `GOOGLE_SERVICE_INFO_PLIST` - Arquivo GoogleService-Info.plist para iOS (base64)
6. `GOOGLE_PLAY_SERVICE_ACCOUNT` - Conta de serviço para Google Play (JSON)
7. `STRIPE_PUBLISHABLE_KEY` - Chave pública do Stripe
8. `ONE_SIGNAL_APP_ID` - ID do OneSignal
9. `SENTRY_AUTH_TOKEN` - Token de autenticação do Sentry
10. `SLACK_BOT_TOKEN` - Token para notificações no Slack

## 6. Verificações Antes da Publicação

Antes de criar um release para produção, verificar:

1. Versão correta no `package.json`
2. Todos os recursos críticos testados em staging
3. Testes em diferentes tamanhos de tela
4. Performance e uso de memória
5. Presença de chaves de API corretas para produção

## 7. Monitoramento Pós-Lançamento

Após o lançamento, monitorar:

1. Painel do Sentry para erros
2. Reviews nas lojas
3. Métricas de uso no Firebase Analytics
4. Testes em dispositivos reais

---

**Nota**: Este documento deve ser atualizado sempre que houver mudanças no processo de produção.
