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

function readJson(filePath, defaultValue) {
    if (!fs.existsSync(filePath)) return defaultValue;
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        // Remover BOM (Byte Order Mark) e espaços extras que quebram o JSON
        content = content.replace(/^\uFEFF/, '').trim();
        if (!content || content === '') return defaultValue;
        return JSON.parse(content);
    } catch (e) {
        log(`Aviso: Erro ao ler ${path.basename(filePath)}. Resetando para padrão.`);
        return defaultValue;
    }
}

function check() {
    const action = process.argv[2] || 'check';
    const currentCommit = getCommitHash();

    // 1. Gerenciar LOCK
    if (action === 'lock') {
        const localLock = path.join(__dirname, '../build.lock');
        if (fs.existsSync(localLock)) {
            const lockInfo = readJson(localLock, { timestamp: 'unknown' });
            const lockTime = new Date(lockInfo.timestamp).getTime();
            const now = new Date().getTime();
            const diffMinutes = (now - lockTime) / (1000 * 60);

            // Auto-unlock após 60 minutos (zombie protection)
            if (diffMinutes > 60) {
                log(`⚠️ [TIMEOUT] Lock detectado de ${diffMinutes.toFixed(1)}m atrás. Removendo automaticamente...`);
                fs.unlinkSync(localLock);
            } else {
                console.error(`❌ [ERROR] Build em andamento detectado (LOCK local). Iniciado há ${diffMinutes.toFixed(1)}m. Abortando.`);
                process.exit(1);
            }
        }
        
        fs.writeFileSync(localLock, JSON.stringify({
            commit: currentCommit,
            timestamp: new Date().toISOString(),
            pid: process.pid,
            github_run_id: process.env.GITHUB_RUN_ID || 'local'
        }), 'utf8');
        log('Lock de build criado com sucesso.');
        process.exit(0);
    }

    if (action === 'unlock') {
        const localLock = path.join(__dirname, '../build.lock');
        if (fs.existsSync(localLock)) {
            fs.unlinkSync(localLock);
            log('Lock de build removido com sucesso.');
        } else {
            log('Aviso: Nenhum lock encontrado para remover.');
        }
        process.exit(0);
    }

    // 2. Verificar duplicidade de commit
    if (action === 'check') {
        const state = readJson(STATE_FILE, {});
        if (state.last_success_commit === currentCommit && !process.env.FORCE_BUILD) {
            console.error(`⚠️ [DUPLICATE] Este commit (${currentCommit.substring(0, 7)}) já foi buildado com sucesso anteriormente.`);
            console.error('💡 Dica: Use FORCE_BUILD=1 para forçar um novo build deste commit.');
            process.exit(1);
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
        }, null, 2), 'utf8');

        // Adicionar ao histórico
        let history = readJson(HISTORY_FILE, []);
        history.unshift(buildData);
        fs.writeFileSync(HISTORY_FILE, JSON.stringify(history.slice(0, 50), null, 2), 'utf8');

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
