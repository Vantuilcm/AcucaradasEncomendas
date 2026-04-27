import fs from 'fs';
import path from 'path';

export interface BusinessMetrics {
  revenue: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  averageTicket: number;
  timestamp: string;
}

export class BusinessImpactService {
  private appId: string;

  constructor(appId: string, _env: string) {
    this.appId = appId;
  }

  /**
   * Monitora métricas de impacto de negócio em tempo real.
   * Em um ambiente real, isso consultaria o Firestore ou um Analytics API.
   * Para o Pipeline Orchestrator, simulamos a coleta baseada em logs ou mocks.
   */
  public async getRealTimeMetrics(): Promise<BusinessMetrics> {
    console.log(`📊 [BUSINESS] Coletando métricas de impacto para ${this.appId}...`);
    
    // Simulação de coleta de dados reais
    // No mundo real: await firestore.collection('orders').where('timestamp', '>', lastHour).get()
    const mockMetrics: BusinessMetrics = {
      revenue: 1500.50 + (Math.random() * 500),
      conversionRate: 3.5 + (Math.random() * 1.5),
      cartAbandonmentRate: 65 - (Math.random() * 10),
      averageTicket: 85.0,
      timestamp: new Date().toISOString()
    };

    return mockMetrics;
  }

  /**
   * Compara métricas atuais com o baseline da versão anterior.
   */
  public async detectBusinessAnomalies(current: BusinessMetrics, baseline: BusinessMetrics): Promise<string[]> {
    const anomalies: string[] = [];

    // Alerta se a receita cair mais de 20%
    if (current.revenue < baseline.revenue * 0.8) {
      anomalies.push(`Queda crítica de receita: -${((1 - current.revenue / baseline.revenue) * 100).toFixed(1)}%`);
    }

    // Alerta se a conversão cair mais de 15%
    if (current.conversionRate < baseline.conversionRate * 0.85) {
      anomalies.push(`Queda na taxa de conversão: ${current.conversionRate.toFixed(2)}% (Baseline: ${baseline.conversionRate.toFixed(2)}%)`);
    }

    // Alerta se o abandono de carrinho subir mais de 20%
    if (current.cartAbandonmentRate > baseline.cartAbandonmentRate * 1.2) {
      anomalies.push(`Aumento no abandono de carrinho: ${current.cartAbandonmentRate.toFixed(1)}%`);
    }

    return anomalies;
  }

  public saveBusinessReport(metrics: BusinessMetrics, buildNumber: string) {
    const reportDir = path.resolve(process.cwd(), 'build-logs', this.appId, 'business');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.resolve(reportDir, `business_${buildNumber}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(metrics, null, 2));
    console.log(`📈 [BUSINESS] Relatório de impacto salvo para build ${buildNumber}`);
  }
}

export default BusinessImpactService;
