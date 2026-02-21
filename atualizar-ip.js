/**
 * Script para atualizar o IP em todos os arquivos relevantes
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// IP antigo e novo IP
const IP_ANTIGO = '192.168.0.13';
const IP_NOVO = '177.192.13.46';

// Arquivos a serem verificados
const arquivos = [
  path.resolve(__dirname, 'app.json'),
  path.resolve(__dirname, 'metro.config.js'),
  path.resolve(__dirname, 'iniciar-expo-qrcode-fixo.bat'),
  path.resolve(__dirname, '.env'),
  path.resolve(__dirname, '.env.local'),
  path.resolve(__dirname, '.env.production')
];

console.log(`🔧 Atualizando IP de ${IP_ANTIGO} para ${IP_NOVO}...\n`);

// Função para atualizar o IP em um arquivo
function atualizarIP(arquivo) {
  if (!fs.existsSync(arquivo)) {
    console.log(`❌ Arquivo não encontrado: ${arquivo}`);
    return false;
  }

  try {
    let conteudo = fs.readFileSync(arquivo, 'utf8');
    const conteudoOriginal = conteudo;
    
    // Substituir todas as ocorrências do IP antigo pelo novo
    conteudo = conteudo.replace(new RegExp(IP_ANTIGO, 'g'), IP_NOVO);
    
    // Verificar se houve alterações
    if (conteudo !== conteudoOriginal) {
      fs.writeFileSync(arquivo, conteudo, 'utf8');
      console.log(`✅ IP atualizado em: ${arquivo}`);
      return true;
    } else {
      console.log(`ℹ️ Nenhuma alteração necessária em: ${arquivo}`);
      return false;
    }
  } catch (erro) {
    console.error(`❌ Erro ao processar ${arquivo}:`, erro.message);
    return false;
  }
}

// Atualizar o IP em todos os arquivos
let arquivosAtualizados = 0;
arquivos.forEach(arquivo => {
  if (atualizarIP(arquivo)) {
    arquivosAtualizados++;
  }
});

// Atualizar o app.json manualmente
const appJsonPath = path.resolve(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  try {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    if (appJson.expo && appJson.expo.extra && appJson.expo.extra.hostUri) {
      const hostUriAntigo = appJson.expo.extra.hostUri;
      appJson.expo.extra.hostUri = hostUriAntigo.replace(IP_ANTIGO, IP_NOVO);
      fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2), 'utf8');
      console.log(`✅ hostUri atualizado em app.json: ${appJson.expo.extra.hostUri}`);
      arquivosAtualizados++;
    }
  } catch (erro) {
    console.error(`❌ Erro ao processar app.json:`, erro.message);
  }
}

console.log(`\n✅ Processo concluído com ${arquivosAtualizados} arquivo(s) atualizado(s).`);
console.log('\nPróximos passos:');
console.log('1. Execute: npx expo start --clear');
console.log('2. Acesse o aplicativo em: http://177.192.13.46:8081');