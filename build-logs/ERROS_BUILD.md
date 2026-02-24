## Erros de Build iOS

Code
Issues
Pull requests
Actions
Projects
Wiki
Security
5
 (5)
Insights
Settings
iOS Production Build (GitHub Free)
iOS Production Build (GitHub Free) #346
All jobs
Run details
🍎 Build iOS (Optimized)
succeeded 1 minute ago in 1m 19s
Search logs
3s
Current runner version: '2.331.0'
Runner Image Provisioner
Operating System
Runner Image
GITHUB_TOKEN Permissions
Secret source: Actions
Prepare workflow directory
Prepare all required actions
Getting action download info
Download action repository 'actions/checkout@v4' (SHA:34e114876b0b11c390a56381ad16ebd13914f8d5)
Download action repository 'actions/setup-node@v4' (SHA:49933ea5288caeca8642d1e84afbd3f7d6820020)
Download action repository 'expo/expo-github-action@v8' (SHA:c7b66a9c327a43a8fa7c0158e7f30d6040d2481e)
Download action repository 'actions/upload-artifact@v4' (SHA:ea165f8d65b6e75b540449e92b4886f43607fa02)
Complete job name: 🍎 Build iOS (Optimized)
5s
Run actions/checkout@v4
Syncing repository: Vantuilcm/AcucaradasEncomendas
Getting Git version info
Copying '/Users/runner/.gitconfig' to '/Users/runner/work/_temp/769ba744-f7b9-46db-8fb0-399c29dbf1f5/.gitconfig'
Temporarily overriding HOME='/Users/runner/work/_temp/769ba744-f7b9-46db-8fb0-399c29dbf1f5' before making global git config changes
Adding repository directory to the temporary git global config as a safe directory
/opt/homebrew/bin/git config --global --add safe.directory /Users/runner/work/AcucaradasEncomendas/AcucaradasEncomendas
Deleting the contents of '/Users/runner/work/AcucaradasEncomendas/AcucaradasEncomendas'
Initializing the repository
Disabling automatic garbage collection
Setting up auth
Fetching the repository
Determining the checkout info
/opt/homebrew/bin/git sparse-checkout disable
/opt/homebrew/bin/git config --local --unset-all extensions.worktreeConfig
Checking out the ref
  /opt/homebrew/bin/git checkout --progress --force -B upgrade/sdk-52-rn-076 refs/remotes/origin/upgrade/sdk-52-rn-076
  Updating files:  45% (10298/22700)
  Updating files:  46% (10442/22700)
  Updating files:  47% (10669/22700)
  Updating files:  48% (10896/22700)
  Updating files:  49% (11123/22700)
  Updating files:  50% (11350/22700)
  Updating files:  51% (11577/22700)
  Updating files:  52% (11804/22700)
  Updating files:  53% (12031/22700)
  Updating files:  54% (12258/22700)
  Updating files:  55% (12485/22700)
  Updating files:  56% (12712/22700)
  Updating files:  57% (12939/22700)
  Updating files:  58% (13166/22700)
  Updating files:  59% (13393/22700)
  Updating files:  60% (13620/22700)
  Updating files:  61% (13847/22700)
  Updating files:  62% (14074/22700)
  Updating files:  63% (14301/22700)
  Updating files:  64% (14528/22700)
  Updating files:  65% (14755/22700)
  Updating files:  66% (14982/22700)
  Updating files:  67% (15209/22700)
  Updating files:  68% (15436/22700)
  Updating files:  69% (15663/22700)
  Updating files:  70% (15890/22700)
  Updating files:  71% (16117/22700)
  Updating files:  72% (16344/22700)
  Updating files:  73% (16571/22700)
  Updating files:  74% (16798/22700)
  Updating files:  75% (17025/22700)
  Updating files:  76% (17252/22700)
  Updating files:  77% (17479/22700)
  Updating files:  78% (17706/22700)
  Updating files:  79% (17933/22700)
  Updating files:  80% (18160/22700)
  Updating files:  81% (18387/22700)
  Updating files:  82% (18614/22700)
  Updating files:  82% (18679/22700)
  Updating files:  83% (18841/22700)
  Updating files:  84% (19068/22700)
  Updating files:  85% (19295/22700)
  Updating files:  86% (19522/22700)
  Updating files:  87% (19749/22700)
  Updating files:  88% (19976/22700)
  Updating files:  89% (20203/22700)
  Updating files:  90% (20430/22700)
  Updating files:  91% (20657/22700)
  Updating files:  92% (20884/22700)
  Updating files:  93% (21111/22700)
  Updating files:  94% (21338/22700)
  Updating files:  95% (21565/22700)
  Updating files:  96% (21792/22700)
  Updating files:  97% (22019/22700)
  Updating files:  98% (22246/22700)
  Updating files:  99% (22473/22700)
  Updating files: 100% (22700/22700)
  Updating files: 100% (22700/22700), done.
  Switched to a new branch 'upgrade/sdk-52-rn-076'
  branch 'upgrade/sdk-52-rn-076' set up to track 'origin/upgrade/sdk-52-rn-076'.
/opt/homebrew/bin/git log -1 --format=%H
6b582c1de68c52a6d0eba45a68d796e50500bbb0
10s
Run actions/setup-node@v4
  
Attempting to download 20.19.4...
Acquiring 20.19.4 - arm64 from https://github.com/actions/node-versions/releases/download/20.19.4-16309772647/node-20.19.4-darwin-arm64.tar.gz
Extracting ...
/usr/bin/tar xz --strip 1 -C /Users/runner/work/_temp/b303ad51-0eec-46e6-b3f7-466c211d573c -f /Users/runner/work/_temp/01fee6e8-a448-4916-b374-c6445a5065cb
Adding to the cache ...
Environment details
/Users/runner/hostedtoolcache/node/20.19.4/arm64/bin/npm config get cache
/Users/runner/.npm
Cache hit for: node-cache-macOS-arm64-npm-9b1761f6a0b1c65d06231e27bfb0401fe443c81aad1bdaf31ec3c25d6e621143
Received 71303168 of 223264432 (31.9%), 68.0 MBs/sec
Received 138412032 of 223264432 (62.0%), 66.0 MBs/sec
Received 219070128 of 223264432 (98.1%), 69.6 MBs/sec
Received 223264432 of 223264432 (100.0%), 67.4 MBs/sec
Cache Size: ~213 MB (223264432 B)
/opt/homebrew/bin/gtar -xf /Users/runner/work/_temp/641b9959-9fe4-4794-8190-974e8441e402/cache.tzst -P -C /Users/runner/work/AcucaradasEncomendas/AcucaradasEncomendas --delay-directory-restore --use-compress-program unzstd
Cache restored successfully
Cache restored from key: node-cache-macOS-arm64-npm-9b1761f6a0b1c65d06231e27bfb0401fe443c81aad1bdaf31ec3c25d6e621143
1s
Run node -e "const fs=require('fs'); const path='app.json'; const raw=fs.readFileSync(path,'utf8'); const data=JSON.parse(raw); const expo=data.expo||{}; const ios=expo.ios||{}; const build=Number(ios.buildNumber||0); const min=362; if (!Number.isFinite(build) || build < min) { expo.ios = { ...ios, buildNumber: String(min) }; data.expo = expo; fs.writeFileSync(path, JSON.stringify(data, null, 2)); console.log('buildNumber atualizado para', min, 'no workspace'); } else { console.log('buildNumber já está >=', min, ':', build); }"
  
buildNumber já está >= 362 : 362
17s
Run npm config set fetch-retries 5
  
npm warn deprecated watchman@1.0.0: Package no longer supported. Contact support@npmjs.com for more info.
npm warn deprecated osenv@0.1.5: This package is no longer supported.
npm warn deprecated @npmcli/move-file@1.1.2: This functionality has been moved to @npmcli/fs
npm warn deprecated @babel/plugin-proposal-optional-catch-binding@7.18.6: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-optional-catch-binding instead.
npm warn deprecated @babel/plugin-proposal-numeric-separator@7.18.6: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-numeric-separator instead.
npm warn deprecated @babel/plugin-proposal-export-namespace-from@7.18.9: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-export-namespace-from instead.
npm warn deprecated @babel/plugin-proposal-class-properties@7.18.6: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-class-properties instead.
npm warn deprecated @babel/plugin-proposal-nullish-coalescing-operator@7.18.6: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-nullish-coalescing-operator instead.
npm warn deprecated rimraf@2.4.5: Rimraf versions prior to v4 are no longer supported
npm warn deprecated rimraf@2.6.3: Rimraf versions prior to v4 are no longer supported
npm warn deprecated @babel/plugin-proposal-optional-chaining@7.21.0: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-optional-chaining instead.
npm warn deprecated @babel/plugin-proposal-async-generator-functions@7.20.7: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-async-generator-functions instead.
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@6.0.4: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.2.3: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated sudo-prompt@9.2.1: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated @babel/plugin-proposal-object-rest-spread@7.20.7: This proposal has been merged to the ECMAScript standard and thus this plugin is no longer maintained. Please use @babel/plugin-transform-object-rest-spread instead.
npm warn deprecated glob@7.1.6: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.1.6: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated sudo-prompt@9.1.1: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
npm warn deprecated glob@7.1.6: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.1.6: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated glob@7.1.6: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
npm warn deprecated metro-react-native-babel-preset@0.76.8: Use @react-native/babel-preset instead
npm warn deprecated metro-react-native-babel-preset@0.76.9: Use @react-native/babel-preset instead
npm warn deprecated metro-react-native-babel-preset@0.76.9: Use @react-native/babel-preset instead
npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
npm warn deprecated uuid@3.4.0: Please upgrade  to version 7 or higher.  Older versions may use Math.random() in certain circumstances, which is known to be problematic.  See https://v8.dev/blog/math-random for details.
npm warn deprecated uglify-es@3.3.10: support for ECMAScript is superseded by `uglify-js` as of v3.13.0
npm warn deprecated @react-native-voice/voice@3.1.5: This package is deprecated. Use expo-speech-recognition instead.
added 1601 packages in 17s
1s
Run echo "ref=${GITHUB_REF}" 
ref=refs/heads/upgrade/sdk-52-rn-076
sha=6b582c1de68c52a6d0eba45a68d796e50500bbb0
6b582c1d fix-config-eas-expo-build-ios-362
app.json expo.version= 1.0.1
app.json ios.buildNumber= 362
package.json version= 1.0.1
0s
Run echo "SENTRY_DISABLE_AUTO_UPLOAD=$SENTRY_DISABLE_AUTO_UPLOAD"
SENTRY_DISABLE_AUTO_UPLOAD=1
SENTRY_ALLOW_FAILURE=1
0s
Run export SENTRY_DISABLE_AUTO_UPLOAD=1
SENTRY_DISABLE_AUTO_UPLOAD=1
SENTRY_ALLOW_FAILURE=1
0s
Run STUBBIN="$HOME/.local/bin"
  
1s
Run node -e "const fs=require('fs'); const app=JSON.parse(fs.readFileSync('app.json','utf8')).expo||{}; const expected={version: app.version, buildNumber: String(app.ios?.buildNumber||'')}; const raw=JSON.parse(require('child_process').execSync('npx expo config --type public --json',{encoding:'utf8'})); const cfg=(raw && (raw.expo||raw.exp)) ? (raw.expo||raw.exp) : raw; const got={version: cfg?.version, buildNumber: String(cfg?.ios?.buildNumber||'')}; console.log('expected', expected); console.log('got', got); if (!expected.version || !expected.buildNumber) { console.error('Missing expo.version or ios.buildNumber in app.json'); process.exit(1); } if (expected.version !== got.version || expected.buildNumber !== got.buildNumber) { console.error('Expo config mismatch (likely wrong commit/config override).'); process.exit(1); }"
  
expected { version: '1.0.1', buildNumber: '362' }
got { version: '1.0.1', buildNumber: '362' }
0s
Run if [ -d "node_modules/expo-modules-core" ]; then
Checking expo-modules-core package.json...
  "main": "build/index.js",
  "homepage": "https://github.com/expo/expo/tree/main/packages/expo-modules-core",
Checking expo-modules-core folder structure...
CHANGELOG.md
ExpoModulesCore.podspec
README.md
android/
android-annotation/
android-annotation-processor/
build/
common/
expo-module.config.json
index.js
ios/
package.json
react-native.config.js
src/
tsconfig.json
unimodule.json
EventEmitter.d.ts
EventEmitter.d.ts.map
EventEmitter.js
EventEmitter.js.map
NativeModulesProxy.d.ts
NativeModulesProxy.d.ts.map
NativeModulesProxy.js
NativeModulesProxy.js.map
NativeModulesProxy.native.d.ts
NativeModulesProxy.native.d.ts.map
NativeModulesProxy.native.js
NativeModulesProxy.native.js.map
NativeModulesProxy.types.d.ts
NativeModulesProxy.types.d.ts.map
NativeModulesProxy.types.js
NativeModulesProxy.types.js.map
NativeViewManagerAdapter.d.ts
NativeViewManagerAdapter.d.ts.map
NativeViewManagerAdapter.js
NativeViewManagerAdapter.js.map
NativeViewManagerAdapter.native.d.ts
NativeViewManagerAdapter.native.d.ts.map
NativeViewManagerAdapter.native.js
NativeViewManagerAdapter.native.js.map
PermissionsHook.d.ts
PermissionsHook.d.ts.map
PermissionsHook.js
PermissionsHook.js.map
PermissionsInterface.d.ts
PermissionsInterface.d.ts.map
PermissionsInterface.js
PermissionsInterface.js.map
Platform.d.ts
Platform.d.ts.map
Platform.js
Platform.js.map
SyntheticPlatformEmitter.d.ts
SyntheticPlatformEmitter.d.ts.map
SyntheticPlatformEmitter.js
SyntheticPlatformEmitter.js.map
TypedArrays.types.d.ts
TypedArrays.types.d.ts.map
TypedArrays.types.js
TypedArrays.types.js.map
deprecate.d.ts
deprecate.d.ts.map
deprecate.js
deprecate.js.map
environment/
errors/
index.d.ts
index.d.ts.map
index.js
index.js.map
requireNativeModule.d.ts
requireNativeModule.d.ts.map
requireNativeModule.js
requireNativeModule.js.map
sweet/
0s
Run npm run prepare:ios
  npm run prepare:ios
  shell: /bin/bash -e {0}
  env:
    SENTRY_DISABLE_AUTO_UPLOAD: 1
    SENTRY_ALLOW_FAILURE: 1
    EXPO_PUBLIC_ENABLE_SENTRY: 0
    SENTRY_AUTH_TOKEN: 
    SENTRY_ORG: 
    SENTRY_PROJECT: 
    SENTRY_URL: 
    SENTRY_DSN: 
    GOOGLE_SERVICE_INFO_PLIST: ***
  
    APPLE_CERT_BASE64: ***
  
    APPLE_PROVISION_BASE64: ***
  
    APPLE_CERT_PASSWORD: ***
    ONESIGNAL_CERT_BASE64: ***
    ONESIGNAL_PROVISION_BASE64: ***
  
    EXPO_APPLE_ID: ***
    EXPO_NO_CAPABILITY_SYNC: 1
    EXPO_USE_METRO_WORKSPACE_ROOT: 1
    EXPO_NO_TELEMETRY: 1
    NODE_OPTIONS: --max-old-space-size=8192
  
> ***@1.0.1 prepare:ios
> node ./scripts/prepare-ios-build.js
--- 🍎 PREPARAÇÃO PARA BUILD IOS (GITHUB FREE) ---
✅ buildNumber já está >= 362: 362
🧹 Removendo pasta ios/ antiga para consistência...
✅ Pasta ios/ removida.
✅ Criando GoogleService-Info.prod.plist a partir da variável de ambiente (XML Válido)...
✅ .env.sentry-build-plugin criado para evitar falha do Sentry no build.
🔓 Decodificando APPLE_CERT_BASE64 -> credentials/ios/AcucaradasEncomendas-dist-cert.p12
✅ AcucaradasEncomendas-dist-cert.p12 gerado com sucesso.
🔓 Decodificando APPLE_PROVISION_BASE64 -> credentials/ios/AcucaradasEncomendas-profile.mobileprovision
✅ AcucaradasEncomendas-profile.mobileprovision gerado com sucesso.
🔓 Decodificando ONESIGNAL_CERT_BASE64 -> credentials/ios/OneSignalNotificationServiceExtension-dist-cert.p12
✅ OneSignalNotificationServiceExtension-dist-cert.p12 gerado com sucesso.
🔓 Decodificando ONESIGNAL_PROVISION_BASE64 -> credentials/ios/OneSignalNotificationServiceExtension-profile.mobileprovision
✅ OneSignalNotificationServiceExtension-profile.mobileprovision gerado com sucesso.
✅ credentials.json gerado para build local.
✅ Ambiente preparado com sucesso!
22s
Run expo/expo-github-action@v8
  
Skipped installing expo-cli: 'expo-version' not provided.
Installing eas-cli (18.0.3) with yarn
  /Users/runner/.yarn/bin/yarn add eas-cli@18.0.3
  yarn add v1.22.22
  info No lockfile found.
  [1/4] Resolving packages...
  warning eas-cli > tar@7.5.7: Old versions of tar are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
  warning eas-cli > @expo/plist > @xmldom/xmldom@0.7.13: this version is no longer supported, please update to at least 0.8.*
  warning eas-cli > @expo/config-plugins > @expo/plist > @xmldom/xmldom@0.7.13: this version is no longer supported, please update to at least 0.8.*
  warning eas-cli > @oclif/core > @oclif/screen@3.0.8: Package no longer supported. Contact Support at https://www.npmjs.com/support for more info.
  warning eas-cli > @expo/config > glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
  warning eas-cli > @expo/config-plugins > glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
  warning eas-cli > @expo/config > @expo/config-plugins > glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
  warning eas-cli > @expo/prebuild-config > @expo/config > glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
  warning eas-cli > minizlib > rimraf > glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
  warning eas-cli > @expo/config > sucrase > glob@10.5.0: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
  warning eas-cli > @expo/steps > lodash.get@4.4.2: This package is deprecated. Use the optional chaining (?.) operator instead.
  warning eas-cli > @expo/logger > bunyan > mv > rimraf@2.4.5: Rimraf versions prior to v4 are no longer supported
  warning eas-cli > @expo/logger > bunyan > mv > rimraf > glob@6.0.4: Old versions of glob are not supported, and contain widely publicized security vulnerabilities, which have been fixed in the current version. Please update. Support for old versions may be purchased (at exorbitant rates) by contacting i@izs.me
  warning eas-cli > @expo/logger > bunyan > mv > rimraf > glob > inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
  [2/4] Fetching packages...
  [3/4] Linking dependencies...
  warning "eas-cli > @expo/plugin-help > @oclif/core > ts-node@10.9.2" has unmet peer dependency "@types/node@*".
  warning "eas-cli > @expo/plugin-help > @oclif/core > ts-node@10.9.2" has unmet peer dependency "typescript@>=2.7".
  [4/4] Building fresh packages...
  success Saved lockfile.
  success Saved 281 new dependencies.
  info Direct dependencies
  └─ eas-cli@18.0.3
  info All dependencies
  ├─ @0no-co/graphql.web@1.2.0
  ├─ @babel/helper-validator-identifier@7.28.5
  ├─ @babel/highlight@7.25.9
  ├─ @cspotcode/source-map-support@0.8.1
  ├─ @expo/apple-utils@2.1.13
  ├─ @expo/bunyan@4.0.1
  ├─ @expo/code-signing-certificates@0.0.5
  ├─ @expo/config-plugins@9.0.17
  ├─ @expo/config@10.0.6
  ├─ @expo/eas-json@18.0.2
  ├─ @expo/env@1.0.7
  ├─ @expo/image-utils@0.6.5
  ├─ @expo/json-file@9.1.5
  ├─ @expo/multipart-body-parser@2.0.0
  ├─ @expo/osascript@2.1.4
  ├─ @expo/package-manager@1.9.10
  ├─ @expo/pkcs12@0.1.3
  ├─ @expo/plist@0.2.2
  ├─ @expo/plugin-help@5.1.23
  ├─ @expo/plugin-warn-if-update-available@2.5.1
  ├─ @expo/prebuild-config@8.0.17
  ├─ @expo/results@1.0.0
  ├─ @expo/rudder-sdk-node@1.1.1
  ├─ @expo/steps@18.0.2
  ├─ @expo/timeago.js@1.0.0
  ├─ @hapi/topo@5.1.0
  ├─ @isaacs/cliui@8.0.2
  ├─ @isaacs/fs-minipass@4.0.1
  ├─ @jridgewell/gen-mapping@0.3.13
  ├─ @jridgewell/resolve-uri@3.1.2
  ├─ @jridgewell/sourcemap-codec@1.5.5
  ├─ @jridgewell/trace-mapping@0.3.9
  ├─ @nodelib/fs.scandir@2.1.5
  ├─ @nodelib/fs.stat@2.0.5
  ├─ @oclif/linewrap@1.0.0
  ├─ @oclif/plugin-autocomplete@2.3.10
  ├─ @oclif/screen@3.0.8
  ├─ @pkgjs/parseargs@0.11.0
  ├─ @react-native/normalize-colors@0.76.2
  ├─ @segment/ajv-human-errors@2.15.0
  ├─ @segment/loosely-validate-event@2.0.0
  ├─ @sideway/address@4.1.5
  ├─ @tsconfig/node10@1.0.12
  ├─ @tsconfig/node12@1.0.11
  ├─ @tsconfig/node14@1.0.3
  ├─ @tsconfig/node16@1.0.4
  ├─ @types/bunyan@1.8.11
  ├─ @types/cli-progress@3.11.6
  ├─ @urql/core@4.0.11
  ├─ @urql/exchange-retry@1.2.0
  ├─ acorn-walk@8.3.5
  ├─ acorn@8.16.0
  ├─ agent-base@6.0.2
  ├─ ajv-formats@2.1.1
  ├─ ajv@8.11.0
  ├─ ansicolors@0.3.2
  ├─ arg@4.1.3
  ├─ argparse@1.0.10
  ├─ array-union@2.1.0
  ├─ asn1@0.2.6
  ├─ astral-regex@2.0.0
  ├─ async@3.2.6
  ├─ asynckit@0.4.0
  ├─ balanced-match@1.0.2
  ├─ bare-events@2.8.2
  ├─ base64-js@1.5.1
  ├─ better-opn@3.0.2
  ├─ bplist-creator@0.1.0
  ├─ bplist-parser@0.3.2
  ├─ braces@3.0.3
  ├─ bunyan@1.8.15
  ├─ call-bind-apply-helpers@1.0.2
  ├─ charenc@0.0.2
  ├─ chownr@3.0.0
  ├─ cli-cursor@3.1.0
  ├─ cli-progress@3.12.0
  ├─ cli-spinners@2.9.2
  ├─ clone@1.0.4
  ├─ color-convert@2.0.1
  ├─ color-name@1.1.4
  ├─ combined-stream@1.0.8
  ├─ commander@4.1.1
  ├─ component-type@1.2.2
  ├─ concat-map@0.0.1
  ├─ content-type@1.0.5
  ├─ create-require@1.1.1
  ├─ cross-spawn@7.0.6
  ├─ crypt@0.0.2
  ├─ crypto-random-string@2.0.0
  ├─ dateformat@4.6.3
  ├─ debug@4.4.3
  ├─ defaults@1.0.4
  ├─ define-lazy-prop@2.0.0
  ├─ delayed-stream@1.0.0
  ├─ diff@7.0.0
  ├─ dir-glob@3.0.1
  ├─ domino@2.1.6
  ├─ dotenv-expand@11.0.7
  ├─ dotenv@16.3.1
  ├─ dtrace-provider@0.8.8
  ├─ dunder-proto@1.0.1
  ├─ eas-cli@18.0.3
  ├─ eastasianwidth@0.2.0
  ├─ ejs@3.1.10
  ├─ env-paths@2.2.0
  ├─ env-string@1.0.1
  ├─ envinfo@7.11.0
  ├─ err-code@2.0.3
  ├─ error-ex@1.3.4
  ├─ es-define-property@1.0.1
  ├─ es-object-atoms@1.1.1
  ├─ es-set-tostringtag@2.1.0
  ├─ esprima@4.0.1
  ├─ events-universal@1.0.1
  ├─ exec-async@2.2.0
  ├─ fast-deep-equal@3.1.3
  ├─ fast-fifo@1.3.2
  ├─ fast-glob@3.3.2
  ├─ fast-uri@3.1.0
  ├─ fastq@1.20.1
  ├─ fetch-retry@4.1.1
  ├─ figures@3.2.0
  ├─ filelist@1.0.4
  ├─ fill-range@7.1.1
  ├─ find-up@4.1.0
  ├─ foreground-child@3.3.1
  ├─ form-data@4.0.5
  ├─ get-intrinsic@1.3.0
  ├─ get-proto@1.0.1
  ├─ glob@10.5.0
  ├─ golden-fleece@1.0.9
  ├─ gradle-to-js@2.0.1
  ├─ graphql-tag@2.12.6
  ├─ graphql@16.8.1
  ├─ has-symbols@1.1.0
  ├─ has-tostringtag@1.0.2
  ├─ hosted-git-info@7.0.2
  ├─ http-call@5.3.0
  ├─ https-proxy-agent@5.0.1
  ├─ ignore@5.3.0
  ├─ imurmurhash@0.1.4
  ├─ inflight@1.0.6
  ├─ inherits@2.0.4
  ├─ invariant@2.2.4
  ├─ is-arrayish@0.2.1
  ├─ is-buffer@1.1.6
  ├─ is-docker@2.2.1
  ├─ is-extglob@2.1.1
  ├─ is-glob@4.0.3
  ├─ is-interactive@1.0.0
  ├─ is-number@7.0.0
  ├─ is-retry-allowed@1.2.0
  ├─ is-stream@2.0.1
  ├─ is-unicode-supported@0.1.0
  ├─ isexe@2.0.0
  ├─ jackspeak@3.4.3
  ├─ jake@10.9.4
  ├─ jimp-compact@0.16.1
  ├─ jks-js@1.1.0
  ├─ join-component@1.1.0
  ├─ js-tokens@4.0.0
  ├─ jsep@1.4.0
  ├─ json-parse-better-errors@1.0.2
  ├─ keychain@1.5.0
  ├─ kleur@3.0.3
  ├─ lines-and-columns@1.2.4
  ├─ locate-path@5.0.0
  ├─ lodash.clonedeep@4.5.0
  ├─ lodash.get@4.4.2
  ├─ lodash.merge@4.6.2
  ├─ loose-envify@1.4.0
  ├─ lru-cache@10.4.3
  ├─ make-error@1.3.6
  ├─ math-intrinsics@1.1.0
  ├─ md5@2.3.0
  ├─ micromatch@4.0.8
  ├─ mime-db@1.52.0
  ├─ mime-types@2.1.35
  ├─ mime@3.0.0
  ├─ mimic-fn@2.1.0
  ├─ minimatch@5.1.2
  ├─ minimist@1.2.8
  ├─ minipass@7.1.3
  ├─ minizlib@3.0.1
  ├─ mkdirp@0.5.6
  ├─ moment@2.30.1
  ├─ ms@2.1.3
  ├─ multipasta@0.2.7
  ├─ mute-stream@0.0.8
  ├─ mv@2.1.1
  ├─ mz@2.7.0
  ├─ nan@2.25.0
  ├─ nanoid@3.3.8
  ├─ ncp@2.0.0
  ├─ node-fetch@2.6.7
  ├─ node-int64@0.4.0
  ├─ node-rsa@1.1.1
  ├─ node-stream-zip@1.15.0
  ├─ npm-package-arg@11.0.3
  ├─ nullthrows@1.1.1
  ├─ object-assign@4.1.1
  ├─ onetime@5.1.2
  ├─ open@8.4.2
  ├─ ora@5.1.0
  ├─ p-limit@2.3.0
  ├─ p-locate@4.1.0
  ├─ p-try@2.2.0
  ├─ package-json-from-dist@1.0.1
  ├─ parse-json@4.0.0
  ├─ parse-png@2.1.0
  ├─ path-exists@4.0.0
  ├─ path-is-absolute@1.0.1
  ├─ path-key@3.1.1
  ├─ path-scurry@1.11.1
  ├─ path-type@4.0.0
  ├─ picocolors@1.1.1
  ├─ picomatch@2.3.1
  ├─ pirates@4.0.7
  ├─ pkg-dir@4.2.0
  ├─ plist@3.1.0
  ├─ pngjs@7.0.0
  ├─ proc-log@4.2.0
  ├─ promise-limit@2.7.0
  ├─ promise-retry@2.0.1
  ├─ prompts@2.4.2
  ├─ punycode@2.3.1
  ├─ qrcode-terminal@0.12.0
  ├─ queue-microtask@1.2.3
  ├─ redeyed@2.1.1
  ├─ remove-trailing-slash@0.1.1
  ├─ restore-cursor@3.1.0
  ├─ retry@0.12.0
  ├─ reusify@1.1.0
  ├─ rimraf@5.0.10
  ├─ run-parallel@1.2.0
  ├─ safe-buffer@5.2.1
  ├─ safe-json-stringify@1.2.0
  ├─ safer-buffer@2.1.2
  ├─ sax@1.4.4
  ├─ set-interval-async@3.0.3
  ├─ shebang-command@2.0.0
  ├─ shebang-regex@3.0.0
  ├─ simple-plist@1.3.1
  ├─ sisteransi@1.0.5
  ├─ slice-ansi@4.0.0
  ├─ sprintf-js@1.0.3
  ├─ stream-buffers@2.2.0
  ├─ streamx@2.23.0
  ├─ string-width-cjs@4.2.3
  ├─ strip-ansi-cjs@6.0.1
  ├─ supports-color@7.2.0
  ├─ tar-stream@3.1.7
  ├─ tar@7.5.7
  ├─ temp-dir@2.0.0
  ├─ text-decoder@1.2.7
  ├─ thenify-all@1.6.0
  ├─ thenify@3.3.1
  ├─ to-regex-range@5.0.1
  ├─ tr46@0.0.3
  ├─ ts-deepmerge@6.2.0
  ├─ ts-interface-checker@0.1.13
  ├─ ts-node@10.9.2
  ├─ tslib@2.8.1
  ├─ tunnel-agent@0.6.0
  ├─ turndown@7.1.2
  ├─ type-fest@0.21.3
  ├─ undici-types@7.18.2
  ├─ unique-string@2.0.0
  ├─ untildify@4.0.0
  ├─ uri-js@4.4.1
  ├─ uuid@8.3.2
  ├─ v8-compile-cache-lib@3.0.1
  ├─ validate-npm-package-name@5.0.1
  ├─ webidl-conversions@3.0.1
  ├─ which@2.0.2
  ├─ wordwrap@1.0.0
  ├─ wrap-ansi-cjs@7.0.0
  ├─ yallist@5.0.0
  ├─ yaml@2.6.0
  ├─ yn@3.1.1
  └─ zod@4.3.6
  Done in 16.61s.
Validating authenticated account
  /Users/runner/hostedtoolcache/eas-cli/18.0.3/arm64/node_modules/.bin/eas whoami
  acucaradaencomendas (authenticated using EXPO_TOKEN)
  Accounts:
  • acucaradaencomendas (Role: Owner)
  • cozinhaconecta-solucoes (Role: Owner)
Patching system watchers for the 'ENOSPC' error
  
0s
Run if command -v xcbeautify >/dev/null 2>&1; then
xcbeautify já instalado
4s
Run if [ -d "/Applications/Xcode_16.2.app" ]; then
Selecionando Xcode 16.2 em /Applications/Xcode_16.2.app/Contents/Developer
Xcode 16.2
Build version 16C5032a
18.2
0s
Run ls -d /Applications/Xcode*.app 2>/dev/null || ***
/Applications/Xcode.app
/Applications/Xcode_15.0.1.app
/Applications/Xcode_15.0.app
/Applications/Xcode_15.1.0.app
/Applications/Xcode_15.1.app
/Applications/Xcode_15.2.0.app
/Applications/Xcode_15.2.app
/Applications/Xcode_15.3.0.app
/Applications/Xcode_15.3.app
/Applications/Xcode_15.4.0.app
/Applications/Xcode_15.4.app
/Applications/Xcode_16.1.0.app
/Applications/Xcode_16.1.app
/Applications/Xcode_16.2.0.app
/Applications/Xcode_16.2.app
Xcode 16.2
Build version 16C5032a
18.2
1s
Run node scripts/verify-build-readiness.js
  node scripts/verify-build-readiness.js
  shell: /bin/bash -e {0}
  env:
    SENTRY_DISABLE_AUTO_UPLOAD: 1
    SENTRY_ALLOW_FAILURE: 1
    EXPO_PUBLIC_ENABLE_SENTRY: 0
    SENTRY_AUTH_TOKEN: 
    SENTRY_ORG: 
    SENTRY_PROJECT: 
    SENTRY_URL: 
    SENTRY_DSN: 
    EXPO_TOKEN: ***
    DEVELOPER_DIR: /Applications/Xcode_16.2.app/Contents/Developer
    APPLE_CERT_BASE64: ***
  
    APPLE_PROVISION_BASE64: ***
  
    APPLE_CERT_PASSWORD: ***
🧐 Iniciando Auditoria Final de Build...
✅ Project ID no app.json está correto.
✅ Project ID no eas.json está consistente.
✅ Configuração de OneSignal/AppGroups validada.
✅ Sentry desativado no eas.json/ambiente.
✅ Versão efetiva (expo config): 1.0.1
✅ BuildNumber efetivo (expo config): 362
✅ Versão do Metro ignorada (confiando no package.json).
✅ Script presente: scripts/prepare-ios-build.js
✅ credentials.json presente.
ℹ️ Xcode: Xcode 16.2 Build version 16C5032a
ℹ️ iOS SDK (iphoneos): 18.2
ℹ️ Versão do Node.js atual: v20.19.4
ℹ️ Versão do Node.js requerida: 18.0.0 <23.0.0
✅ Versão do Node.js atende o mínimo exigido (>=18.0.0 <23.0.0).
✅ .expo/ está no .gitignore.
🚀 TUDO PRONTO! O build tem alta probabilidade de sucesso.
1s
Run echo "Checking Expo Config after preparation..."
Checking Expo Config after preparation...
{"name":"Açucaradas Encomendas","slug":"***","version":"1.0.1","orientation":"portrait","icon":"./assets/icon.png","userInterfaceStyle":"light","splash":{"image":"./assets/splash.png","resizeMode":"contain","backgroundColor":"#ffffff"},"assetBundlePatterns":["**/*"],"ios":{"supportsTablet":***,"bundleIdentifier":"com.acucaradas.encomendas","buildNumber":"362","infoPlist":{"NSCameraUsageDescription":"Este aplicativo usa a câmera para escanear códigos QR e tirar fotos dos produtos.","NSPhotoLibraryUsageDescription":"Este aplicativo precisa acessar sua galeria para selecionar imagens para os produtos.","NSMicrophoneUsageDescription":"Este aplicativo usa o microfone para gravar notas de voz para os pedidos.","NSLocationWhenInUseUsageDescription":"Este aplicativo usa sua localização para encontrar confeitarias próximas e calcular o tempo de entrega.","UIBackgroundModes":["remote-notification"],"ITSAppUsesNonExemptEncryption":false},"googleServicesFile":"./ios/GoogleService-Info.prod.plist"},"android":{"adaptiveIco
EXPO_PUBLIC_ENABLE_SENTRY=0
EXPO_TOKEN=***
1s
Run echo "SENTRY_DISABLE_AUTO_UPLOAD=1" > .env.sentry-build-plugin
  
SENTRY_DISABLE_AUTO_UPLOAD=1
SENTRY_ALLOW_FAILURE=1
== .env.sentry-build-plugin ==
-rw-r--r--  1 runner  staff  52 Feb 21 23:28 .env.sentry-build-plugin
SENTRY_DISABLE_AUTO_UPLOAD=1
SENTRY_ALLOW_FAILURE=1
0s
Run mkdir -p ci-bin
  
1s
Run export SENTRY_DISABLE_AUTO_UPLOAD=1
  
node:internal/modules/cjs/loader:1215
  throw err;
  ^
Error: Cannot find module '/Users/runner/work/AcucaradasEncomendas/AcucaradasEncomendas/scripts/ci-prepare-sentry.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)
    at Module._load (node:internal/modules/cjs/loader:1043:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)
    at node:internal/main/run_main_module:28:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}
Node.js v20.19.4
node:internal/modules/cjs/loader:1215
  throw err;
  ^
Error: Cannot find module '/Users/runner/work/AcucaradasEncomendas/AcucaradasEncomendas/scripts/ios-nuke-sentry-phases.js'
    at Module._resolveFilename (node:internal/modules/cjs/loader:1212:15)
    at Module._load (node:internal/modules/cjs/loader:1043:27)
    at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:164:12)
    at node:internal/main/run_main_module:28:49 {
  code: 'MODULE_NOT_FOUND',
  requireStack: []
}
Node.js v20.19.4
-rw-r--r--  1 runner  staff  52 Feb 21 23:29 .env.sentry-build-plugin
-rw-r--r--  1 runner  staff  52 Feb 21 23:29 ios/.env.sentry-build-plugin
5s
Run if [ -z "${DEVELOPER_DIR:-}" ]; then
DEVELOPER_DIR=/Applications/Xcode_16.2.app/Contents/Developer
Xcode 16.2
Build version 16C5032a
Xcode 16.2
Build version 16C5032a
SENTRY_DISABLE_AUTO_UPLOAD=1
SENTRY_ALLOW_FAILURE=1
-rw-r--r--  1 runner  staff  52 Feb 21 23:29 .env.sentry-build-plugin
SENTRY_DISABLE_AUTO_UPLOAD=1
SENTRY_ALLOW_FAILURE=1
🚀 Iniciando Build iOS Local via Script Seguro
> ***@1.0.1 build:ios
> eas build --platform ios --profile production --local --non-interactive --output ./build-artifacts/Acucaradas.ipa
Using EAS CLI without version control system is not recommended, use this mode only if you know what you are doing.
Resolved "production" environment for the build. Learn more: https://docs.expo.dev/eas/environment-variables/#setting-the-environment-for-your-builds
Environment variables with visibility "Plain text" and "Sensitive" loaded from the "production" environment on EAS: EXPO_PUBLIC_API_URL, EXPO_PUBLIC_APPLE_MERCHANT_ID, EXPO_PUBLIC_ENABLE_DEVICE_SECURITY_CHECKS, EXPO_PUBLIC_ENABLE_ONESIGNAL, EXPO_PUBLIC_ENABLE_SENTRY, EXPO_PUBLIC_FACEBOOK_APP_ID, EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_APP_ID, EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN, EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID, EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, EXPO_PUBLIC_FIREBASE_PROJECT_ID, EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET, EXPO_PUBLIC_FIREBASE_VAPID_KEY, EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS, EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB, EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID, EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID, EXPO_PUBLIC_ONESIGNAL_APP_ID, EXPO_PUBLIC_PROJECT_ID, EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY, GOOGLE_SERVICES_INFO_PLIST_BASE64.
Environment variables loaded from the "production" build profile "env" configuration: APP_ENV, EXPO_PUBLIC_APP_ENV, EXPO_PUBLIC_APP_NAME, EXPO_PUBLIC_APP_VERSION, EXPO_PUBLIC_PROJECT_ID.
The following environment variables are defined in both the "production" build profile "env" configuration and the "production" environment on EAS: EXPO_PUBLIC_PROJECT_ID. The values from the build profile configuration will be used.
Failed to read the app config from the project using "npx expo config" command: npx expo config --json --type introspect exited with non-zero code: 1.
Falling back to the version of "@expo/config" shipped with the EAS CLI.
Cannot find 'expo-modules-autolinking' package in your project, make sure that you have 'expo' package installed
    Error: build command failed.
0s
Run if [ -f "./build-artifacts/Acucaradas.ipa" ]; then
total 8
drwxr-xr-x    3 runner  staff    96 Feb 21 23:29 .
drwxr-xr-x  150 runner  staff  4800 Feb 21 23:29 ..
-rw-r--r--    1 runner  staff  2048 Feb 21 23:29 build.log
1s
Run actions/upload-artifact@v4
  
With the provided path, there will be 1 file uploaded
Artifact name is valid!
Root directory input is valid!
Beginning upload of artifact content to blob storage
Uploaded bytes 1011
Finished uploading artifact content to blob storage!
SHA256 digest of uploaded artifact zip is 2e1004fdf50fa82b02bf7794f3e6b3bb372eefb8d0b2888df49dca93b141edef
Finalizing artifact upload
Artifact ios-build-artifacts.zip successfully finalized. Artifact ID 5603854821
Artifact ios-build-artifacts has been successfully uploaded! Final size is 1011 bytes. Artifact ID is 5603854821
Artifact download URL: https://github.com/Vantuilcm/AcucaradasEncomendas/actions/runs/22266394219/artifacts/5603854821
0s
Post job cleanup.
Cache hit occurred on the primary key node-cache-macOS-arm64-npm-9b1761f6a0b1c65d06231e27bfb0401fe443c81aad1bdaf31ec3c25d6e621143, not saving cache.
1s
Post job cleanup.
/opt/homebrew/bin/git version
git version 2.53.0
Copying '/Users/runner/.gitconfig' to '/Users/runner/work/_temp/dd67fe35-3da2-41e9-bb8b-5aad2db04b88/.gitconfig'
Temporarily overriding HOME='/Users/runner/work/_temp/dd67fe35-3da2-41e9-bb8b-5aad2db04b88' before making global git config changes
Adding repository directory to the temporary git global config as a safe directory
/opt/homebrew/bin/git config --global --add safe.directory /Users/runner/work/AcucaradasEncomendas/AcucaradasEncomendas
/opt/homebrew/bin/git config --local --name-only --get-regexp core\.sshCommand
/opt/homebrew/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'core\.sshCommand' && git config --local --unset-all 'core.sshCommand' || :"
/opt/homebrew/bin/git config --local --name-only --get-regexp http\.https\:\/\/github\.com\/\.extraheader
http.https://github.com/.extraheader
/opt/homebrew/bin/git config --local --unset-all http.https://github.com/.extraheader
/opt/homebrew/bin/git submodule foreach --recursive sh -c "git config --local --name-only --get-regexp 'http\.https\:\/\/github\.com\/\.extraheader' && git config --local --unset-all 'http.https://github.com/.extraheader' || :"
/opt/homebrew/bin/git config --local --name-only --get-regexp ^includeIf\.gitdir:
/opt/homebrew/bin/git submodule foreach --recursive git config --local --show-origin --name-only --get-regexp remote.origin.url
0s
Cleaning up orphan processes

