@echo off
set NODE_OPTIONS=--no-warnings
set JEST_WORKER_ID=1
echo Running Minimal App Test V2...
echo Node Version:
node -v
echo.

if exist test_progress_log.txt del test_progress_log.txt

call node_modules\.bin\jest src/__tests__/e2e/test_compra_minimo.test.tsx --verbose --no-cache --forceExit --detectOpenHandles > test_minimo_output.txt 2>&1

echo Test completed. Output:
type test_minimo_output.txt
