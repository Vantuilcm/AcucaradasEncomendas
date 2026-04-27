@echo off
echo Running CompraCompleta.test.tsx (v4)...
npx jest src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit > compra_output_v4.txt 2>&1
echo Done.
exit /b 0