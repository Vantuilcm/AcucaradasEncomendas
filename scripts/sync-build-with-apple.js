const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Enterprise Safe Build Synchronization System
 * - Uses BuildNumberEnforcerAI (force-build-number.js) for absolute truth
 */
async function syncBuildEnterprise() {
  console.log('🛡️ [Enterprise Sync] Sincronizando números de build via Enforcer...');

  try {
    // Chamar o Enforcer que já possui a lógica de jump e sincronia total
    execSync('node scripts/ci/force-build-number.js --run', { stdio: 'inherit' });
    console.log('✅ [Sync] Build sincronizado com sucesso (800+ jump enforced).');
  } catch (error) {
    console.error('❌ [Critical] Falha na sincronização de build:', error.message);
    process.exit(1);
  }
}

syncBuildEnterprise();
