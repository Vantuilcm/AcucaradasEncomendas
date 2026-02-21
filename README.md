# 🧁 Açucaradas Encomendas

> **Aplicativo de delivery de doces artesanais desenvolvido com React Native e Expo**

Conecte clientes às melhores confeitarias da região através de uma plataforma moderna, intuitiva e segura.

## 📱 Sobre o Projeto

O **Açucaradas Encomendas** é um aplicativo mobile que facilita a encomenda e entrega de doces artesanais, conectando clientes a confeitarias especializadas. O app oferece uma experiência completa desde a navegação no catálogo até o acompanhamento da entrega em tempo real.

### ✨ Principais Funcionalidades

- 🛍️ **Catálogo Completo**: Navegue por centenas de doces artesanais
- 🎨 **Personalização**: Customize seus doces com mensagens e preferências
- 🚀 **Entrega Rápida**: Receba em até 2 horas ou agende para depois
- 💳 **Pagamento Seguro**: Cartão, PIX e débito via Stripe
- 📍 **Rastreamento**: Acompanhe seu pedido em tempo real
- ⭐ **Avaliações**: Sistema completo de reviews e favoritos
- 🔔 **Notificações**: Updates sobre pedidos e promoções
- 👤 **Perfil**: Histórico, endereços e preferências

## 🛠️ Tecnologias Utilizadas

### Frontend Mobile
- **React Native** 0.74.5
- **Expo** SDK 51
- **TypeScript** para tipagem estática
- **React Navigation** para navegação
- **React Hook Form** para formulários
- **Async Storage** para persistência local

### Backend & APIs
- **Supabase** (Database + Auth + Storage)
- **Stripe** para processamento de pagamentos
- **Expo Notifications** para push notifications
- **Google Maps API** para localização

### Ferramentas de Desenvolvimento
- **EAS Build** para builds de produção
- **EAS Submit** para publicação nas stores
- **Expo Dev Tools** para desenvolvimento
- **ESLint + Prettier** para qualidade de código

## 🚀 Tecnologias

- React Native
- Expo
- TypeScript
- Firebase
- Stripe
- OneSignal
- Jest
- React Navigation

## 📋 Pré-requisitos

- Node.js 16+
- npm ou yarn
- Expo CLI
- Android Studio (para desenvolvimento Android)
- Xcode (para desenvolvimento iOS)

## 🔧 Instalação

1. Clone o repositório:

```bash
git clone https://github.com/seu-usuario/acucaradas-encomendas.git
cd acucaradas-encomendas
```

2. Instale as dependências:

```bash
npm install
# ou
yarn install
```

3. Configure as variáveis de ambiente:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais.

4. Configure as integrações externas:

```bash
node setup/setup-integracoes.js
```

Siga as instruções fornecidas pelo script para configurar Firebase, Stripe e OneSignal.

5. Inicie o aplicativo:

```bash
npm start
# ou
yarn start
```

## 🔌 Integrações Externas

O aplicativo utiliza as seguintes integrações externas:

### Firebase

- **Autenticação**: Login e registro de usuários
- **Firestore**: Banco de dados para armazenar informações de produtos, pedidos e usuários
- **Storage**: Armazenamento para imagens de produtos e perfis de usuários
- **Cloud Messaging**: Notificações para status de pedidos

### Stripe

- Processamento de pagamentos
- Checkout seguro
- Gerenciamento de métodos de pagamento

### OneSignal

- Notificações push
- Segmentação de usuários
- Automações de notificações

#### Scripts de Configuração

Para facilitar a configuração das integrações, utilize os scripts na pasta `setup/`:

```bash
# Configuração completa guiada
node setup/setup-integracoes.js

# Ou scripts individuais
node setup/firebase-setup.js
node setup/stripe-setup.js
node setup/onesignal-setup.js
```

Para mais detalhes sobre as configurações, consulte o arquivo [instrucoes_integracoes.md](instrucoes_integracoes.md).

## 🧪 Testes

### Testes Unitários

```bash
npm test
# ou
yarn test
```

### Testes E2E

```bash
npm run test:e2e
# ou
yarn test:e2e
```

## 📱 Estrutura do Projeto

```
src/
├── components/     # Componentes reutilizáveis
├── config/        # Configurações do app
├── contexts/      # Contextos React
├── hooks/         # Hooks customizados
├── navigation/    # Configuração de navegação
├── screens/       # Telas do aplicativo
├── services/      # Serviços e APIs
├── store/         # Estado global
├── types/         # Definições de tipos
└── utils/         # Funções utilitárias
```

## 🔄 Fluxos de Desenvolvimento

1. **Criar uma nova feature**:

   - Crie uma branch: `git checkout -b feature/nome-da-feature`
   - Desenvolva a feature
   - Adicione testes
   - Faça commit: `git commit -m "feat: descrição da feature"`
   - Faça push: `git push origin feature/nome-da-feature`
   - Crie um Pull Request

2. **Corrigir um bug**:
   - Crie uma branch: `git checkout -b fix/nome-do-bug`
   - Corrija o bug
   - Adicione testes
   - Faça commit: `git commit -m "fix: descrição do bug"`
   - Faça push: `git push origin fix/nome-do-bug`
   - Crie um Pull Request

## 📦 Scripts Disponíveis

- `npm start`: Inicia o aplicativo
- `npm test`: Executa testes unitários
- `npm run test:e2e`: Executa testes E2E
- `npm run lint`: Executa o linter
- `npm run build`: Gera build de produção
- `npm run deploy`: Faz deploy para as lojas

## 🔒 Segurança

- Nunca commite arquivos `.env` ou credenciais
- Use variáveis de ambiente para dados sensíveis
- Mantenha as dependências atualizadas
- Siga as boas práticas de segurança do React Native

## 📝 Convenções de Código

- Use TypeScript para todo novo código
- Siga o padrão de commits do Conventional Commits
- Mantenha os componentes pequenos e reutilizáveis
- Documente funções e componentes complexos
- Use testes para garantir qualidade

## 🤝 Contribuindo

1. Faça um Fork do projeto
2. Crie uma branch para sua feature
3. Faça commit das suas mudanças
4. Faça push para a branch
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte, envie um email para suporte@acucaradasencomendas.com.br ou abra uma issue no GitHub.

# Açucaradas Encomendas - Busca por Voz

## Descrição

A Açucaradas Encomendas é uma aplicação para pedidos de bolos, doces e salgados. Este projeto implementa uma funcionalidade de pesquisa por voz que permite aos usuários buscar produtos através de comandos de voz, tornando a experiência mais acessível e prática.

## Funcionalidades de Busca por Voz

O componente `VoiceSearch` foi implementado com:

- Reconhecimento de voz usando a biblioteca `@react-native-voice/voice`
- Interface visual com animações para feedback durante o reconhecimento
- Suporte a múltiplos idiomas (pt-BR, en-US, es-ES, fr-FR)
- Tratamento de erros abrangente
- Feedback tátil através de vibrações
- Melhorias de acessibilidade para usuários com deficiência visual

### Componentes Atualizados

- `VoiceSearch`: Componente principal do reconhecimento de voz
- `ConfiguracoesScreen`: Tela de configurações com opções para escolher o idioma preferido
- `TesteVoz`: Nova tela para testar o reconhecimento de voz em diferentes idiomas

## Configuração

Para configurar o reconhecimento de voz:

1. Execute o script de configuração:

```bash
node scripts/setup-voice.js
```

2. Verifique as permissões do app:

   - Android: Permissão de RECORD_AUDIO no AndroidManifest.xml
   - iOS: NSMicrophoneUsageDescription e NSSpeechRecognitionUsageDescription no Info.plist

3. Para projetos Expo, o script já atualiza o app.json automaticamente

## Teste da Funcionalidade

Uma tela de teste completa foi adicionada para verificar o reconhecimento de voz:

- Acesse pela tela de configurações ou navegue para `/teste-voz`
- Teste com diferentes idiomas
- Verifique o reconhecimento usando frases pré-definidas
- Monitore os resultados e o desempenho do reconhecimento

## Próximos Passos

- Melhorar o suporte para reconhecimento de categorias específicas
- Adicionar recursos de aprendizado para termos frequentemente buscados
- Implementar análise de sentimento para entender melhor as intenções do usuário
