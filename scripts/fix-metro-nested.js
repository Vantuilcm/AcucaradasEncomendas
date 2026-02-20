const fs = require('fs');
const path = require('path');

/**
 * Script para remover dependências aninhadas do Metro que causam falha no expo-doctor.
 * O pacote @react-native/metro-config@0.81.5 traz erroneamente o metro-config@0.83.3,
 * o que conflita com o Expo SDK 52 (que exige 0.81.x).
 */

function fixNestedMetro() {
  console.log('🔧 Iniciando fix-metro-nested.js...');
  
  const nestedPaths = [
    path.join('node_modules', '@react-native', 'metro-config', 'node_modules', 'metro-config'),
    path.join('node_modules', '@react-native', 'metro-config', 'node_modules', 'metro-runtime'),
  ];

  nestedPaths.forEach(p => {
    const fullPath = path.resolve(process.cwd(), p);
    if (fs.existsSync(fullPath)) {
      console.log(`🗑️ Removendo dependência aninhada: ${p}`);
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ ${p} removido com sucesso.`);
      } catch (e) {
        console.warn(`⚠️ Erro ao remover ${p}: ${e.message}`);
      }
    } else {
      console.log(`ℹ️ Dependência aninhada não encontrada (já limpo): ${p}`);
    }
  });

  console.log('✨ Limpeza de dependências do Metro concluída.');
}

fixNestedMetro();
