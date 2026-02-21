# Checklist de Publicacao na Google Play Store
# Autor: AppPublisherAI
# Data: $(Get-Date -Format "dd/MM/yyyy")

# Configuracoes iniciais
$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Funcao para exibir mensagens de log
function Write-Log {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [ValidateSet("Info", "Warning", "Error", "Success")]
        [string]$Type = "Info"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $color = switch ($Type) {
        "Info"    { "White" }
        "Warning" { "Yellow" }
        "Error"   { "Red" }
        "Success" { "Green" }
    }
    
    Write-Host "[$timestamp] [$Type] $Message" -ForegroundColor $color
}

# Definir diretorio de saida
$checklistDir = "$PSScriptRoot\play-store-checklist"

# Criar diretorio se nao existir
if (-not (Test-Path -Path $checklistDir)) {
    try {
        New-Item -Path $checklistDir -ItemType Directory -Force | Out-Null
        Write-Log "Diretorio de checklist criado: $checklistDir" -Type Success
    } catch {
        Write-Log "Erro ao criar diretorio de checklist: $_" -Type Error
        exit 1
    }
}

# Funcao para criar arquivo de checklist em formato Markdown
function Create-ChecklistFile {
    param (
        [string]$FileName,
        [string]$Title,
        [string]$Description,
        [array]$Items
    )
    
    $filePath = "$checklistDir\$FileName.md"
    
    $content = @"
# $Title

$Description

## Checklist

"@
    
    foreach ($item in $Items) {
        $content += "- [ ] $item`n"
    }
    
    $content += "`n*Ultima atualizacao: $(Get-Date -Format "dd/MM/yyyy")*`n"
    
    Set-Content -Path $filePath -Value $content
    Write-Log "Arquivo de checklist criado: $filePath" -Type Success
    
    return $filePath
}

# Criar checklist de preparacao do aplicativo
$prepItems = @(
    "Aplicativo testado em multiplos dispositivos e versoes do Android",
    "Todas as funcionalidades principais funcionam conforme esperado",
    "Bugs criticos corrigidos",
    "Verificacao de compatibilidade com diferentes tamanhos de tela",
    "Testes de performance realizados",
    "Verificacao de uso de memoria e bateria",
    "Aplicativo otimizado para diferentes conexoes de rede",
    "Verificacao de acessibilidade implementada",
    "Suporte a diferentes idiomas (se aplicavel)",
    "Verificacao de conformidade com as politicas da Google Play"
)

$prepFile = Create-ChecklistFile "01-preparacao-app" "Preparacao do Aplicativo" "Verifique se o aplicativo esta pronto para ser publicado na Google Play Store." $prepItems

# Criar checklist de conta de desenvolvedor
$accountItems = @(
    "Conta de desenvolvedor do Google Play criada",
    "Taxa de registro paga (US$ 25)",
    "Informacoes de contato atualizadas",
    "Informacoes de pagamento configuradas",
    "Perfil de desenvolvedor preenchido",
    "Endereco fisico verificado (se aplicavel)",
    "Verificacao de identidade concluida",
    "Concordancia com os termos de servico",
    "Configuracao de usuarios e permissoes (para equipes)",
    "Verificacao de elegibilidade para paises de distribuicao"
)

$accountFile = Create-ChecklistFile "02-conta-desenvolvedor" "Conta de Desenvolvedor" "Certifique-se de que sua conta de desenvolvedor do Google Play esta configurada corretamente." $accountItems

# Criar checklist de build do aplicativo
$buildItems = @(
    "Versao de codigo (versionCode) incrementada",
    "Versao de nome (versionName) atualizada",
    "Aplicativo compilado em modo release",
    "Arquivo AAB (Android App Bundle) gerado",
    "Aplicativo assinado com chave de producao",
    "Chave de assinatura armazenada com seguranca",
    "Verificacao de tamanho do APK/AAB (< 150MB para AAB principal)",
    "Recursos desnecessarios removidos",
    "Codigo de depuracao removido",
    "Verificacao de permissoes no AndroidManifest.xml",
    "Configuracao do targetSdkVersion para a versao mais recente",
    "Verificacao de bibliotecas de terceiros e licencas"
)

$buildFile = Create-ChecklistFile "03-build-aplicativo" "Build do Aplicativo" "Verifique se o build do aplicativo esta pronto para envio." $buildItems

# Criar checklist de ficha do aplicativo
$listingItems = @(
    "Nome do aplicativo definido (max. 50 caracteres)",
    "Descricao curta criada (max. 80 caracteres)",
    "Descricao completa elaborada (max. 4000 caracteres)",
    "Palavras-chave relevantes incluidas nas descricoes",
    "Categoria principal e secundaria selecionadas",
    "Tags relevantes adicionadas",
    "Icone do aplicativo enviado (512x512px, PNG 32-bits)",
    "Imagem de destaque criada (1024x500px)",
    "Screenshots para smartphone enviados (min. 2, max. 8)",
    "Screenshots para tablet enviados (se aplicavel)",
    "Video promocional adicionado (opcional)",
    "Informacoes de contato atualizadas",
    "Website do aplicativo informado",
    "Email de contato valido",
    "Traducoes para outros idiomas (se aplicavel)"
)

$listingFile = Create-ChecklistFile "04-ficha-aplicativo" "Ficha do Aplicativo" "Prepare todos os elementos da ficha do aplicativo na Google Play Store." $listingItems

# Criar checklist de politica de privacidade
$privacyItems = @(
    "Politica de privacidade criada",
    "URL da politica de privacidade adicionada",
    "Coleta de dados pessoais documentada",
    "Uso de dados explicado claramente",
    "Opcoes de consentimento do usuario descritas",
    "Informacoes sobre compartilhamento de dados",
    "Politica de retencao de dados explicada",
    "Direitos do usuario documentados",
    "Informacoes de contato para questoes de privacidade",
    "Conformidade com GDPR (se aplicavel)",
    "Conformidade com CCPA (se aplicavel)",
    "Conformidade com LGPD (se aplicavel)",
    "Politica adaptada para criancas (se aplicavel)"
)

$privacyFile = Create-ChecklistFile "05-politica-privacidade" "Politica de Privacidade" "Certifique-se de que sua politica de privacidade atende a todos os requisitos." $privacyItems

# Criar checklist de seguranca de dados
$dataItems = @(
    "Formulario de seguranca de dados preenchido",
    "Tipos de dados coletados declarados",
    "Finalidade da coleta de dados explicada",
    "Dados compartilhados com terceiros declarados",
    "Praticas de seguranca documentadas",
    "Opcoes de exclusao de dados explicadas",
    "Verificacao de conformidade com politicas de dados",
    "Declaracao sobre criptografia de dados",
    "Informacoes sobre armazenamento de dados",
    "Verificacao de bibliotecas de terceiros e suas politicas"
)

$dataFile = Create-ChecklistFile "06-seguranca-dados" "Seguranca de Dados" "Preencha todas as informacoes sobre seguranca e privacidade de dados." $dataItems

# Criar checklist de classificacao de conteudo
$contentItems = @(
    "Questionario de classificacao de conteudo preenchido",
    "Idade minima recomendada definida",
    "Presenca de violencia declarada",
    "Conteudo sexual declarado",
    "Linguagem inapropriada declarada",
    "Referencias a drogas declaradas",
    "Referencias a alcool declaradas",
    "Referencias a jogos de azar declaradas",
    "Conteudo gerado pelo usuario declarado",
    "Interacoes entre usuarios declaradas",
    "Compras no aplicativo declaradas",
    "Publicidade no aplicativo declarada",
    "Localizacao compartilhada declarada"
)

$contentFile = Create-ChecklistFile "07-classificacao-conteudo" "Classificacao de Conteudo" "Complete o questionario de classificacao de conteudo para definir a faixa etaria do seu aplicativo." $contentItems

# Criar checklist de preco e distribuicao
$pricingItems = @(
    "Modelo de monetizacao definido (gratuito, pago, freemium)",
    "Preco do aplicativo definido (se pago)",
    "Paises de distribuicao selecionados",
    "Configuracao de compras no aplicativo (se aplicavel)",
    "Descricao das compras no aplicativo",
    "Periodo de teste gratuito configurado (se aplicavel)",
    "Codigo promocional criado (se aplicavel)",
    "Configuracao de pre-registro (se aplicavel)",
    "Configuracao de lancamento programado (se aplicavel)",
    "Configuracao de atualizacao programada (se aplicavel)",
    "Restricoes de dispositivos configuradas (se necessario)",
    "Restricoes de pais configuradas (se necessario)"
)

$pricingFile = Create-ChecklistFile "08-preco-distribuicao" "Preco e Distribuicao" "Configure as opcoes de preco e distribuicao do seu aplicativo." $pricingItems

# Criar checklist de lancamento
$releaseItems = @(
    "Testes internos configurados",
    "Grupo de testadores alfa configurado (se aplicavel)",
    "Grupo de testadores beta configurado (se aplicavel)",
    "Feedback dos testadores analisado",
    "Problemas criticos corrigidos",
    "Notas de lancamento preparadas",
    "Estrategia de lancamento definida (completo, parcial, teste A/B)",
    "Porcentagem de lancamento definida (para lancamento gradual)",
    "Metricas de monitoramento configuradas",
    "Plano de resposta a problemas pos-lancamento",
    "Estrategia de atualizacao definida",
    "Plano de marketing e promocao preparado"
)

$releaseFile = Create-ChecklistFile "09-lancamento" "Lancamento do Aplicativo" "Prepare o lancamento do seu aplicativo na Google Play Store." $releaseItems

# Criar checklist de pos-lancamento
$postItems = @(
    "Monitoramento de crashes e ANRs",
    "Analise de metricas de desempenho",
    "Monitoramento de avaliacoes e comentarios",
    "Resposta a avaliacoes negativas",
    "Atualizacao das respostas a perguntas frequentes",
    "Analise de metricas de aquisicao de usuarios",
    "Analise de metricas de retencao",
    "Analise de metricas de monetizacao (se aplicavel)",
    "Planejamento de atualizacoes futuras",
    "Otimizacao de ASO (App Store Optimization)",
    "Analise de concorrencia",
    "Implementacao de campanhas de marketing"
)

$postFile = Create-ChecklistFile "10-pos-lancamento" "Pos-Lancamento" "Acompanhe e otimize seu aplicativo apos o lancamento na Google Play Store." $postItems

# Criar arquivo de checklist principal
$mainChecklistPath = "$checklistDir\checklist-principal.md"
$mainChecklistContent = @"
# Checklist Principal de Publicacao na Google Play Store

## Visao Geral
Este documento contem o checklist principal para publicacao do seu aplicativo na Google Play Store. Cada secao possui um arquivo detalhado com itens especificos.

## Checklists Detalhados

1. [Preparacao do Aplicativo](./01-preparacao-app.md)
2. [Conta de Desenvolvedor](./02-conta-desenvolvedor.md)
3. [Build do Aplicativo](./03-build-aplicativo.md)
4. [Ficha do Aplicativo](./04-ficha-aplicativo.md)
5. [Politica de Privacidade](./05-politica-privacidade.md)
6. [Seguranca de Dados](./06-seguranca-dados.md)
7. [Classificacao de Conteudo](./07-classificacao-conteudo.md)
8. [Preco e Distribuicao](./08-preco-distribuicao.md)
9. [Lancamento do Aplicativo](./09-lancamento.md)
10. [Pos-Lancamento](./10-pos-lancamento.md)

## Fluxo de Trabalho Recomendado

1. **Preparacao (1-3)**: Prepare seu aplicativo e conta de desenvolvedor
2. **Configuracao (4-7)**: Configure a ficha do aplicativo e politicas
3. **Distribuicao (8-9)**: Configure preco, distribuicao e lancamento
4. **Monitoramento (10)**: Acompanhe o desempenho pos-lancamento

## Recursos Adicionais

- [Console do Desenvolvedor Google Play](https://play.google.com/console/)
- [Politicas do Desenvolvedor](https://play.google.com/about/developer-content-policy/)
- [Melhores Praticas de Qualidade](https://developer.android.com/quality)
- [Guia de Lancamento](https://developer.android.com/studio/publish)

*Ultima atualizacao: $(Get-Date -Format "dd/MM/yyyy")*
"@

Set-Content -Path $mainChecklistPath -Value $mainChecklistContent
Write-Log "Checklist principal criado: $mainChecklistPath" -Type Success

# Criar arquivo HTML interativo para acompanhamento
$htmlChecklistPath = "$checklistDir\checklist-interativo.html"
$htmlChecklistContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Checklist de Publicacao na Google Play Store</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        h1, h2, h3 {
            color: #0F9D58;
        }
        h1 {
            border-bottom: 2px solid #0F9D58;
            padding-bottom: 10px;
        }
        .section {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
        }
        .section-header h2 {
            margin: 0;
        }
        .section-content {
            display: none;
            margin-top: 15px;
        }
        .section-content.active {
            display: block;
        }
        .progress {
            background-color: #e0e0e0;
            border-radius: 10px;
            height: 10px;
            width: 200px;
            overflow: hidden;
        }
        .progress-bar {
            background-color: #0F9D58;
            height: 100%;
            width: 0%;
            transition: width 0.3s ease;
        }
        .checklist-item {
            display: flex;
            align-items: flex-start;
            margin-bottom: 10px;
        }
        .checklist-item input[type="checkbox"] {
            margin-top: 5px;
            margin-right: 10px;
        }
        .checklist-item label {
            flex: 1;
        }
        .progress-text {
            font-size: 14px;
            color: #666;
            margin-left: 10px;
        }
        .overall-progress {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            display: flex;
            align-items: center;
        }
        .overall-progress .progress {
            width: 300px;
            height: 15px;
        }
        .overall-progress .progress-text {
            font-size: 16px;
            font-weight: bold;
        }
        .save-button {
            background-color: #0F9D58;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 20px;
        }
        .save-button:hover {
            background-color: #0b8043;
        }
        .section-toggle {
            font-size: 24px;
            color: #0F9D58;
        }
        .completed {
            text-decoration: line-through;
            color: #888;
        }
        @media print {
            .save-button, .section-toggle {
                display: none;
            }
            .section-content {
                display: block;
            }
            body {
                background-color: white;
            }
            .section, .overall-progress {
                box-shadow: none;
                border: 1px solid #ddd;
            }
        }
    </style>
</head>
<body>
    <h1>Checklist de Publicacao na Google Play Store</h1>
    
    <div class="overall-progress">
        <div class="progress">
            <div class="progress-bar" id="overall-progress-bar"></div>
        </div>
        <span class="progress-text" id="overall-progress-text">0%</span>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('prep')">
            <h2>1. Preparacao do Aplicativo</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="prep-progress"></div>
                </div>
                <span class="progress-text" id="prep-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="prep-content">
            <div class="checklist-item">
                <input type="checkbox" id="prep-1" onchange="updateProgress()">
                <label for="prep-1">Aplicativo testado em multiplos dispositivos e versoes do Android</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-2" onchange="updateProgress()">
                <label for="prep-2">Todas as funcionalidades principais funcionam conforme esperado</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-3" onchange="updateProgress()">
                <label for="prep-3">Bugs criticos corrigidos</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-4" onchange="updateProgress()">
                <label for="prep-4">Verificacao de compatibilidade com diferentes tamanhos de tela</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-5" onchange="updateProgress()">
                <label for="prep-5">Testes de performance realizados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-6" onchange="updateProgress()">
                <label for="prep-6">Verificacao de uso de memoria e bateria</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-7" onchange="updateProgress()">
                <label for="prep-7">Aplicativo otimizado para diferentes conexoes de rede</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-8" onchange="updateProgress()">
                <label for="prep-8">Verificacao de acessibilidade implementada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-9" onchange="updateProgress()">
                <label for="prep-9">Suporte a diferentes idiomas (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="prep-10" onchange="updateProgress()">
                <label for="prep-10">Verificacao de conformidade com as politicas da Google Play</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('account')">
            <h2>2. Conta de Desenvolvedor</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="account-progress"></div>
                </div>
                <span class="progress-text" id="account-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="account-content">
            <div class="checklist-item">
                <input type="checkbox" id="account-1" onchange="updateProgress()">
                <label for="account-1">Conta de desenvolvedor do Google Play criada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-2" onchange="updateProgress()">
                <label for="account-2">Taxa de registro paga (US$ 25)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-3" onchange="updateProgress()">
                <label for="account-3">Informacoes de contato atualizadas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-4" onchange="updateProgress()">
                <label for="account-4">Informacoes de pagamento configuradas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-5" onchange="updateProgress()">
                <label for="account-5">Perfil de desenvolvedor preenchido</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-6" onchange="updateProgress()">
                <label for="account-6">Endereco fisico verificado (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-7" onchange="updateProgress()">
                <label for="account-7">Verificacao de identidade concluida</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-8" onchange="updateProgress()">
                <label for="account-8">Concordancia com os termos de servico</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-9" onchange="updateProgress()">
                <label for="account-9">Configuracao de usuarios e permissoes (para equipes)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="account-10" onchange="updateProgress()">
                <label for="account-10">Verificacao de elegibilidade para paises de distribuicao</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('build')">
            <h2>3. Build do Aplicativo</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="build-progress"></div>
                </div>
                <span class="progress-text" id="build-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="build-content">
            <div class="checklist-item">
                <input type="checkbox" id="build-1" onchange="updateProgress()">
                <label for="build-1">Versao de codigo (versionCode) incrementada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-2" onchange="updateProgress()">
                <label for="build-2">Versao de nome (versionName) atualizada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-3" onchange="updateProgress()">
                <label for="build-3">Aplicativo compilado em modo release</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-4" onchange="updateProgress()">
                <label for="build-4">Arquivo AAB (Android App Bundle) gerado</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-5" onchange="updateProgress()">
                <label for="build-5">Aplicativo assinado com chave de producao</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-6" onchange="updateProgress()">
                <label for="build-6">Chave de assinatura armazenada com seguranca</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-7" onchange="updateProgress()">
                <label for="build-7">Verificacao de tamanho do APK/AAB (< 150MB para AAB principal)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-8" onchange="updateProgress()">
                <label for="build-8">Recursos desnecessarios removidos</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-9" onchange="updateProgress()">
                <label for="build-9">Codigo de depuracao removido</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-10" onchange="updateProgress()">
                <label for="build-10">Verificacao de permissoes no AndroidManifest.xml</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-11" onchange="updateProgress()">
                <label for="build-11">Configuracao do targetSdkVersion para a versao mais recente</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="build-12" onchange="updateProgress()">
                <label for="build-12">Verificacao de bibliotecas de terceiros e licencas</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('listing')">
            <h2>4. Ficha do Aplicativo</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="listing-progress"></div>
                </div>
                <span class="progress-text" id="listing-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="listing-content">
            <div class="checklist-item">
                <input type="checkbox" id="listing-1" onchange="updateProgress()">
                <label for="listing-1">Nome do aplicativo definido (max. 50 caracteres)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-2" onchange="updateProgress()">
                <label for="listing-2">Descricao curta criada (max. 80 caracteres)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-3" onchange="updateProgress()">
                <label for="listing-3">Descricao completa elaborada (max. 4000 caracteres)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-4" onchange="updateProgress()">
                <label for="listing-4">Palavras-chave relevantes incluidas nas descricoes</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-5" onchange="updateProgress()">
                <label for="listing-5">Categoria principal e secundaria selecionadas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-6" onchange="updateProgress()">
                <label for="listing-6">Tags relevantes adicionadas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-7" onchange="updateProgress()">
                <label for="listing-7">Icone do aplicativo enviado (512x512px, PNG 32-bits)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-8" onchange="updateProgress()">
                <label for="listing-8">Imagem de destaque criada (1024x500px)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-9" onchange="updateProgress()">
                <label for="listing-9">Screenshots para smartphone enviados (min. 2, max. 8)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-10" onchange="updateProgress()">
                <label for="listing-10">Screenshots para tablet enviados (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-11" onchange="updateProgress()">
                <label for="listing-11">Video promocional adicionado (opcional)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-12" onchange="updateProgress()">
                <label for="listing-12">Informacoes de contato atualizadas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-13" onchange="updateProgress()">
                <label for="listing-13">Website do aplicativo informado</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-14" onchange="updateProgress()">
                <label for="listing-14">Email de contato valido</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="listing-15" onchange="updateProgress()">
                <label for="listing-15">Traducoes para outros idiomas (se aplicavel)</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('privacy')">
            <h2>5. Politica de Privacidade</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="privacy-progress"></div>
                </div>
                <span class="progress-text" id="privacy-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="privacy-content">
            <div class="checklist-item">
                <input type="checkbox" id="privacy-1" onchange="updateProgress()">
                <label for="privacy-1">Politica de privacidade criada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-2" onchange="updateProgress()">
                <label for="privacy-2">URL da politica de privacidade adicionada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-3" onchange="updateProgress()">
                <label for="privacy-3">Coleta de dados pessoais documentada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-4" onchange="updateProgress()">
                <label for="privacy-4">Uso de dados explicado claramente</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-5" onchange="updateProgress()">
                <label for="privacy-5">Opcoes de consentimento do usuario descritas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-6" onchange="updateProgress()">
                <label for="privacy-6">Informacoes sobre compartilhamento de dados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-7" onchange="updateProgress()">
                <label for="privacy-7">Politica de retencao de dados explicada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-8" onchange="updateProgress()">
                <label for="privacy-8">Direitos do usuario documentados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-9" onchange="updateProgress()">
                <label for="privacy-9">Informacoes de contato para questoes de privacidade</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-10" onchange="updateProgress()">
                <label for="privacy-10">Conformidade com GDPR (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-11" onchange="updateProgress()">
                <label for="privacy-11">Conformidade com CCPA (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-12" onchange="updateProgress()">
                <label for="privacy-12">Conformidade com LGPD (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="privacy-13" onchange="updateProgress()">
                <label for="privacy-13">Politica adaptada para criancas (se aplicavel)</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('data')">
            <h2>6. Seguranca de Dados</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="data-progress"></div>
                </div>
                <span class="progress-text" id="data-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="data-content">
            <div class="checklist-item">
                <input type="checkbox" id="data-1" onchange="updateProgress()">
                <label for="data-1">Formulario de seguranca de dados preenchido</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-2" onchange="updateProgress()">
                <label for="data-2">Tipos de dados coletados declarados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-3" onchange="updateProgress()">
                <label for="data-3">Finalidade da coleta de dados explicada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-4" onchange="updateProgress()">
                <label for="data-4">Dados compartilhados com terceiros declarados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-5" onchange="updateProgress()">
                <label for="data-5">Praticas de seguranca documentadas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-6" onchange="updateProgress()">
                <label for="data-6">Opcoes de exclusao de dados explicadas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-7" onchange="updateProgress()">
                <label for="data-7">Verificacao de conformidade com politicas de dados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-8" onchange="updateProgress()">
                <label for="data-8">Declaracao sobre criptografia de dados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-9" onchange="updateProgress()">
                <label for="data-9">Informacoes sobre armazenamento de dados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="data-10" onchange="updateProgress()">
                <label for="data-10">Verificacao de bibliotecas de terceiros e suas politicas</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('content')">
            <h2>7. Classificacao de Conteudo</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="content-progress"></div>
                </div>
                <span class="progress-text" id="content-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="content-content">
            <div class="checklist-item">
                <input type="checkbox" id="content-1" onchange="updateProgress()">
                <label for="content-1">Questionario de classificacao de conteudo preenchido</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-2" onchange="updateProgress()">
                <label for="content-2">Idade minima recomendada definida</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-3" onchange="updateProgress()">
                <label for="content-3">Presenca de violencia declarada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-4" onchange="updateProgress()">
                <label for="content-4">Conteudo sexual declarado</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-5" onchange="updateProgress()">
                <label for="content-5">Linguagem inapropriada declarada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-6" onchange="updateProgress()">
                <label for="content-6">Referencias a drogas declaradas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-7" onchange="updateProgress()">
                <label for="content-7">Referencias a alcool declaradas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-8" onchange="updateProgress()">
                <label for="content-8">Referencias a jogos de azar declaradas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-9" onchange="updateProgress()">
                <label for="content-9">Conteudo gerado pelo usuario declarado</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-10" onchange="updateProgress()">
                <label for="content-10">Interacoes entre usuarios declaradas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-11" onchange="updateProgress()">
                <label for="content-11">Compras no aplicativo declaradas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-12" onchange="updateProgress()">
                <label for="content-12">Publicidade no aplicativo declarada</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="content-13" onchange="updateProgress()">
                <label for="content-13">Localizacao compartilhada declarada</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('pricing')">
            <h2>8. Preco e Distribuicao</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="pricing-progress"></div>
                </div>
                <span class="progress-text" id="pricing-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="pricing-content">
            <div class="checklist-item">
                <input type="checkbox" id="pricing-1" onchange="updateProgress()">
                <label for="pricing-1">Modelo de monetizacao definido (gratuito, pago, freemium)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-2" onchange="updateProgress()">
                <label for="pricing-2">Preco do aplicativo definido (se pago)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-3" onchange="updateProgress()">
                <label for="pricing-3">Paises de distribuicao selecionados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-4" onchange="updateProgress()">
                <label for="pricing-4">Configuracao de compras no aplicativo (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-5" onchange="updateProgress()">
                <label for="pricing-5">Descricao das compras no aplicativo</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-6" onchange="updateProgress()">
                <label for="pricing-6">Periodo de teste gratuito configurado (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-7" onchange="updateProgress()">
                <label for="pricing-7">Codigo promocional criado (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-8" onchange="updateProgress()">
                <label for="pricing-8">Configuracao de pre-registro (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-9" onchange="updateProgress()">
                <label for="pricing-9">Configuracao de lancamento programado (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-10" onchange="updateProgress()">
                <label for="pricing-10">Configuracao de atualizacao programada (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-11" onchange="updateProgress()">
                <label for="pricing-11">Restricoes de dispositivos configuradas (se necessario)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="pricing-12" onchange="updateProgress()">
                <label for="pricing-12">Restricoes de pais configuradas (se necessario)</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('release')">
            <h2>9. Lancamento do Aplicativo</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="release-progress"></div>
                </div>
                <span class="progress-text" id="release-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="release-content">
            <div class="checklist-item">
                <input type="checkbox" id="release-1" onchange="updateProgress()">
                <label for="release-1">Testes internos configurados</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-2" onchange="updateProgress()">
                <label for="release-2">Grupo de testadores alfa configurado (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-3" onchange="updateProgress()">
                <label for="release-3">Grupo de testadores beta configurado (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-4" onchange="updateProgress()">
                <label for="release-4">Feedback dos testadores analisado</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-5" onchange="updateProgress()">
                <label for="release-5">Problemas criticos corrigidos</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-6" onchange="updateProgress()">
                <label for="release-6">Notas de lancamento preparadas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-7" onchange="updateProgress()">
                <label for="release-7">Estrategia de lancamento definida (completo, parcial, teste A/B)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-8" onchange="updateProgress()">
                <label for="release-8">Porcentagem de lancamento definida (para lancamento gradual)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-9" onchange="updateProgress()">
                <label for="release-9">Metricas de monitoramento configuradas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-10" onchange="updateProgress()">
                <label for="release-10">Plano de resposta a problemas pos-lancamento</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-11" onchange="updateProgress()">
                <label for="release-11">Estrategia de atualizacao definida</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="release-12" onchange="updateProgress()">
                <label for="release-12">Plano de marketing e promocao preparado</label>
            </div>
        </div>
    </div>
    
    <div class="section">
        <div class="section-header" onclick="toggleSection('post')">
            <h2>10. Pos-Lancamento</h2>
            <div class="progress-container">
                <div class="progress">
                    <div class="progress-bar" id="post-progress"></div>
                </div>
                <span class="progress-text" id="post-progress-text">0%</span>
            </div>
            <span class="section-toggle">+</span>
        </div>
        <div class="section-content" id="post-content">
            <div class="checklist-item">
                <input type="checkbox" id="post-1" onchange="updateProgress()">
                <label for="post-1">Monitoramento de crashes e ANRs</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-2" onchange="updateProgress()">
                <label for="post-2">Analise de metricas de desempenho</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-3" onchange="updateProgress()">
                <label for="post-3">Monitoramento de avaliacoes e comentarios</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-4" onchange="updateProgress()">
                <label for="post-4">Resposta a avaliacoes negativas</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-5" onchange="updateProgress()">
                <label for="post-5">Atualizacao das respostas a perguntas frequentes</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-6" onchange="updateProgress()">
                <label for="post-6">Analise de metricas de aquisicao de usuarios</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-7" onchange="updateProgress()">
                <label for="post-7">Analise de metricas de retencao</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-8" onchange="updateProgress()">
                <label for="post-8">Analise de metricas de monetizacao (se aplicavel)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-9" onchange="updateProgress()">
                <label for="post-9">Planejamento de atualizacoes futuras</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-10" onchange="updateProgress()">
                <label for="post-10">Otimizacao de ASO (App Store Optimization)</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-11" onchange="updateProgress()">
                <label for="post-11">Analise de concorrencia</label>
            </div>
            <div class="checklist-item">
                <input type="checkbox" id="post-12" onchange="updateProgress()">
                <label for="post-12">Implementacao de campanhas de marketing</label>
            </div>
        </div>
    </div>
    
    <button class="save-button" onclick="saveProgress()">Salvar Progresso</button>
    
    <script>
        // Funcao para alternar a visibilidade das secoes
        function toggleSection(sectionId) {
            const content = document.getElementById(sectionId + '-content');
            const toggle = content.parentElement.querySelector('.section-toggle');
            
            if (content.classList.contains('active')) {
                content.classList.remove('active');
                toggle.textContent = '+';
            } else {
                content.classList.add('active');
                toggle.textContent = '-';
            }
        }
        
        // Funcao para atualizar o progresso
        function updateProgress() {
            const sections = [
                { id: 'prep', total: 10 },
                { id: 'account', total: 10 },
                { id: 'build', total: 12 },
                { id: 'listing', total: 15 },
                { id: 'privacy', total: 13 },
                { id: 'data', total: 10 },
                { id: 'content', total: 13 },
                { id: 'pricing', total: 12 },
                { id: 'release', total: 12 },
                { id: 'post', total: 12 }
            ];
            
            let totalItems = 0;
            let totalChecked = 0;
            
            sections.forEach(section => {
                let sectionChecked = 0;
                
                for (let i = 1; i <= section.total; i++) {
                    const checkbox = document.getElementById(`${section.id}-${i}`);
                    if (checkbox && checkbox.checked) {
                        sectionChecked++;
                        totalChecked++;
                        
                        // Adicionar classe 'completed' ao label
                        const label = checkbox.nextElementSibling;
                        if (label) {
                            label.classList.add('completed');
                        }
                    } else if (checkbox) {
                        // Remover classe 'completed' do label
                        const label = checkbox.nextElementSibling;
                        if (label) {
                            label.classList.remove('completed');
                        }
                    }
                }
                
                totalItems += section.total;
                
                // Atualizar progresso da secao
                const sectionProgress = (sectionChecked / section.total) * 100;
                document.getElementById(`${section.id}-progress`).style.width = `${sectionProgress}%`;
                document.getElementById(`${section.id}-progress-text`).textContent = `${Math.round(sectionProgress)}%`;
            });
            
            // Atualizar progresso geral
            const overallProgress = (totalChecked / totalItems) * 100;
            document.getElementById('overall-progress-bar').style.width = `${overallProgress}%`;
            document.getElementById('overall-progress-text').textContent = `${Math.round(overallProgress)}% Concluido`;
            
            // Salvar progresso automaticamente
            saveProgress(false);
        }
        
        // Funcao para salvar o progresso
        function saveProgress(showAlert = true) {
            const checkboxStates = {};
            
            // Coletar estado de todas as checkboxes
            document.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
                checkboxStates[checkbox.id] = checkbox.checked;
            });
            
            // Salvar no localStorage
            localStorage.setItem('playStoreChecklistProgress', JSON.stringify(checkboxStates));
            
            if (showAlert) {
                alert('Progresso salvo com sucesso!');
            }
        }
        
        // Funcao para carregar o progresso
        function loadProgress() {
            const savedProgress = localStorage.getItem('playStoreChecklistProgress');
            
            if (savedProgress) {
                const checkboxStates = JSON.parse(savedProgress);
                
                // Aplicar estados salvos às checkboxes
                Object.keys(checkboxStates).forEach(id => {
                    const checkbox = document.getElementById(id);
                    if (checkbox) {
                        checkbox.checked = checkboxStates[id];
                        
                        // Atualizar classe 'completed' no label
                        const label = checkbox.nextElementSibling;
                        if (label) {
                            if (checkbox.checked) {
                                label.classList.add('completed');
                            } else {
                                label.classList.remove('completed');
                            }
                        }
                    }
                });
                
                // Atualizar barras de progresso
                updateProgress();
            }
        }
        
        // Carregar progresso ao iniciar
        document.addEventListener('DOMContentLoaded', loadProgress);
        
        // Abrir a primeira secao por padrao
        document.addEventListener('DOMContentLoaded', function() {
            toggleSection('prep');
        });
    </script>
</body>
</html>
"@

Set-Content -Path $htmlChecklistPath -Value $htmlChecklistContent
Write-Log "Checklist interativo HTML criado: $htmlChecklistPath" -Type Success

# Criar arquivo README com instruções
$readmePath = "$checklistDir\README.md"
$readmeContent = @"
# Checklist de Publicacao na Google Play Store

## Visao Geral

Este diretorio contem arquivos de checklist para auxiliar na publicacao do seu aplicativo na Google Play Store. Os checklists foram criados para garantir que todas as etapas necessarias sejam seguidas durante o processo de publicacao.

## Arquivos Disponiveis

1. **checklist-principal.md** - Visao geral de todas as etapas do processo de publicacao
2. **01-preparacao-app.md** - Checklist para preparacao do aplicativo
3. **02-conta-desenvolvedor.md** - Checklist para configuracao da conta de desenvolvedor
4. **03-build-aplicativo.md** - Checklist para build do aplicativo
5. **04-ficha-aplicativo.md** - Checklist para ficha do aplicativo
6. **05-politica-privacidade.md** - Checklist para politica de privacidade
7. **06-seguranca-dados.md** - Checklist para seguranca de dados
8. **07-classificacao-conteudo.md** - Checklist para classificacao de conteudo
9. **08-preco-distribuicao.md** - Checklist para preco e distribuicao
10. **09-lancamento.md** - Checklist para lancamento do aplicativo
11. **10-pos-lancamento.md** - Checklist para pos-lancamento
12. **checklist-interativo.html** - Versao interativa do checklist com progresso salvo localmente

## Como Usar

### Checklists em Markdown

Os arquivos .md podem ser visualizados em qualquer editor de texto ou navegador que suporte Markdown. Voce pode marcar os itens concluidos manualmente editando os arquivos e alterando `[ ]` para `[x]`.

### Checklist Interativo HTML

O arquivo `checklist-interativo.html` oferece uma interface interativa para acompanhar seu progresso:

1. Abra o arquivo em qualquer navegador web moderno
2. Marque as tarefas concluidas clicando nas caixas de selecao
3. O progresso e salvo automaticamente no seu navegador
4. Clique no botao "Salvar Progresso" para garantir que tudo foi salvo
5. O progresso sera restaurado quando voce abrir o arquivo novamente no mesmo navegador

## Fluxo de Trabalho Recomendado

1. Comece pelo arquivo `checklist-principal.md` para entender todas as etapas
2. Siga os checklists na ordem numerica (01 a 10)
3. Use o checklist interativo para acompanhar seu progresso geral
4. Consulte a documentacao oficial do Google Play quando necessario

## Recursos Adicionais

- [Console do Desenvolvedor Google Play](https://play.google.com/console/)
- [Politicas do Desenvolvedor](https://play.google.com/about/developer-content-policy/)
- [Melhores Praticas de Qualidade](https://developer.android.com/quality)
- [Guia de Lancamento](https://developer.android.com/studio/publish)

*Ultima atualizacao: $(Get-Date -Format "dd/MM/yyyy")*
"@

Set-Content -Path $readmePath -Value $readmeContent
Write-Log "Arquivo README criado: $readmePath" -Type Success

# Exibir mensagem final
Write-Log "Checklist de publicacao na Google Play Store criado com sucesso!" -Type Success
Write-Log "Diretorio: $checklistDir" -Type Info
Write-Log "Arquivos criados:" -Type Info
Write-Log "- Checklist principal: $mainChecklistPath" -Type Info
Write-Log "- Checklist interativo HTML: $htmlChecklistPath" -Type Info
Write-Log "- README: $readmePath" -Type Info
Write-Log "- 10 checklists detalhados em formato Markdown" -Type Info
Write-Log "\nPara comecar, abra o arquivo 'checklist-principal.md' ou 'checklist-interativo.html'" -Type Success