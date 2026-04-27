// Teste simples para verificar funcionalidades básicas
console.log('🧪 INICIANDO TESTES DE FUNCIONALIDADE...\n');

// Teste 1: Verificar se o React está disponível
try {
  const React = require('react');
  console.log('✅ React carregado com sucesso');
} catch (error) {
  console.log('❌ Erro ao carregar React:', error.message);
}

// Teste 2: Verificar package.json
try {
  const fs = require('fs');
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  console.log('✅ package.json lido com sucesso');
  console.log('📦 Nome do projeto:', packageJson.name);
  console.log('📦 Versão:', packageJson.version);
  
  // Verificar dependências essenciais
  const essentialDeps = ['expo', 'react', 'react-native', 'expo-router'];
  const missingDeps = essentialDeps.filter(dep => !packageJson.dependencies[dep]);
  
  if (missingDeps.length === 0) {
    console.log('✅ Todas as dependências essenciais estão presentes');
  } else {
    console.log('⚠️ Dependências faltando:', missingDeps.join(', '));
  }
} catch (error) {
  console.log('❌ Erro ao ler package.json:', error.message);
}

// Teste 3: Verificar arquivos principais
const mainFiles = [
  './App.tsx',
  './app/_layout.tsx', 
  './app/index.tsx',
  './src/components/ThemeProvider.tsx'
];

mainFiles.forEach(file => {
  try {
    const fs = require('fs');
    if (fs.existsSync(file)) {
      console.log(`✅ Arquivo encontrado: ${file}`);
    } else {
      console.log(`❌ Arquivo não encontrado: ${file}`);
    }
  } catch (error) {
    console.log(`❌ Erro ao verificar ${file}:`, error.message);
  }
});

console.log('\n🏁 TESTES CONCLUÍDOS!');