# Configuração de Permissões para Reconhecimento de Voz

## Configurações para Android

Adicione a permissão no arquivo `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
```

## Configurações para iOS

Adicione as seguintes chaves no arquivo `ios/AcucaradasEncomendas/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Precisamos do microfone para o reconhecimento de voz durante as buscas</string>
<key>NSSpeechRecognitionUsageDescription</key>
<string>Precisamos do reconhecimento de fala para permitir buscas por voz</string>
```

## Configurações para Expo

Para projetos Expo, atualize o arquivo `app.json`:

```json
{
  "expo": {
    ...
    "ios": {
      ...
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Precisamos do microfone para o reconhecimento de voz durante as buscas",
        "NSSpeechRecognitionUsageDescription": "Precisamos do reconhecimento de fala para permitir buscas por voz"
      }
    },
    "android": {
      ...
      "permissions": [
        "android.permission.RECORD_AUDIO"
      ]
    },
    "plugins": [
      "@react-native-voice/voice"
    ]
  }
}
```
