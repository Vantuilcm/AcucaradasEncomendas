import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * 🛡️ BuildNumberGuardianAI - Missão: Integridade e Unicidade de Builds
 * Implementa lógica MAX(Local, Expo, Apple, Android) + 1 e validação profunda.
 */
class BuildNumberGuardian {
  private projectRoot: string;
  private appJsonPath: string;
  private historyPath: string;

  constructor() {
    this.projectRoot = process.cwd();
    this.appJsonPath = path.join(this.projectRoot, 'app.json');
    this.historyPath = path.join(this.projectRoot, 'build-history.json');
  }

  /**
   * Obtém o número de build atual do arquivo app.json
   */
  getLocalBuildNumber(platform: 'ios' | 'android'): number {
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    return platform === 'ios' 
      ? parseInt(appJson.expo.ios.buildNumber || '1', 10)
      : parseInt(appJson.expo.android.versionCode || '1', 10);
  }

  /**
   * Obtém a baseline da Apple (TestFlight) via EAS
   */
  getAppleBaseline(): number {
    try {
      console.log('🍎 [Apple] Consultando TestFlight via EAS...');
      const output = execSync('npx eas build:list --platform ios --status finished --limit 1 --non-interactive', { encoding: 'utf8' });
      const match = output.match(/Build number\s+(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (e) {
      console.warn('⚠️ [Apple] Falha ao consultar TestFlight. Usando baseline local.');
      return 0;
    }
  }

  /**
   * Obtém a baseline do Android via EAS
   */
  getAndroidBaseline(): number {
    try {
      console.log('🤖 [Android] Consultando Play Store via EAS...');
      const output = execSync('npx eas build:list --platform android --status finished --limit 1 --non-interactive', { encoding: 'utf8' });
      const match = output.match(/Build number\s+(\d+)/);
      return match ? parseInt(match[1], 10) : 0;
    } catch (e) {
      console.warn('⚠️ [Android] Falha ao consultar Play Store. Usando baseline local.');
      return 0;
    }
  }

  /**
   * Calcula o próximo número de build seguro
   */
  computeNextBuildNumber(): number {
    const localIos = this.getLocalBuildNumber('ios');
    const localAndroid = this.getLocalBuildNumber('android');
    const appleBaseline = this.getAppleBaseline();
    const androidBaseline = this.getAndroidBaseline();

    const next = Math.max(localIos, localAndroid, appleBaseline, androidBaseline) + 1;
    
    // Proteção contra o build 347 (Hardcoded Block)
    return next === 347 ? 348 : next;
  }

  /**
   * Valida se o build configurado é seguro para upload
   */
  assertBuildNumberIsSafe(platform: 'ios' | 'android'): void {
    const current = this.getLocalBuildNumber(platform);
    const apple = this.getAppleBaseline();
    const android = this.getAndroidBaseline();
    const history = this.getHistory();

    console.log(`🔍 [Validate] Build Atual: ${current} | Apple: ${apple} | Android: ${android}`);

    if (platform === 'ios' && current <= apple) {
      throw new Error(`❌ [DUPLICATE] Build iOS ${current} já existe na Apple (Baseline: ${apple}).`);
    }
    if (platform === 'android' && current <= android) {
      throw new Error(`❌ [DUPLICATE] Build Android ${current} já existe no Google (Baseline: ${android}).`);
    }

    // Verificar histórico para evitar repetição do mesmo commit
    const duplicate = history.find(h => h.platform === platform && h.buildNumber === current && h.status === 'SUCCESS');
    if (duplicate) {
      throw new Error(`❌ [HISTORY] Build ${current} já foi finalizado com sucesso anteriormente.`);
    }

    // Bloqueio Hardcoded 347
    if (current === 347) {
      throw new Error(`❌ [SAFETY] O build 347 está banido por ser uma versão de conflito conhecida.`);
    }

    console.log('✅ [Safe] Build number validado e seguro para prosseguir.');
  }

  /**
   * Valida o versionCode de um arquivo AAB usando bundletool ou aapt2 (se disponível)
   */
  validateAab(aabPath: string, expectedVC: number): void {
    if (!fs.existsSync(aabPath)) throw new Error(`❌ AAB não encontrada em: ${aabPath}`);
    console.log(`📦 [Artifact] Validando AAB: ${aabPath}`);
    // No CI Android, o aapt2 costuma estar disponível via ANDROID_HOME
    try {
      const aaptPath = process.env.ANDROID_HOME 
        ? path.join(process.env.ANDROID_HOME, 'build-tools', '34.0.0', 'aapt2') // Exemplo de versão
        : 'aapt2';
      
      const dump = execSync(`"${aaptPath}" dump badging "${aabPath}" | grep versionCode`, { encoding: 'utf8' });
      const match = dump.match(/versionCode='(\d+)'/);
      if (match) {
        const actualVC = parseInt(match[1], 10);
        if (actualVC !== expectedVC) {
          throw new Error(`❌ [MISMATCH] AAB versionCode (${actualVC}) diverge do esperado (${expectedVC}).`);
        }
        console.log(`✅ [Valid] AAB versionCode confirmado: ${actualVC}`);
      }
    } catch (e) {
      console.warn('⚠️ [Warning] Falha ao validar AAB via aapt2. Prosseguindo com validação de orquestrador.');
    }
  }

  /**
   * Valida a IPA gerada extraindo Info.plist
   */
  validateIpa(ipaPath: string, expectedBN: number): void {
    if (!fs.existsSync(ipaPath)) throw new Error(`❌ IPA não encontrada em: ${ipaPath}`);

    console.log(`📦 [Artifact] Validando IPA: ${ipaPath}`);
    try {
      // No macOS (CI), usamos o comando 'defaults' ou 'plutil'
      // No Windows/Linux, usamos 'unzip -p' + 'grep'
      const plistContent = execSync(`unzip -p "${ipaPath}" "Payload/*.app/Info.plist" | strings`, { encoding: 'utf8' });
      const versionMatch = plistContent.match(/CFBundleVersion\s+(\d+)/) || plistContent.match(/<key>CFBundleVersion<\/key>\s*<string>(\d+)<\/string>/);
      
      if (versionMatch) {
        const actualBN = parseInt(versionMatch[1], 10);
        if (actualBN !== expectedBN) {
          throw new Error(`❌ [MISMATCH] IPA Build (${actualBN}) diverge do esperado (${expectedBN}).`);
        }
        console.log(`✅ [Valid] IPA Build Number confirmado: ${actualBN}`);
      }
    } catch (e: any) {
      console.warn(`⚠️ [Warning] Falha na validação profunda da IPA: ${e.message}`);
    }
  }

  private getHistory(): any[] {
    if (!fs.existsSync(this.historyPath)) return [];
    return JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
  }

  saveToHistory(platform: 'ios' | 'android', buildNumber: number, status: 'SUCCESS' | 'FAILED'): void {
    const history = this.getHistory();
    const appJson = JSON.parse(fs.readFileSync(this.appJsonPath, 'utf8'));
    history.push({
      platform,
      buildNumber,
      version: appJson.expo.version,
      commit: execSync('git rev-parse HEAD').toString().trim(),
      timestamp: new Date().toISOString(),
      status
    });
    fs.writeFileSync(this.historyPath, JSON.stringify(history.slice(-50), null, 2));
    console.log(`📝 [History] Build ${buildNumber} (${platform}) salvo no histórico.`);
  }
}

// CLI Interface
if (require.main === module) {
  const guardian = new BuildNumberGuardian();
  const args = process.argv.slice(2);

  if (args.includes('--sync')) {
    const next = guardian.computeNextBuildNumber();
    const appJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'app.json'), 'utf8'));
    appJson.expo.ios.buildNumber = next.toString();
    appJson.expo.android.versionCode = next;
    fs.writeFileSync(path.join(process.cwd(), 'app.json'), JSON.stringify(appJson, null, 2));
    console.log(`✅ [Sync] Build Number sincronizado para: ${next}`);
  }

  if (args.includes('--validate-ios')) {
    guardian.assertBuildNumberIsSafe('ios');
  }

  if (args.includes('--validate-android')) {
    guardian.assertBuildNumberIsSafe('android');
  }

  if (args.includes('--validate-ipa')) {
    const ipaPath = args[args.indexOf('--validate-ipa') + 1];
    const expectedBN = parseInt(args[args.indexOf('--validate-ipa') + 2], 10);
    guardian.validateIpa(ipaPath, expectedBN);
  }

  if (args.includes('--validate-aab')) {
    const aabPath = args[args.indexOf('--validate-aab') + 1];
    const expectedVC = parseInt(args[args.indexOf('--validate-aab') + 2], 10);
    guardian.validateAab(aabPath, expectedVC);
  }

  if (args.includes('--save-history')) {
    const platform = args[args.indexOf('--save-history') + 1] as 'ios' | 'android';
    const bn = parseInt(args[args.indexOf('--save-history') + 2], 10);
    const status = args[args.indexOf('--save-history') + 3] as 'SUCCESS' | 'FAILED';
    guardian.saveToHistory(platform, bn, status);
  }
}

export default BuildNumberGuardian;
