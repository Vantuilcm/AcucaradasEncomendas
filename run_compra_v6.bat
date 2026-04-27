@echo off
echo STARTING TEST > compra_output_v6.txt
echo Running CompraCompleta.test.tsx... >> compra_output_v6.txt
call npx jest src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit --runInBand >> compra_output_v6.txt 2>&1
echo DONE >> compra_output_v6.txt
exit /b 0
