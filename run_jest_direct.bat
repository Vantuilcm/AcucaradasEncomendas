@echo off
echo STARTING DIRECT JEST > compra_output_v7.txt
echo Node version: >> compra_output_v7.txt
call node -v >> compra_output_v7.txt 2>&1
echo Running jest script... >> compra_output_v7.txt
call node node_modules/jest/bin/jest.js src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit --runInBand >> compra_output_v7.txt 2>&1
echo DONE >> compra_output_v7.txt
exit /b 0
