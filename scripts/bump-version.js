const fs = require('fs');
const path = require('path');

const appJsonPath = path.resolve(__dirname, '../app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

const currentVersion = appJson.expo.version;
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Incrementa o patch para versão semântica 1.0.X
const nextPatch = patch + 1;
const nextVersion = `${major}.${minor}.${nextPatch}`;

appJson.expo.version = nextVersion;

// Também sincronizamos o buildNumber/versionCode no app.json para manter consistência,
// embora o app.config.js use o GITHUB_RUN_NUMBER se disponível.
const nextBuild = (parseInt(appJson.expo.ios?.buildNumber || "0") + 1).toString();
const nextCode = (appJson.expo.android?.versionCode || 0) + 1;

if (appJson.expo.ios) appJson.expo.ios.buildNumber = nextBuild;
if (appJson.expo.android) appJson.expo.android.versionCode = nextCode;

fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log(`✅ [RellBuild] Versão atualizada: ${currentVersion} -> ${nextVersion}`);
console.log(`✅ [RellBuild] Build/Code atualizado: ${nextBuild}/${nextCode}`);
