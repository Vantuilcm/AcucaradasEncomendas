# Scripts de Configuração de Integrações Externas

Esta pasta contém scripts para auxiliar na configuração e verificação das integrações externas utilizadas pelo aplicativo Açucaradas Encomendas.

## Conteúdo

- `setup-integracoes.js` - Script principal que executa todas as verificações
- `firebase-setup.js` - Verificações e instruções específicas para o Firebase
- `stripe-setup.js` - Verificações e instruções específicas para o Stripe
- `onesignal-setup.js` - Verificações e instruções específicas para o OneSignal

## Como Usar

### Pré-requisitos

- Node.js instalado (v14 ou superior)
- NPM ou Yarn
- Projeto Açucaradas Encomendas configurado

### Executar Script Principal

Este script irá verificar todas as integrações sequencialmente e fornecer instruções passo a passo:

```bash
node setup/setup-integracoes.js
```

### Executar Scripts Individuais

Você também pode executar scripts para verificações específicas:

#### Firebase

```bash
node setup/firebase-setup.js
```

#### Stripe

```bash
node setup/stripe-setup.js
```

#### OneSignal

```bash
node setup/onesignal-setup.js
```

## O que esses Scripts Verificam

### Firebase

- Presença do arquivo `google-services.json`
- Configuração correta do pacote Android
- Variáveis de ambiente necessárias
- Instruções para configurar Firestore, Authentication e Storage

### Stripe

- Variáveis de ambiente do Stripe
- Arquivo de configuração
- Verificação de chaves de teste vs. produção
- Instruções para configurar conta, webhooks e testes

### OneSignal

- Variáveis de ambiente do OneSignal
- Arquivo de configuração
- Integração correta no aplicativo
- Instruções para configurar plataformas e segmentos

## Observações Importantes

- Estes scripts não alteram ou configuram automaticamente as integrações.
- Eles apenas verificam o estado atual e fornecem instruções para configuração manual.
- Para detalhes completos, consulte o arquivo `instrucoes_integracoes.md` na raiz do projeto.
- Mantenha suas chaves e credenciais em local seguro e nunca as exponha publicamente.

## Troubleshooting

### Script não encontra os arquivos de configuração

Certifique-se de estar executando o script a partir da raiz do projeto:

```bash
# Correto
cd /caminho/para/acucaradas-encomendas
node setup/setup-integracoes.js

# Incorreto
cd /caminho/para/acucaradas-encomendas/setup
node setup-integracoes.js
```

### Erro ao executar o script

Se você encontrar erros ao executar os scripts, verifique:

1. Se você tem Node.js instalado (`node --version`)
2. Se você está na pasta raiz do projeto
3. Se as permissões dos arquivos estão corretas
