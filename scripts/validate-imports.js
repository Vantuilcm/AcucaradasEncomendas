const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../src');
const criticalFiles = [
  'components/ScreenshotProtection.tsx',
  'contexts/AuthContext.tsx',
  'monitoring/AppSecurityMonitoring.ts',
];

console.log('🔍 Validando arquivos críticos...');

let hasError = false;

criticalFiles.forEach(file => {
  const fullPath = path.resolve(srcDir, file);
  if (!fs.existsSync(fullPath)) {
    console.error(`❌ ERRO: Arquivo não encontrado: ${file}`);
    hasError = true;
  } else {
    console.log(`✅ OK: ${file}`);
    
    // Validar imports dentro do arquivo
    const content = fs.readFileSync(fullPath, 'utf8');
    const importRegex = /from ['"](@\/|\.\/|\.\.\/)([^'"]+)['"]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const prefix = match[1];
      const importPath = match[2];
      let resolvedPath;
      
      if (prefix === '@/') {
        resolvedPath = path.resolve(srcDir, importPath);
      } else {
        resolvedPath = path.resolve(path.dirname(fullPath), prefix + importPath);
      }
      
      // Tentar extensões comuns
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
      let found = false;
      for (const ext of extensions) {
        if (fs.existsSync(resolvedPath + ext) && fs.lstatSync(resolvedPath + ext).isFile()) {
          found = true;
          break;
        }
      }
      
      if (!found) {
        console.error(`  ❌ Import inválido em ${file}: ${prefix}${importPath}`);
        hasError = true;
      }
    }
  }
});

if (hasError) {
  console.error('\n🛑 Falha na validação de imports. Não inicie o build no EAS até corrigir os erros acima.');
  process.exit(1);
} else {
  console.log('\n🚀 Todos os imports críticos estão válidos! Pode prosseguir com o build.');
  process.exit(0);
}
