@echo off
echo Running CompraCompleta.test.tsx (v3)...
npx jest src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit > compra_output_v3.txt 2>&1
echo Done.
exit /b 0