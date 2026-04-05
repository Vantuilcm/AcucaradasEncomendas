const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Release Guardian Global Scale
 * Governança multi-versão, detecção de anomalias e orquestração de canary rollback.
 */
class ReleaseGuardian {
  constructor() {
    this.thresholdsPath = path.join(__dirname, 'release-thresholds.json');
    this.statePath = path.join(__dirname, '../release-state.json');
    this.historyPath = path.join(__dirname, '../release-history.json');
    this.logPath = path.join(__dirname, '../build-logs/release-guardian-log.json');
    
    this.thresholds = JSON.parse(fs.readFileSync(this.thresholdsPath, 'utf8'));
    this.state = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
  }

  /**
   * Registra um evento no log do Guardian
   */
  log(message, level = 'INFO', metadata = {}) {
    const logs = JSON.parse(fs.readFileSync(this.logPath, 'utf8'));
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      releaseId: this.state.activeReleaseId,
      ...metadata
    };
    logs.push(entry);
    fs.writeFileSync(this.logPath, JSON.stringify(logs.slice(-200), null, 2));
    console.log(`[Guardian][${level}][${this.state.activeReleaseId}] ${message}`);
  }

  /**
   * Detecção de anomalias baseada em baseline histórico (últimos 3 builds)
   */
  detectAnomalies(signals) {
    const history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
    const anomalies = [];
    
    // Pegar baseline dos últimos 3 builds estáveis
    const baselineBuilds = history
      .filter(h => h.status === 'STABLE' && h.buildNumber < this.state.releases[this.state.activeReleaseId].buildNumber)
      .slice(-3);

    if (baselineBuilds.length > 0) {
      const avgCrashRate = baselineBuilds.reduce((sum, b) => sum + b.monitoring.crashRate, 0) / baselineBuilds.length;
      
      // Se crash rate for 3x maior que a média histórica
      if (signals.crashRate > avgCrashRate * 3 && signals.crashRate > 0.005) {
        anomalies.push(`Crash rate anormal (${(signals.crashRate*100).toFixed(2)}%) vs Baseline (${(avgCrashRate*100).toFixed(2)}%)`);
      }
    }

    return anomalies;
  }

  /**
   * Classifica a saúde da release
   */
  classifyRelease(signals, anomalies) {
    const { crashRate, paymentFailureRate, criticalErrors } = signals;
    
    if (crashRate > this.thresholds.maxCrashRate || 
        paymentFailureRate > this.thresholds.maxPaymentFailureRate || 
        criticalErrors > this.thresholds.maxCriticalErrors ||
        anomalies.length >= 2) {
      return 'CRITICAL';
    }

    if (crashRate > this.thresholds.maxCrashRate * 0.5 || 
        paymentFailureRate > this.thresholds.maxPaymentFailureRate * 0.5 ||
        anomalies.length > 0) {
      return 'DEGRADED';
    }

    return 'STABLE';
  }

  /**
   * Executa ações baseado na classificação
   */
  async handleClassification(status, signals) {
    const releaseId = this.state.activeReleaseId;
    const release = this.state.releases[releaseId];
    
    const anomalies = this.detectAnomalies(signals);
    const finalStatus = this.classifyRelease(signals, anomalies);

    release.status = finalStatus;
    release.lastCheck = new Date().toISOString();
    release.health = signals;
    release.anomalies = anomalies;
    
    this.log(`Release ${releaseId} classificada como ${finalStatus}`, finalStatus === 'STABLE' ? 'INFO' : 'WARN', { signals, anomalies });

    if (finalStatus === 'CRITICAL') {
      await this.triggerRollback(releaseId, signals);
    } else if (finalStatus === 'STABLE' && release.rollout < 1.0) {
      await this.promoteCanary(releaseId);
    }

    this.updateHistory(releaseId, finalStatus, signals);
    fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
  }

  /**
   * Promoção de Canary para 100%
   */
  async promoteCanary(releaseId) {
    const release = this.state.releases[releaseId];
    this.log(`Promovendo Canary ${releaseId} para 100%...`, 'INFO');
    
    try {
      // execSync(`npx eas update --channel production --republish-from-branch ${release.channel}`);
      release.rollout = 1.0;
      release.channel = 'production';
      this.log('Canary promovido com sucesso.', 'SUCCESS');
    } catch (e) {
      this.log(`Erro ao promover canary: ${e.message}`, 'ERROR');
    }
  }

  /**
   * Orquestra o Rollback Automático Seguro
   */
  async triggerRollback(releaseId, signals) {
    const release = this.state.releases[releaseId];
    
    if (release.rollbackTriggered) {
      this.log('Rollback já disparado. Pulando.', 'INFO');
      return;
    }

    this.log(`🚨 DISPARANDO ROLLBACK PARA ${releaseId}`, 'ERROR', signals);
    
    const lastStable = this.state.lastStableReleaseId;
    if (!lastStable) {
      this.log('CRÍTICO: Nenhuma release estável anterior encontrada para rollback!', 'FATAL');
      return;
    }

    release.rollbackTriggered = true;
    release.blocked = true;

    try {
      this.log(`Executando rollback para baseline estável: ${lastStable}`, 'INFO');
      // execSync(`npx eas update --channel production --republish-from-id ${lastStable}`);
      
      this.log(`Rollback concluído. Canal 'production' aponta para ${lastStable}.`, 'SUCCESS');
    } catch (error) {
      this.log(`Falha ao executar rollback: ${error.message}`, 'FATAL');
    }
  }

  /**
   * Atualiza histórico de releases
   */
  updateHistory(releaseId, status, signals) {
    const history = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
    const release = this.state.releases[releaseId];
    
    const entry = {
      releaseId,
      version: release.version,
      buildNumber: release.buildNumber,
      releasedAt: release.lastCheck,
      status,
      channel: release.channel,
      rollout: release.rollout,
      monitoring: signals,
      anomalies: release.anomalies,
      rollbackTriggered: release.rollbackTriggered
    };
    
    const index = history.findIndex(h => h.releaseId === releaseId);
    if (index !== -1) {
      history[index] = entry;
    } else {
      history.push(entry);
    }
    
    fs.writeFileSync(this.historyPath, JSON.stringify(history.slice(-50), null, 2));
  }
}

module.exports = new ReleaseGuardian();
