# DocumentaÃ§Ã£o da Nova Arquitetura - AÃ§ucaradas Encomendas

## VisÃ£o Geral da Arquitetura

O aplicativo AÃ§ucaradas Encomendas foi completamente redesenhado para utilizar uma arquitetura moderna e desacoplada, eliminando a dependÃªncia do WordPress/WooCommerce. A nova implementaÃ§Ã£o Ã© baseada em React Native com Expo, utilizando Firebase como backend principal para autenticaÃ§Ã£o, armazenamento de dados e notificaÃ§Ãµes.

## Componentes Principais

### 1. Frontend (React Native + Expo)

- **Interface de UsuÃ¡rio**: Implementada com React Native e componentes personalizados
- **Gerenciamento de Estado**: Utiliza Context API e hooks para gerenciamento de estado
- **NavegaÃ§Ã£o**: React Navigation para gerenciamento de rotas e fluxos de navegaÃ§Ã£o
- **EstilizaÃ§Ã£o**: Styled Components para estilizaÃ§Ã£o consistente e reutilizÃ¡vel

### 2. Backend (Firebase)

- **AutenticaÃ§Ã£o**: Firebase Authentication para gerenciamento de usuÃ¡rios e sessÃµes
- **Banco de Dados**: Firestore para armazenamento de dados estruturados
- **Armazenamento**: Firebase Storage para armazenamento de imagens e arquivos
- **NotificaÃ§Ãµes**: Firebase Cloud Messaging (FCM) para notificaÃ§Ãµes push
- **FunÃ§Ãµes Serverless**: Firebase Functions para lÃ³gica de backend e integraÃ§Ãµes

### 3. Camada de SeguranÃ§a

- **ProteÃ§Ã£o contra Screenshots**: ImplementaÃ§Ã£o de bloqueio de capturas de tela em telas sensÃ­veis
- **Marcas d'Ã¡gua DinÃ¢micas**: SobreposiÃ§Ã£o de informaÃ§Ãµes do usuÃ¡rio para rastreabilidade
- **DetecÃ§Ã£o de Dispositivos Comprometidos**: VerificaÃ§Ã£o de root/jailbreak
- **Armazenamento Seguro**: Criptografia de dados sensÃ­veis antes do armazenamento
- **Logging Seguro**: Sistema de logs com rotaÃ§Ã£o e criptografia

## Fluxos Principais

### AutenticaÃ§Ã£o e AutorizaÃ§Ã£o

1. **Registro de UsuÃ¡rio**:
   - Implementado diretamente com Firebase Authentication
   - ValidaÃ§Ã£o de email e polÃ­tica de senhas fortes
   - Armazenamento seguro de tokens

2. **Login**:
   - MÃºltiplos mÃ©todos de autenticaÃ§Ã£o (email/senha, Google, Apple)
   - SessÃµes persistentes com renovaÃ§Ã£o segura de tokens
   - ProteÃ§Ã£o contra tentativas excessivas de login

3. **Controle de Acesso**:
   - Baseado em regras de seguranÃ§a do Firestore e Storage
   - VerificaÃ§Ã£o de permissÃµes em nÃ­vel de aplicativo

### Gerenciamento de Produtos

1. **CatÃ¡logo de Produtos**:
   - Dados armazenados no Firestore com cache local
   - Imagens otimizadas no Firebase Storage
   - CategorizaÃ§Ã£o e filtragem eficientes

2. **Detalhes do Produto**:
   - Carregamento otimizado de imagens
   - InformaÃ§Ãµes detalhadas com opÃ§Ãµes de personalizaÃ§Ã£o

### Processo de Pedido

1. **Carrinho de Compras**:
   - PersistÃªncia local com sincronizaÃ§Ã£o na nuvem
   - CÃ¡lculos de preÃ§o e quantidade em tempo real

2. **Checkout**:
   - IntegraÃ§Ã£o com gateways de pagamento
   - ValidaÃ§Ã£o de endereÃ§o e opÃ§Ãµes de entrega
   - ConfirmaÃ§Ã£o e recibo digital

3. **Acompanhamento de Pedido**:
   - AtualizaÃ§Ãµes em tempo real via Firestore
   - NotificaÃ§Ãµes push para mudanÃ§as de status

## ServiÃ§os e UtilitÃ¡rios

### ServiÃ§os Principais

- **AuthService**: Gerenciamento de autenticaÃ§Ã£o e sessÃ£o
- **ProductService**: OperaÃ§Ãµes relacionadas a produtos
- **OrderService**: Gerenciamento de pedidos e checkout
- **NotificationService**: ConfiguraÃ§Ã£o e gerenciamento de notificaÃ§Ãµes push
- **PaymentService**: IntegraÃ§Ã£o com gateways de pagamento

### ServiÃ§os de SeguranÃ§a

- **SecureStorageService**: Armazenamento seguro de dados sensÃ­veis
- **DeviceSecurityService**: VerificaÃ§Ã£o de integridade do dispositivo
- **SecureLoggingService**: Sistema de logs seguros e auditÃ¡veis

## EstratÃ©gia de MigraÃ§Ã£o

A migraÃ§Ã£o do WordPress/WooCommerce para a nova arquitetura foi realizada em fases:

1. **Fase 1**: ImplementaÃ§Ã£o da nova interface de usuÃ¡rio com dados mockados
2. **Fase 2**: IntegraÃ§Ã£o com Firebase para autenticaÃ§Ã£o e armazenamento
3. **Fase 3**: MigraÃ§Ã£o de dados do WordPress para o Firestore
4. **Fase 4**: ImplementaÃ§Ã£o de funcionalidades especÃ­ficas e otimizaÃ§Ãµes
5. **Fase 5**: Testes de seguranÃ§a e performance
6. **Fase 6**: LanÃ§amento da nova versÃ£o e desativaÃ§Ã£o do WordPress

## ConsideraÃ§Ãµes de SeguranÃ§a

### ProteÃ§Ã£o de Dados

- Todos os dados sensÃ­veis sÃ£o criptografados antes do armazenamento
- Tokens de autenticaÃ§Ã£o sÃ£o armazenados de forma segura
- ImplementaÃ§Ã£o de timeout de sessÃ£o e invalidaÃ§Ã£o de tokens

### PrevenÃ§Ã£o de Ataques

- ProteÃ§Ã£o contra injeÃ§Ã£o de cÃ³digo
- ValidaÃ§Ã£o de entrada em todos os campos
- LimitaÃ§Ã£o de taxa para prevenir ataques de forÃ§a bruta
- VerificaÃ§Ã£o de integridade do dispositivo

### Conformidade

- ImplementaÃ§Ã£o de prÃ¡ticas alinhadas com LGPD/GDPR
- Consentimento explÃ­cito para coleta de dados
- Funcionalidades para exclusÃ£o de conta e dados do usuÃ¡rio

## Monitoramento e ManutenÃ§Ã£o

### Monitoramento

- Firebase Crashlytics para rastreamento de erros
- Firebase Performance Monitoring para mÃ©tricas de desempenho
- Logs seguros para auditoria e depuraÃ§Ã£o

### AtualizaÃ§Ãµes

- AtualizaÃ§Ãµes OTA via Expo EAS Update
- Versionamento semÃ¢ntico para controle de versÃµes
- EstratÃ©gia de rollback para casos de problemas crÃ­ticos

## PrÃ³ximos Passos

1. **ResoluÃ§Ã£o de Conflitos de DependÃªncias**: Resolver os conflitos de versÃµes React identificados
2. **Testes Abrangentes**: Realizar testes de integraÃ§Ã£o, performance e seguranÃ§a
3. **OtimizaÃ§Ãµes de Performance**: Melhorar tempos de carregamento e responsividade
4. **ImplementaÃ§Ã£o de 2FA**: Adicionar autenticaÃ§Ã£o de dois fatores para maior seguranÃ§a
5. **ExpansÃ£o de Funcionalidades**: Implementar recursos adicionais planejados

## ConclusÃ£o

A nova arquitetura representa uma evoluÃ§Ã£o significativa em termos de seguranÃ§a, performance e manutenibilidade. O desacoplamento do WordPress/WooCommerce permite maior flexibilidade, escalabilidade e uma experiÃªncia de usuÃ¡rio aprimorada, ao mesmo tempo que fortalece os aspectos de seguranÃ§a da aplicaÃ§Ã£o.

---

*DocumentaÃ§Ã£o atualizada em: 12/09/2025*

*VersÃ£o: 1.0*

