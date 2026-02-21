// Teste simples para verificar se o Expo funciona
console.log('Testando se o Expo está funcionando...');

try {
  const expo = require('expo');
  console.log('✅ Expo carregado com sucesso!');
  console.log('Versão do Expo:', expo.Constants?.expoVersion || 'Não disponível');
} catch (error) {
  console.log('❌ Erro ao carregar o Expo:', error.message);
}

try {
  const react = require('react');
  console.log('✅ React carregado com sucesso!');
  console.log('Versão do React:', react.version);
} catch (error) {
  console.log('❌ Erro ao carregar o React:', error.message);
}

try {
  const reactNative = require('react-native');
  console.log('✅ React Native carregado com sucesso!');
} catch (error) {
  console.log('❌ Erro ao carregar o React Native:', error.message);
}

console.log('Teste concluído!');