import fs from 'fs';
import path from 'path';
import { BuildValidation } from './PostBuildValidator';
import { BusinessMetrics } from './BusinessImpactService';

export type ReleaseDecision = 'approve' | 'block' | 'rollback' | 'progressive';

export interface DecisionPayload {
  decision: ReleaseDecision;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reason: string[];
  metrics: {
    buildScore: number;
    crashRate: number;
    businessImpactScore: number;
    paymentSuccessRate: number;
  };
}

export class ReleaseDecisionAI {
  private appId: string;
  private env: string;

  constructor(appId: string, env: string) {
    this.appId = appId;
    this.env = env;
  }

  /**
   * Decide autonomamente o destino de uma release baseada em múltiplos sinais.
   */
  public async decide(
    validation: BuildValidation,
    businessMetrics: BusinessMetrics,
    crashRate: number,
    paymentSuccessRate: number
  ): Promise<DecisionPayload> {
    console.log(`🧠 [AI] Analisando sinais para decisão de release (${this.appId})...`);

    const reasons: string[] = [];
    let riskLevel: DecisionPayload['riskLevel'] = 'low';
    let decision: ReleaseDecision = 'approve';

    // 1. Build Score (Métrica de Engenharia)
    if (validation.totalScore < 60) {
      reasons.push(`Score de build insuficiente: ${validation.totalScore}/100`);
      decision = 'block';
      riskLevel = 'critical';
    }

    // 2. Crash Rate (Métrica de Estabilidade)
    if (crashRate > 0.05) { // 5% de taxa de crash é crítico
      reasons.push(`Taxa de crash crítica: ${(crashRate * 100).toFixed(2)}%`);
      decision = 'rollback';
      riskLevel = 'critical';
    } else if (crashRate > 0.01) { // 1% é preocupante
      reasons.push(`Taxa de crash elevada: ${(crashRate * 100).toFixed(2)}%`);
      decision = 'progressive';
      riskLevel = 'medium';
    }

    // 3. Taxa de Sucesso de Pagamento (Métrica de Receita)
    if (paymentSuccessRate < 0.90) { // < 90% sucesso é falha crítica
      reasons.push(`Falha crítica em pagamentos: ${(paymentSuccessRate * 100).toFixed(1)}% de sucesso`);
      decision = 'rollback';
      riskLevel = 'critical';
    }

    // 4. Conversão (Métrica de Negócio)
    if (businessMetrics.conversionRate < 2.0) { // Média de mercado ~2.5% - 3.0%
      reasons.push(`Baixa conversão detectada: ${businessMetrics.conversionRate.toFixed(2)}%`);
      if (decision === 'approve') decision = 'progressive';
      if (riskLevel === 'low') riskLevel = 'medium';
    }

    // 5. Decisão Final baseada em prioridade de riscos
    if (decision === 'approve' && riskLevel === 'low') {
      reasons.push('Todos os sinais estão saudáveis. Release aprovada para rollout.');
    }

    return {
      decision,
      riskLevel,
      confidence: 0.95, // Simulado
      reason: reasons,
      metrics: {
        buildScore: validation.totalScore,
        crashRate,
        businessImpactScore: businessMetrics.revenue / 2000 * 100, // Normalizado para 0-100
        paymentSuccessRate
      }
    };
  }

  public saveDecisionLog(decision: DecisionPayload, buildNumber: string) {
    const logDir = path.resolve(process.cwd(), 'build-logs', this.appId, 'ai_decisions');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.resolve(logDir, `decision_${buildNumber}.json`);
    fs.writeFileSync(logFile, JSON.stringify({
      appId: this.appId,
      env: this.env,
      buildNumber,
      timestamp: new Date().toISOString(),
      ...decision
    }, null, 2));
    
    console.log(`🧠 [AI] Decisão salva para build ${buildNumber}: ${decision.decision.toUpperCase()}`);
  }
}

export default ReleaseDecisionAI;
