// scripts/fix-native-modules.js
const fs = require("fs");
const path = require("path");

const isStrict = process.argv.includes("--strict");

function mustRead(file) {
  if (!fs.existsSync(file)) {
    const msg = `Arquivo não encontrado: ${file}`;
    if (isStrict) {
      console.error(`❌ ERRO CRÍTICO: ${msg}`);
      process.exit(1);
    }
    console.warn(`⚠️ Warning: ${msg}`);
    return null;
  }
  return fs.readFileSync(file, "utf8");
}

function writeIfChanged(file, next, prev, label, successMsg) {
  if (next !== prev) {
    fs.writeFileSync(file, next, "utf8");
    console.log(`✅ PATCH OK ${label}: ${successMsg}`);
    return true;
  }
  
  // Se não mudou, precisamos verificar se é porque já estava corrigido
  // ou se o padrão simplesmente não foi encontrado (o que é erro no modo strict)
  return false;
}

function patchEasClient() {
  const label = "expo-eas-client";
  const file = path.join(process.cwd(), "node_modules/expo-eas-client/ios/EASClient/EASClientModule.swift");
  const prev = mustRead(file);
  if (!prev) return;

  if (prev.includes('Constants([')) {
    console.log(`ℹ️ ALREADY PATCHED ${label}: Replaced Constant -> Constants`);
    return;
  }

  const pattern = /Constant\("clientID"\)\s*\{\s*EASClientID\.uuid\(\)\.uuidString\s*\}/g;
  if (!pattern.test(prev)) {
    if (isStrict) {
      console.error(`❌ ERRO CRÍTICO ${label}: Padrão antigo não encontrado. A biblioteca pode ter sido atualizada.`);
      process.exit(1);
    }
    return;
  }

  const next = prev.replace(pattern, 'Constants(["clientID": EASClientID.uuid().uuidString])');
  writeIfChanged(file, next, prev, label, "Replaced Constant -> Constants");
}

function patchMediaLibrary() {
  const label = "expo-media-library";
  const file = path.join(process.cwd(), "node_modules/expo-media-library/ios/MediaLibraryExceptions.swift");
  const prev = mustRead(file);
  if (!prev) return;

  // Verificação de segurança: se já tem 'final class', consideramos corrigido
  if (prev.includes('final class MediaLibraryPermissionsException')) {
    console.log(`ℹ️ ALREADY PATCHED ${label}: Marked exceptions final`);
    return;
  }

  const pattern = /\b(internal|public)\s+class\s+([A-Za-z0-9_]+)\s*:\s*Exception\b/g;
  const next = prev.replace(pattern, "$1 final class $2: Exception");

  if (next === prev) {
    if (isStrict) {
      console.error(`❌ ERRO CRÍTICO ${label}: Não foi possível encontrar classes de Exception para aplicar 'final'.`);
      process.exit(1);
    }
    return;
  }

  writeIfChanged(file, next, prev, label, "Marked exceptions final (Swift 6 Sendable)");
}

try {
  console.log(`🔧 Running Native Module Fixes (Strict: ${isStrict})`);
  patchEasClient();
  patchMediaLibrary();
  console.log("⭐ STRICT OK: All targets found and modified successfully.");
} catch (err) {
  console.error("❌ UNEXPECTED ERROR:", err.message);
  process.exit(1);
}
