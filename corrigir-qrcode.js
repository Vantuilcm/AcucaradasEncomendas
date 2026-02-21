const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Iniciando correção do QR Code do Expo...');

// Função para verificar se um arquivo existe
function verificarArquivo(caminho) {
  return fs.existsSync(caminho);
}

// Função para obter o endereço IP local
function obterEnderecoIP() {
  try {
    // Obter o endereço IP usando o comando ipconfig
    const output = execSync('ipconfig').toString();
    
    // Procurar por endereços IPv4
    const matches = output.match(/IPv4[.\s\S]*?:[.\s\S]*?(\d+\.\d+\.\d+\.\d+)/g);
    
    if (matches && matches.length > 0) {
      // Extrair o primeiro endereço IP que não seja 127.0.0.1
      for (const match of matches) {
        const ip = match.match(/(\d+\.\d+\.\d+\.\d+)/)[1];
        if (ip && ip !== '127.0.0.1') {
          console.log(`✅ Endereço IP local encontrado: ${ip}`);
          return ip;
        }
      }
    }
    
    console.log('⚠️ Não foi possível encontrar um endereço IP válido. Usando 127.0.0.1');
    return '127.0.0.1';
  } catch (error) {
    console.error(`❌ Erro ao obter endereço IP: ${error.message}`);
    console.log('⚠️ Usando endereço IP padrão: 127.0.0.1');
    return '127.0.0.1';
  }
}

// Função para criar ou atualizar o arquivo .env
function configurarEnv(ip) {
  console.log('Configurando variáveis de ambiente...');
  
  const envPath = path.join(process.cwd(), '.env');
  let envContent = '';
  
  // Ler o conteúdo existente do .env, se houver
  if (verificarArquivo(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }
  
  // Verificar se já tem EXPO_DEVTOOLS_LISTEN_ADDRESS
  if (!envContent.includes('EXPO_DEVTOOLS_LISTEN_ADDRESS')) {
    console.log(`Adicionando EXPO_DEVTOOLS_LISTEN_ADDRESS=${ip}`);
    envContent += `\n# Configuração do endereço IP para o Expo\nEXPO_DEVTOOLS_LISTEN_ADDRESS=${ip}\n`;
  } else {
    // Atualizar o endereço IP existente
    const regex = /EXPO_DEVTOOLS_LISTEN_ADDRESS=([^\n]*)/;
    envContent = envContent.replace(regex, `EXPO_DEVTOOLS_LISTEN_ADDRESS=${ip}`);
    console.log(`✅ Atualizado EXPO_DEVTOOLS_LISTEN_ADDRESS para ${ip}`);
  }
  
  // Verificar se já tem REACT_NATIVE_PACKAGER_HOSTNAME
  if (!envContent.includes('REACT_NATIVE_PACKAGER_HOSTNAME')) {
    console.log(`Adicionando REACT_NATIVE_PACKAGER_HOSTNAME=${ip}`);
    envContent += `\n# Configuração do hostname do packager\nREACT_NATIVE_PACKAGER_HOSTNAME=${ip}\n`;
  } else {
    // Atualizar o hostname existente
    const regex = /REACT_NATIVE_PACKAGER_HOSTNAME=([^\n]*)/;
    envContent = envContent.replace(regex, `REACT_NATIVE_PACKAGER_HOSTNAME=${ip}`);
    console.log(`✅ Atualizado REACT_NATIVE_PACKAGER_HOSTNAME para ${ip}`);
  }
  
  // Salvar o arquivo .env
  fs.writeFileSync(envPath, envContent, 'utf8');
  console.log('✅ Arquivo .env atualizado com sucesso!');
}

// Função para criar arquivo app.json se não existir
function verificarAppJson(ip) {
  console.log('Verificando app.json...');
  
  const appJsonPath = path.join(process.cwd(), 'app.json');
  
  if (!verificarArquivo(appJsonPath)) {
    console.log('❌ Arquivo app.json não encontrado. Criando um básico...');
    
    const appJsonBasico = {
      expo: {
        name: "Acucaradas Encomendas",
        slug: "acucaradas-encomendas",
        version: "1.0.0",
        orientation: "portrait",
        icon: "./assets/icon.png",
        userInterfaceStyle: "light",
        splash: {
          image: "./assets/splash.png",
          resizeMode: "contain",
          backgroundColor: "#ffffff"
        },
        assetBundlePatterns: [
          "**/*"
        ],
        ios: {
          supportsTablet: true
        },
        android: {
          adaptiveIcon: {
            foregroundImage: "./assets/adaptive-icon.png",
            backgroundColor: "#ffffff"
          }
        },
        web: {
          favicon: "./assets/favicon.png"
        },
        extra: {
          eas: {
            projectId: "acucaradas-encomendas"
          }
        },
        owner: "acucaradas"
      }
    };
    
    fs.writeFileSync(appJsonPath, JSON.stringify(appJsonBasico, null, 2), 'utf8');
    console.log('✅ Arquivo app.json criado com sucesso!');
    return;
  }
  
  try {
    // Ler o arquivo app.json existente
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    
    // Verificar se tem a seção expo
    if (!appJson.expo) {
      appJson.expo = {};
    }
    
    // Verificar se tem a seção extra
    if (!appJson.expo.extra) {
      appJson.expo.extra = {};
    }
    
    // Adicionar ou atualizar a configuração de hostUri
    appJson.expo.extra.hostUri = `${ip}:8081`;
    
    // Salvar o arquivo app.json atualizado
    fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
    console.log(`✅ Arquivo app.json atualizado com hostUri: ${ip}:8081`);
  } catch (error) {
    console.error(`❌ Erro ao processar app.json: ${error.message}`);
  }
}

// Função para limpar o cache do Expo
function limparCacheExpo() {
  console.log('Limpando cache do Expo...');
  
  const expoDir = path.join(process.cwd(), '.expo');
  if (fs.existsSync(expoDir)) {
    try {
      fs.rmSync(expoDir, { recursive: true, force: true });
      console.log('✅ Cache do Expo removido com sucesso!');
    } catch (error) {
      console.error(`❌ Erro ao remover cache do Expo: ${error.message}`);
    }
  } else {
    console.log('⚠️ Diretório .expo não encontrado. Nada para limpar.');
  }
}

// Função principal
function main() {
  console.log('Iniciando correção do QR Code do Expo...');
  
  // Obter o endereço IP local
  const ip = obterEnderecoIP();
  
  // Configurar o arquivo .env
  configurarEnv(ip);
  
  // Verificar e atualizar o app.json
  verificarAppJson(ip);
  
  // Limpar o cache do Expo
  limparCacheExpo();
  
  console.log('\n✅ Correção do QR Code concluída!');
  console.log('\nPróximos passos:');
  console.log('1. Pare o servidor Expo atual (Ctrl+C)');
  console.log('2. Execute: .\\iniciar-expo-otimizado.bat');
  console.log('3. Escaneie o novo QR code gerado');
  console.log(`4. Ou acesse manualmente: exp://${ip}:8081 no Expo Go`);
}

// Executar função principal
main();