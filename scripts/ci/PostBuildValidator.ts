import fs from 'fs';
import path from 'path';

export interface ValidationResult {
  service: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  scoreContribution: number;
}

export interface BuildValidation {
  totalScore: number;
  results: ValidationResult[];
  status: 'approved' | 'rejected';
}

export class PostBuildValidator {
  private appId: string;
  private env: string;

  constructor(appId: string, env: string) {
    this.appId = appId;
    this.env = env;
  }

  public validateBuild(buildPath: string): BuildValidation {
    console.log(`🔍 [VALIDATOR] Validating build for ${this.appId} (${this.env})...`);
    
    const results: ValidationResult[] = [];
    let score = 0;

    // 1. Check if build exists (Critical: 40 points)
    if (fs.existsSync(buildPath)) {
      results.push({ service: 'Artifact', status: 'passed', message: 'Build IPA exists', scoreContribution: 40 });
      score += 40;
    } else {
      results.push({ service: 'Artifact', status: 'failed', message: 'Build IPA not found', scoreContribution: 0 });
    }

    // 2. Validate Firebase (20 points)
    const firebaseConfig = this.env === 'production' ? './GoogleService-Info.plist' : './GoogleService-Info.plist';
    if (fs.existsSync(path.resolve(process.cwd(), firebaseConfig))) {
      results.push({ service: 'Firebase', status: 'passed', message: 'Firebase config present', scoreContribution: 20 });
      score += 20;
    } else {
      results.push({ service: 'Firebase', status: 'failed', message: 'Firebase config missing', scoreContribution: 0 });
    }

    // 3. Mock Stripe & OneSignal Check (Simulated: 20 points each)
    // In a real scenario, this could check for env variables or library injection
    const stripeEnabled = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY !== undefined;
    if (stripeEnabled) {
      results.push({ service: 'Stripe', status: 'passed', message: 'Stripe configured', scoreContribution: 20 });
      score += 20;
    } else {
      results.push({ service: 'Stripe', status: 'warning', message: 'Stripe not found', scoreContribution: 10 });
      score += 10;
    }

    const oneSignalEnabled = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID !== undefined;
    if (oneSignalEnabled) {
      results.push({ service: 'OneSignal', status: 'passed', message: 'OneSignal configured', scoreContribution: 20 });
      score += 20;
    } else {
      results.push({ service: 'OneSignal', status: 'warning', message: 'OneSignal not found', scoreContribution: 10 });
      score += 10;
    }

    const status = score >= 60 ? 'approved' : 'rejected';
    
    console.log(`📊 [VALIDATOR] Build ${status} with score: ${score}/100`);

    return { totalScore: score, results, status };
  }

  public saveValidationReport(validation: BuildValidation, buildNumber: string) {
    const reportDir = path.resolve(process.cwd(), 'build-logs', this.appId, 'validation');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportFile = path.resolve(reportDir, `validation_${buildNumber}.json`);
    fs.writeFileSync(reportFile, JSON.stringify({
      appId: this.appId,
      env: this.env,
      buildNumber,
      timestamp: new Date().toISOString(),
      ...validation
    }, null, 2));
  }
}

export default PostBuildValidator;
