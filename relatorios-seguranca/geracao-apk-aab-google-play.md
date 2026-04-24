# Guia para Geração de APK/AAB para Google Play Store

## Introdução

Este documento fornece instruções detalhadas para a geração de um arquivo APK (Android Package) ou AAB (Android App Bundle) otimizado e assinado para submissão na Google Play Store. O Android App Bundle (AAB) é o formato recomendado pela Google, pois permite otimizações de tamanho e entrega específica por dispositivo.

## Pré-requisitos

Antes de iniciar o processo de geração do APK/AAB, certifique-se de que:

1. O código do aplicativo está finalizado e testado
2. Todas as dependências estão atualizadas e compatíveis
3. O arquivo `AndroidManifest.xml` está configurado corretamente
4. O versionamento está atualizado no `build.gradle`
5. Os recursos gráficos estão otimizados
6. As permissões necessárias estão declaradas e justificadas

## Configuração de Versão

No arquivo `android/app/build.gradle`, verifique e atualize as seguintes configurações:

```gradle
defaultConfig {
    applicationId "com.acucaradas.encomendas"  // Não altere após a primeira publicação
    minSdkVersion 21                           // Versão mínima do Android suportada
    targetSdkVersion 33                        // Versão alvo do Android
    versionCode 1                              // Incrementar a cada nova versão
    versionName "1.0.0"                        // Versão semântica visível ao usuário
}
```

### Regras de Versionamento

- **versionCode**: Número inteiro que deve ser incrementado a cada nova versão enviada à Play Store
- **versionName**: String que segue o padrão semântico (MAJOR.MINOR.PATCH)

## Criação da Chave de Assinatura

Para publicar na Google Play Store, seu aplicativo deve ser assinado com uma chave privada. Esta chave é crucial e deve ser mantida em segurança, pois todas as atualizações futuras precisarão ser assinadas com a mesma chave.

### Usando o Android Studio

1. No menu, selecione **Build > Generate Signed Bundle/APK**
2. Selecione **Android App Bundle** ou **APK**
3. Clique em **Create new...**
4. Preencha o formulário:
   - **Key store path**: Local onde o arquivo keystore será salvo
   - **Password**: Senha forte para o keystore
   - **Alias**: Nome para identificar a chave (ex: "acucaradas")
   - **Password**: Senha para a chave (pode ser a mesma do keystore)
   - **Validity**: 25+ anos recomendado (ex: 9000 dias)
   - **Certificate**: Suas informações (Nome, Organização, etc.)
5. Clique em **OK**

### Usando a Linha de Comando

Alternativamente, você pode criar a chave usando o keytool:

```bash
keytool -genkey -v -keystore acucaradas-key.keystore -alias acucaradas -keyalg RSA -keysize 2048 -validity 9000
```

### Armazenamento Seguro da Chave

**IMPORTANTE**: Guarde o arquivo keystore e suas senhas em local seguro. Recomendações:

1. Faça backup do arquivo keystore em múltiplos locais seguros
2. Documente as senhas em um gerenciador de senhas
3. Considere um cofre digital para empresas
4. Nunca inclua o keystore no controle de versão (adicione ao .gitignore)

## Configuração do Gradle para Assinatura

Para automatizar o processo de assinatura, configure o arquivo `android/app/build.gradle`:

```gradle
android {
    // ... outras configurações
    
    signingConfigs {
        release {
            storeFile file("caminho/para/acucaradas-key.keystore")
            storePassword "sua-senha-do-keystore"
            keyAlias "acucaradas"
            keyPassword "sua-senha-da-chave"
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

**Nota de Segurança**: Para evitar expor senhas no código, considere usar variáveis de ambiente ou o arquivo `gradle.properties` (local ou global) com as seguintes configurações:

```properties
ACUCARADAS_STORE_FILE=caminho/para/acucaradas-key.keystore
ACUCARADAS_STORE_PASSWORD=sua-senha-do-keystore
ACUCARADAS_KEY_ALIAS=acucaradas
ACUCARADAS_KEY_PASSWORD=sua-senha-da-chave
```

E no `build.gradle`:

```gradle
signingConfigs {
    release {
        storeFile file(ACUCARADAS_STORE_FILE)
        storePassword ACUCARADAS_STORE_PASSWORD
        keyAlias ACUCARADAS_KEY_ALIAS
        keyPassword ACUCARADAS_KEY_PASSWORD
    }
}
```

## Otimização do APK/AAB

Para reduzir o tamanho do aplicativo e melhorar o desempenho:

### 1. Habilitar R8/ProGuard

O R8 (substituto do ProGuard) está habilitado por padrão quando `minifyEnabled` é `true`. Crie ou atualize o arquivo `android/app/proguard-rules.pro` com regras específicas para suas bibliotecas:

```proguard
# Regras gerais
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
-keepattributes Signature
-keepattributes Exceptions

# Regras para React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

# Adicione regras específicas para outras bibliotecas que você usa
# ...
```

### 2. Otimização de Recursos

Habilite a compressão de recursos com `shrinkResources true` no `build.gradle`.

### 3. Divisão de APKs por ABI

Para reduzir o tamanho do download para cada dispositivo, configure a divisão por arquitetura:

```gradle
android {
    // ... outras configurações
    
    splits {
        abi {
            enable true
            reset()
            include 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
            universalApk false
        }
    }
}
```

**Nota**: Esta configuração só é necessária para APKs. O formato AAB já inclui esta otimização automaticamente.

## Geração do APK/AAB

### Usando o Android Studio

1. No menu, selecione **Build > Generate Signed Bundle/APK**
2. Selecione **Android App Bundle** ou **APK**
3. Selecione o keystore existente e preencha as senhas
4. Selecione a variante **release**
5. Clique em **Finish**

### Usando a Linha de Comando

Para gerar um AAB (recomendado):

```bash
# Na pasta raiz do projeto React Native
cd android
./gradlew bundleRelease
```

Para gerar um APK:

```bash
# Na pasta raiz do projeto React Native
cd android
./gradlew assembleRelease
```

## Localização dos Arquivos Gerados

- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`
- **APK**: `android/app/build/outputs/apk/release/app-release.apk`

## Testes Pré-Submissão

Antes de enviar para a Google Play Store, é essencial testar o build de produção:

### 1. Teste de Instalação

Instale o APK em dispositivos físicos para verificar se a instalação funciona corretamente:

```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

### 2. Teste de Funcionalidades

Verifique todas as funcionalidades principais do aplicativo no build de produção, incluindo:

- Login/autenticação
- Navegação entre telas
- Operações de CRUD
- Integrações com APIs
- Notificações push
- Compartilhamento de conteúdo

### 3. Teste de Desempenho

- Verifique o tempo de inicialização
- Teste a responsividade da interface
- Monitore o uso de memória e CPU
- Verifique o comportamento em condições de rede limitada

### 4. Teste de Compatibilidade

Teste em diferentes:
- Versões do Android (especialmente a versão mínima suportada)
- Tamanhos de tela
- Densidades de pixel
- Orientações (retrato/paisagem, se aplicável)

## Validação do APK/AAB

Use a ferramenta de validação da Google para verificar problemas antes da submissão:

1. Acesse o [Play Console](https://play.google.com/console/)
2. Vá para a seção de testes internos ou produção
3. Faça upload do APK/AAB
4. Verifique os avisos e erros reportados

Alternativamente, use a ferramenta `bundletool` para validar localmente:

```bash
java -jar bundletool.jar validate --bundle=app-release.aab
```

## Solução de Problemas Comuns

### Erro de Assinatura

**Problema**: "APK signature verification failed"

**Solução**: Verifique se está usando a chave correta e se as configurações de assinatura estão corretas no `build.gradle`.

### Conflitos de Versão

**Problema**: "Version code X has already been used"

**Solução**: Incremente o `versionCode` no `build.gradle`.

### Problemas com ProGuard/R8

**Problema**: Crashes após a minificação

**Solução**: Adicione regras específicas no `proguard-rules.pro` para preservar classes necessárias.

### Tamanho do APK Muito Grande

**Problema**: APK excede limites recomendados

**Solução**:
- Use o formato AAB em vez de APK
- Otimize imagens e recursos
- Remova bibliotecas não utilizadas
- Considere divisão de recursos por idioma/densidade

## Conclusão

Seguindo este guia, você estará preparado para gerar um APK/AAB otimizado e assinado para submissão na Google Play Store. Lembre-se de manter sua chave de assinatura em segurança, pois ela será necessária para todas as atualizações futuras do aplicativo.

Recomendamos fortemente o uso do formato AAB para novas submissões, pois ele oferece vantagens significativas em termos de tamanho de download e otimização específica por dispositivo.