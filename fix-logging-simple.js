/**
 * Script simples para corrigir referências incorretas ao método LoggingService.logError
 */

const fs = require('fs');
const path = require('path');

// Arquivos específicos com o problema (caminhos corrigidos)
const filesToFix = [
  'src/screens/NotificationSettingsMigrationScreen.tsx',
  'src/components/OneSignalTestPanel.tsx',
  'src/components/ProtectedRoute.tsx',
  'src/contexts/LocationContext.tsx',
  'src/components/StoreLocator.tsx',
  'src/screens/HomeScreen.tsx',
  'src/screens/ProfileScreen.tsx',
  'src/screens/ProductCatalogScreen.tsx',
  'src/screens/ProductScreen.tsx',
  'src/screens/StoreListScreen.tsx',
  'src/screens/WishlistScreen.tsx',
  'src/services/PaymentService.ts'
];

// Função para corrigir as referências incorretas em um arquivo
function fixLoggingReferences(filePath) {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    if (!fs.existsSync(fullPath)) {
      console.log(`Arquivo não encontrado: ${fullPath}`);
      return false;
    }
    
    let content = fs.readFileSync(fullPath, 'utf8');
    const originalContent = content;
    
    // Substituir loggingService.logError por loggingService.error
    content = content.replace(/loggingService\.logError\(/g, 'loggingService.error(');
    
    // Substituir LoggingService.logError por LoggingService.error
    content = content.replace(/LoggingService\.logError\(/g, 'LoggingService.error(');
    
    // Verificar se houve alterações
    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`✅ Corrigido: ${filePath}`);
      return true;
    } else {
      console.log(`Nenhuma alteração necessária em: ${filePath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Erro ao processar arquivo ${filePath}:`, error.message);
    return false;
  }
}

// Função principal
function main() {
  console.log('🔍 Iniciando correção de referências ao LoggingService...');
  
  // Contador de arquivos corrigidos
  let fixedFiles = 0;
  
  // Processar cada arquivo da lista
  for (const file of filesToFix) {
    const wasFixed = fixLoggingReferences(file);
    if (wasFixed) fixedFiles++;
  }
  
  console.log(`\n✅ Processo concluído! ${fixedFiles} arquivos foram corrigidos.`);
  
  if (fixedFiles > 0) {
    console.log('\n🔄 Recomendação: Execute "npx expo start --clear" para reiniciar o aplicativo com as correções.');
  }
}

// Executar o script
main();