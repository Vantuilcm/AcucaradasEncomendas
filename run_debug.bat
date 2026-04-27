@echo off
set NODE_OPTIONS=--no-warnings
set JEST_WORKER_ID=1
echo Running CompraCompletaDebug.test.tsx...
echo Node Version:
node -v
echo.

if exist test_progress_log.txt del test_progress_log.txt
if exist debug_output.txt del debug_output.txt

call node_modules\.bin\jest src/__tests__/e2e/CompraCompletaDebug.test.tsx --verbose --no-cache --forceExit --detectOpenHandles --runInBand > debug_output.txt 2>&1

echo Test completed. Output:
type debug_output.txt
