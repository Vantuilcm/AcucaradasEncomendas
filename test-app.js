// Teste simples para verificar se a aplicação básica funciona
const React = require('react');

console.log('🧪 INICIANDO TESTES DE FUNCIONALIDADES');
console.log('=====================================');

// Teste 1: Verificar se React está disponível
try {
  console.log('✅ React:', React.version || 'Disponível');
} catch (error) {
  console.log('❌ React:', error.message);
}

// Teste 2: Verificar se os arquivos principais existem
const fs = require('fs');
const path = require('path');

const arquivosEssenciais = [
  'package.json',
  'App.tsx',
  'app/_layout.tsx',
  'app/index.tsx',
  'src/components/ThemeProvider.tsx',
  'src/components/base/Button.tsx'
];

console.log('\n📁 VERIFICANDO ARQUIVOS ESSENCIAIS:');
arquivosEssenciais.forEach(arquivo => {
  try {
    if (fs.existsSync(path.join(__dirname, arquivo))) {
      console.log(`✅ ${arquivo}`);
    } else {
      console.log(`❌ ${arquivo} - NÃO ENCONTRADO`);
    }
  } catch (error) {
    console.log(`❌ ${arquivo} - ERRO: ${error.message}`);
  }
});

// Teste 3: Verificar package.json
console.log('\n📦 VERIFICANDO PACKAGE.JSON:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log(`✅ Nome: ${packageJson.name}`);
  console.log(`✅ Versão: ${packageJson.version}`);
  console.log(`✅ Main: ${packageJson.main}`);
  
  const dependenciasEssenciais = [
    'expo',
    'react',
    'react-native',
    'expo-router'
  ];
  
  console.log('\n🔗 DEPENDÊNCIAS ESSENCIAIS:');
  dependenciasEssenciais.forEach(dep => {
    if (packageJson.dependencies && packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: NÃO ENCONTRADA`);
    }
  });
  
} catch (error) {
  console.log(`❌ Erro ao ler package.json: ${error.message}`);
}

console.log('\n🎯 RESULTADO DOS TESTES:');
console.log('=====================================');
console.log('Se todos os itens acima estão ✅, a aplicação está pronta para rodar!');
console.log('Se há itens ❌, eles precisam ser corrigidos antes de prosseguir.');