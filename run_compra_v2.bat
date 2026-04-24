@echo off
echo Running CompraCompleta.test.tsx (v2)...
npx jest src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit > compra_output_v2.txt 2>&1
echo Done.
exit /b 0