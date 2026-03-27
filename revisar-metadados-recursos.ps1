# Script para Revisar Metadados e Preparar Recursos Graficos para Google Play Store
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

# Definir diretorios
$metadataDir = "$PSScriptRoot\play-store-metadata"
$resourcesDir = "$PSScriptRoot\play-store-resources"
$checklistDir = "$PSScriptRoot\play-store-checklist"

# Verificar se os diretorios existem
if (-not (Test-Path -Path $metadataDir)) {
    Write-Log "Diretorio de metadados nao encontrado: $metadataDir" -Type Warning
    $createMetadata = Read-Host "Deseja criar o diretorio de metadados? (S/N)"
    if ($createMetadata -eq "S" -or $createMetadata -eq "s") {
        try {
            New-Item -Path $metadataDir -ItemType Directory -Force | Out-Null
            Write-Log "Diretorio de metadados criado: $metadataDir" -Type Success
        } catch {
            Write-Log "Erro ao criar diretorio de metadados: $_" -Type Error
            exit 1
        }
    } else {
        Write-Log "Operacao cancelada pelo usuario" -Type Warning
        exit 0
    }
}

if (-not (Test-Path -Path $resourcesDir)) {
    try {
        New-Item -Path $resourcesDir -ItemType Directory -Force | Out-Null
        Write-Log "Diretorio de recursos criado: $resourcesDir" -Type Success
    } catch {
        Write-Log "Erro ao criar diretorio de recursos: $_" -Type Error
        exit 1
    }
}

# Funcao para revisar metadados
function Review-Metadata {
    Write-Log "Iniciando revisao de metadados..." -Type Info
    
    # Verificar arquivos de metadados
    $metadataFiles = @(
        "app-name.txt",
        "short-description.txt",
        "full-description.txt",
        "keywords.txt",
        "privacy-policy.html",
        "terms-of-service.html"
    )
    
    $missingFiles = @()
    foreach ($file in $metadataFiles) {
        $filePath = "$metadataDir\$file"
        if (Test-Path -Path $filePath) {
            $content = Get-Content -Path $filePath -Raw
            $wordCount = ($content -split '\s+').Count
            
            Write-Log "Arquivo encontrado: $file ($wordCount palavras)" -Type Success
            
            # Verificar limites de caracteres
            switch ($file) {
                "app-name.txt" {
                    if ($content.Length -gt 50) {
                        Write-Log "ATENCAO: Nome do aplicativo excede 50 caracteres (atual: $($content.Length))" -Type Warning
                    }
                }
                "short-description.txt" {
                    if ($content.Length -gt 80) {
                        Write-Log "ATENCAO: Descricao curta excede 80 caracteres (atual: $($content.Length))" -Type Warning
                    }
                }
                "full-description.txt" {
                    if ($content.Length -gt 4000) {
                        Write-Log "ATENCAO: Descricao completa excede 4000 caracteres (atual: $($content.Length))" -Type Warning
                    }
                }
            }
        } else {
            $missingFiles += $file
            Write-Log "Arquivo nao encontrado: $file" -Type Warning
        }
    }
    
    # Criar arquivos faltantes
    if ($missingFiles.Count -gt 0) {
        Write-Log "Arquivos de metadados faltantes: $($missingFiles.Count)" -Type Warning
        $createMissing = Read-Host "Deseja criar templates para os arquivos faltantes? (S/N)"
        
        if ($createMissing -eq "S" -or $createMissing -eq "s") {
            foreach ($file in $missingFiles) {
                $filePath = "$metadataDir\$file"
                $content = switch ($file) {
                    "app-name.txt" { "Acucaradas Encomendas" }
                    "short-description.txt" { "Aplicativo para gerenciamento de encomendas de doces e bolos artesanais." }
                    "full-description.txt" { @"
Acucaradas Encomendas - Gerencie seus pedidos de doces e bolos artesanais

# Sobre o Aplicativo
O Acucaradas Encomendas e um aplicativo completo para gerenciamento de encomendas de doces e bolos artesanais. Ideal para confeiteiros, doceiros e pequenos empreendedores do setor de confeitaria que desejam organizar seus pedidos, clientes e produtos de forma simples e eficiente.

# Principais Funcionalidades

- Cadastro de clientes com informacoes de contato
- Catalogo de produtos com fotos, descricoes e precos
- Gerenciamento de pedidos com datas de entrega
- Controle de pagamentos e status de producao
- Historico completo de encomendas por cliente
- Relatorios de vendas e produtos mais populares
- Calendario de entregas e compromissos
- Notificacoes de pedidos proximos da data de entrega

# Beneficios

- Interface intuitiva e facil de usar
- Acompanhamento em tempo real do status dos pedidos
- Organizacao eficiente da producao diaria
- Melhoria no atendimento ao cliente
- Reducao de erros e esquecimentos
- Aumento da produtividade

# Ideal Para

- Confeiteiros autonomos
- Doceiras artesanais
- Pequenas confeitarias
- Empreendedores do setor de doces e bolos

Baixe agora e transforme a gestao do seu negocio de confeitaria!
"@ }
                    "keywords.txt" { "confeitaria, doces, bolos, encomendas, gerenciamento, pedidos, confeiteiros, doceira, artesanal, confeitaria" }
                    "privacy-policy.html" { @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Politica de Privacidade - Acucaradas Encomendas</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2 {
            color: #d81b60;
        }
        h1 {
            border-bottom: 2px solid #d81b60;
            padding-bottom: 10px;
        }
        h2 {
            margin-top: 30px;
        }
        p {
            margin-bottom: 15px;
        }
        .date {
            font-style: italic;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <h1>Politica de Privacidade</h1>
    <p>Ultima atualizacao: $(Get-Date -Format "dd/MM/yyyy")</p>
    
    <p>A sua privacidade e importante para nos. E politica do Acucaradas Encomendas respeitar a sua privacidade em relacao a qualquer informacao que possamos coletar no aplicativo Acucaradas Encomendas.</p>
    
    <p>Solicitamos informacoes pessoais apenas quando realmente precisamos delas para lhe fornecer um servico. Fazemo-lo por meios justos e legais, com o seu conhecimento e consentimento. Tambem informamos por que estamos coletando e como sera usado.</p>
    
    <h2>1. Informacoes que coletamos</h2>
    <p>Podemos coletar as seguintes informacoes:</p>
    <ul>
        <li>Informacoes de contato (como nome, endereco de e-mail, numero de telefone)</li>
        <li>Endereco para entrega de encomendas</li>
        <li>Historico de pedidos e preferencias</li>
        <li>Informacoes de pagamento (processadas por servicos de pagamento seguros)</li>
    </ul>
    
    <h2>2. Como usamos suas informacoes</h2>
    <p>Usamos as informacoes que coletamos das seguintes formas:</p>
    <ul>
        <li>Fornecer, operar e manter nosso aplicativo</li>
        <li>Processar e gerenciar seus pedidos</li>
        <li>Melhorar, personalizar e expandir nosso aplicativo</li>
        <li>Entender e analisar como voce usa nosso aplicativo</li>
        <li>Comunicar-se com voce, incluindo para atendimento ao cliente</li>
        <li>Enviar notificacoes relacionadas aos seus pedidos</li>
    </ul>
    
    <h2>3. Armazenamento de dados</h2>
    <p>Seus dados sao armazenados com seguranca em servidores protegidos. Implementamos medidas de seguranca adequadas para proteger contra acesso nao autorizado, alteracao, divulgacao ou destruicao de suas informacoes pessoais.</p>
    
    <h2>4. Compartilhamento de dados</h2>
    <p>Nao compartilhamos suas informacoes pessoais com terceiros, exceto:</p>
    <ul>
        <li>Quando necessario para fornecer servicos solicitados por voce (como processamento de pagamentos)</li>
        <li>Quando exigido por lei</li>
        <li>Para proteger nossos direitos</li>
    </ul>
    
    <h2>5. Seus direitos</h2>
    <p>Voce tem os seguintes direitos relacionados aos seus dados pessoais:</p>
    <ul>
        <li>Direito de acesso aos seus dados pessoais</li>
        <li>Direito de retificacao de dados incorretos</li>
        <li>Direito de exclusao de seus dados (dentro dos limites legais)</li>
        <li>Direito de restringir o processamento de seus dados</li>
        <li>Direito a portabilidade de dados</li>
        <li>Direito de retirar o consentimento a qualquer momento</li>
    </ul>
    
    <h2>6. Cookies e tecnologias semelhantes</h2>
    <p>Nosso aplicativo pode usar "cookies" para melhorar sua experiencia. Voce pode configurar seu dispositivo para recusar todos os cookies ou para indicar quando um cookie esta sendo enviado.</p>
    
    <h2>7. Servicos de terceiros</h2>
    <p>Podemos empregar servicos de terceiros confiáveis para nos ajudar a operar nosso aplicativo ou administrar atividades em nosso nome. Esses terceiros tem acesso as suas informacoes pessoais apenas para realizar tarefas especificas em nosso nome e sao obrigados a nao divulgar ou usar suas informacoes para qualquer outra finalidade.</p>
    
    <h2>8. Conformidade com a LGPD</h2>
    <p>Estamos em conformidade com a Lei Geral de Protecao de Dados (LGPD) do Brasil. Processamos dados pessoais com base nos seguintes fundamentos legais:</p>
    <ul>
        <li>Consentimento do titular dos dados</li>
        <li>Execucao de contrato</li>
        <li>Interesses legitimos</li>
        <li>Conformidade com obrigacoes legais</li>
    </ul>
    
    <h2>9. Alteracoes nesta politica</h2>
    <p>Podemos atualizar nossa Politica de Privacidade periodicamente. Notificaremos voce sobre quaisquer alteracoes publicando a nova Politica de Privacidade nesta pagina e, se as alteracoes forem significativas, enviaremos uma notificacao.</p>
    
    <h2>10. Contato</h2>
    <p>Se voce tiver alguma duvida sobre esta Politica de Privacidade, entre em contato conosco:</p>
    <ul>
        <li>Por e-mail: contato@acucaradasencomendas.com.br</li>
        <li>Por telefone: (XX) XXXX-XXXX</li>
    </ul>
    
    <p class="date">Esta politica esta em vigor a partir de $(Get-Date -Format "dd/MM/yyyy")</p>
</body>
</html>
"@ }
                    "terms-of-service.html" { @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Termos de Servico - Acucaradas Encomendas</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        h1, h2 {
            color: #d81b60;
        }
        h1 {
            border-bottom: 2px solid #d81b60;
            padding-bottom: 10px;
        }
        h2 {
            margin-top: 30px;
        }
        p {
            margin-bottom: 15px;
        }
        .date {
            font-style: italic;
            margin-top: 40px;
        }
    </style>
</head>
<body>
    <h1>Termos de Servico</h1>
    <p>Ultima atualizacao: $(Get-Date -Format "dd/MM/yyyy")</p>
    
    <p>Por favor, leia estes Termos de Servico ("Termos", "Termos de Servico") cuidadosamente antes de usar o aplicativo Acucaradas Encomendas ("Aplicativo", "Servico") operado por Acucaradas Encomendas ("nos", "nosso").</p>
    
    <p>Seu acesso e uso do Servico estao condicionados a sua aceitacao e conformidade com estes Termos. Estes Termos se aplicam a todos os visitantes, usuarios e outras pessoas que acessam ou usam o Servico.</p>
    
    <p>Ao acessar ou usar o Servico, voce concorda em ficar vinculado a estes Termos. Se voce discordar de qualquer parte dos termos, entao voce nao podera acessar o Servico.</p>
    
    <h2>1. Uso do Servico</h2>
    <p>O Acucaradas Encomendas e um aplicativo destinado ao gerenciamento de encomendas de doces e bolos artesanais. Ao utilizar nosso Servico, voce concorda em:</p>
    <ul>
        <li>Fornecer informacoes precisas e completas ao criar uma conta</li>
        <li>Manter a confidencialidade de sua senha e restringir o acesso a sua conta</li>
        <li>Ser responsavel por todas as atividades que ocorrem em sua conta</li>
        <li>Notificar-nos imediatamente sobre qualquer violacao de seguranca ou uso nao autorizado de sua conta</li>
        <li>Nao usar o Servico para qualquer finalidade ilegal ou nao autorizada</li>
    </ul>
    
    <h2>2. Contas</h2>
    <p>Quando voce cria uma conta conosco, voce garante que:</p>
    <ul>
        <li>Tem capacidade legal para aceitar estes Termos</li>
        <li>As informacoes que nos fornece sao precisas, completas e atuais</li>
        <li>Atualizara suas informacoes conforme necessario para mante-las precisas, completas e atuais</li>
    </ul>
    
    <h2>3. Conteudo do Usuario</h2>
    <p>Nosso Servico permite que voce armazene, envie, compartilhe e disponibilize certas informacoes, como dados de clientes, produtos e pedidos ("Conteudo"). Voce e responsavel pelo Conteudo que publica em nosso Servico, incluindo sua legalidade, confiabilidade e adequacao.</p>
    
    <p>Ao publicar Conteudo em nosso Servico, voce nos concede o direito de usar, modificar, executar publicamente, exibir publicamente e distribuir seu Conteudo em conexao com o Servico. Voce mantem todos os seus direitos sobre o Conteudo que publica.</p>
    
    <h2>4. Propriedade Intelectual</h2>
    <p>O Servico e seu conteudo original, recursos e funcionalidades sao e permanecerao propriedade exclusiva do Acucaradas Encomendas e seus licenciadores. O Servico e protegido por direitos autorais, marcas registradas e outras leis do Brasil e de outros paises.</p>
    
    <p>Nosso nome, logotipo e marcas relacionadas sao marcas comerciais do Acucaradas Encomendas. Voce nao deve usar essas marcas sem nossa permissao previa por escrito.</p>
    
    <h2>5. Pagamentos</h2>
    <p>O uso basico do aplicativo e gratuito. No entanto, podemos oferecer servicos ou recursos premium que requerem pagamento. Ao optar por um servico pago, voce concorda em pagar todas as taxas aplicaveis no momento do faturamento.</p>
    
    <p>Todas as taxas sao nao-reembolsaveis, exceto quando exigido por lei ou a nosso criterio exclusivo.</p>
    
    <h2>6. Limitacao de Responsabilidade</h2>
    <p>Em nenhum caso o Acucaradas Encomendas, seus diretores, funcionarios ou agentes serao responsaveis por quaisquer danos indiretos, incidentais, especiais, consequenciais ou punitivos, incluindo, sem limitacao, perda de lucros, dados, uso, boa vontade ou outras perdas intangiveis, resultantes de:</p>
    <ul>
        <li>Seu acesso ou uso ou incapacidade de acessar ou usar o Servico</li>
        <li>Qualquer conduta ou conteudo de terceiros no Servico</li>
        <li>Conteudo obtido do Servico</li>
        <li>Acesso nao autorizado, uso ou alteracao de suas transmissoes ou conteudo</li>
    </ul>
    
    <h2>7. Indenizacao</h2>
    <p>Voce concorda em defender, indenizar e isentar o Acucaradas Encomendas de e contra quaisquer reclamacoes, danos, obrigacoes, perdas, responsabilidades, custos ou dividas e despesas (incluindo, mas nao limitado a honorarios advocaticios) decorrentes de:</p>
    <ul>
        <li>Seu uso e acesso ao Servico</li>
        <li>Sua violacao destes Termos</li>
        <li>Sua violacao de quaisquer direitos de terceiros, incluindo, mas nao limitado a, direitos autorais, propriedade ou privacidade</li>
    </ul>
    
    <h2>8. Alteracoes</h2>
    <p>Reservamo-nos o direito, a nosso criterio exclusivo, de modificar ou substituir estes Termos a qualquer momento. Se uma revisao for material, tentaremos fornecer um aviso com pelo menos 30 dias de antecedencia antes que quaisquer novos termos entrem em vigor.</p>
    
    <p>O que constitui uma alteracao material sera determinado a nosso criterio exclusivo. Ao continuar a acessar ou usar nosso Servico apos essas revisoes se tornarem efetivas, voce concorda em ficar vinculado aos termos revisados.</p>
    
    <h2>9. Rescisao</h2>
    <p>Podemos encerrar ou suspender sua conta e acesso ao Servico imediatamente, sem aviso previo ou responsabilidade, por qualquer motivo, incluindo, sem limitacao, se voce violar os Termos.</p>
    
    <p>Mediante rescisao, seu direito de usar o Servico cessara imediatamente. Se voce deseja encerrar sua conta, voce pode simplesmente descontinuar o uso do Servico ou nos notificar.</p>
    
    <h2>10. Lei Aplicavel</h2>
    <p>Estes Termos serao regidos e interpretados de acordo com as leis do Brasil, independentemente de seus conflitos de disposicoes legais.</p>
    
    <p>Nossa falha em fazer valer qualquer direito ou disposicao destes Termos nao sera considerada uma renuncia a esses direitos. Se qualquer disposicao destes Termos for considerada invalida ou inexequivel por um tribunal, as disposicoes restantes destes Termos permanecerao em vigor.</p>
    
    <h2>11. Contato</h2>
    <p>Se voce tiver alguma duvida sobre estes Termos, entre em contato conosco:</p>
    <ul>
        <li>Por e-mail: contato@acucaradasencomendas.com.br</li>
        <li>Por telefone: (XX) XXXX-XXXX</li>
    </ul>
    
    <p class="date">Estes termos estao em vigor a partir de $(Get-Date -Format "dd/MM/yyyy")</p>
</body>
</html>
"@ }
                }
                
                try {
                    Set-Content -Path $filePath -Value $content
                    Write-Log "Arquivo criado: $file" -Type Success
                } catch {
                    Write-Log "Erro ao criar arquivo $file: $_" -Type Error
                }
            }
        } else {
            Write-Log "Operacao cancelada pelo usuario" -Type Warning
        }
    }
    
    Write-Log "Revisao de metadados concluida" -Type Success
}

# Funcao para preparar recursos graficos
function Prepare-GraphicResources {
    Write-Log "Iniciando preparacao de recursos graficos..." -Type Info
    
    # Criar subdiretorios para recursos graficos
    $iconDir = "$resourcesDir\icones"
    $screenshotDir = "$resourcesDir\screenshots"
    $featureGraphicDir = "$resourcesDir\feature-graphic"
    
    $dirs = @($iconDir, $screenshotDir, $featureGraphicDir)
    foreach ($dir in $dirs) {
        if (-not (Test-Path -Path $dir)) {
            try {
                New-Item -Path $dir -ItemType Directory -Force | Out-Null
                Write-Log "Diretorio criado: $dir" -Type Success
            } catch {
                Write-Log "Erro ao criar diretorio $dir: $_" -Type Error
            }
        }
    }
    
    # Criar arquivo README para icones
    $iconReadmePath = "$iconDir\README.md"
    $iconReadmeContent = @"
# Icones para Google Play Store

## Requisitos

### Icone do Aplicativo
- **Tamanho**: 512x512 pixels
- **Formato**: PNG 32-bits (com transparencia)
- **Qualidade**: Alta resolucao, sem compressao excessiva
- **Estilo**: Siga as diretrizes de Material Design

### Dicas de Design
- Mantenha o design simples e reconhecivel
- Use cores contrastantes
- Evite texto pequeno (o icone sera exibido em varios tamanhos)
- Teste o icone em fundos claros e escuros
- Mantenha uma area de seguranca ao redor do elemento principal

### Formatos Necessarios
1. **Icone de Alta Resolucao (512x512px)** - Obrigatorio para a Google Play Store
2. **Icone Adaptativo do Android**:
   - Camada de primeiro plano (foreground): 108x108dp (432x432px)
   - Camada de fundo (background): 108x108dp (432x432px)

## Checklist
- [ ] Icone criado no tamanho 512x512px
- [ ] Formato PNG com transparencia
- [ ] Design simples e reconhecivel
- [ ] Testado em diferentes tamanhos
- [ ] Versao adaptativa criada (para Android 8.0+)
- [ ] Otimizado para tamanho de arquivo

## Recursos Uteis
- [Diretrizes de Icones do Material Design](https://material.io/design/iconography/product-icons.html)
- [Ferramenta de Criacao de Icones Adaptaveis](https://developer.android.com/studio/write/image-asset-studio)
- [Verificador de Qualidade de Icones](https://developer.android.com/studio/write/lint)
"@
    
    Set-Content -Path $iconReadmePath -Value $iconReadmeContent
    Write-Log "README para icones criado: $iconReadmePath" -Type Success
    
    # Criar arquivo README para screenshots
    $screenshotReadmePath = "$screenshotDir\README.md"
    $screenshotReadmeContent = @"
# Screenshots para Google Play Store

## Requisitos

### Screenshots para Smartphone
- **Quantidade**: Minimo 2, maximo 8
- **Formato**: PNG ou JPEG
- **Orientacao**: Retrato (vertical) e/ou paisagem (horizontal)
- **Resolucao Minima**: 320px
- **Resolucao Maxima**: 3840px
- **Relacao de Aspecto**: Entre 16:9 e 2:1

### Screenshots para Tablet (Opcional)
- **Quantidade**: Minimo 2, maximo 8
- **Formato**: PNG ou JPEG
- **Orientacao**: Retrato (vertical) e/ou paisagem (horizontal)
- **Resolucao Minima**: 320px
- **Resolucao Maxima**: 3840px
- **Relacao de Aspecto**: Entre 16:9 e 2:1

### Dicas para Screenshots Eficazes
- Mostre as principais funcionalidades do aplicativo
- Adicione texto explicativo curto em cada screenshot
- Mantenha um estilo visual consistente
- Use dispositivos mockup para melhor apresentacao
- Organize em ordem logica (da funcionalidade mais importante para a menos importante)
- Otimize o tamanho dos arquivos sem perder qualidade

## Checklist
- [ ] Minimo de 2 screenshots para smartphone criados
- [ ] Screenshots mostram as principais funcionalidades
- [ ] Estilo visual consistente em todos os screenshots
- [ ] Texto explicativo adicionado (se aplicavel)
- [ ] Tamanho de arquivo otimizado
- [ ] Screenshots para tablet criados (se aplicavel)

## Resolucoes Recomendadas
- **Smartphone (16:9)**: 1080x1920px
- **Smartphone (18:9)**: 1080x2160px
- **Tablet (16:10)**: 1920x1200px
- **Tablet (4:3)**: 2048x1536px

## Recursos Uteis
- [Diretrizes de Screenshots da Google Play](https://developer.android.com/distribute/best-practices/launch/store-listing)
- [Ferramentas de Mockup para Dispositivos](https://www.mockupworld.co/free/category/mobile/)
- [Canva - Criacao de Screenshots](https://www.canva.com/)
"@
    
    Set-Content -Path $screenshotReadmePath -Value $screenshotReadmeContent
    Write-Log "README para screenshots criado: $screenshotReadmePath" -Type Success
    
    # Criar arquivo README para imagem de destaque
    $featureGraphicReadmePath = "$featureGraphicDir\README.md"
    $featureGraphicReadmeContent = @"
# Imagem de Destaque (Feature Graphic) para Google Play Store

## Requisitos

### Especificacoes Tecnicas
- **Tamanho**: 1024x500 pixels
- **Formato**: PNG ou JPEG (sem transparencia)
- **Cores**: RGB
- **Tamanho Maximo do Arquivo**: 1MB

### Diretrizes de Design
- **Area Segura**: Mantenha elementos importantes dentro da area central (640x320px)
- **Texto**: Limite o texto ao minimo necessario
- **Logo**: Inclua o logo do aplicativo, mas nao o faca muito pequeno
- **Cores**: Use cores que representem sua marca e sejam consistentes com o aplicativo
- **Contraste**: Garanta bom contraste para visibilidade

### O que Evitar
- Texto pequeno ou excessivo
- Bordas ou cantos arredondados (a imagem ocupara todo o espaco retangular)
- Incluir informacoes de classificacao, premios ou promocoes
- Usar a palavra "app" ou "aplicativo"
- Incluir screenshots de dispositivos

## Dicas para uma Imagem de Destaque Eficaz
- Mantenha o design simples e impactante
- Comunique claramente o proposito do aplicativo
- Use elementos visuais que representem as funcionalidades principais
- Mantenha consistencia com a identidade visual do aplicativo
- Teste como a imagem aparece em diferentes dispositivos

## Checklist
- [ ] Imagem criada no tamanho 1024x500px
- [ ] Formato PNG ou JPEG
- [ ] Elementos importantes na area segura central
- [ ] Texto limitado e legivel
- [ ] Logo do aplicativo incluido
- [ ] Cores consistentes com a identidade do aplicativo
- [ ] Tamanho do arquivo menor que 1MB

## Recursos Uteis
- [Diretrizes da Google Play para Graficos](https://developer.android.com/distribute/best-practices/launch/feature-graphic)
- [Canva - Criacao de Imagens de Destaque](https://www.canva.com/)
- [Adobe Express](https://www.adobe.com/express/)
"@
    
    Set-Content -Path $featureGraphicReadmePath -Value $featureGraphicReadmeContent
    Write-Log "README para imagem de destaque criado: $featureGraphicReadmePath" -Type Success
    
    # Criar template HTML para visualizacao de icone
    $iconTemplatePath = "$iconDir\template-icone.html"
    $iconTemplateContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template de Icone - Acucaradas Encomendas</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        h1, h2 {
            color: #d81b60;
        }
        h1 {
            border-bottom: 2px solid #d81b60;
            padding-bottom: 10px;
        }
        .icon-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin: 30px 0;
        }
        .icon-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .icon-preview h3 {
            margin-top: 15px;
            margin-bottom: 5px;
        }
        .icon-preview p {
            margin: 5px 0;
            font-size: 14px;
            color: #666;
        }
        .icon-box {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 200px;
            height: 200px;
            border: 1px dashed #ccc;
            margin-bottom: 10px;
        }
        .icon-box.light {
            background-color: white;
        }
        .icon-box.dark {
            background-color: #333;
        }
        .icon-box img {
            max-width: 100%;
            max-height: 100%;
        }
        .instructions {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .instructions code {
            background-color: #f5f5f5;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }
    </style>
</head>
<body>
    <h1>Template de Icone - Acucaradas Encomendas</h1>
    
    <p>Use este template para visualizar e testar o icone do seu aplicativo em diferentes tamanhos e fundos.</p>
    
    <div class="icon-container">
        <div class="icon-preview">
            <h3>Icone em Fundo Claro</h3>
            <div class="icon-box light">
                <!-- Substitua o caminho abaixo pelo caminho para o seu icone -->
                <img src="seu-icone-512x512.png" alt="Icone do Aplicativo" id="icon-light">
            </div>
            <p>512x512px - Tamanho para Google Play</p>
        </div>
        
        <div class="icon-preview">
            <h3>Icone em Fundo Escuro</h3>
            <div class="icon-box dark">
                <!-- Substitua o caminho abaixo pelo caminho para o seu icone -->
                <img src="seu-icone-512x512.png" alt="Icone do Aplicativo" id="icon-dark">
            </div>
            <p>512x512px - Tamanho para Google Play</p>
        </div>
    </div>
    
    <div class="icon-container">
        <div class="icon-preview">
            <h3>Icone Tamanho Medio</h3>
            <div class="icon-box light">
                <!-- Substitua o caminho abaixo pelo caminho para o seu icone -->
                <img src="seu-icone-512x512.png" alt="Icone do Aplicativo" id="icon-medium" style="width: 192px; height: 192px;">
            </div>
            <p>192x192px - Visualizacao media</p>
        </div>
        
        <div class="icon-preview">
            <h3>Icone Tamanho Pequeno</h3>
            <div class="icon-box light">
                <!-- Substitua o caminho abaixo pelo caminho para o seu icone -->
                <img src="seu-icone-512x512.png" alt="Icone do Aplicativo" id="icon-small" style="width: 48px; height: 48px;">
            </div>
            <p>48x48px - Visualizacao pequena</p>
        </div>
    </div>
    
    <div class="instructions">
        <h2>Como usar este template</h2>
        <ol>
            <li>Crie seu icone no tamanho 512x512 pixels em formato PNG com transparencia</li>
            <li>Salve o arquivo como <code>icone-acucaradas-512x512.png</code> nesta pasta</li>
            <li>Edite este arquivo HTML e atualize os caminhos das imagens para apontar para seu icone</li>
            <li>Abra este arquivo HTML em um navegador para visualizar seu icone em diferentes contextos</li>
            <li>Verifique se o icone e claramente visivel em todos os tamanhos e fundos</li>
        </ol>
        
        <h2>Dicas para um bom icone</h2>
        <ul>
            <li>Mantenha o design simples e reconhecivel</li>
            <li>Use cores contrastantes</li>
            <li>Evite detalhes muito pequenos que nao serao visiveis em tamanhos menores</li>
            <li>Teste em diferentes dispositivos e tamanhos</li>
            <li>Siga as diretrizes de Material Design para icones</li>
        </ul>
    </div>
    
    <script>
        // Script para carregar o icone quando o arquivo estiver disponivel
        document.addEventListener('DOMContentLoaded', function() {
            // Tente carregar o icone com nome padrao
            const iconFile = 'icone-acucaradas-512x512.png';
            
            // Funcao para verificar se o arquivo existe
            function checkImage(imageSrc, callback) {
                var img = new Image();
                img.onload = function() { callback(true); };
                img.onerror = function() { callback(false); };
                img.src = imageSrc;
            }
            
            // Verificar e atualizar as imagens
            checkImage(iconFile, function(exists) {
                if (exists) {
                    document.getElementById('icon-light').src = iconFile;
                    document.getElementById('icon-dark').src = iconFile;
                    document.getElementById('icon-medium').src = iconFile;
                    document.getElementById('icon-small').src = iconFile;
                }
            });
        });
    </script>
</body>
</html>
"@
    
    Set-Content -Path $iconTemplatePath -Value $iconTemplateContent
    Write-Log "Template HTML para icone criado: $iconTemplatePath" -Type Success
    
    # Criar template SVG para icone
    $iconSvgPath = "$iconDir\icone-template.svg"
    $iconSvgContent = @"
<svg width="512" height="512" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Fundo circular -->
    <circle cx="256" cy="256" r="256" fill="#D81B60"/>
    
    <!-- Cupcake base -->
    <path d="M176 352H336V392C336 405.255 325.255 416 312 416H200C186.745 416 176 405.255 176 392V352Z" fill="#F5F5F5"/>
    
    <!-- Cobertura do cupcake -->
    <path d="M160 256C160 221.6 187.6 194 222 194H290C324.4 194 352 221.6 352 256V352H160V256Z" fill="#F8BBD0"/>
    
    <!-- Decoracoes -->
    <circle cx="200" cy="240" r="12" fill="#F48FB1"/>
    <circle cx="240" cy="220" r="10" fill="#F48FB1"/>
    <circle cx="280" cy="230" r="14" fill="#F48FB1"/>
    <circle cx="310" cy="250" r="8" fill="#F48FB1"/>
    
    <!-- Cereja no topo -->
    <circle cx="256" cy="194" r="20" fill="#C2185B"/>
    <path d="M256 174C256 174 270 154 280 134" stroke="#4CAF50" stroke-width="6" stroke-linecap="round"/>
</svg>
"@
    
    Set-Content -Path $iconSvgPath -Value $iconSvgContent
    Write-Log "Template SVG para icone criado: $iconSvgPath" -Type Success
    
    # Criar template SVG para imagem de destaque
    $featureGraphicSvgPath = "$featureGraphicDir\feature-graphic-template.svg"
    $featureGraphicSvgContent = @"
<svg width="1024" height="500" viewBox="0 0 1024 500" fill="none" xmlns="http://www.w3.org/2000/svg">
    <!-- Fundo -->
    <rect width="1024" height="500" fill="#D81B60"/>
    
    <!-- Area segura (guia visual) -->
    <rect x="192" y="90" width="640" height="320" stroke="#FFFFFF" stroke-opacity="0.2" stroke-dasharray="5 5" fill="none"/>
    
    <!-- Elementos decorativos -->
    <circle cx="256" cy="250" r="120" fill="#F8BBD0" fill-opacity="0.6"/>
    <circle cx="768" cy="250" r="120" fill="#F8BBD0" fill-opacity="0.6"/>
    
    <!-- Titulo do aplicativo -->
    <text x="512" y="200" font-family="Arial" font-size="60" font-weight="bold" fill="white" text-anchor="middle">Acucaradas Encomendas</text>
    
    <!-- Subtitulo -->
    <text x="512" y="260" font-family="Arial" font-size="30" fill="white" text-anchor="middle">Gerencie seus pedidos de doces e bolos</text>
    
    <!-- Icone do aplicativo (representacao) -->
    <circle cx="512" cy="350" r="60" fill="white"/>
    <circle cx="512" cy="350" r="50" fill="#F8BBD0"/>
    <circle cx="512" cy="330" r="10" fill="#C2185B"/>
    
    <!-- Nota: Este e apenas um template. Substitua os elementos por seu design real. -->
    <text x="512" y="480" font-family="Arial" font-size="14" fill="white" text-anchor="middle">Substitua este template pelo seu design personalizado</text>
</svg>
"@
    
    Set-Content -Path $featureGraphicSvgPath -Value $featureGraphicSvgContent
    Write-Log "Template SVG para imagem de destaque criado: $featureGraphicSvgPath" -Type Success
    
    # Criar arquivo HTML para visualizacao de screenshots
    $screenshotTemplatePath = "$screenshotDir\template-screenshots.html"
    $screenshotTemplateContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template de Screenshots - Acucaradas Encomendas</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        h1, h2 {
            color: #d81b60;
        }
        h1 {
            border-bottom: 2px solid #d81b60;
            padding-bottom: 10px;
        }
        .screenshot-container {
            display: flex;
            flex-wrap: wrap;
            gap: 20px;
            margin: 30px 0;
            justify-content: center;
        }
        .screenshot-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            width: 320px;
        }
        .screenshot-preview h3 {
            margin-top: 15px;
            margin-bottom: 5px;
        }
        .screenshot-preview p {
            margin: 5px 0;
            font-size: 14px;
            color: #666;
            text-align: center;
        }
        .screenshot-box {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 280px;
            height: 560px;
            border: 1px dashed #ccc;
            margin-bottom: 10px;
            background-color: #f5f5f5;
            position: relative;
            overflow: hidden;
        }
        .screenshot-box img {
            max-width: 100%;
            max-height: 100%;
            object-fit: contain;
        }
        .screenshot-box .placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            color: #999;
            text-align: center;
            padding: 20px;
        }
        .screenshot-box .placeholder i {
            font-size: 48px;
            margin-bottom: 10px;
        }
        .instructions {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin-top: 30px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
        }
        .instructions code {
            background-color: #f5f5f5;
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }
        .upload-area {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
        }
        .upload-button {
            background-color: #d81b60;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;
        }
        .upload-button:hover {
            background-color: #c2185b;
        }
        .dimensions {
            background-color: #f5f5f5;
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 14px;
            margin-top: 10px;
            display: inline-block;
        }
        .toggle-safe-area {
            background-color: transparent;
            color: #d81b60;
            border: 1px solid #d81b60;
            padding: 5px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            margin-top: 10px;
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
</head>
<body>
    <h1>Template de Imagem de Destaque - Acucaradas Encomendas</h1>
    
    <p>Use este template para visualizar e criar a imagem de destaque (feature graphic) do seu aplicativo para a Google Play Store.</p>
    
    <div class="upload-area">
        <h2>Carregar Imagem de Destaque</h2>
        <p>Selecione a imagem de destaque do seu aplicativo (1024x500px) para visualiza-la neste template.</p>
        <input type="file" id="feature-graphic-upload" accept="image/*" style="display: none;">
        <button class="upload-button" onclick="document.getElementById('feature-graphic-upload').click()">Selecionar Imagem</button>
        <div class="dimensions">Dimensoes recomendadas: 1024x500 pixels</div>
    </div>
    
    <div class="preview-container">
        <div class="feature-graphic-preview" id="preview-container">
            <div class="placeholder">
                <i class="fas fa-image"></i>
                <p>Imagem de Destaque</p>
                <p>1024x500 pixels</p>
            </div>
            <div class="safe-area" id="safe-area">Area segura (640x320px)</div>
        </div>
        
        <button class="toggle-safe-area" id="toggle-safe-area">Mostrar/Ocultar Area Segura</button>
    </div>
    
    <div class="instructions">
        <h2>Como usar este template</h2>
        <ol>
            <li>Crie sua imagem de destaque no tamanho 1024x500 pixels</li>
            <li>Clique no botao "Selecionar Imagem" para carregar sua imagem</li>
            <li>Verifique se os elementos importantes estao dentro da area segura</li>
            <li>Use o botao "Mostrar/Ocultar Area Segura" para visualizar melhor sua imagem</li>
        </ol>
        
        <h2>Diretrizes para Imagem de Destaque</h2>
        <ul>
            <li><strong>Area Segura:</strong> Mantenha elementos importantes dentro da area central (640x320px)</li>
            <li><strong>Texto:</strong> Limite o texto ao minimo necessario</li>
            <li><strong>Logo:</strong> Inclua o logo do aplicativo, mas nao o faca muito pequeno</li>
            <li><strong>Cores:</strong> Use cores que representem sua marca e sejam consistentes com o aplicativo</li>
            <li><strong>Contraste:</strong> Garanta bom contraste para visibilidade</li>
        </ul>
        
        <h2>O que Evitar</h2>
        <ul>
            <li>Texto pequeno ou excessivo</li>
            <li>Bordas ou cantos arredondados (a imagem ocupara todo o espaco retangular)</li>
            <li>Incluir informacoes de classificacao, premios ou promocoes</li>
            <li>Usar a palavra "app" ou "aplicativo"</li>
            <li>Incluir screenshots de dispositivos</li>
        </ul>
    </div>
    
    <script>
        // Script para carregar e exibir a imagem de destaque
        document.addEventListener(''DOMContentLoaded'', function() {
            const uploadInput = document.getElementById(''feature-graphic-upload'');
            const previewContainer = document.getElementById(''preview-container'');
            const safeArea = document.getElementById(''safe-area'');
            const toggleSafeAreaButton = document.getElementById(''toggle-safe-area'');
            
            // Alternar visibilidade da area segura
            toggleSafeAreaButton.addEventListener(''click'', function() {
                if (safeArea.style.display === ''none'') {
                    safeArea.style.display = ''flex'';
                } else {
                    safeArea.style.display = ''none'';
                }
            });
            
            // Carregar imagem
            uploadInput.addEventListener(''change'', function(event) {
                const file = event.target.files[0];
                
                // Verificar se e uma imagem
                if (!file || !file.type.match(''image.*'')) return;
                
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    // Limpar container
                    previewContainer.innerHTML = '''';
                    
                    // Criar imagem
                    const img = document.createElement(''img'');
                    img.src = e.target.result;
                    img.alt = ''Imagem de Destaque'';
                    
                    // Adicionar imagem ao container
                    previewContainer.appendChild(img);
                    
                    // Verificar dimensoes da imagem
                    img.onload = function() {
                        if (img.naturalWidth !== 1024 || img.naturalHeight !== 500) {
                            alert(''Atencao: A imagem tem '' + img.naturalWidth + ''x'' + img.naturalHeight + ''px. O tamanho recomendado e 1024x500px.'');
                        }
                    };
                };
                
                reader.readAsDataURL(file);
            });
        });
    </script>
</body>
</html>
"@
    
    Set-Content -Path $featureGraphicTemplatePath -Value $featureGraphicTemplateContent
    Write-Log "Template HTML para imagem de destaque criado: $featureGraphicTemplatePath" -Type Success
    
    Write-Log "Preparacao de recursos graficos concluida" -Type Success
}

# Funcao para criar README com checklist
function Create-Checklist {
    Write-Log "Criando README com checklist..." -Type Info
    
    $readmePath = "$resourcesDir\README.md"
    $readmeContent = @"
# Recursos Graficos para Google Play Store - Acucaradas Encomendas

## Checklist de Recursos

### Icones
- [ ] Icone do aplicativo (512x512px, PNG com transparencia)
- [ ] Icone adaptativo (foreground e background)

### Screenshots
- [ ] Minimo de 2 screenshots para smartphone
- [ ] Screenshots em alta resolucao (1080x1920px recomendado)
- [ ] Screenshots mostram as principais funcionalidades
- [ ] Texto explicativo adicionado (se aplicavel)

### Imagem de Destaque (Feature Graphic)
- [ ] Imagem de destaque criada (1024x500px)
- [ ] Elementos importantes na area segura central
- [ ] Design consistente com a identidade do aplicativo

## Diretorios

- **icones/** - Armazena o icone principal e arquivos relacionados
- **screenshots/** - Armazena os screenshots do aplicativo
- **feature-graphic/** - Armazena a imagem de destaque

## Proximos Passos

1. **Revisar Metadados**
   - Verifique e personalize os textos no diretorio `play-store-metadata`
   - Ajuste as descricoes, palavras-chave e politicas conforme necessario

2. **Finalizar Recursos Graficos**
   - Complete todos os itens do checklist acima
   - Teste os recursos em diferentes dispositivos e tamanhos

3. **Configurar Conta na Google Play Console**
   - Acesse https://play.google.com/console/
   - Configure sua conta de desenvolvedor (taxa unica de $25 USD)
   - Crie uma nova ficha de aplicativo

4. **Enviar AAB para a Google Play**
   - Faca upload do arquivo AAB gerado
   - Preencha todos os campos de metadados
   - Envie para revisao

5. **Monitorar Processo de Revisao**
   - Acompanhe o status da revisao no Console
   - Esteja preparado para responder a quaisquer perguntas ou solicitacoes

## Recursos Uteis

- [Diretrizes de Design para Google Play](https://developer.android.com/distribute/best-practices/launch/store-listing)
- [Politicas do Programa para Desenvolvedores](https://play.google.com/about/developer-content-policy/)
- [Guia de Lancamento na Google Play](https://developer.android.com/distribute/best-practices/launch/)
"@
    
    Set-Content -Path $readmePath -Value $readmeContent
    Write-Log "README com checklist criado: $readmePath" -Type Success
}

# Executar funcoes principais
Write-Log "Iniciando processo de revisao de metadados e preparacao de recursos graficos..." -Type Info

# Revisar metadados
Review-Metadata

# Preparar recursos graficos
Prepare-GraphicResources

# Criar checklist
Create-Checklist

Write-Log "Processo concluido com sucesso!" -Type Success
Write-Log "Os arquivos foram criados nos seguintes diretorios:" -Type Info
Write-Log "- Metadados: $metadataDir" -Type Info
Write-Log "- Recursos Graficos: $resourcesDir" -Type Info

Write-Log "Proximos passos:" -Type Info
Write-Log "1. Revisar e personalizar os metadados" -Type Info
Write-Log "2. Criar os recursos graficos seguindo os templates" -Type Info
Write-Log "3. Verificar o checklist para garantir que todos os itens foram concluidos" -Type Info
Write-Log "4. Configurar sua conta na Google Play Console" -Type Info
Write-Log "5. Enviar o AAB para a Google Play" -Type Info

Write-Host ""
Write-Host "Pressione qualquer tecla para sair..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        }
        .upload-button:hover {
            background-color: #c2185b;
        }
    </style>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css">
</head>
<body>
    <h1>Template de Screenshots - Acucaradas Encomendas</h1>
    
    <p>Use este template para visualizar e organizar os screenshots do seu aplicativo para a Google Play Store.</p>
    
    <div class="upload-area">
        <h2>Carregar Screenshots</h2>
        <p>Selecione os screenshots do seu aplicativo para visualiza-los neste template.</p>
        <input type="file" id="screenshot-upload" accept="image/*" multiple style="display: none;">
        <button class="upload-button" onclick="document.getElementById('screenshot-upload').click()">Selecionar Screenshots</button>
    </div>
    
    <h2>Screenshots para Smartphone</h2>
    <div class="screenshot-container" id="smartphone-container">
        <!-- Os screenshots serao adicionados aqui via JavaScript -->
        <div class="screenshot-preview">
            <h3>Screenshot 1</h3>
            <div class="screenshot-box">
                <div class="placeholder">
                    <i class="fas fa-image"></i>
                    <p>Tela Inicial</p>
                    <p>Resolucao recomendada: 1080x1920px</p>
                </div>
            </div>
            <p>Tela Inicial do Aplicativo</p>
        </div>
        
        <div class="screenshot-preview">
            <h3>Screenshot 2</h3>
            <div class="screenshot-box">
                <div class="placeholder">
                    <i class="fas fa-image"></i>
                    <p>Lista de Produtos</p>
                    <p>Resolucao recomendada: 1080x1920px</p>
                </div>
            </div>
            <p>Catalogo de Produtos</p>
        </div>
        
        <div class="screenshot-preview">
            <h3>Screenshot 3</h3>
            <div class="screenshot-box">
                <div class="placeholder">
                    <i class="fas fa-image"></i>
                    <p>Detalhes do Pedido</p>
                    <p>Resolucao recomendada: 1080x1920px</p>
                </div>
            </div>
            <p>Detalhes do Pedido</p>
        </div>
        
        <div class="screenshot-preview">
            <h3>Screenshot 4</h3>
            <div class="screenshot-box">
                <div class="placeholder">
                    <i class="fas fa-image"></i>
                    <p>Calendario de Entregas</p>
                    <p>Resolucao recomendada: 1080x1920px</p>
                </div>
            </div>
            <p>Calendario de Entregas</p>
        </div>
    </div>
    
    <div class="instructions">
        <h2>Como usar este template</h2>
        <ol>
            <li>Crie seus screenshots nas resolucoes recomendadas (1080x1920px para smartphones)</li>
            <li>Clique no botao "Selecionar Screenshots" para carregar suas imagens</li>
            <li>Visualize como seus screenshots ficarao na Google Play Store</li>
            <li>Organize-os na ordem desejada</li>
            <li>Verifique se todas as funcionalidades principais do aplicativo estao representadas</li>
        </ol>
        
        <h2>Dicas para screenshots eficazes</h2>
        <ul>
            <li>Mostre as principais funcionalidades do aplicativo</li>
            <li>Adicione texto explicativo curto em cada screenshot</li>
            <li>Mantenha um estilo visual consistente</li>
            <li>Use dispositivos mockup para melhor apresentacao</li>
            <li>Organize em ordem logica (da funcionalidade mais importante para a menos importante)</li>
            <li>Otimize o tamanho dos arquivos sem perder qualidade</li>
        </ul>
    </div>
    
    <script>
        // Script para carregar e exibir screenshots
        document.addEventListener('DOMContentLoaded', function() {
            const uploadInput = document.getElementById('screenshot-upload');
            const smartphoneContainer = document.getElementById('smartphone-container');
            
            uploadInput.addEventListener('change', function(event) {
                // Limpar container existente
                smartphoneContainer.innerHTML = '';
                
                const files = event.target.files;
                
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    
                    // Verificar se e uma imagem
                    if (!file.type.match('image.*')) continue;
                    
                    const reader = new FileReader();
                    
                    reader.onload = function(e) {
                        // Criar elemento de preview
                        const preview = document.createElement('div');
                        preview.className = 'screenshot-preview';
                        
                        // Criar titulo
                        const title = document.createElement('h3');
                        title.textContent = `Screenshot ${i + 1}`;
                        
                        // Criar caixa de screenshot
                        const box = document.createElement('div');
                        box.className = 'screenshot-box';
                        
                        // Criar imagem
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.alt = `Screenshot ${i + 1}`;
                        
                        // Criar descricao
                        const description = document.createElement('p');
                        description.textContent = `Screenshot ${i + 1} - ${file.name}`;
                        
                        // Montar estrutura
                        box.appendChild(img);
                        preview.appendChild(title);
                        preview.appendChild(box);
                        preview.appendChild(description);
                        
                        // Adicionar ao container
                        smartphoneContainer.appendChild(preview);
                    };
                    
                    reader.readAsDataURL(file);
                }
            });
        });
    </script>
</body>
</html>
"@
    
    Set-Content -Path $screenshotTemplatePath -Value $screenshotTemplateContent
    Write-Log "Template HTML para screenshots criado: $screenshotTemplatePath" -Type Success
    
    # Criar arquivo HTML para visualizacao de imagem de destaque
    $featureGraphicTemplatePath = "$featureGraphicDir\template-feature-graphic.html"
    $featureGraphicTemplateContent = @"
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Template de Imagem de Destaque - Acucaradas Encomendas</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        h1, h2 {
            color: #d81b60;
        }
        h1 {
            border-bottom: 2px solid #d81b60;
            padding-bottom: 10px;
        }
        .preview-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            margin: 30px 0;
        }
        .feature-graphic-preview {
            width: 1024px;
            height: 500px;
            border: 1px solid #ccc;
            margin-bottom: 20px;
            position: relative;
            overflow: hidden;
            background-color: #f5f5f5;
        }
        .feature-graphic-preview img {
            width: 100%;
            height: 100%;
            object-fit: contain;
        }
        .feature-graphic-preview .placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            width: 100%;
            height: 100%;
            color: #999;
            text-align: center;
            padding: 20px;
        }
        .feature-graphic-preview .placeholder i {
            font-size: 64px;
            margin-bottom: 20px;
        }
        .feature-graphic-preview .safe-area {
            position: absolute;
            top: 90px;
            left: 192px;
            width: 640px;
            height: 320px;
            border: 1px dashed #d81b60;
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #d81b60;
            font-size: 14px;
            opacity: 0.7;
        }
        .upload-area {
            background-color: white;
            border-radius: 8px;
            padding: 20px;
            margin: 30px 0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
            text-align: center;
            width: 100%;
            max-width: 1024px;
        }
        .upload-button {
            background-color: #d81b60;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
            margin-top: 10px;