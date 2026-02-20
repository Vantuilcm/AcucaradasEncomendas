#!/bin/zsh
set -e
export LANG=en_US.UTF-8
export PATH=/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH
cd ~/acucaradas-encomendas/AcucaradasEncomendas/ios || cd ~/acucaradas-encomendas/ios
WORKSPACE=AucaradasEncomendas.xcworkspace
SCHEME=AucaradasEncomendas
security import ~/certs/Distribuicao.p12 -k ~/Library/Keychains/login.keychain-db -P jtx20182dhp -T /usr/bin/codesign -T /usr/bin/security -T /usr/bin/xcodebuild
SIGN_ID=$(security find-identity -p codesigning -v | grep "Apple Distribution" | head -n1 | sed -E 's/.*"(.+)"/\1/')
PROFILE_NAME=$(security cms -D -i ~/certs/AppStore_com.acucaradas.encomendas.mobileprovision | /usr/libexec/PlistBuddy -c 'Print :Name' -)
mkdir -p build
xcodebuild -workspace "$WORKSPACE" -scheme "$SCHEME" -configuration Release -destination 'generic/platform=iOS' -archivePath ./build/App.xcarchive archive CODE_SIGN_STYLE=Manual DEVELOPMENT_TEAM=4G75MX4TPA PROVISIONING_PROFILE_SPECIFIER="$PROFILE_NAME" CODE_SIGN_IDENTITY="$SIGN_ID" PRODUCT_BUNDLE_IDENTIFIER="com.acucaradas.encomendas"
plist_path=./build/exportOptions.plist
/usr/libexec/PlistBuddy -c "Clear" "$plist_path" 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Add :method string app-store" "$plist_path"
/usr/libexec/PlistBuddy -c "Add :teamID string 4G75MX4TPA" "$plist_path"
/usr/libexec/PlistBuddy -c "Add :signingStyle string manual" "$plist_path"
/usr/libexec/PlistBuddy -c "Add :provisioningProfiles dict" "$plist_path"
/usr/libexec/PlistBuddy -c "Add :provisioningProfiles:com.acucaradas.encomendas string $PROFILE_NAME" "$plist_path"
/usr/libexec/PlistBuddy -c "Add :compileBitcode bool false" "$plist_path"
xcodebuild -exportArchive -archivePath ./build/App.xcarchive -exportOptionsPlist "$plist_path" -exportPath ./build/ios
IPA=$(find ./build/ios -maxdepth 1 -type f -name '*.ipa' -print -quit)
SIZE=$(stat -f%z "$IPA")
echo IPA=$IPA
echo SIZE=$SIZE