@echo off
set NODE_OPTIONS=--no-warnings
set JEST_WORKER_ID=1
echo Running CompraCompleta.test.tsx...
echo Node Version:
node -v
echo.

if exist test_progress_log.txt del test_progress_log.txt
if exist compra_final_output.txt del compra_final_output.txt

call node_modules\.bin\jest src/__tests__/e2e/CompraCompleta.test.tsx --verbose --no-cache --forceExit --detectOpenHandles --runInBand > compra_final_output.txt 2>&1

echo Test completed. Output:
type compra_final_output.txt
