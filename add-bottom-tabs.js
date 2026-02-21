// Script para adicionar @react-navigation/bottom-tabs ao package.json
const fs = require('fs');
const path = require('path');

console.log('Adicionando @react-navigation/bottom-tabs ao package.json...');

const packageJsonPath = path.join(process.cwd(), 'package.json');

try {
  // Ler o package.json atual
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  // Adicionar a dependência se não existir
  if (!packageJson.dependencies['@react-navigation/bottom-tabs']) {
    packageJson.dependencies['@react-navigation/bottom-tabs'] = '6.5.11';
    console.log('Adicionando @react-navigation/bottom-tabs versão 6.5.11');
  } else {
    console.log('@react-navigation/bottom-tabs já existe no package.json');
  }
  
  // Salvar o package.json atualizado
  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  console.log('package.json atualizado com sucesso!');
} catch (error) {
  console.error('Erro ao atualizar package.json:', error.message);
}