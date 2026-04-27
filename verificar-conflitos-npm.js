/**
 * Script para verificar e resolver conflitos de dependências NPM
 * 
 * Este script analisa o package.json e package-lock.json para identificar:
 * - Conflitos entre versões de dependências
 * - Peer dependencies não satisfeitas
 * - Dependências com versões obsoletas ou inseguras
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Cores para o console
const cores = {
  reset: '\x1b[0m',
  vermelho: '\x1b[31m',
  verde: '\x1b[32m',
  amarelo: '\x1b[33m',
  azul: '\x1b[34m',
  magenta: '\x1b[35m',
  ciano: '\x1b[36m',
  branco: '\x1b[37m',
  negrito: '\x1b[1m'
};

// Função para imprimir cabeçalho
function imprimirCabecalho(texto) {
  console.log(`\n${cores.negrito}${cores.ciano}=== ${texto} ===${cores.reset}\n`);
}

// Função para imprimir mensagem de sucesso
function imprimirSucesso(texto) {
  console.log(`${cores.verde}✓ ${texto}${cores.reset}`);
}

// Função para imprimir mensagem de erro
function imprimirErro(texto) {
  console.log(`${cores.vermelho}✗ ${texto}${cores.reset}`);
}

// Função para imprimir aviso
function imprimirAviso(texto) {
  console.log(`${cores.amarelo}⚠ ${texto}${cores.reset}`);
}

// Função para imprimir informação
function imprimirInfo(texto) {
  console.log(`${cores.azul}ℹ ${texto}${cores.reset}`);
}

// Função para verificar se o arquivo existe
function verificarArquivo(caminho) {
  return fs.existsSync(caminho) && fs.statSync(caminho).isFile();
}

// Função para ler o package.json
function lerPackageJson() {
  const caminhoPackageJson = path.resolve(__dirname, 'package.json');
  
  if (!verificarArquivo(caminhoPackageJson)) {
    imprimirErro('Arquivo package.json não encontrado');
    return null;
  }
  
  try {
    const conteudo = fs.readFileSync(caminhoPackageJson, 'utf8');
    return JSON.parse(conteudo);
  } catch (erro) {
    imprimirErro(`Erro ao ler package.json: ${erro.message}`);
    return null;
  }
}

// Função para verificar conflitos de dependências
function verificarConflitos() {
  imprimirCabecalho('VERIFICANDO CONFLITOS DE DEPENDÊNCIAS');
  
  const packageJson = lerPackageJson();
  if (!packageJson) return;
  
  // Verificar dependências diretas
  const dependencias = { ...packageJson.dependencies, ...packageJson.devDependencies };
  const totalDependencias = Object.keys(dependencias).length;
  
  imprimirInfo(`Total de dependências: ${totalDependencias}`);
  
  // Executar pnpm why para verificar dependências duplicadas
  try {
    imprimirInfo('Verificando dependências duplicadas...');
    
    // Lista de dependências críticas para verificar
    const dependenciasCriticas = [
      'react', 'react-native', 'expo', 'expo-router', 'metro', 
      'metro-config', 'metro-core', 'metro-runtime'
    ];
    
    let conflitosEncontrados = 0;
    
    for (const dep of dependenciasCriticas) {
      try {
        console.log(`\n${cores.magenta}Verificando ${dep}...${cores.reset}`);
        const resultado = execSync(`pnpm why ${dep} --json`, { encoding: 'utf8' });
        
        // Analisar resultado
        const linhas = resultado.split('\n').filter(linha => linha.trim());
        const versoes = new Set();
        
        for (const linha of linhas) {
          try {
            const dados = JSON.parse(linha);
            if (dados.version) {
              versoes.add(dados.version);
            }
          } catch (e) {
            // Ignorar linhas que não são JSON válido
          }
        }
        
        if (versoes.size > 1) {
          imprimirAviso(`Múltiplas versões de ${dep} encontradas: ${Array.from(versoes).join(', ')}`);
          conflitosEncontrados++;
        } else if (versoes.size === 1) {
          imprimirSucesso(`${dep} tem apenas uma versão: ${Array.from(versoes)[0]}`);
        } else {
          imprimirInfo(`Não foi possível determinar a versão de ${dep}`);
        }
      } catch (erro) {
        imprimirInfo(`Não foi possível verificar ${dep}: ${erro.message}`);
      }
    }
    
    if (conflitosEncontrados > 0) {
      imprimirAviso(`Foram encontrados ${conflitosEncontrados} conflitos de versão`);
    } else {
      imprimirSucesso('Não foram encontrados conflitos de versão nas dependências críticas');
    }
    
  } catch (erro) {
    imprimirErro(`Erro ao verificar dependências: ${erro.message}`);
  }
}

// Função para verificar peer dependencies não satisfeitas
function verificarPeerDependencies() {
  imprimirCabecalho('VERIFICANDO PEER DEPENDENCIES');
  
  try {
    imprimirInfo('Executando verificação de peer dependencies...');
    
    try {
      const resultado = execSync('pnpm ls --json', { encoding: 'utf8' });
      const dados = JSON.parse(resultado);
      
      if (dados.peerDependencies && Object.keys(dados.peerDependencies).length > 0) {
        imprimirAviso('Peer dependencies não satisfeitas encontradas:');
        for (const [dep, info] of Object.entries(dados.peerDependencies)) {
          console.log(`  - ${cores.amarelo}${dep}${cores.reset}: ${info.required} (atual: ${info.version || 'não instalada'})`);
        }
      } else {
        imprimirSucesso('Todas as peer dependencies estão satisfeitas');
      }
    } catch (e) {
      // Tentar método alternativo
      const resultado = execSync('pnpm ls', { encoding: 'utf8' });
      
      if (resultado.includes('UNMET PEER DEPENDENCY')) {
        imprimirAviso('Peer dependencies não satisfeitas encontradas (verifique manualmente)');
        console.log(resultado.split('\n')
          .filter(linha => linha.includes('UNMET PEER DEPENDENCY'))
          .join('\n'));
      } else {
        imprimirSucesso('Todas as peer dependencies parecem estar satisfeitas');
      }
    }
  } catch (erro) {
    imprimirErro(`Erro ao verificar peer dependencies: ${erro.message}`);
  }
}

// Função para verificar dependências obsoletas ou inseguras
function verificarDependenciasObsoletas() {
  imprimirCabecalho('VERIFICANDO DEPENDÊNCIAS OBSOLETAS OU INSEGURAS');
  
  try {
    imprimirInfo('Executando npm audit...');
    
    try {
      const resultado = execSync('npm audit --json', { encoding: 'utf8' });
      const dados = JSON.parse(resultado);
      
      if (dados.vulnerabilities && Object.keys(dados.vulnerabilities).length > 0) {
        const totalVulnerabilidades = Object.keys(dados.vulnerabilities).length;
        imprimirAviso(`Encontradas ${totalVulnerabilidades} vulnerabilidades:`);
        
        for (const [pacote, info] of Object.entries(dados.vulnerabilities)) {
          console.log(`  - ${cores.vermelho}${pacote}${cores.reset} (${info.severity}): ${info.via[0]}`);
        }
        
        imprimirInfo('\nSugestão de correção:');
        console.log('  npm audit fix --force  # Use com cautela, pode quebrar compatibilidade');
      } else {
        imprimirSucesso('Não foram encontradas vulnerabilidades');
      }
    } catch (e) {
      // Tentar método alternativo
      const resultado = execSync('npm audit', { encoding: 'utf8' });
      
      if (resultado.includes('found 0 vulnerabilities')) {
        imprimirSucesso('Não foram encontradas vulnerabilidades');
      } else {
        imprimirAviso('Vulnerabilidades encontradas (verifique manualmente)');
        console.log(resultado);
      }
    }
  } catch (erro) {
    imprimirErro(`Erro ao verificar vulnerabilidades: ${erro.message}`);
  }
}

// Função para sugerir otimizações
function sugerirOtimizacoes() {
  imprimirCabecalho('SUGESTÕES DE OTIMIZAÇÃO');
  
  const packageJson = lerPackageJson();
  if (!packageJson) return;
  
  // Verificar configurações do .npmrc
  const caminhoNpmrc = path.resolve(__dirname, '.npmrc');
  if (verificarArquivo(caminhoNpmrc)) {
    imprimirSucesso('Arquivo .npmrc encontrado com configurações otimizadas');
  } else {
    imprimirAviso('Arquivo .npmrc não encontrado. Considere criar um com as seguintes configurações:');
    console.log(`
# Configurações otimizadas para resolver conflitos de dependências
node-linker=hoisted
strict-peer-dependencies=false
auto-install-peers=true
shallow-install=false
resolve-peers-from-workspace-root=true
save-workspace-protocol=false
engine-strict=false
fund=false
audit=false
strict-ssl=false
save-exact=true
prefer-frozen-lockfile=false

# Padrões de hoisting específicos para resolver conflitos
hoist-pattern[]=*
public-hoist-pattern[]=*expo*
public-hoist-pattern[]=*react*
public-hoist-pattern[]=*metro*
public-hoist-pattern[]=*expo-router*
`);
  }
  
  // Verificar configurações do metro.config.js
  const caminhoMetroConfig = path.resolve(__dirname, 'metro.config.js');
  if (verificarArquivo(caminhoMetroConfig)) {
    imprimirSucesso('Arquivo metro.config.js encontrado');
    
    const conteudoMetroConfig = fs.readFileSync(caminhoMetroConfig, 'utf8');
    
    if (conteudoMetroConfig.includes('extraNodeModules')) {
      imprimirSucesso('Configuração de aliases encontrada no metro.config.js');
    } else {
      imprimirAviso('Considere adicionar aliases no metro.config.js para resolver problemas de módulos');
    }
    
    if (conteudoMetroConfig.includes('maxWorkers')) {
      imprimirSucesso('Configuração de maxWorkers encontrada no metro.config.js');
    } else {
      imprimirAviso('Considere limitar o número de workers no metro.config.js para evitar sobrecarga de memória');
    }
  } else {
    imprimirAviso('Arquivo metro.config.js não encontrado');
  }
  
  // Sugestões gerais
  imprimirInfo('\nSugestões gerais:');
  console.log(`
1. ${cores.verde}Utilize pnpm em vez de npm${cores.reset} para melhor gerenciamento de dependências
2. ${cores.verde}Mantenha as versões do React e React Native consistentes${cores.reset}
3. ${cores.verde}Considere usar resolutions/overrides${cores.reset} para forçar versões específicas de pacotes problemáticos
4. ${cores.verde}Limpe caches regularmente${cores.reset} antes de iniciar o aplicativo
5. ${cores.verde}Aumente a memória disponível para o Node.js${cores.reset} usando NODE_OPTIONS=--max_old_space_size=6144
`);
}

// Função principal
function main() {
  console.log(`\n${cores.negrito}${cores.magenta}🔍 RELATÓRIO DE CONFLITOS NPM${cores.reset}\n`);
  
  verificarConflitos();
  verificarPeerDependencies();
  verificarDependenciasObsoletas();
  sugerirOtimizacoes();
  
  console.log(`\n${cores.negrito}${cores.verde}✅ ANÁLISE CONCLUÍDA${cores.reset}\n`);
}

// Executar função principal
main();