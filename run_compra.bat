@echo off
echo Running CompraCompleta.test.tsx...
call npx jest src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit > compra_output.txt 2>&1
echo Done.
exit /b 0
