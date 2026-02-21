# Script simplificado para gerar AAB
Write-Host "=== Gerando AAB para Açucaradas Encomendas ==="
Write-Host "Iniciando processo..."

# Verificar se o diretório android existe
if (Test-Path -Path ".\android") {
    Write-Host "Diretório Android encontrado. Prosseguindo com a geração do AAB..."
    
    # Navegar para o diretório android
    Set-Location -Path ".\android"
    
    # Executar gradlew bundleRelease
    Write-Host "Executando: gradlew bundleRelease"
    .\gradlew bundleRelease
    
    # Verificar se o AAB foi gerado
    $aabPath = ".\app\build\outputs\bundle\release\app-release.aab"
    if (Test-Path -Path $aabPath) {
        Write-Host "AAB gerado com sucesso em: $aabPath"
        
        # Copiar para a raiz do projeto
        Copy-Item -Path $aabPath -Destination "..\" -Force
        Write-Host "AAB copiado para a raiz do projeto."
        
        # Voltar para o diretório raiz
        Set-Location -Path ".."
        
        Write-Host "Processo concluído! O arquivo AAB está pronto para upload no Google Play Console."
    } else {
        Write-Host "Erro: AAB não foi gerado. Verifique os logs acima para mais detalhes."
    }
} else {
    Write-Host "Erro: Diretório Android não encontrado. Execute 'npx expo prebuild -p android' primeiro."
}