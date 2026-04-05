const guardian = require('./release-guardian');
const fs = require('fs');
const path = require('path');

/**
 * Post-Release Monitor Global Scale
 * Captura sinais de saúde da release e invoca o Guardian para decisão.
 */
async function monitorPostRelease() {
  const statePath = path.join(__dirname, '../release-state.json');
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const releaseId = state.activeReleaseId;

  console.log(`🔍 [Monitor] Iniciando monitoramento para Release: ${releaseId}`);

  try {
    // 1. Capturar Sinais
    const signals = await captureSignals();

    console.log('📊 [Monitor] Sinais capturados:', signals);

    // 2. Classificar e Agir via Guardian
    await guardian.handleClassification('STABLE', signals);

    console.log('✨ [Monitor] Ciclo de monitoramento concluído.');
  } catch (error) {
    console.error('❌ [Monitor] Erro crítico:', error.message);
    process.exit(1);
  }
}

/**
 * Lógica de captura de sinais (Mock para integração futura)
 */
async function captureSignals() {
  // Simulando leitura de logs/APIs
  // Em um cenário real, aqui usaríamos bibliotecas como 'axios' para consultar:
  // - Sentry API (Issues fatais nas últimas 24h)
  // - Stripe Dashboard (Eventos de falha de pagamento)
  // - Firestore (Log de ações autônomas falhas)
  
  const signals = {
    crashRate: 0.005, // 0.5% (Abaixo do threshold de 2%)
    paymentFailureRate: 0.01, // 1% (Abaixo do threshold de 5%)
    criticalErrors: 0
  };

  // Verificação de segurança: Se houver erros graves no log do Guardian
  const guardianLogPath = path.join(__dirname, '../build-logs/release-guardian-log.json');
  if (fs.existsSync(guardianLogPath)) {
    const logs = JSON.parse(fs.readFileSync(guardianLogPath, 'utf8'));
    const lastErrors = logs.filter(l => l.level === 'FATAL').length;
    signals.criticalErrors += lastErrors;
  }

  return signals;
}

monitorPostRelease();
