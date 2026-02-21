@echo off
echo Copiando simple-index.js para index.js temporariamente...
copy simple-index.js index.js /Y
echo Implantando a função sendVerificationCode...
firebase deploy --only functions:sendVerificationCode --project acucaradas-encomendas
echo Implantação concluída!
pause 