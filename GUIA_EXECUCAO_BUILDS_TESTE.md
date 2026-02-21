# Guia de Execução de Builds de Teste - Açucaradas Encomendas

Este guia apresenta os passos necessários para executar builds de teste do aplicativo Açucaradas Encomendas para Android e iOS, com o objetivo de verificar a integridade do projeto antes da publicação.

## Pré-requisitos

1. Git instalado no sistema (siga as instruções em [GUIA_INSTALACAO_GIT.md](./GUIA_INSTALACAO_GIT.md))
2. Node.js versão 18 ou superior
3. Conta no Expo (https://expo.dev)
4. EAS CLI instalado globalmente:
   ```
   npm install -g eas-cli
   ```
5. Login realizado no EAS:
   ```
   eas login
   ```

## Opções para Execução de Builds de Teste

### Opção 1: Usando o Script Automatizado

Foi criado um script automatizado que executa todas as verificações necessárias e orienta o processo de build de teste:

```bash
npm run test:builds
```

Este script:

1. Verifica se o Git está instalado
2. Verifica se o Node.js está instalado
3. Verifica se o EAS CLI está instalado
4. Verifica se você está logado no EAS
5. Permite escolher qual tipo de build executar (Android, iOS ou ambos)

### Opção 2: Usando Comandos NPM Diretamente

Para maior controle, você pode usar os seguintes comandos npm:

1. Para verificar a configuração do EAS:

   ```bash
   npm run eas:check
   ```

2. Para executar build de teste apenas para Android:

   ```bash
   npm run test:build:android
   ```

3. Para executar build de teste apenas para iOS:
   ```bash
   npm run test:build:ios
   ```

### Opção 3: Usando Comandos EAS Diretamente

Para usuários mais avançados, você pode usar os comandos EAS diretamente:

1. Para Android:

   ```bash
   eas build --platform android --profile test-android
   ```

2. Para iOS:
   ```bash
   eas build --platform ios --profile test-ios
   ```

## Acompanhando o Progresso dos Builds

Os builds são executados remotamente na infraestrutura do Expo. Para acompanhar o progresso:

1. Acesse o [Dashboard do Expo](https://expo.dev)
2. Navegue até o projeto Açucaradas Encomendas
3. Clique na aba "Builds"
4. Você verá o status e o progresso de todos os builds em andamento e concluídos

Ou use o link direto:

```
https://expo.dev/accounts/acucaradaencomendas/projects/acucaradas-encomendas/builds
```

## Instalando e Testando os Builds

### Android

1. Após a conclusão do build, baixe o arquivo APK
2. Transfira o APK para um dispositivo Android
3. Instale o aplicativo diretamente (certifique-se de que a instalação de fontes desconhecidas está habilitada)
4. Teste todas as funcionalidades principais

### iOS

Para iOS, há duas opções:

1. **Para builds de simulador**:

   - Baixe o arquivo de build
   - Abra-o com o simulador do iOS no macOS

2. **Para builds de dispositivo**:
   - É necessário estar registrado na conta de desenvolvedor da Apple
   - O dispositivo precisa estar registrado no perfil de provisionamento
   - Instale através do TestFlight ou diretamente via Xcode

## Solução de Problemas Comuns

### Erro de Autenticação EAS

Se encontrar erros de autenticação:

```
eas logout
eas login
```

### Falha no Build Android

Verifique:

- O arquivo `google-services.json` está presente
- As configurações do Android no `app.json` estão corretas
- As versões do Gradle são compatíveis

### Falha no Build iOS

Verifique:

- O arquivo `GoogleService-Info.plist` está presente na pasta ios/
- O provisionamento está configurado corretamente
- As configurações do iOS no `app.json` estão corretas

### Erro de Git

Se o EAS reportar erros relacionados ao Git:

```
git init
git add .
git commit -m "Build inicial"
```

## Lista de Verificação de Funcionalidades

Durante o teste dos builds, verifique as seguintes funcionalidades:

1. Login e autenticação
2. Navegação entre telas
3. Carregamento de dados do Firebase
4. Upload de imagens
5. Processos de compra
6. Notificações push
7. Funcionamento offline
8. Desempenho geral da aplicação

## Próximos Passos

Após a conclusão bem-sucedida dos builds de teste:

1. Corrija quaisquer problemas identificados
2. Atualize a versão no `package.json` se necessário
3. Prossiga para a criação dos builds finais de produção

---

Em caso de dúvidas ou problemas persistentes, entre em contato com a equipe de desenvolvimento.
