Write-Host "=== Submissão Automática para TestFlight ==="
Write-Host "Pasta: C:\Users\vantu\Downloads\AcucaradasEncomendas"
Write-Host "Build ID: 8587fe1f-abe7-4b4f-863c-2ab8ed809029"
Write-Host ""
Write-Host "⚠️  ATENÇÃO: Você precisará digitar seu Apple ID e a Senha de App (App-Specific Password) quando solicitado."
Write-Host ""

Set-Location "C:\Users\vantu\Downloads\AcucaradasEncomendas"
eas submit --platform ios --id 8587fe1f-abe7-4b4f-863c-2ab8ed809029

Write-Host ""
Write-Host "Processo finalizado."
Read-Host "Pressione Enter para fechar..."
