@echo off
echo STARTING JEST CMD > compra_output_v8.txt
call .\node_modules\.bin\jest.cmd src/__tests__/e2e/CompraCompleta.test.tsx --detectOpenHandles --forceExit --runInBand >> compra_output_v8.txt 2>&1
echo DONE >> compra_output_v8.txt
exit /b 0
