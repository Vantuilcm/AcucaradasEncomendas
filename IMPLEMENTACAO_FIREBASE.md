# Implementação do Firebase no Aplicativo Açucaradas Encomendas

## Visão Geral

Este documento descreve como o Firebase foi implementado no aplicativo Açucaradas Encomendas, um projeto Expo/React Native. O Firebase fornece diversos serviços como autenticação, banco de dados em tempo real, armazenamento e analytics que são essenciais para o funcionamento do aplicativo.

## Arquivos de Configuração Existentes

O projeto já possui os seguintes arquivos de configuração do Firebase:

1. `google-services.json` - Arquivo de configuração principal para Android
2. `google-services.prod.json` - Arquivo de configuração para ambiente de produção
3. `google-service-account.json` - Arquivo de credenciais para publicação na Play Store

## Configuração Atual

Atualmente, o projeto já possui:

- Configuração básica do Firebase no arquivo `src/config/firebase.ts`
- Referência ao arquivo `google-services.json` no `app.json` e `app.config.ts`
- Dependência do Firebase instalada no `package.json`

## Implementação do Firebase no Android

Para projetos Expo gerenciados, o processo de implementação do Firebase é simplificado, pois o Expo EAS Build cuida da configuração do Gradle automaticamente. No entanto, para garantir que tudo funcione corretamente, seguimos estas etapas:

### 1. Verificação da Configuração Atual

O arquivo `app.config.ts` já contém a configuração necessária para o Android:

```typescript
android: {
  adaptiveIcon: {
    foregroundImage: './assets/adaptive-icon.png',
    backgroundColor: '#ffffff',
  },
  package: 'com.acucaradas.encomendas',
  googleServicesFile: './google-services.json',
}
```

O arquivo `google-services.json` já está presente na raiz do projeto.

### 2. Configuração do Firebase no Código

O arquivo `src/config/firebase.ts` já está configurado corretamente para inicializar o Firebase com as credenciais apropriadas.

### 3. Processo de Build com EAS

Quando você executa um build com EAS (Expo Application Services), o sistema automaticamente:

1. Detecta o arquivo `google-services.json`
2. Configura o plugin do Google Services no Gradle
3. Adiciona as dependências necessárias

Para builds de produção, use o comando conforme documentado em `INSTRUCOES_PUBLICACAO.md`:

```bash
eas build --platform android --profile production
```

## Verificação da Implementação

Para verificar se o Firebase está corretamente implementado:

1. Execute um build de desenvolvimento:

   ```bash
   eas build --platform android --profile development
   ```

2. Instale o aplicativo no dispositivo de teste

3. Verifique nos logs se a mensagem "Firebase initialized successfully on android" aparece

4. Teste as funcionalidades que dependem do Firebase (autenticação, armazenamento, etc.)

## Solução de Problemas

Se encontrar problemas com a integração do Firebase:

1. Verifique se o arquivo `google-services.json` está atualizado e contém as informações corretas
2. Confirme que o pacote no `google-services.json` corresponde ao pacote em `app.json`
3. Verifique se todas as dependências do Firebase necessárias estão instaladas
4. Consulte os logs de build do EAS para identificar possíveis erros

## Recursos Adicionais

- [Documentação do Firebase para React Native](https://firebase.google.com/docs/react-native/setup)
- [Guia do Expo para Firebase](https://docs.expo.dev/guides/using-firebase/)
- [Configuração do EAS Build](https://docs.expo.dev/build/setup/)

## Contato para Suporte

Em caso de dúvidas ou problemas durante a implementação do Firebase, entre em contato:

**Suporte Técnico Açucaradas**  
E-mail: suporte@acucaradas.com.br  
Telefone: (21) 98812-7973
