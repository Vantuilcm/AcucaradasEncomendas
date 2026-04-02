/**
 * 🛡️ scripts/build-state-check.js
 * Missão: State Engine do Pipeline. Impedir concorrência, duplicidade e manter histórico.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const STATE_FILE = path.join(__dirname, '../build-logs/state.json');
const HISTORY_FILE = path.join(__dirname, '../build-logs/build-history.json');
const LOCK_FILE = '/tmp/build.lock'; // No GitHub Actions/Linux este é o padrão

function log(msg) {
    console.log(`⚙️ [STATE-ENGINE] ${msg}`);
}

function getCommitHash() {
    try {
        return execSync('git rev-parse HEAD').toString().trim();
    } catch (e) {
        return 'unknown';
    }
}

function check() {
    const action = process.argv[2] || 'check';
    const currentCommit = getCommitHash();

    // 1. Gerenciar LOCK
    if (action === 'lock') {
        if (fs.existsSync(LOCK_FILE)) {
            console.error(`❌ [ERROR] Build em andamento detectado (LOCK existe em ${LOCK_FILE}). Abortando.`);
            process.exit(1);
        }
        try {
            fs.writeFileSync(LOCK_FILE, JSON.stringify({
                commit: currentCommit,
                timestamp: new Date().toISOString(),
                pid: process.pid
            }));
            log('Lock criado com sucesso.');
            process.exit(0);
        } catch (e) {
            log('Aviso: Não foi possível criar lock em /tmp (pode ser Windows). Tentando local...');
            const localLock = path.join(__dirname, '../build.lock');
            if (fs.existsSync(localLock)) {
                console.error(`❌ [ERROR] Build em andamento detectado (LOCK local). Abortando.`);
                process.exit(1);
            }
            fs.writeFileSync(localLock, 'locked');
            process.exit(0);
        }
    }

    if (action === 'unlock') {
        if (fs.existsSync(LOCK_FILE)) fs.unlinkSync(LOCK_FILE);
        const localLock = path.join(__dirname, '../build.lock');
        if (fs.existsSync(localLock)) fs.unlinkSync(localLock);
        log('Lock removido.');
        process.exit(0);
    }

    // 2. Verificar duplicidade de commit
    if (action === 'check') {
        if (fs.existsSync(STATE_FILE)) {
            const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
            if (state.last_success_commit === currentCommit && !process.env.FORCE_BUILD) {
                console.error(`⚠️ [DUPLICATE] Este commit (${currentCommit.substring(0, 7)}) já foi buildado com sucesso anteriormente.`);
                console.error('💡 Dica: Use FORCE_BUILD=1 para forçar um novo build deste commit.');
                process.exit(1);
            }
        }
        log('Verificação de estado concluída. Prosseguindo...');
        process.exit(0);
    }

    // 3. Registrar Sucesso
    if (action === 'success') {
        const buildData = {
            commit: currentCommit,
            timestamp: new Date().toISOString(),
            version: process.env.CURRENT_VERSION || 'unknown',
            buildNumber: process.env.CURRENT_BN || 'unknown',
            status: 'SUCCESS'
        };

        // Atualizar state.json
        fs.writeFileSync(STATE_FILE, JSON.stringify({
            last_success_commit: currentCommit,
            last_success_timestamp: buildData.timestamp,
            last_version: buildData.version,
            last_bn: buildData.buildNumber
        }, null, 2));

        // Adicionar ao histórico
        let history = [];
        if (fs.existsSync(HISTORY_FILE)) {
            history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
        }
        history.unshift(buildData);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 50), null, 2));

        log('Estado de sucesso registrado e histórico atualizado.');
        process.exit(0);
    }
}

try {
    check();
} catch (error) {
    console.error('❌ [FATAL] Erro no State Engine:', error.message);
    process.exit(1);
}
