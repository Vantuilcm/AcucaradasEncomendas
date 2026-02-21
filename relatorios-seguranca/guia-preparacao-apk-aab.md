# Guia para Preparação do APK/AAB para Envio na Google Play Store

## Introdução

Este guia fornece instruções detalhadas para a preparação do arquivo APK (Android Package) ou AAB (Android App Bundle) do aplicativo Acucaradas Encomendas para submissão na Google Play Store. Seguir estas etapas garantirá que seu aplicativo esteja otimizado, assinado corretamente e pronto para aprovação.

## Índice

1. [APK vs AAB: Qual Escolher?](#1-apk-vs-aab-qual-escolher)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Configuração de Versão](#3-configuração-de-versão)
4. [Criação da Chave de Assinatura](#4-criação-da-chave-de-assinatura)
5. [Configuração do Gradle](#5-configuração-do-gradle)
6. [Otimizações Recomendadas](#6-otimizações-recomendadas)
7. [Geração do APK/AAB](#7-geração-do-apkaab)
8. [Testes Pré-Submissão](#8-testes-pré-submissão)
9. [Validação do APK/AAB](#9-validação-do-apkaab)
10. [Solução de Problemas Comuns](#10-solução-de-problemas-comuns)

## 1. APK vs AAB: Qual Escolher?

### Android App Bundle (AAB) - Recomendado

O formato AAB é o formato de publicação recomendado pela Google e oferece várias vantagens:

- **Tamanho reduzido de download**: A Play Store gera APKs otimizados para cada dispositivo
- **Suporte a recursos dinâmicos**: Permite carregar recursos sob demanda
- **Atualizações menores**: Usuários baixam apenas o que mudou nas atualizações
- **Compatibilidade com Play App Signing**: Gerenciamento de chaves pela Google

### APK (Android Package)

O formato APK tradicional ainda é suportado, mas tem limitações:

- **Tamanho maior**: Contém recursos para todos os dispositivos
- **Sem otimização automática**: Você precisa criar múltiplos APKs para diferentes configurações
- **Atualizações maiores**: Usuários baixam o aplicativo completo em cada atualização

**Recomendação para Acucaradas Encomendas**: Utilize o formato AAB para aproveitar todas as vantagens de otimização e distribuição da Play Store.

## 2. Pré-requisitos

Antes de iniciar o processo de geração do APK/AAB, certifique-se de que você possui:

- **Android Studio**: Versão mais recente instalada e atualizada
- **JDK (Java Development Kit)**: Versão 8 ou superior
- **Gradle**: Versão compatível com seu projeto
- **Acesso ao código-fonte**: Repositório atualizado do aplicativo Acucaradas Encomendas
- **Conexão com internet**: Para resolver dependências durante o build

## 3. Configuração de Versão

A configuração correta de versão é essencial para o gerenciamento de atualizações na Play Store.

### Abra o arquivo build.gradle (nível do módulo)

Localize o arquivo em: `android/app/build.gradle`

### Configure os números de versão

```gradle
android {
    defaultConfig {
        applicationId "com.acucaradas.encomendas"  // Não altere o applicationId após a publicação inicial
        minSdkVersion 21                           // Versão mínima do Android suportada
        targetSdkVersion 33                        // Versão alvo do Android
        versionCode 1                              // Incrementar a cada nova versão enviada
        versionName "1.0.0"                      // Versão visível para usuários (semântica)
    }
}
```

### Regras para versionamento

- **versionCode**: Número inteiro que deve ser incrementado a cada nova versão enviada para a Play Store
  - Primeira versão: 1
  - Atualizações subsequentes: 2, 3, 4, etc.

- **versionName**: String que representa a versão visível para os usuários
  - Recomendamos seguir o padrão semântico: `MAJOR.MINOR.PATCH`
  - MAJOR: Mudanças incompatíveis com versões anteriores
  - MINOR: Adição de funcionalidades compatíveis com versões anteriores
  - PATCH: Correções de bugs compatíveis com versões anteriores

## 4. Criação da Chave de Assinatura

Todo aplicativo Android deve ser assinado digitalmente antes da distribuição. A chave de assinatura é um componente crítico que identifica o desenvolvedor do aplicativo.

### Importância da Chave de Assinatura

- **Identidade do desenvolvedor**: Comprova a autenticidade do aplicativo
- **Atualizações**: Necessária para publicar atualizações do aplicativo
- **Segurança**: Protege contra substituição não autorizada do aplicativo

### Criação da Chave com o Android Studio

1. No Android Studio, vá para **Build > Generate Signed Bundle/APK**
2. Selecione **Android App Bundle** ou **APK** dependendo do formato escolhido
3. Clique em **Create new...**
4. Preencha o formulário:
   - **Key store path**: Local onde o arquivo de keystore será salvo
   - **Password**: Senha forte para o keystore
   - **Alias**: Nome para identificar a chave (ex: "acucaradas_key")
   - **Key password**: Senha para a chave específica
   - **Validity**: 25+ anos recomendado (ex: 9000 dias)
   - **Certificate**: Informações sobre sua organização
5. Clique em **OK** para gerar o keystore

### Criação da Chave via Linha de Comando

Alternativamente, você pode criar a chave usando o keytool:

```bash
keytool -genkey -v -keystore acucaradas_key.jks -keyalg RSA -keysize 2048 -validity 9000 -alias acucaradas_key
```

### Backup da Chave de Assinatura

**EXTREMAMENTE IMPORTANTE**: Faça backup da chave de assinatura em local seguro!

- Se você perder a chave, não poderá mais atualizar seu aplicativo
- Será necessário publicar um novo aplicativo com novo ID e perder todos os usuários e avaliações

Recomendações de backup:
- Armazene em múltiplos locais seguros (drive criptografado, cofre digital)
- Documente as senhas em um gerenciador de senhas seguro
- Considere o Play App Signing para que a Google gerencie sua chave de upload

## 5. Configuração do Gradle

Para automatizar o processo de assinatura, configure o Gradle para usar sua chave de assinatura.

### Configuração no build.gradle

Adicione a configuração de assinatura no arquivo `android/app/build.gradle`:

```gradle
android {
    // ... outras configurações

    signingConfigs {
        release {
            storeFile file("caminho/para/acucaradas_key.jks")
            storePassword "sua_senha_do_keystore"
            keyAlias "acucaradas_key"
            keyPassword "sua_senha_da_chave"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Proteção de Senhas

Para evitar armazenar senhas no código-fonte, use variáveis de ambiente ou um arquivo de propriedades:

1. Crie um arquivo `keystore.properties` na raiz do projeto (não inclua no controle de versão):

```
storeFile=caminho/para/acucaradas_key.jks
storePassword=sua_senha_do_keystore
keyAlias=acucaradas_key
keyPassword=sua_senha_da_chave
```

2. Modifique o `build.gradle` para ler este arquivo:

```gradle
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... outras configurações

    signingConfigs {
        release {
            storeFile file(keystoreProperties['storeFile'])
            storePassword keystoreProperties['storePassword']
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
        }
    }

    // ... resto da configuração
}
```

## 6. Otimizações Recomendadas

Antes de gerar o APK/AAB final, implemente estas otimizações para melhorar o desempenho e reduzir o tamanho do aplicativo:

### Redução de Tamanho

1. **Habilite o R8/ProGuard**:
   - Já configurado na seção anterior com `minifyEnabled true`
   - Crie ou atualize o arquivo `proguard-rules.pro` com regras específicas para suas bibliotecas

2. **Habilite a compressão de recursos**:
   - Já configurado com `shrinkResources true`

3. **Otimize imagens**:
   - Converta PNGs para WebP
   - No Android Studio: **Tools > Android > Convert to WebP**

4. **Remova recursos não utilizados**:
   - Verifique a pasta `res` e remova arquivos desnecessários
   - Use o Lint do Android Studio: **Analyze > Inspect Code**

### Melhoria de Desempenho

1. **Otimize o carregamento de imagens**:
   - Use bibliotecas como Glide ou Picasso
   - Implemente carregamento lazy de imagens

2. **Reduza o uso de bibliotecas pesadas**:
   - Revise as dependências no `build.gradle`
   - Remova bibliotecas não utilizadas

3. **Implemente multidex se necessário**:
   - Se seu aplicativo ultrapassar o limite de métodos, adicione:

```gradle
android {
    defaultConfig {
        multiDexEnabled true
    }
}

dependencies {
    implementation "androidx.multidex:multidex:2.0.1"
}
```

## 7. Geração do APK/AAB

### Usando o Android Studio

1. Vá para **Build > Generate Signed Bundle/APK**
2. Selecione **Android App Bundle** ou **APK**
3. Selecione o keystore existente e preencha as informações
4. Selecione o build type **release**
5. Clique em **Finish**

### Usando a Linha de Comando

Para gerar um AAB:

```bash
./gradlew bundleRelease
```

Para gerar um APK:

```bash
./gradlew assembleRelease
```

### Localização dos Arquivos Gerados

- AAB: `app/build/outputs/bundle/release/app-release.aab`
- APK: `app/build/outputs/apk/release/app-release.apk`

## 8. Testes Pré-Submissão

Antes de enviar o APK/AAB para a Play Store, realize estes testes essenciais:

### Teste de Instalação

1. Instale o APK de release em dispositivos físicos (não apenas emuladores)
2. Teste em diferentes versões do Android (do minSdkVersion ao targetSdkVersion)
3. Teste em diferentes tamanhos de tela (smartphone e tablet)

### Teste de Funcionalidade

1. Verifique se todas as funcionalidades principais funcionam corretamente:
   - Cadastro e login de usuários
   - Navegação pelo catálogo de produtos
   - Processo de encomenda completo
   - Pagamento (teste em modo sandbox)
   - Notificações

2. Verifique se não há erros ou crashes:
   - Teste cenários de erro (sem internet, servidor indisponível)
   - Teste entradas inválidas em formulários

### Teste de Performance

1. Verifique o tempo de inicialização do aplicativo
2. Teste o desempenho em dispositivos de baixo desempenho
3. Monitore o uso de memória e CPU

## 9. Validação do APK/AAB

Antes do envio final, valide seu APK/AAB usando ferramentas oficiais:

### Usando o Android App Bundle Explorer

1. Acesse [bundletool](https://github.com/google/bundletool/releases) e baixe a versão mais recente
2. Execute a validação:

```bash
java -jar bundletool.jar validate --bundle=app-release.aab
```

### Usando o Google Play Console

1. Acesse o [Google Play Console](https://play.google.com/console)
2. Vá para **Testes > Testes internos**
3. Crie um novo lançamento e faça upload do seu AAB/APK
4. O console realizará verificações automáticas e alertará sobre problemas

### Verificações Importantes

- **Permissões**: Verifique se todas as permissões solicitadas são necessárias e justificáveis
- **Compatibilidade**: Verifique se o aplicativo é compatível com os dispositivos alvo
- **Política da Play Store**: Certifique-se de que o aplicativo cumpre todas as políticas

## 10. Solução de Problemas Comuns

### Erro de Assinatura

**Problema**: "APK não está assinado" ou "Assinatura inválida"

**Solução**:
- Verifique se a configuração de assinatura no `build.gradle` está correta
- Confirme se o caminho para o keystore está correto
- Verifique se as senhas estão corretas

### Erro de Versão

**Problema**: "O código de versão já existe" ao tentar fazer upload

**Solução**:
- Incremente o `versionCode` no `build.gradle`
- Gere um novo APK/AAB com o código de versão atualizado

### Erro de Compatibilidade

**Problema**: "Seu aplicativo não é compatível com nenhum dispositivo"

**Solução**:
- Verifique as configurações de `minSdkVersion` e `targetSdkVersion`
- Revise as bibliotecas que podem estar limitando a compatibilidade
- Verifique se há filtros de recursos (`<uses-feature>`) restritivos no AndroidManifest.xml

### Erro de Tamanho

**Problema**: "O APK excede o tamanho máximo permitido"

**Solução**:
- Implemente as otimizações da seção 6
- Considere usar o formato AAB em vez de APK
- Remova recursos desnecessários
- Comprima imagens e outros recursos

## Conclusão

Seguindo este guia passo a passo, você estará preparado para gerar um APK/AAB otimizado, seguro e pronto para submissão na Google Play Store. Lembre-se de que a preparação adequada do arquivo de distribuição é fundamental para garantir uma experiência de usuário de qualidade e evitar rejeições durante o processo de revisão.

Recomendamos fortemente o uso do formato AAB para o aplicativo Acucaradas Encomendas, pois ele oferece vantagens significativas em termos de tamanho de download, atualizações e compatibilidade com diferentes dispositivos.

Não se esqueça de realizar testes completos antes da submissão final e manter um backup seguro da sua chave de assinatura para futuras atualizações.