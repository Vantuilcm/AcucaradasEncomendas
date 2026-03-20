@echo off
set NODE_OPTIONS=--no-warnings
set JEST_WORKER_ID=1
echo Running Auth Import Test...
call node_modules\.bin\jest src/__tests__/e2e/test_auth_import.test.tsx --verbose --no-cache --forceExit --detectOpenHandles --runInBand > auth_import_output.txt 2>&1
echo Test completed. Output:
type auth_import_output.txt
