@echo off
npx jest src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit > test_output.log 2>&1
if %ERRORLEVEL% EQU 0 (
  echo SUCCESS > test_status.txt
) else (
  echo FAILURE > test_status.txt
)
