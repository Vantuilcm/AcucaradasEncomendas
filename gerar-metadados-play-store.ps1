# Script para gerar metadados para publicacao na Google Play Store
# Acucaradas Encomendas

# Configuracoes iniciais
$ErrorActionPreference = "Continue"
$projectRoot = $PSScriptRoot
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
$metadataDir = Join-Path $projectRoot "play-store-metadata"

# Funcao para registrar mensagens de log
function Write-Log {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Message,
        
        [Parameter(Mandatory=$false)]
        [string]$ForegroundColor = "White"
    )
    
    Write-Host $Message -ForegroundColor $ForegroundColor
}

Write-Host ""
Write-Host "===== GERACAO DE METADADOS PARA GOOGLE PLAY STORE ====="
Write-Host "Iniciado em: $timestamp"
Write-Host "Diretorio do projeto: $projectRoot"
Write-Host "------------------------------------------"
Write-Host ""

# Criar diretorio para metadados se nao existir
if (-not (Test-Path $metadataDir)) {
    Write-Log "Criando diretorio para metadados: $metadataDir" -ForegroundColor Cyan
    New-Item -ItemType Directory -Path $metadataDir | Out-Null
}

# Criar subdiretorio para cada idioma
$languages = @("pt-BR", "en-US")
foreach ($lang in $languages) {
    $langDir = Join-Path $metadataDir $lang
    if (-not (Test-Path $langDir)) {
        Write-Log "Criando diretorio para idioma $lang" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $langDir | Out-Null
    }
}

# Definir metadados para o aplicativo
$appMetadata = @{
    "pt-BR" = @{
        "app_name" = "Açucaradas Encomendas"
        "short_description" = "Gerencie seus pedidos de doces e bolos de forma simples e eficiente."
        "full_description" = "O aplicativo Açucaradas Encomendas é a solução perfeita para gerenciar seus pedidos de doces e bolos artesanais. Com uma interface intuitiva e amigável, você pode cadastrar clientes, registrar pedidos, acompanhar o status de produção e entregas, além de gerar relatórios detalhados sobre suas vendas.\n\nPrincipais funcionalidades:\n\n• Cadastro de clientes com informações de contato\n• Registro de pedidos com detalhes personalizados\n• Catálogo de produtos com fotos e descrições\n• Acompanhamento do status de produção\n• Controle de pagamentos e entregas\n• Notificações de prazos e compromissos\n• Relatórios de vendas e desempenho\n\nIdeal para confeiteiros, doceiros e pequenos empreendedores do ramo de doces artesanais que desejam organizar seu negócio e oferecer um atendimento mais profissional aos seus clientes.\n\nBaixe agora e transforme a gestão do seu negócio de doces!"
        "keywords" = "confeitaria, doces, bolos, encomendas, gestão, pedidos, confeiteiros, doceiros, empreendedorismo"
        "whats_new" = "• Correção de bugs e melhorias de desempenho\n• Interface renovada para melhor experiência do usuário\n• Novas funcionalidades de relatórios e estatísticas\n• Suporte a múltiplos perfis de usuário"
    }
    "en-US" = @{
        "app_name" = "Sweet Orders"
        "short_description" = "Manage your cake and sweet orders simply and efficiently."
        "full_description" = "The Sweet Orders app is the perfect solution for managing your artisanal cake and sweet orders. With an intuitive and user-friendly interface, you can register customers, record orders, track production and delivery status, and generate detailed reports on your sales.\n\nMain features:\n\n• Customer registration with contact information\n• Order recording with customized details\n• Product catalog with photos and descriptions\n• Production status tracking\n• Payment and delivery control\n• Deadline and appointment notifications\n• Sales and performance reports\n\nIdeal for confectioners, bakers, and small entrepreneurs in the artisanal sweets business who want to organize their business and offer more professional service to their customers.\n\nDownload now and transform the management of your sweet business!"
        "keywords" = "confectionery, sweets, cakes, orders, management, bakers, confectioners, entrepreneurship"
        "whats_new" = "• Bug fixes and performance improvements\n• Renewed interface for better user experience\n• New reporting and statistics features\n• Support for multiple user profiles"
    }
}

# Gerar arquivos de metadados para cada idioma
foreach ($lang in $languages) {
    $langDir = Join-Path $metadataDir $lang
    $metadata = $appMetadata[$lang]
    
    # Gerar arquivo de nome do aplicativo
    $appNamePath = Join-Path $langDir "app_name.txt"
    $metadata.app_name | Out-File -FilePath $appNamePath -Encoding utf8
    
    # Gerar arquivo de descrição curta
    $shortDescPath = Join-Path $langDir "short_description.txt"
    $metadata.short_description | Out-File -FilePath $shortDescPath -Encoding utf8
    
    # Gerar arquivo de descrição completa
    $fullDescPath = Join-Path $langDir "full_description.txt"
    $metadata.full_description | Out-File -FilePath $fullDescPath -Encoding utf8
    
    # Gerar arquivo de palavras-chave
    $keywordsPath = Join-Path $langDir "keywords.txt"
    $metadata.keywords | Out-File -FilePath $keywordsPath -Encoding utf8
    
    # Gerar arquivo de novidades
    $whatsNewPath = Join-Path $langDir "whats_new.txt"
    $metadata.whats_new | Out-File -FilePath $whatsNewPath -Encoding utf8
    
    Write-Log "Metadados gerados para o idioma $lang" -ForegroundColor Green
}

# Gerar arquivo de política de privacidade
$privacyPolicyPath = Join-Path $metadataDir "privacy_policy.html"
$privacyPolicy = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Política de Privacidade - Açucaradas Encomendas</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        h1, h2 { color: #8B4513; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Política de Privacidade - Açucaradas Encomendas</h1>
        <p><em>Última atualização: $(Get-Date -Format "dd/MM/yyyy")</em></p>
        
        <h2>1. Introdução</h2>
        <p>Bem-vindo à Política de Privacidade do aplicativo Açucaradas Encomendas. Esta política descreve como coletamos, usamos, processamos e protegemos suas informações pessoais quando você utiliza nosso aplicativo.</p>
        
        <h2>2. Informações que Coletamos</h2>
        <p>Podemos coletar os seguintes tipos de informações:</p>
        <ul>
            <li><strong>Informações de Conta:</strong> Nome, endereço de e-mail, número de telefone e endereço para entrega.</li>
            <li><strong>Informações de Uso:</strong> Dados sobre como você interage com o aplicativo, incluindo pedidos realizados, preferências e configurações.</li>
            <li><strong>Informações do Dispositivo:</strong> Modelo do dispositivo, sistema operacional, identificadores únicos e dados de rede móvel.</li>
        </ul>
        
        <h2>3. Como Usamos Suas Informações</h2>
        <p>Utilizamos suas informações para:</p>
        <ul>
            <li>Processar e gerenciar seus pedidos de produtos</li>
            <li>Fornecer suporte ao cliente</li>
            <li>Melhorar e personalizar sua experiência no aplicativo</li>
            <li>Enviar notificações sobre o status dos pedidos</li>
            <li>Desenvolver novos recursos e funcionalidades</li>
        </ul>
        
        <h2>4. Compartilhamento de Informações</h2>
        <p>Não vendemos suas informações pessoais a terceiros. Podemos compartilhar informações com:</p>
        <ul>
            <li>Prestadores de serviços que nos auxiliam na operação do aplicativo</li>
            <li>Parceiros de entrega para realizar a entrega dos produtos</li>
            <li>Autoridades legais quando exigido por lei</li>
        </ul>
        
        <h2>5. Segurança de Dados</h2>
        <p>Implementamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, alteração, divulgação ou destruição.</p>
        
        <h2>6. Seus Direitos</h2>
        <p>Você tem o direito de:</p>
        <ul>
            <li>Acessar as informações pessoais que mantemos sobre você</li>
            <li>Corrigir informações imprecisas</li>
            <li>Excluir suas informações pessoais</li>
            <li>Retirar seu consentimento a qualquer momento</li>
        </ul>
        
        <h2>7. Alterações nesta Política</h2>
        <p>Podemos atualizar esta política periodicamente. Notificaremos você sobre quaisquer alterações significativas por meio do aplicativo ou por e-mail.</p>
        
        <h2>8. Contato</h2>
        <p>Se você tiver dúvidas ou preocupações sobre esta política de privacidade, entre em contato conosco pelo e-mail: contato@acucaradas.com.br</p>
    </div>
</body>
</html>
"@

$privacyPolicy | Out-File -FilePath $privacyPolicyPath -Encoding utf8
Write-Log "Política de privacidade gerada" -ForegroundColor Green

# Gerar arquivo de termos de uso
$termsOfServicePath = Join-Path $metadataDir "terms_of_service.html"
$termsOfService = @"
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Termos de Uso - Açucaradas Encomendas</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        h1, h2 { color: #8B4513; }
        .container { max-width: 800px; margin: 0 auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Termos de Uso - Açucaradas Encomendas</h1>
        <p><em>Última atualização: $(Get-Date -Format "dd/MM/yyyy")</em></p>
        
        <h2>1. Aceitação dos Termos</h2>
        <p>Ao baixar, instalar ou usar o aplicativo Açucaradas Encomendas, você concorda com estes Termos de Uso. Se você não concordar com estes termos, não use o aplicativo.</p>
        
        <h2>2. Descrição do Serviço</h2>
        <p>O Açucaradas Encomendas é um aplicativo que permite aos usuários gerenciar pedidos de doces e bolos artesanais, incluindo cadastro de clientes, registro de pedidos, acompanhamento de produção e entregas.</p>
        
        <h2>3. Conta de Usuário</h2>
        <p>Para utilizar todas as funcionalidades do aplicativo, você pode precisar criar uma conta. Você é responsável por manter a confidencialidade de suas credenciais de login e por todas as atividades que ocorrem em sua conta.</p>
        
        <h2>4. Uso Permitido</h2>
        <p>Você concorda em usar o aplicativo apenas para fins legais e de acordo com estes Termos. Você não deve:</p>
        <ul>
            <li>Violar quaisquer leis aplicáveis</li>
            <li>Distribuir vírus ou outros códigos maliciosos</li>
            <li>Tentar acessar contas de outros usuários</li>
            <li>Interferir no funcionamento adequado do aplicativo</li>
        </ul>
        
        <h2>5. Propriedade Intelectual</h2>
        <p>O aplicativo e todo o seu conteúdo, recursos e funcionalidades são de propriedade da Açucaradas Encomendas e estão protegidos por leis de direitos autorais, marcas registradas e outras leis de propriedade intelectual.</p>
        
        <h2>6. Limitação de Responsabilidade</h2>
        <p>O aplicativo é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo. Não garantimos que o aplicativo será ininterrupto, oportuno, seguro ou livre de erros.</p>
        
        <h2>7. Indenização</h2>
        <p>Você concorda em indenizar e isentar a Açucaradas Encomendas de qualquer reclamação, responsabilidade, danos, perdas e despesas decorrentes de sua violação destes Termos ou do uso indevido do aplicativo.</p>
        
        <h2>8. Modificações dos Termos</h2>
        <p>Reservamo-nos o direito de modificar estes Termos a qualquer momento. As alterações entrarão em vigor após a publicação dos Termos revisados no aplicativo.</p>
        
        <h2>9. Rescisão</h2>
        <p>Podemos encerrar ou suspender seu acesso ao aplicativo imediatamente, sem aviso prévio, por qualquer motivo, incluindo, sem limitação, a violação destes Termos.</p>
        
        <h2>10. Lei Aplicável</h2>
        <p>Estes Termos serão regidos e interpretados de acordo com as leis do Brasil, independentemente de seus conflitos de princípios legais.</p>
        
        <h2>11. Contato</h2>
        <p>Se você tiver dúvidas sobre estes Termos, entre em contato conosco pelo e-mail: contato@acucaradas.com.br</p>
    </div>
</body>
</html>
"@

$termsOfService | Out-File -FilePath $termsOfServicePath -Encoding utf8
Write-Log "Termos de uso gerados" -ForegroundColor Green

# Criar arquivo de instruções para screenshots
$screenshotsInstructionsPath = Join-Path $metadataDir "screenshots_instructions.md"
$screenshotsInstructions = @"
# Instruções para Screenshots da Google Play Store

## Requisitos de Screenshots

A Google Play Store requer screenshots em diferentes tamanhos para diversos dispositivos. Aqui estão as especificações recomendadas:

### Smartphones
- **Tamanho mínimo**: 320px
- **Tamanho máximo**: 3840px
- **Relação de aspecto**: 16:9 (recomendado)
- **Formato**: PNG ou JPEG (sem transparência)
- **Quantidade**: 2-8 screenshots

### Tablets
- **Tamanho mínimo**: 320px
- **Tamanho máximo**: 3840px
- **Relação de aspecto**: 16:9 ou 4:3 (recomendado)
- **Formato**: PNG ou JPEG (sem transparência)
- **Quantidade**: 2-8 screenshots

## Telas Recomendadas para Captura

Para mostrar as principais funcionalidades do aplicativo Açucaradas Encomendas, recomendamos capturar as seguintes telas:

1. **Tela de Início/Dashboard** - Mostrando resumo de pedidos e estatísticas
2. **Catálogo de Produtos** - Exibindo os doces e bolos disponíveis
3. **Detalhes do Produto** - Mostrando informações detalhadas de um item
4. **Formulário de Pedido** - Captura do processo de criação de um pedido
5. **Lista de Clientes** - Exibindo o gerenciamento de clientes
6. **Calendário de Entregas** - Mostrando o planejamento de entregas
7. **Relatórios** - Exibindo gráficos e estatísticas de vendas
8. **Configurações** - Mostrando as opções de personalização

## Dicas para Screenshots Eficazes

1. **Use dados realistas** - Preencha o app com dados que pareçam reais para demonstrar o uso prático
2. **Mantenha a consistência** - Use o mesmo dispositivo e tema para todas as capturas
3. **Destaque recursos-chave** - Cada screenshot deve mostrar claramente um recurso importante
4. **Adicione texto explicativo** - Considere adicionar breves descrições sobre o que cada tela mostra
5. **Evite informações sensíveis** - Não inclua dados pessoais reais ou informações confidenciais
6. **Verifique a qualidade** - Certifique-se de que as imagens estão nítidas e bem enquadradas

## Processo de Captura

1. Instale o aplicativo em um dispositivo com tela limpa (sem notificações ou status de bateria baixa)
2. Configure o dispositivo para exibir o horário como 9:41 (padrão de marketing)
3. Remova widgets e notificações desnecessárias
4. Use a ferramenta de captura de tela do dispositivo ou o Android Studio
5. Edite as imagens conforme necessário usando Photoshop, GIMP ou Canva
6. Salve no formato e tamanho corretos
7. Organize os arquivos por tipo de dispositivo

## Nomeação dos Arquivos

Recomendamos nomear os arquivos seguindo este padrão:

```
device_feature_number.png
```

Exemplos:
- `phone_dashboard_01.png`
- `phone_catalog_02.png`
- `tablet_orders_01.png`
- `tablet_reports_02.png`
"@

$screenshotsInstructions | Out-File -FilePath $screenshotsInstructionsPath -Encoding utf8
Write-Log "Instruções para screenshots geradas" -ForegroundColor Green

# Criar arquivo de declaração de segurança de dados
$dataSafetyPath = Join-Path $metadataDir "data_safety_declaration.md"
$dataSafetyDeclaration = @"
# Declaração de Segurança de Dados - Açucaradas Encomendas

## Visão Geral

Esta declaração de segurança de dados foi preparada para atender aos requisitos da seção "Data Safety" (Segurança de Dados) da Google Play Store. Ela descreve quais dados o aplicativo Açucaradas Encomendas coleta, como são usados e as práticas de segurança implementadas.

## Dados Coletados e Finalidade

### Informações Pessoais

| Tipo de Dado | Coletado | Finalidade | Compartilhado | Opcional |
|--------------|----------|------------|--------------|----------|
| Nome | Sim | Processamento de pedidos | Não | Não |
| E-mail | Sim | Comunicação e autenticação | Não | Não |
| Número de telefone | Sim | Comunicação sobre pedidos | Não | Não |
| Endereço | Sim | Entrega de produtos | Sim* | Não |

*Compartilhado apenas com serviços de entrega quando necessário

### Dados do Dispositivo e Uso

| Tipo de Dado | Coletado | Finalidade | Compartilhado | Opcional |
|--------------|----------|------------|--------------|----------|
| ID do dispositivo | Sim | Autenticação e segurança | Não | Não |
| Dados de uso do app | Sim | Melhorias no aplicativo | Não | Sim |
| Registros de erros | Sim | Correção de bugs | Não | Sim |
| Localização aproximada | Sim | Otimização de entregas | Não | Sim |

## Práticas de Segurança

### Criptografia

Todos os dados pessoais são criptografados durante a transmissão usando protocolos HTTPS/TLS. Os dados armazenados localmente no dispositivo são criptografados usando as APIs de segurança padrão do Android.

### Retenção de Dados

Os dados pessoais são retidos apenas pelo tempo necessário para fornecer os serviços solicitados e cumprir obrigações legais. Os usuários podem solicitar a exclusão de seus dados a qualquer momento.

### Proteção de Dados de Crianças

O aplicativo Açucaradas Encomendas não é direcionado a crianças menores de 13 anos e não coleta intencionalmente informações pessoais de crianças.

## Permissões do Aplicativo

| Permissão | Finalidade | Obrigatória |
|-----------|------------|-------------|
| Internet | Sincronização de dados com o servidor | Sim |
| Armazenamento | Salvar dados localmente | Sim |
| Câmera | Capturar fotos de produtos | Não |
| Notificações | Enviar alertas sobre pedidos | Não |
| Localização aproximada | Otimizar rotas de entrega | Não |

## Processadores de Dados Terceirizados

| Serviço | Finalidade | Dados Acessados |
|---------|------------|----------------|
| Firebase | Autenticação e banco de dados | Dados de usuário e pedidos |
| Google Analytics | Análise de uso do aplicativo | Dados de uso anônimos |

## Direitos do Usuário

Os usuários têm os seguintes direitos em relação aos seus dados pessoais:

- Acesso aos dados pessoais coletados
- Correção de dados imprecisos
- Exclusão de dados pessoais
- Restrição ou objeção ao processamento
- Portabilidade de dados
- Retirada de consentimento

Para exercer esses direitos, os usuários podem entrar em contato através do e-mail: contato@acucaradas.com.br

## Atualizações desta Declaração

Esta declaração pode ser atualizada periodicamente para refletir mudanças nas práticas de coleta e uso de dados. Os usuários serão notificados sobre alterações significativas.

---

Última atualização: $(Get-Date -Format "dd/MM/yyyy")
"@

$dataSafetyDeclaration | Out-File -FilePath $dataSafetyPath -Encoding utf8
Write-Log "Declaração de segurança de dados gerada" -ForegroundColor Green

# Criar arquivo de checklist para publicação
$checklistPath = Join-Path $metadataDir "publicacao_checklist.md"
$checklist = @"
# Checklist de Publicação na Google Play Store

## Preparação do Aplicativo

- [ ] Versão do aplicativo incrementada no arquivo `app.json` ou `build.gradle`
- [ ] Código do aplicativo testado em diferentes dispositivos
- [ ] Todos os recursos críticos funcionando corretamente
- [ ] Arquivo AAB gerado e assinado com chave de produção
- [ ] Tamanho do AAB otimizado (menor que 150MB)

## Conta de Desenvolvedor

- [ ] Conta na Google Play Console ativa
- [ ] Taxa anual de desenvolvedor paga
- [ ] Informações fiscais e de pagamento atualizadas
- [ ] Verificação de identidade concluída (se aplicável)

## Metadados do Aplicativo

- [ ] Nome do aplicativo definido ("Açucaradas Encomendas")
- [ ] Descrição curta criada (até 80 caracteres)
- [ ] Descrição completa elaborada (até 4000 caracteres)
- [ ] Categoria principal selecionada (Produtividade/Negócios)
- [ ] Categoria secundária selecionada (opcional)
- [ ] Tags/palavras-chave definidas
- [ ] Informações de contato atualizadas

## Recursos Gráficos

- [ ] Ícone de alta resolução (512x512px)
- [ ] Imagem de destaque (1024x500px)
- [ ] Screenshots para smartphones (pelo menos 2)
- [ ] Screenshots para tablets (pelo menos 2, se aplicável)
- [ ] Vídeo promocional (opcional)

## Classificação de Conteúdo

- [ ] Questionário de classificação de conteúdo preenchido
- [ ] Classificação etária apropriada
- [ ] Justificativas para elementos sensíveis (se aplicável)

## Políticas e Conformidade

- [ ] Política de privacidade criada e URL fornecida
- [ ] Termos de uso elaborados
- [ ] Declaração de segurança de dados preenchida
- [ ] Permissões do aplicativo justificadas
- [ ] Conformidade com as políticas do Google Play

## Preços e Distribuição

- [ ] Modelo de monetização definido (gratuito, pago, compras no aplicativo)
- [ ] Preço definido (se aplicável)
- [ ] Países de distribuição selecionados
- [ ] Dispositivos compatíveis especificados

## Testes e Lançamento

- [ ] Teste interno configurado
- [ ] Teste fechado (alfa/beta) configurado (opcional)
- [ ] Notas de lançamento criadas
- [ ] Estratégia de lançamento definida (completo ou gradual)

## Pós-Lançamento

- [ ] Monitoramento de crashes e ANRs
- [ ] Acompanhamento de avaliações e comentários
- [ ] Plano de atualizações regulares
- [ ] Estratégia de ASO (App Store Optimization)

---

Use este checklist para garantir que todos os aspectos necessários para a publicação na Google Play Store foram considerados e implementados. Marque cada item conforme for concluído.
"@

$checklist | Out-File -FilePath $checklistPath -Encoding utf8
Write-Log "Checklist de publicação gerado" -ForegroundColor Green

Write-Host ""
Write-Log "===== METADADOS GERADOS COM SUCESSO ====="
Write-Host ""
Write-Log "Diretório de metadados: $metadataDir" -ForegroundColor Cyan
Write-Log "Arquivos gerados:" -ForegroundColor Cyan

# Listar arquivos gerados
Get-ChildItem -Path $metadataDir -Recurse | ForEach-Object {
    if (-not $_.PSIsContainer) {
        $relativePath = $_.FullName.Replace($metadataDir, ".")
        Write-Host "  $relativePath"
    }
}

Write-Host ""
Write-Log "Próximos passos:" -ForegroundColor Yellow
Write-Log "1. Revise e personalize os metadados gerados" -ForegroundColor Yellow
Write-Log "2. Prepare os recursos gráficos (ícones, screenshots, etc.)" -ForegroundColor Yellow
Write-Log "3. Use o checklist para garantir que todos os requisitos foram atendidos" -ForegroundColor Yellow
Write-Log "4. Faça upload do AAB e dos metadados no Google Play Console" -ForegroundColor Yellow
Write-Host ""