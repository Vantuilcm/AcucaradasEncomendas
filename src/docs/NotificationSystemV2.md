# Sistema de Notificações V2 - Documentação

## Visão Geral

O Sistema de Notificações V2 é uma implementação otimizada para gerenciar as preferências de notificações dos usuários no aplicativo Açucaradas Encomendas. Esta nova versão foi projetada para oferecer melhor desempenho, experiência do usuário aprimorada e maior flexibilidade nas configurações de notificações.

## Arquitetura

O sistema é composto pelos seguintes componentes principais:

### 1. Gerenciamento de Cache

#### LRUCache

Implementação de um cache Least Recently Used (LRU) que mantém os dados mais recentemente acessados em memória, removendo automaticamente os itens menos utilizados quando o limite de capacidade é atingido.

**Características principais:**

- Capacidade configurável
- Suporte a expiração de itens
- Remoção automática de itens menos utilizados
- Purga de itens expirados

#### EnhancedCacheManager

Gerenciador de cache que combina armazenamento em memória (LRUCache) com persistência (AsyncStorage), proporcionando acesso rápido aos dados frequentemente utilizados e persistência entre sessões do aplicativo.

**Características principais:**

- Padrão Singleton para acesso global
- Armazenamento em duas camadas (memória e persistência)
- Limpeza automática de itens expirados
- Logging de operações para depuração

### 2. Serviço de Configurações de Notificação

#### NotificationSettingsServiceWithCacheV2

Serviço responsável por gerenciar as configurações de notificação dos usuários, utilizando o Firestore como fonte de dados primária e o EnhancedCacheManager para otimizar o desempenho.

**Características principais:**

- Padrão Singleton para acesso global
- Criação automática de configurações padrão para novos usuários
- Armazenamento em cache para acesso rápido
- Suporte a diferentes tipos de notificação
- Modo silencioso com configuração de horários

### 3. Hook React para Integração com UI

#### useNotificationSettingsV2

Hook React que facilita a integração do serviço de configurações de notificação com os componentes de interface do usuário.

**Características principais:**

- Carregamento automático das configurações do usuário atual
- Funções para alternar tipos de notificação
- Gerenciamento de estado de carregamento e erros
- Suporte a modo silencioso e configuração de frequência

### 4. Interface de Usuário

#### NotificationSettingsScreenV2

Tela que permite aos usuários visualizar e modificar suas configurações de notificação.

**Características principais:**

- Interface intuitiva com switches para ativar/desativar notificações
- Configuração de modo silencioso
- Seleção de horários para receber notificações
- Feedback visual durante operações de carregamento e atualização

### 5. Migração de Configurações

#### NotificationSettingsMigration

Classe responsável por migrar as configurações de notificação da versão 1 para a versão 2.

**Características principais:**

- Migração de configurações individuais ou em lote
- Verificação de status de migração
- Limpeza de cache após migração

#### NotificationSettingsMigrationScreen

Tela que permite aos administradores e usuários migrar as configurações de notificação para a nova versão.

**Características principais:**

- Interface para migração de configurações individuais
- Opção para administradores migrarem todas as configurações
- Feedback visual durante o processo de migração

## Como Utilizar

### Para Usuários Finais

1. Acesse a tela de perfil do aplicativo
2. Selecione "Migração de Notificações" para migrar suas configurações para a versão 2
3. Após a migração, acesse "Configurações de Notificação V2" para personalizar suas preferências

### Para Desenvolvedores

#### Acessando o Serviço de Notificações

```typescript
import { NotificationSettingsServiceWithCacheV2 } from '../services/NotificationSettingsServiceWithCacheV2';

// Obter a instância do serviço
const notificationService = NotificationSettingsServiceWithCacheV2.getInstance();

// Obter configurações de um usuário
const settings = await notificationService.getSettings('userId');

// Atualizar configurações
await notificationService.updateSettings('userId', updatedSettings);
```

#### Utilizando o Hook em Componentes React

```typescript
import { useNotificationSettingsV2 } from '../hooks/useNotificationSettingsV2';

const MyComponent = () => {
  const {
    settings,
    loading,
    error,
    toggleNotifications,
    toggleNotificationType,
    toggleSilentMode,
    updateSilentHours,
    reloadSettings
  } = useNotificationSettingsV2();

  // Exemplo: alternar notificações de pedidos
  const handleToggleOrderNotifications = () => {
    toggleNotificationType('orders');
  };

  return (
    // Seu componente aqui
  );
};
```

#### Migrando Configurações

```typescript
import { NotificationSettingsMigration } from '../utils/notificationSettingsMigration';

// Migrar configurações de um usuário específico
const migration = new NotificationSettingsMigration();
await migration.migrateUserSettings('userId');

// Para administradores: migrar configurações de todos os usuários
await migration.migrateAllUsers();
```

## Testes

O sistema inclui testes unitários abrangentes para todos os componentes:

- `LRUCache.test.ts`: Testes para o cache LRU
- `EnhancedCacheManager.test.ts`: Testes para o gerenciador de cache
- `NotificationSettingsServiceWithCacheV2.test.ts`: Testes para o serviço de configurações
- `useNotificationSettingsV2.test.tsx`: Testes para o hook React
- `NotificationSettingsScreenV2.test.tsx`: Testes para a interface de usuário

## Melhores Práticas

1. **Sempre use o hook**: Para componentes de UI, utilize o hook `useNotificationSettingsV2` em vez de acessar diretamente o serviço.

2. **Limpeza de cache**: Considere limpar o cache quando o usuário fizer logout para evitar vazamento de dados entre sessões.

3. **Tratamento de erros**: Sempre trate erros de rede ou do Firestore para garantir uma boa experiência do usuário.

4. **Migração gradual**: Recomenda-se migrar os usuários gradualmente para a nova versão, monitorando o desempenho e a experiência do usuário.

## Solução de Problemas

### Dados desatualizados

Se os usuários relatarem dados desatualizados, você pode:

1. Solicitar que o usuário force a recarga das configurações (usando o botão de atualização na tela)
2. Limpar o cache do aplicativo
3. Verificar se há conflitos entre as versões 1 e 2 do sistema de notificações

### Problemas de desempenho

Se houver problemas de desempenho:

1. Verifique o tamanho do cache LRU (pode ser necessário ajustar a capacidade)
2. Monitore o uso de memória do aplicativo
3. Verifique se há operações de rede excessivas ao Firestore

## Roadmap Futuro

- Suporte a notificações programadas
- Integração com serviços de push notification externos
- Análise de engajamento baseada nas configurações de notificação
- Interface de administração para envio de notificações em massa
