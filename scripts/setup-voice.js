/**
 * Script para configurar a biblioteca @react-native-voice/voice
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎤 Iniciando setup da biblioteca de reconhecimento de voz...');

// Função para executar comandos com tratamento de erros
function execCommand(command) {
  try {
    console.log(`Executando: ${command}`);
    execSync(command, { stdio: 'inherit' });
    return true;
  } catch (error) {
    console.error(`Erro ao executar: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Instalar a biblioteca
console.log('📦 Instalando @react-native-voice/voice...');
if (!execCommand('npm install @react-native-voice/voice --save --legacy-peer-deps')) {
  console.log('⚠️ Tentando instalação alternativa...');
  execCommand('npm install @react-native-voice/voice --save --force');
}

// Verificar plataformas
console.log('🔍 Verificando plataformas suportadas...');

// Configuração para Android
const androidManifestPath = path.join(
  __dirname,
  '..',
  'android',
  'app',
  'src',
  'main',
  'AndroidManifest.xml'
);
if (fs.existsSync(path.dirname(androidManifestPath))) {
  console.log('🤖 Configurando Android...');

  if (fs.existsSync(androidManifestPath)) {
    let androidManifest = fs.readFileSync(androidManifestPath, 'utf8');
    if (!androidManifest.includes('android.permission.RECORD_AUDIO')) {
      // Adicionar permissão antes da tag </manifest>
      androidManifest = androidManifest.replace(
        '</manifest>',
        '    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n</manifest>'
      );
      fs.writeFileSync(androidManifestPath, androidManifest);
      console.log('✅ Permissão de áudio adicionada ao AndroidManifest.xml');
    } else {
      console.log('✅ Permissão de áudio já existe no AndroidManifest.xml');
    }
  } else {
    console.log(
      '⚠️ AndroidManifest.xml não encontrado. Certifique-se de adicionar a permissão manualmente:'
    );
    console.log('<uses-permission android:name="android.permission.RECORD_AUDIO" />');
  }
}

// Configuração para iOS
const iosInfoPlistPath = path.join(__dirname, '..', 'ios', 'AcucaradasEncomendas', 'Info.plist');
if (fs.existsSync(path.dirname(iosInfoPlistPath))) {
  console.log('🍎 Configurando iOS...');

  if (fs.existsSync(iosInfoPlistPath)) {
    let iosInfoPlist = fs.readFileSync(iosInfoPlistPath, 'utf8');
    let modified = false;

    // Adicionar NSMicrophoneUsageDescription se não existir
    if (!iosInfoPlist.includes('NSMicrophoneUsageDescription')) {
      iosInfoPlist = iosInfoPlist.replace(
        '</dict>',
        '	<key>NSMicrophoneUsageDescription</key>\n	<string>Precisamos do microfone para o reconhecimento de voz durante as buscas</string>\n</dict>'
      );
      modified = true;
    }

    // Adicionar NSSpeechRecognitionUsageDescription se não existir
    if (!iosInfoPlist.includes('NSSpeechRecognitionUsageDescription')) {
      iosInfoPlist = iosInfoPlist.replace(
        '</dict>',
        '	<key>NSSpeechRecognitionUsageDescription</key>\n	<string>Precisamos do reconhecimento de fala para permitir buscas por voz</string>\n</dict>'
      );
      modified = true;
    }

    if (modified) {
      fs.writeFileSync(iosInfoPlistPath, iosInfoPlist);
      console.log('✅ Permissões adicionadas ao Info.plist');
    } else {
      console.log('✅ Permissões já existem no Info.plist');
    }
  } else {
    console.log(
      '⚠️ Info.plist não encontrado. Certifique-se de adicionar as permissões manualmente:'
    );
    console.log('<key>NSMicrophoneUsageDescription</key>');
    console.log(
      '<string>Precisamos do microfone para o reconhecimento de voz durante as buscas</string>'
    );
    console.log('<key>NSSpeechRecognitionUsageDescription</key>');
    console.log(
      '<string>Precisamos do reconhecimento de fala para permitir buscas por voz</string>'
    );
  }
}

// Para o Expo, adicionar permissões ao app.json
const appJsonPath = path.join(__dirname, '..', 'app.json');
if (fs.existsSync(appJsonPath)) {
  console.log('📱 Configurando permissões no Expo...');

  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

    if (!appJson.expo) {
      appJson.expo = {};
    }

    if (!appJson.expo.plugins) {
      appJson.expo.plugins = [];
    }

    // Verificar se já existe configuração para permissões
    let hasVoicePlugin = false;
    for (const plugin of appJson.expo.plugins) {
      if (
        (typeof plugin === 'object' && plugin.name === '@react-native-voice/voice') ||
        plugin === '@react-native-voice/voice'
      ) {
        hasVoicePlugin = true;
        break;
      }
    }

    if (!hasVoicePlugin) {
      appJson.expo.plugins.push('@react-native-voice/voice');
    }

    // Verificar permissões
    if (!appJson.expo.android) {
      appJson.expo.android = {};
    }

    if (!appJson.expo.android.permissions) {
      appJson.expo.android.permissions = [];
    }

    if (!appJson.expo.android.permissions.includes('android.permission.RECORD_AUDIO')) {
      appJson.expo.android.permissions.push('android.permission.RECORD_AUDIO');
    }

    if (!appJson.expo.ios) {
      appJson.expo.ios = {};
    }

    if (!appJson.expo.ios.infoPlist) {
      appJson.expo.ios.infoPlist = {};
    }

    appJson.expo.ios.infoPlist.NSMicrophoneUsageDescription =
      'Precisamos do microfone para o reconhecimento de voz durante as buscas';
    appJson.expo.ios.infoPlist.NSSpeechRecognitionUsageDescription =
      'Precisamos do reconhecimento de fala para permitir buscas por voz';

    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));
    console.log('✅ Permissões configuradas no app.json');
  } catch (error) {
    console.error('⚠️ Erro ao modificar app.json:', error.message);
    console.log('Por favor, adicione as permissões manualmente.');
  }
}

console.log('\n🎉 Setup concluído!');
console.log('\nPróximos passos:');
console.log('1. Execute "npx expo prebuild" para regenerar os projetos nativos');
console.log(
  '2. Ou execute "npx expo run:android" ou "npx expo run:ios" para executar em um dispositivo'
);
console.log('\n⚠️ Se tiver problemas, verifique a documentação:');
console.log('https://github.com/react-native-voice/voice#readme');
