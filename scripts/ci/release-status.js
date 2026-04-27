const fs = require('fs');
const path = require('path');

/**
 * 🚀 Release Status Visibility Engine
 * Missão: Expor saúde, rollout e decisões de release em tempo real.
 */
function checkReleaseStatus() {
    const configPath = path.resolve(process.cwd(), 'release-control.json');
    if (!fs.existsSync(configPath)) {
        console.error('❌ [ERROR] release-control.json não encontrado.');
        process.exit(1);
    }

    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    console.log('------------------------------------------------------------');
    console.log(`🚀 RELEASE STATUS: ${data.current_version} (${data.current_build})`);
    console.log('------------------------------------------------------------');
    console.log(`📈 ROLLOUT: ${data.rollout_percentage}%`);
    console.log(`🏥 HEALTH: ${data.health_status.toUpperCase()}`);
    console.log(`🤖 DECISION: ${data.decision.toUpperCase()}`);
    console.log('------------------------------------------------------------');
    
    console.log('📱 PLATFORMS:');
    console.log(`   🍎 iOS: ${data.platforms.ios.testflight_status} (${data.platforms.ios.status})`);
    console.log(`   🤖 Android: ${data.platforms.android.playstore_status} (${data.platforms.android.status})`);
    
    console.log('------------------------------------------------------------');
    console.log('📊 METRICS:');
    console.log(`   📉 Crash Rate: ${data.metrics.crash_rate}%`);
    console.log(`   💰 Payment Success: ${data.metrics.payment_success}%`);
    
    if (data.decision === 'rollback') {
        console.log('🚨 [ALERT] ROLLBACK TRIGGERED! Verifique os logs críticos.');
    } else if (data.decision === 'risk') {
        console.log('⚠️ [WARN] RELEASE AT RISK. Monitoramento intensivo necessário.');
    } else {
        console.log('✅ [OK] Release estável.');
    }
    console.log('------------------------------------------------------------');
}

checkReleaseStatus();
