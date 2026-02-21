/**
 * Script para corrigir o QR code do Expo detectando o IP local correto
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// Função para obter o endereço IP local
function obterIPLocal() {
  const interfaces = os.networkInterfaces();
  let ipAddress = '127.0.0.1';

  // Procurar por interfaces de rede válidas (não-loopback, IPv4)
  Object.keys(interfaces).forEach((ifname) => {
    interfaces[ifname].forEach((iface) => {
      if (!iface.internal && iface.family === 'IPv4') {
        console.log(`Interface de rede encontrada: ${ifname} - ${iface.address}`);
        ipAddress = iface.address;
      }
    });
  });

  return ipAddress;
}

// Obter o IP local
const ipLocal = obterIPLocal();
console.log(`\n🔍 IP local detectado: ${ipLocal}\n`);

// Atualizar o arquivo .env
function atualizarEnv() {
  const envPath = path.resolve(__dirname, '.env');
  
  if (!fs.existsSync(envPath)) {
    console.log('❌ Arquivo .env não encontrado. Criando um novo...');
    fs.writeFileSync(envPath, '', 'utf8');
  }

  let conteudo = fs.readFileSync(envPath, 'utf8');
  
  // Atualizar ou adicionar as variáveis de ambiente
  const variaveis = {
    'REACT_NATIVE_PACKAGER_HOSTNAME': ipLocal,
    'EXPO_DEVTOOLS_LISTEN_ADDRESS': ipLocal,
    'EXPO_USE_METRO_CACHE': 'true',
    'METRO_CACHE_RESET': 'false',
    'EXPO_TELEMETRY_DISABLED': '1',
    'REACT_NATIVE_TELEMETRY_DISABLED': '1',
    'NODE_ENV': 'development',
    'NODE_OPTIONS': '--max_old_space_size=6144',
    'METRO_MAX_WORKERS': '1'
  };

  let atualizadas = [];
  
  // Atualizar cada variável no arquivo .env
  Object.entries(variaveis).forEach(([chave, valor]) => {
    const regex = new RegExp(`^${chave}=.*$`, 'm');
    
    if (regex.test(conteudo)) {
      // Atualizar variável existente
      conteudo = conteudo.replace(regex, `${chave}=${valor}`);
      atualizadas.push(`${chave}=${valor}`);
    } else {
      // Adicionar nova variável
      conteudo += `\n${chave}=${valor}`;
      atualizadas.push(`${chave}=${valor}`);
    }
  });

  // Salvar as alterações
  fs.writeFileSync(envPath, conteudo, 'utf8');
  
  console.log('✅ Arquivo .env atualizado com as seguintes configurações:');
  atualizadas.forEach(v => console.log(`   ${v}`));
}

// Atualizar o script de inicialização
function atualizarScriptInicio() {
  const scriptPath = path.resolve(__dirname, 'iniciar-expo-otimizado-v2.bat');
  
  if (!fs.existsSync(scriptPath)) {
    console.log('❌ Script iniciar-expo-otimizado-v2.bat não encontrado.');
    return;
  }

  let conteudo = fs.readFileSync(scriptPath, 'utf8');
  
  // Atualizar as variáveis de ambiente no script
  const linhasAnteriores = [
    'set REACT_NATIVE_PACKAGER_HOSTNAME=127.0.0.1',
    'set EXPO_DEVTOOLS_LISTEN_ADDRESS=127.0.0.1'
  ];
  
  const linhasNovas = [
    `set REACT_NATIVE_PACKAGER_HOSTNAME=${ipLocal}`,
    `set EXPO_DEVTOOLS_LISTEN_ADDRESS=${ipLocal}`
  ];
  
  // Substituir as linhas
  linhasAnteriores.forEach((linha, index) => {
    conteudo = conteudo.replace(linha, linhasNovas[index]);
  });
  
  // Salvar as alterações
  fs.writeFileSync(scriptPath, conteudo, 'utf8');
  
  console.log('✅ Script iniciar-expo-otimizado-v2.bat atualizado com o IP correto.');
}

// Executar as atualizações
try {
  atualizarEnv();
  atualizarScriptInicio();
  
  console.log('\n✅ Configurações de IP atualizadas com sucesso!');
  console.log('\n🚀 Execute o script iniciar-expo-otimizado-v2.bat para iniciar o Expo com o IP correto.');
  console.log('\n📱 O QR code agora deve funcionar corretamente com o IP:', ipLocal);
} catch (erro) {
  console.error('\n❌ Erro ao atualizar as configurações:', erro.message);
}