#!/usr/bin/env bash
set -euo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

TEAM_ID="${TEAM_ID:-4G75MX4TPA}"
BUNDLE_ID="${BUNDLE_ID:-com.acucaradas.encomendas}"
EXPECTED_VERSION="${EXPECTED_VERSION:-}"
P12_PATH="${P12_PATH:-}"
P12_PASSWORD="${P12_PASSWORD:-}"
MOBILEPROVISION_PATH="${MOBILEPROVISION_PATH:-}"

BASE_DIR="${BASE_DIR:-$HOME/acucaradas-encomendas}"
if [ ! -d "$BASE_DIR" ]; then
  echo "Erro: Diretório base não encontrado: $BASE_DIR"
  exit 1
fi
cd "$BASE_DIR"

if [ -d "$BASE_DIR/AcucaradasEncomendas" ]; then
  cd "$BASE_DIR/AcucaradasEncomendas"
fi

if [ ! -f package.json ]; then
  echo "Erro: package.json não encontrado"
  exit 1
fi

if [ -z "$EXPECTED_VERSION" ]; then
  EXPECTED_VERSION="$(node -e "try{const j=require('./app.json');process.stdout.write(String(j?.expo?.version||''))}catch(e){process.stdout.write('')}" 2>/dev/null || true)"
  if [ -z "$EXPECTED_VERSION" ]; then
    EXPECTED_VERSION="$(node -e "try{const j=require('./package.json');process.stdout.write(String(j?.version||''))}catch(e){process.stdout.write('')}" 2>/dev/null || true)"
  fi
  EXPECTED_VERSION="${EXPECTED_VERSION:-1.0.0}"
fi

env -u NODE_ENV NPM_CONFIG_PRODUCTION=false npm install || true
npx patch-package || true

if [ ! -d ios ]; then
  npx expo prebuild -p ios --non-interactive || true
fi

cd ios
export CURRENT_ARCH=arm64
POD_BIN="${POD_BIN:-/opt/homebrew/bin/pod}"
"$POD_BIN" install --repo-update

WORKSPACE="$(find . -maxdepth 1 -type d -name '*.xcworkspace' -print -quit | sed 's|^./||')"
if [ -z "$WORKSPACE" ]; then
  echo "Erro: Workspace não encontrado"
  exit 1
fi

SCHEME_NAME="${SCHEME_NAME:-}"
if [ -z "$SCHEME_NAME" ]; then
  SCHEME_NAME="$(xcodebuild -list -workspace "$WORKSPACE" | awk '/Schemes:/,/^$/{print}' | sed '1d' | head -n1 | xargs)"
fi
if [ -z "$SCHEME_NAME" ]; then
  echo "Erro: Scheme não encontrado"
  exit 1
fi

cd ..
EAS_OK=true
if command -v npx >/dev/null 2>&1; then
  if node -e "process.exit(0)" >/dev/null 2>&1; then
    if [ -f .eas.json ] || [ -f eas.json ]; then
      npx eas-cli@latest build -p ios --local --non-interactive --profile production || EAS_OK=false
    else
      EAS_OK=false
    fi
  else
    EAS_OK=false
  fi
else
  EAS_OK=false
fi

IPA_PATH=""
if [ "$EAS_OK" = true ]; then
  IPA_PATH="$(find . -maxdepth 3 -type f -name '*.ipa' | sort | tail -n1 || true)"
fi

if [ -z "$IPA_PATH" ]; then
  cd ios
  if [ -z "$(security find-identity -p codesigning -v | grep 'Apple Distribution' || true)" ]; then
    if [ -n "$P12_PATH" ] && [ -n "$P12_PASSWORD" ]; then
      security import "$P12_PATH" -k ~/Library/Keychains/login.keychain-db -P "$P12_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/xcodebuild
    fi
  fi
  SIGN_ID="$(security find-identity -p codesigning -v | grep 'Apple Distribution' | head -n1 | sed -E 's/.*"(.+)"/\1/')"
  if [ -z "$SIGN_ID" ]; then
    echo "Erro: Identidade 'Apple Distribution' não disponível"
    exit 1
  fi
  if [ -n "$MOBILEPROVISION_PATH" ]; then
    UUID="$(security cms -D -i "$MOBILEPROVISION_PATH" | /usr/libexec/PlistBuddy -c 'Print :UUID' -)"
    PROFILE_NAME="$(security cms -D -i "$MOBILEPROVISION_PATH" | /usr/libexec/PlistBuddy -c 'Print :Name' -)"
    mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
    cp "$MOBILEPROVISION_PATH" ~/Library/MobileDevice/Provisioning\ Profiles/$UUID.mobileprovision
  else
    PROFILE_NAME="${PROFILE_NAME:-}"
    if [ -z "$PROFILE_NAME" ]; then
      echo "Erro: MOBILEPROVISION_PATH ou PROFILE_NAME não definido"
      exit 1
    fi
  fi
  mkdir -p build
  xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME_NAME" -configuration Release -destination 'generic/platform=iOS' -archivePath ./build/App.xcarchive archive CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM="$TEAM_ID" PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" CODE_SIGN_IDENTITY="$SIGN_ID" PRODUCT_BUNDLE_IDENTIFIER="$BUNDLE_ID"
  cat > ./build/exportOptions.plist <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>method</key>
  <string>app-store</string>
  <key>teamID</key>
  <string>__TEAM_ID__</string>
  <key>signingStyle</key>
  <string>manual</string>
  <key>provisioningProfiles</key>
  <dict>
    <key>__BUNDLE_ID__</key>
    <string>__PROFILE_NAME__</string>
  </dict>
  <key>compileBitcode</key>
  <false/>
</dict>
</plist>
PLIST
  sed -i '' "s/__TEAM_ID__/$TEAM_ID/g" ./build/exportOptions.plist
  sed -i '' "s/__BUNDLE_ID__/$BUNDLE_ID/g" ./build/exportOptions.plist
  sed -i '' "s/__PROFILE_NAME__/$PROFILE_NAME/g" ./build/exportOptions.plist
  xcodebuild -exportArchive -archivePath ./build/App.xcarchive -exportOptionsPlist ./build/exportOptions.plist -exportPath ./build/ios
  IPA_PATH="$(ls -1 ./build/ios/*.ipa | head -n1 || true)"
  if [ -z "$IPA_PATH" ]; then
    echo "Erro: IPA não gerada"
    exit 1
  fi
fi

if [ -z "$IPA_PATH" ]; then
  echo "Erro: IPA não encontrada"
  exit 1
fi

APP_PLIST="$(find ./build/App.xcarchive/Products/Applications -maxdepth 1 -type f -name 'Info.plist' -print -o -path './build/App.xcarchive/Products/Applications/*.app/Info.plist' | head -n1 || true)"
if [ -z "$APP_PLIST" ]; then
  APP_PLIST="$(unzip -Z1 "$IPA_PATH" | grep -E 'Payload/.+\.app/Info.plist' | head -n1 | xargs -I{} unzip -p "$IPA_PATH" {} > /tmp/info.plist && echo /tmp/info.plist)"
fi

CFBUNDLEID="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$APP_PLIST" || true)"
CFBUNDLEVER="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$APP_PLIST" || true)"

if [ "$CFBUNDLEID" != "$BUNDLE_ID" ]; then
  echo "Erro: CFBundleIdentifier diferente ($CFBUNDLEID)"
  exit 1
fi
if [ "$CFBUNDLEVER" != "$EXPECTED_VERSION" ]; then
  echo "Erro: Versão diferente ($CFBUNDLEVER)"
  exit 1
fi

APP_PATH_IN_ARCHIVE="$(ls -1 ./build/App.xcarchive/Products/Applications/*.app 2>/dev/null | head -n1 || true)"
if [ -n "$APP_PATH_IN_ARCHIVE" ]; then
  codesign -dv --verbose=4 "$APP_PATH_IN_ARCHIVE" >/dev/null 2>&1 || true
fi

SIZE="$(stat -f%z "$IPA_PATH" 2>/dev/null || wc -c < "$IPA_PATH")"

echo "IPA=$IPA_PATH"
echo "SIZE=$SIZE"
