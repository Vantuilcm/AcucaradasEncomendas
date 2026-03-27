@echo off
set NODE_OPTIONS=--no-warnings
set JEST_WORKER_ID=1
echo Running AuthContext Test...
call node_modules\.bin\jest src/__tests__/contexts/AuthContext.test.tsx --verbose --no-cache --forceExit --detectOpenHandles > auth_context_output.txt 2>&1
echo Test completed. Output:
type auth_context_output.txt
