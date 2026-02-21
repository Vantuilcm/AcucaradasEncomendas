// jsxRuntime.fix.js
// Este script corrige o erro: TypeError: (0 , _jsxDevRuntime.jsxDEV) is not a function

const fs = require('fs');
const path = require('path');

// Função para encontrar o arquivo de configuração do babel
function findBabelConfig() {
  const possiblePaths = [
    path.resolve(process.cwd(), 'babel.config.js'),
    path.resolve(process.cwd(), '.babelrc'),
    path.resolve(process.cwd(), '.babelrc.js')
  ];

  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      console.log(`✅ Encontrado arquivo de configuração Babel: ${configPath}`);
      return configPath;
    }
  }

  console.error('❌ Não foi possível encontrar um arquivo de configuração do Babel');
  return null;
}

// Função para atualizar a configuração do babel
function updateBabelConfig(configPath) {
  if (!configPath) return false;

  try {
    let content = fs.readFileSync(configPath, 'utf8');
    
    // Verificar se já tem a configuração de runtime
    if (content.includes('runtime: "automatic"')) {
      console.log('✅ Configuração de JSX runtime já está presente');
      return true;
    }

    // Adicionar configuração de JSX runtime
    if (configPath.endsWith('.js')) {
      // Para babel.config.js ou .babelrc.js
      if (content.includes('presets: [')) {
        content = content.replace(
          'presets: [',
          'presets: [\n    ["@babel/preset-react", {"runtime": "automatic"}],'        
        );
      } else {
        console.error('❌ Não foi possível encontrar a seção de presets no arquivo');
        return false;
      }
    } else {
      // Para .babelrc (formato JSON)
      try {
        const config = JSON.parse(content);
        if (!config.presets) config.presets = [];
        config.presets.unshift(["@babel/preset-react", {"runtime": "automatic"}]);
        content = JSON.stringify(config, null, 2);
      } catch (e) {
        console.error('❌ Erro ao analisar o arquivo .babelrc:', e);
        return false;
      }
    }

    // Salvar as alterações
    fs.writeFileSync(configPath, content, 'utf8');
    console.log(`✅ Configuração de JSX runtime adicionada em ${configPath}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao atualizar a configuração do Babel:', error);
    return false;
  }
}

// Função para instalar dependências necessárias
async function installDependencies() {
  console.log('📦 Instalando dependências necessárias...');
  const { execSync } = require('child_process');
  
  try {
    execSync('npm install --save-dev @babel/preset-react', { stdio: 'inherit' });
    console.log('✅ @babel/preset-react instalado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro ao instalar dependências:', error);
    return false;
  }
}

// Função para limpar o cache
function clearCache() {
  console.log('🧹 Limpando caches...');
  const cacheDirs = [
    path.resolve(process.cwd(), 'node_modules/.cache'),
    path.resolve(process.cwd(), '.expo')
  ];

  for (const dir of cacheDirs) {
    if (fs.existsSync(dir)) {
      try {
        if (process.platform === 'win32') {
          // No Windows, usamos o comando rd
          const { execSync } = require('child_process');
          execSync(`rd /s /q "${dir}"`, { stdio: 'inherit' });
        } else {
          // Em outros sistemas, usamos rm -rf
          const { execSync } = require('child_process');
          execSync(`rm -rf "${dir}"`, { stdio: 'inherit' });
        }
        console.log(`✅ Cache limpo: ${dir}`);
      } catch (error) {
        console.error(`❌ Erro ao limpar cache ${dir}:`, error);
      }
    }
  }
}

// Função principal
async function fixJsxRuntime() {
  console.log('🔧 Iniciando correção do JSX Runtime...');
  
  // 1. Encontrar e atualizar a configuração do babel
  const babelConfigPath = findBabelConfig();
  const configUpdated = updateBabelConfig(babelConfigPath);
  
  if (!configUpdated) {
    console.error('❌ Não foi possível atualizar a configuração do Babel');
    return false;
  }
  
  // 2. Instalar dependências necessárias
  const depsInstalled = await installDependencies();
  
  if (!depsInstalled) {
    console.error('❌ Não foi possível instalar as dependências necessárias');
    return false;
  }
  
  // 3. Limpar cache
  clearCache();
  
  console.log('✅ Correção do JSX Runtime concluída com sucesso!');
  console.log('🚀 Agora você pode iniciar o aplicativo novamente com:');
  console.log('   npx expo start --web --port 8082 --clear');
  
  return true;
}

// Executar a função principal
fixJsxRuntime().catch(error => {
  console.error('❌ Erro durante a correção do JSX Runtime:', error);
});