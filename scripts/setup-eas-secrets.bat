@echo off
echo 🔐 Configurando EAS Secrets para Produção
echo.
echo IMPORTANTE: Este script irá configurar as variáveis de ambiente seguras.
echo Certifique-se de ter as chaves corretas antes de continuar.
echo.
pause

echo.
echo 📝 Configurando JWT Secret...
set /p JWT_SECRET="Digite o JWT_SECRET (mínimo 32 caracteres): "
eas secret:create --scope project --name JWT_SECRET --value "%JWT_SECRET%"

echo.
echo 🔥 Configurando Firebase API Key...
set /p FIREBASE_API_KEY="Digite o FIREBASE_API_KEY: "
eas secret:create --scope project --name FIREBASE_API_KEY --value "%FIREBASE_API_KEY%"

echo.
echo 🔥 Configurando Firebase Project ID...
set /p FIREBASE_PROJECT_ID="Digite o FIREBASE_PROJECT_ID (padrão: acucaradas-encomendas-prod): "
if "%FIREBASE_PROJECT_ID%"=="" set FIREBASE_PROJECT_ID=acucaradas-encomendas-prod
eas secret:create --scope project --name FIREBASE_PROJECT_ID --value "%FIREBASE_PROJECT_ID%"

echo.
echo 🔥 Configurando Firebase Auth Domain...
set /p FIREBASE_AUTH_DOMAIN="Digite o FIREBASE_AUTH_DOMAIN (padrão: acucaradas-encomendas-prod.firebaseapp.com): "
if "%FIREBASE_AUTH_DOMAIN%"=="" set FIREBASE_AUTH_DOMAIN=acucaradas-encomendas-prod.firebaseapp.com
eas secret:create --scope project --name FIREBASE_AUTH_DOMAIN --value "%FIREBASE_AUTH_DOMAIN%"

echo.
echo 🍎 Configurando Apple Developer...
set /p APPLE_ID="Digite o APPLE_ID (email): "
eas secret:create --scope project --name APPLE_ID --value "%APPLE_ID%"

set /p ASC_APP_ID="Digite o ASC_APP_ID: "
eas secret:create --scope project --name ASC_APP_ID --value "%ASC_APP_ID%"

set /p APPLE_TEAM_ID="Digite o APPLE_TEAM_ID: "
eas secret:create --scope project --name APPLE_TEAM_ID --value "%APPLE_TEAM_ID%"

echo.
echo 📱 Configurando Google Service Account...
set /p GOOGLE_SERVICE_ACCOUNT_KEY_PATH="Digite o caminho para o service account JSON: "
eas secret:create --scope project --name GOOGLE_SERVICE_ACCOUNT_KEY_PATH --value "%GOOGLE_SERVICE_ACCOUNT_KEY_PATH%"

echo.
echo ✅ Configuração de EAS Secrets concluída!
echo.
echo 📋 Próximos passos:
echo 1. Verifique se todas as secrets foram criadas: eas secret:list
echo 2. Execute a validação: npm run validate-security
echo 3. Teste o build: npm run build:android ou npm run build:ios
echo.
pause