@echo off
set NODE_OPTIONS=--no-warnings
set JEST_WORKER_ID=1
echo Running Sanity Test...
call node_modules\.bin\jest src/__tests__/simple.test.js --verbose --no-cache --forceExit --detectOpenHandles --runInBand > sanity_output.txt 2>&1
echo Test completed. Output:
type sanity_output.txt
