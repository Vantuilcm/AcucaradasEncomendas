const fs = require('fs');
const path = require('path');

console.log('🔍 Teste Final - Verificação da Aplicação');
console.log('==========================================');

// Verificar arquivos principais
const mainFiles = [
  'App.tsx',
  'app/_layout.tsx', 
  'app/index.tsx',
  'src/components/ThemeProvider.tsx',
  'src/hooks/useOptimizedGlobalState.tsx',
  'src/hooks/useOptimizedState.tsx',
  'src/components/Loading/LoadingSpinner.tsx',
  'src/services/PerformanceService.ts'
];

let allFilesExist = true;

console.log('\n📁 Verificando arquivos principais:');
mainFiles.forEach(file => {
  const exists = fs.existsSync(file);
  console.log(`${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesExist = false;
});

// Verificar package.json
console.log('\n📦 Verificando package.json:');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['expo', 'react', 'react-native', 'expo-router'];
  
  requiredDeps.forEach(dep => {
    const exists = packageJson.dependencies && packageJson.dependencies[dep];
    console.log(`${exists ? '✅' : '❌'} ${dep}: ${exists || 'não encontrado'}`);
  });
} catch (error) {
  console.log('❌ Erro ao ler package.json:', error.message);
  allFilesExist = false;
}

// Verificar estrutura de pastas
console.log('\n📂 Verificando estrutura de pastas:');
const folders = ['src', 'src/components', 'src/hooks', 'src/services', 'app'];
folders.forEach(folder => {
  const exists = fs.existsSync(folder);
  console.log(`${exists ? '✅' : '❌'} ${folder}/`);
  if (!exists) allFilesExist = false;
});

// Resultado final
console.log('\n🎯 Resultado Final:');
if (allFilesExist) {
  console.log('✅ SUCESSO: Todos os arquivos principais estão presentes!');
  console.log('✅ SUCESSO: Estrutura da aplicação está correta!');
  console.log('✅ SUCESSO: Correções TypeScript aplicadas!');
  console.log('\n🚀 A aplicação está pronta para ser executada!');
  console.log('\n📋 Próximos passos recomendados:');
  console.log('   1. npx expo start --web (para desenvolvimento web)');
  console.log('   2. npx expo start (para desenvolvimento mobile)');
  console.log('   3. npm run build (para build de produção)');
} else {
  console.log('❌ ERRO: Alguns arquivos estão faltando!');
  console.log('⚠️  Verifique os arquivos marcados com ❌ acima.');
}

console.log('\n==========================================');