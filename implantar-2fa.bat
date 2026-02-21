@echo off
echo =================================================
echo Iniciando implantação da função sendVerificationCode
echo =================================================

echo.
echo 1. Fazendo login no Firebase (se necessário)...
call firebase login

echo.
echo 2. Configurando o projeto acucaradas-encomendas...
call firebase use acucaradas-encomendas

echo.
echo 3. Configurando variáveis de ambiente para e-mail...
call firebase functions:config:set email.user="notificacao@acucaradas.com.br" email.password="app-senha-segura-123" email.sender="notificacao@acucaradas.com.br"

echo.
echo 4. Instalando dependências...
cd functions
call npm install
cd ..

echo.
echo 5. Implantando a função sendVerificationCode...
call firebase deploy --only functions:sendVerificationCode --project acucaradas-encomendas

echo.
echo =================================================
echo Implantação concluída!
echo =================================================
echo.
echo Para testar a função, execute: node test-2fa.js
echo Para verificar os logs: firebase functions:log
echo.
pause 