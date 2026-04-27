@echo off
set NODE_OPTIONS=--no-warnings
set JEST_WORKER_ID=1
echo Running CompraCompleta.test.tsx...
echo Node Version:
node -v
echo.

if exist compra_test_progress.txt del compra_test_progress.txt
if exist compra_v7_output.txt del compra_v7_output.txt

call node_modules\.bin\jest src/__tests__/e2e/CompraCompleta.test.tsx --verbose --no-cache --forceExit --detectOpenHandles --runInBand > compra_v7_output.txt 2>&1

echo Test completed. Output:
type compra_v7_output.txt
