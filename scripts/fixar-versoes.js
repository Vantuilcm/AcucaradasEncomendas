/**
 * Script para converter ranges flexíveis de versões (^ e ~) em versões exatas no package.json
 * 
 * Este script analisa o package.json atual, identifica todas as dependências com ranges flexíveis,
 * e as converte para versões exatas com base nas versões atualmente instaladas.
 * 
 * Uso: node scripts/fixar-versoes.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Caminho para o package.json
const packageJsonPath = path.resolve(__dirname, '..', 'package.json');

// Função para fazer backup do package.json original
function backupPackageJson() {
  const backupPath = `${packageJsonPath}.backup-${Date.now()}`;
  fs.copyFileSync(packageJsonPath, backupPath);
  console.log(`✅ Backup do package.json criado em: ${backupPath}`);
  return backupPath;
}

// Função para obter a versão exata instalada de um pacote
function getExactVersion(packageName) {
  try {
    // Executa npm list para obter a versão exata instalada
    const output = execSync(`npm list ${packageName} --depth=0 --json`).toString();
    const parsed = JSON.parse(output);
    
    if (parsed.dependencies && parsed.dependencies[packageName]) {
      return parsed.dependencies[packageName].version;
    }
    return null;
  } catch (error) {
    console.warn(`⚠️ Não foi possível determinar a versão exata de ${packageName}`);
    return null;
  }
}

// Função principal para fixar as versões
async function fixVersions() {
  // Fazer backup do package.json original
  const backupPath = backupPackageJson();
  
  try {
    // Ler o package.json
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);
    
    // Arrays para armazenar resultados
    const fixed = [];
    const skipped = [];
    const errors = [];
    
    // Processar dependências regulares
    if (packageJson.dependencies) {
      for (const [packageName, versionRange] of Object.entries(packageJson.dependencies)) {
        // Verificar se a versão usa range flexível (^ ou ~)
        if (versionRange.startsWith('^') || versionRange.startsWith('~')) {
          const exactVersion = getExactVersion(packageName);
          if (exactVersion) {
            packageJson.dependencies[packageName] = exactVersion;
            fixed.push({ packageName, from: versionRange, to: exactVersion });
          } else {
            skipped.push({ packageName, version: versionRange, reason: 'Não foi possível determinar a versão exata' });
          }
        } else {
          skipped.push({ packageName, version: versionRange, reason: 'Já é uma versão exata ou usa outro formato' });
        }
      }
    }
    
    // Processar devDependencies
    if (packageJson.devDependencies) {
      for (const [packageName, versionRange] of Object.entries(packageJson.devDependencies)) {
        if (versionRange.startsWith('^') || versionRange.startsWith('~')) {
          const exactVersion = getExactVersion(packageName);
          if (exactVersion) {
            packageJson.devDependencies[packageName] = exactVersion;
            fixed.push({ packageName, from: versionRange, to: exactVersion });
          } else {
            skipped.push({ packageName, version: versionRange, reason: 'Não foi possível determinar a versão exata' });
          }
        } else {
          skipped.push({ packageName, version: versionRange, reason: 'Já é uma versão exata ou usa outro formato' });
        }
      }
    }
    
    // Atualizar overrides e resolutions com as mesmas versões exatas
    if (packageJson.overrides) {
      for (const [packageName, versionRange] of Object.entries(packageJson.overrides)) {
        if (versionRange.startsWith('^') || versionRange.startsWith('~')) {
          // Verificar se já fixamos este pacote nas dependências regulares
          const fixedDep = fixed.find(item => item.packageName === packageName);
          if (fixedDep) {
            packageJson.overrides[packageName] = fixedDep.to;
          } else {
            const exactVersion = getExactVersion(packageName);
            if (exactVersion) {
              packageJson.overrides[packageName] = exactVersion;
              fixed.push({ packageName, from: versionRange, to: exactVersion, section: 'overrides' });
            }
          }
        }
      }
    }
    
    // Atualizar resolutions (para Yarn)
    if (packageJson.resolutions) {
      for (const [packageName, versionRange] of Object.entries(packageJson.resolutions)) {
        if (versionRange.startsWith('^') || versionRange.startsWith('~')) {
          // Verificar se já fixamos este pacote nas dependências regulares ou overrides
          const fixedDep = fixed.find(item => item.packageName === packageName);
          if (fixedDep) {
            packageJson.resolutions[packageName] = fixedDep.to;
          } else {
            const exactVersion = getExactVersion(packageName);
            if (exactVersion) {
              packageJson.resolutions[packageName] = exactVersion;
              fixed.push({ packageName, from: versionRange, to: exactVersion, section: 'resolutions' });
            }
          }
        }
      }
    }
    
    // Salvar o package.json atualizado
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Exibir resultados
    console.log('\n🔒 CONVERSÃO DE VERSÕES FLEXÍVEIS PARA EXATAS');
    console.log('===========================================');
    
    console.log(`\n✅ ${fixed.length} dependências convertidas para versões exatas:`);
    fixed.forEach(item => {
      console.log(`  - ${item.packageName}: ${item.from} → ${item.to}${item.section ? ` (${item.section})` : ''}`);
    });
    
    console.log(`\n⏩ ${skipped.length} dependências não modificadas:`);
    skipped.forEach(item => {
      console.log(`  - ${item.packageName}: ${item.version} (${item.reason})`);
    });
    
    if (errors.length > 0) {
      console.log(`\n❌ ${errors.length} erros encontrados:`);
      errors.forEach(item => {
        console.log(`  - ${item.packageName}: ${item.error}`);
      });
    }
    
    console.log('\n📝 Próximos passos:');
    console.log('  1. Revise as alterações no package.json');
    console.log('  2. Execute npm install para atualizar o package-lock.json');
    console.log('  3. Teste a aplicação para garantir que tudo funciona corretamente');
    console.log(`  4. Se necessário, restaure o backup: ${backupPath}`);
    
  } catch (error) {
    console.error('❌ Erro ao processar o package.json:', error);
    console.log(`⚠️ Restaurando backup de ${backupPath}...`);
    fs.copyFileSync(backupPath, packageJsonPath);
    console.log('✅ Backup restaurado com sucesso.');
  }
}

// Executar a função principal
fixVersions().catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});