import fs from 'fs';
import path from 'path';

export type RolloutStage = 0.1 | 0.3 | 0.6 | 1.0;

export interface RolloutStatus {
  stage: RolloutStage;
  active: boolean;
  startTime: string;
  nextStageTime: string | null;
  lastValidationTime: string | null;
}

export class ProgressiveRolloutEngine {
  private appId: string;
  private rolloutFile: string;

  constructor(appId: string, _env: string) {
    this.appId = appId;
    this.rolloutFile = path.resolve(process.cwd(), 'build-logs', this.appId, 'rollout_state.json');
    this.ensureRolloutFile();
  }

  private ensureRolloutFile() {
    const dir = path.dirname(this.rolloutFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.rolloutFile)) {
      fs.writeFileSync(this.rolloutFile, JSON.stringify({
        stage: 0.1,
        active: false,
        startTime: new Date().toISOString(),
        nextStageTime: null,
        lastValidationTime: null
      }, null, 2));
    }
  }

  public getRolloutState(): RolloutStatus {
    return JSON.parse(fs.readFileSync(this.rolloutFile, 'utf-8'));
  }

  public async advanceRollout(currentStage: RolloutStage): Promise<RolloutStage> {
    const stages: RolloutStage[] = [0.1, 0.3, 0.6, 1.0];
    const currentIndex = stages.indexOf(currentStage);
    
    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      return currentStage;
    }

    const nextStage = stages[currentIndex + 1];
    this.updateRolloutState({
      stage: nextStage,
      active: true,
      startTime: new Date().toISOString(),
      lastValidationTime: new Date().toISOString()
    });

    console.log(`📈 [ROLLOUT] Avançando para estágio: ${(nextStage * 100).toFixed(0)}% para ${this.appId}`);
    return nextStage;
  }

  public async validateStageHealth(crashRate: number, revenueImpact: number): Promise<boolean> {
    // Critérios de saúde para interromper rollout
    if (crashRate > 0.02) { // 2% crash rate em estágio progressivo é bloqueio
      console.error(`🚨 [ROLLOUT] Saúde crítica detectada: Taxa de crash ${crashRate * 100}%`);
      return false;
    }

    if (revenueImpact < -0.15) { // Queda de 15% na receita no estágio atual
      console.error(`🚨 [ROLLOUT] Impacto de negócio negativo: Queda de receita ${revenueImpact * 100}%`);
      return false;
    }

    this.updateRolloutState({ lastValidationTime: new Date().toISOString() });
    return true;
  }

  private updateRolloutState(update: Partial<RolloutStatus>) {
    const current = this.getRolloutState();
    const newState = { ...current, ...update };
    fs.writeFileSync(this.rolloutFile, JSON.stringify(newState, null, 2));
  }

  public async triggerAutoRollback(reason: string) {
    console.error(`🛡️ [ROLLBACK] ROLLBACK AUTOMÁTICO disparado por: ${reason}`);
    this.updateRolloutState({
      stage: 0.1,
      active: false,
      lastValidationTime: new Date().toISOString()
    });
    // Aqui acionaria o script de rollback real via EAS ou CLI
  }
}

export default ProgressiveRolloutEngine;
