import fs from 'fs';
import path from 'path';
import BuildQueueService, { BuildJob, BuildPriority } from './BuildQueueService';
import PostBuildValidator, { BuildValidation } from './PostBuildValidator';
import BusinessImpactService from './BusinessImpactService';
import ReleaseDecisionAI from './ReleaseDecisionAI';
import ProgressiveRolloutEngine from './ProgressiveRolloutEngine';

interface AppConfig {
  id: string;
  name: string;
  slug: string;
  bundleIdentifier: string;
  package: string;
  firebase: {
    ios: string;
    android: string;
  };
  environments: Record<string, {
    easProfile: string;
    channel: string;
  }>;
}

interface AppsConfig {
  apps: Record<string, AppConfig>;
  defaultApp: string;
}

class PipelineOrchestrator {
  private config: AppsConfig;
  private currentApp: string;
  private currentEnv: string;
  private currentJob: BuildJob | null = null;
  private businessService: BusinessImpactService;
  private decisionAI: ReleaseDecisionAI;
  private rolloutEngine: ProgressiveRolloutEngine;

  constructor() {
    const configPath = path.resolve(process.cwd(), 'apps.config.json');
    const content = fs.readFileSync(configPath, 'utf-8').replace(/^\uFEFF/, '');
    this.config = JSON.parse(content);
    this.currentApp = process.env.TARGET_APP || this.config.defaultApp;
    this.currentEnv = process.env.APP_ENV || 'production';

    this.businessService = new BusinessImpactService(this.currentApp, this.currentEnv);
    this.decisionAI = new ReleaseDecisionAI(this.currentApp, this.currentEnv);
    this.rolloutEngine = new ProgressiveRolloutEngine(this.currentApp, this.currentEnv);
  }

  public getAppConfig(): AppConfig {
    const appConfig = this.config.apps[this.currentApp];
    if (!appConfig) {
      throw new Error(`App ${this.currentApp} not found in config`);
    }
    return appConfig;
  }

  public getEnvConfig() {
    const appConfig = this.getAppConfig();
    const envConfig = appConfig.environments[this.currentEnv];
    if (!envConfig) {
      throw new Error(`Environment ${this.currentEnv} not found for app ${this.currentApp}`);
    }
    return envConfig;
  }

  public setupEnvironment() {
    const appConfig = this.getAppConfig();
    const envConfig = this.getEnvConfig();

    console.log(`🚀 [ORCHESTRATOR] Setting up environment for ${appConfig.name} (${this.currentEnv})`);

    // Protected Production Mode Check
    const isApproved = process.env.RELEASE_APPROVED === 'true';
    if (this.currentEnv === 'production') {
      if (isApproved) {
        console.log('✅ [ORCHESTRATOR] Production approval granted.');
      } else {
        console.error('🚨 [ORCHESTRATOR] PRODUCTION build rejected: RELEASE_APPROVED=true is missing!');
        console.error('💡 Dica: Adicione "[release]" na mensagem do commit ou use o disparo manual com aprovação.');
        process.exit(1);
      }
    }

    // Inject environment variables for the build
    process.env.EXPO_PUBLIC_PROJECT_ID = appConfig.id;
    process.env.EXPO_PUBLIC_APP_NAME = appConfig.name;
    process.env.PROFILE = envConfig.easProfile;
    
    // Save build status
    this.saveStatus('initializing');
  }

  public async addToQueue(priority: BuildPriority = 'medium') {
    const job = await BuildQueueService.addToQueue(this.currentApp, this.currentEnv, priority);
    this.currentJob = job;
    return job;
  }

  public saveStatus(status: string, details: any = {}) {
    const statusDir = path.resolve(process.cwd(), 'build-logs', this.currentApp);
    if (!fs.existsSync(statusDir)) {
      fs.mkdirSync(statusDir, { recursive: true });
    }

    const statusFile = path.resolve(statusDir, 'pipeline_status.json');
    let existingData: any = {};
    if (fs.existsSync(statusFile)) {
      try {
        existingData = JSON.parse(fs.readFileSync(statusFile, 'utf-8'));
      } catch (e) {}
    }

    // Protection: Don't downgrade from 'validated' or 'rejected' back to 'success'
    if (existingData.status === 'validated' || existingData.status === 'rejected') {
      if (status === 'success') {
        console.log(`🛡️ [ORCHESTRATOR] Status already '${existingData.status}', skipping downgrade to 'success'`);
        return;
      }
    }

    const data = {
      app: this.currentApp,
      env: this.currentEnv,
      timestamp: new Date().toISOString(),
      priority: this.currentJob?.priority || existingData.priority || 'medium',
      ...existingData,
      ...details,
      status // Ensure the new status is applied if not blocked
    };

    fs.writeFileSync(statusFile, JSON.stringify(data, null, 2));
    
    // Multi-app dashboard registry
    const globalStatusFile = path.resolve(process.cwd(), 'build-logs', 'global_dashboard.json');
    let globalData: any = {};
    if (fs.existsSync(globalStatusFile)) {
      globalData = JSON.parse(fs.readFileSync(globalStatusFile, 'utf-8'));
    }
    globalData[this.currentApp] = data;
    fs.writeFileSync(globalStatusFile, JSON.stringify(globalData, null, 2));

    console.log(`📊 [OBSERVABILITY] Status saved for ${this.currentApp}: ${status}`);
  }

  public saveMetrics(metrics: any) {
    const metricsDir = path.resolve(process.cwd(), 'build-logs', this.currentApp, 'metrics');
    if (!fs.existsSync(metricsDir)) {
      fs.mkdirSync(metricsDir, { recursive: true });
    }

    const buildNumber = process.env.CURRENT_BN || 'unknown';
    const metricsFile = path.resolve(metricsDir, `build_${buildNumber}.json`);
    
    fs.writeFileSync(metricsFile, JSON.stringify({
      app: this.currentApp,
      env: this.currentEnv,
      buildNumber,
      timestamp: new Date().toISOString(),
      ...metrics
    }, null, 2));
    
    console.log(`📈 [METRICS] Metrics saved for build ${buildNumber}`);
  }

  public validateBuild(buildPath: string, buildNumber: string): BuildValidation {
    const validator = new PostBuildValidator(this.currentApp, this.currentEnv);
    const validation = validator.validateBuild(buildPath);
    validator.saveValidationReport(validation, buildNumber);
    
    this.saveStatus(validation.status === 'approved' ? 'validated' : 'rejected', { 
      score: validation.totalScore,
      validation: validation.status 
    });

    if (validation.status === 'rejected') {
      console.error(`❌ [ORCHESTRATOR] Build ${buildNumber} rejected with score: ${validation.totalScore}`);
      process.exit(1);
    }

    return validation;
  }

  /**
   * Avalia a saúde da release e toma decisões autônomas (Level Global)
   */
  public async evaluateRelease(buildNumber: string, crashRate: number, paymentSuccessRate: number) {
    console.log(`🤖 [AUTONOMOUS] Avaliando saúde da release ${buildNumber}...`);

    // 1. Obter métricas de impacto de negócio
    const businessMetrics = await this.businessService.getRealTimeMetrics();
    this.businessService.saveBusinessReport(businessMetrics, buildNumber);

    // 2. Obter validação do build
    const validationFile = path.resolve(process.cwd(), 'build-logs', this.currentApp, 'validation', `validation_${buildNumber}.json`);
    if (!fs.existsSync(validationFile)) {
      console.warn(`⚠️ [AUTONOMOUS] Relatório de validação não encontrado para build ${buildNumber}`);
      return;
    }
    const validation = JSON.parse(fs.readFileSync(validationFile, 'utf-8')) as BuildValidation;

    // 3. IA Decisora
    const decision = await this.decisionAI.decide(validation, businessMetrics, crashRate, paymentSuccessRate);
    this.decisionAI.saveDecisionLog(decision, buildNumber);

    // 4. Executar decisão
    if (decision.decision === 'rollback') {
      await this.rolloutEngine.triggerAutoRollback(decision.reason.join(' | '));
      this.saveStatus('rollback_triggered', { riskLevel: 'critical', reason: decision.reason[0] });
      this.updateReleaseControl('risk', 0, 'rollback');
    } else if (decision.decision === 'progressive') {
      const rolloutState = this.rolloutEngine.getRolloutState();
      const nextStage = await this.rolloutEngine.advanceRollout(rolloutState.stage);
      this.saveStatus('progressive_rollout', { stage: nextStage, riskLevel: decision.riskLevel });
      
      // Map stage to rollout percentage
      const rolloutMap: Record<string, number> = { 'initial': 10, 'stage1': 30, 'stage2': 60, 'full': 100 };
      this.updateReleaseControl('stable', rolloutMap[nextStage] || 10, 'stable');
    } else if (decision.decision === 'approve') {
      this.saveStatus('fully_approved', { riskLevel: 'low' });
      this.updateReleaseControl('stable', 100, 'stable');
    } else if (decision.decision === 'block') {
      this.saveStatus('blocked', { riskLevel: 'high', reason: decision.reason[0] });
      this.updateReleaseControl('risk', 0, 'blocked');
    }

    return decision;
  }

  /**
   * Atualiza o Centro de Controle de Release (release-control.json)
   */
  private updateReleaseControl(health: string, rollout: number, decision: string) {
    const controlPath = path.resolve(process.cwd(), 'release-control.json');
    if (!fs.existsSync(controlPath)) return;

    const data = JSON.parse(fs.readFileSync(controlPath, 'utf-8'));
    data.health_status = health;
    data.rollout_percentage = rollout;
    data.decision = decision;
    data.last_release_time = new Date().toISOString();
    
    fs.writeFileSync(controlPath, JSON.stringify(data, null, 2));
    console.log(`🎛️ [CONTROL-CENTER] Release Control Center atualizado: ${rollout}% Rollout`);
  }

  public async runBuild() {
    try {
      this.setupEnvironment();
      
      // Check if another build for the same app is already running
      if (BuildQueueService.isAppBuilding(this.currentApp)) {
        console.log(`⏳ [ORCHESTRATOR] App ${this.currentApp} is already building. Adding to queue...`);
        await this.addToQueue();
        process.exit(0);
      }

      this.saveStatus('building');
      
      console.log(`🏗️ [ORCHESTRATOR] Initializing unified build flow for ${this.currentApp}...`);
      
      // Clean previous app-specific locks if any
      const lockPath = path.resolve(process.cwd(), `build_${this.currentApp}.lock`);
      if (fs.existsSync(lockPath)) fs.unlinkSync(lockPath);

    } catch (error: any) {
      this.saveStatus('failed', { error: error.message });
      console.error(`❌ [ORCHESTRATOR] Initialization failed: ${error.message}`);
      process.exit(1);
    }
  }

  public async processQueue() {
    const job = BuildQueueService.getNextJob();
    if (!job) {
      console.log('✅ [QUEUE] No pending jobs in queue.');
      return;
    }

    console.log(`🚀 [QUEUE] Processing job ${job.id} for ${job.appId} (${job.env})...`);
    
    // In a CI environment, we would trigger a new workflow or execution
    // For this implementation, we mark it as running
    BuildQueueService.updateJobStatus(job.id, 'running');
    
    try {
      // Trigger build (shelling out to build.sh)
      const cmd = `TARGET_APP=${job.appId} APP_ENV=${job.env} ./scripts/ci/build.sh ${job.appId} ${job.env}`;
      console.log(`🛠️ [QUEUE] Executing: ${cmd}`);
      // This is a simplified sequential trigger
    } catch (e) {
      BuildQueueService.updateJobStatus(job.id, 'failed');
    }
  }

  public getDashboardData() {
    const apps = Object.keys(this.config.apps);
    const data = apps.map(appId => {
      const statusPath = path.resolve(process.cwd(), 'build-logs', appId, 'pipeline_status.json');
      if (fs.existsSync(statusPath)) {
        return JSON.parse(fs.readFileSync(statusPath, 'utf-8'));
      }
      return { app: appId, status: 'unknown' };
    });

    return data;
  }
}

// CLI Entry Point
if (require.main === module) {
  const orchestrator = new PipelineOrchestrator();
  const command = process.argv[2];

  if (command === 'build') {
    orchestrator.runBuild();
  } else if (command === 'status') {
    console.log(JSON.stringify(orchestrator.getDashboardData(), null, 2));
  } else if (command === 'metrics') {
    const metrics = JSON.parse(process.argv[3] || '{}');
    orchestrator.saveMetrics(metrics);
    orchestrator.saveStatus('success', { 
      buildNumber: metrics.buildNumber,
      submission: metrics.submission || 'unknown'
    });
  } else if (command === 'validate') {
    const buildPath = process.argv[3];
    const buildNumber = process.argv[4];
    orchestrator.validateBuild(buildPath, buildNumber);
  } else if (command === 'process-queue') {
    orchestrator.processQueue();
  } else if (command === 'evaluate') {
    const buildNumber = process.argv[3];
    const crashRate = parseFloat(process.argv[4] || '0');
    const paymentSuccess = parseFloat(process.argv[5] || '1.0');
    orchestrator.evaluateRelease(buildNumber, crashRate, paymentSuccess);
  }
}

export default PipelineOrchestrator;
