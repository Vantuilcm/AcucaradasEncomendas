#!/usr/bin/env bash
set -euo pipefail

TEAM_ID="${TEAM_ID:-4G75MX4TPA}"
BUNDLE_ID="${BUNDLE_ID:-com.acucaradas.encomendas}"
P12_PATH="${P12_PATH:-}"
P12_PASSWORD="${P12_PASSWORD:-}"
MOBILEPROVISION_PATH="${MOBILEPROVISION_PATH:-}"
SCHEME_NAME="${SCHEME_NAME:-AcucaradasEncomendas}"
WORKSPACE_NAME="${WORKSPACE_NAME:-}"

if [ -z "$P12_PATH" ] || [ -z "$P12_PASSWORD" ] || [ -z "$MOBILEPROVISION_PATH" ]; then
  echo "Defina P12_PATH, P12_PASSWORD e MOBILEPROVISION_PATH."
  exit 1
fi

ROOT_DIR="$(pwd)"
if [ -d "$ROOT_DIR/ios" ]; then
  IOS_DIR="$ROOT_DIR/ios"
elif [ -d "$ROOT_DIR/AcucaradasEncomendas/ios" ]; then
  IOS_DIR="$ROOT_DIR/AcucaradasEncomendas/ios"
else
  IOS_DIR="$(find "$ROOT_DIR" -maxdepth 2 -type d -name ios | head -n1)"
fi

if [ -z "${IOS_DIR:-}" ] || [ ! -d "$IOS_DIR" ]; then
  echo "Pasta iOS não encontrada."
  exit 1
fi

cd "$IOS_DIR"

if [ ! -d "Pods" ] || [ -z "$(ls -1 *.xcworkspace 2>/dev/null | head -n1)" ]; then
  export CURRENT_ARCH=arm64
  pod install --repo-update
fi

if [ -n "$WORKSPACE_NAME" ] && [ -f "$WORKSPACE_NAME" ]; then
  WORKSPACE="$WORKSPACE_NAME"
else
  WORKSPACE="$(ls -1 *.xcworkspace | head -n1)"
fi

if [ -z "$WORKSPACE" ]; then
  echo "Workspace não encontrado."
  exit 1
fi

if ! xcodebuild -list -workspace "$WORKSPACE" >/dev/null 2>&1; then
  echo "Falha ao listar workspace."
  exit 1
fi

if [ -z "$SCHEME_NAME" ]; then
  SCHEME_NAME="$(xcodebuild -list -workspace "$WORKSPACE" | awk '/Schemes:/,/^$/ {print}' | sed '1d' | head -n1 | xargs)"
fi

if [ -z "$SCHEME_NAME" ]; then
  echo "Scheme não encontrado."
  exit 1
fi

security import "$P12_PATH" -k ~/Library/Keychains/login.keychain-db -P "$P12_PASSWORD" -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/xcodebuild

SIGN_ID="$(security find-identity -p codesigning -v | grep 'Apple Distribution' | head -n1 | sed -E 's/.*"(.+)"/\1/')"
if [ -z "$SIGN_ID" ]; then
  echo "Identidade de assinatura não encontrada."
  exit 1
fi

UUID="$(security cms -D -i "$MOBILEPROVISION_PATH" | /usr/libexec/PlistBuddy -c 'Print :UUID' -)"
PROFILE_NAME="$(security cms -D -i "$MOBILEPROVISION_PATH" | /usr/libexec/PlistBuddy -c 'Print :Name' -)"
mkdir -p ~/Library/MobileDevice/Provisioning\ Profiles
cp "$MOBILEPROVISION_PATH" ~/Library/MobileDevice/Provisioning\ Profiles/$UUID.mobileprovision

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
  echo "Falha ao gerar IPA."
  exit 1
fi

echo "$IPA_PATH"