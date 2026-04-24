<#
.SYNOPSIS
    Plano de Resposta a Incidentes de Segurança para o projeto Acucaradas Encomendas.

.DESCRIPTION
    Este script implementa um plano estruturado de resposta a incidentes de segurança,
    definindo procedimentos, responsabilidades e fluxos de trabalho para lidar com
    violações de segurança de forma eficaz e minimizar impactos.

.NOTES
    Autor: Equipe de Segurança Acucaradas Encomendas
    Data: $(Get-Date -Format "dd/MM/yyyy")
    Requisitos: PowerShell 5.1+
#>

# Definir codificação UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# Importar módulo de notificações de segurança
$notificacoesPath = "$PSScriptRoot\sistema-notificacoes-seguranca.ps1"
if (Test-Path $notificacoesPath) {
    . $notificacoesPath
}

# Configurações globais
$global:CONFIG = @{
    LogPath = "$PSScriptRoot\..\logs-seguranca\incidentes"
    ConfigPath = "$PSScriptRoot\..\config-seguranca\incidentes-config.json"
    TemplatePath = "$PSScriptRoot\..\templates-seguranca\incidentes"
    IncidentesPath = "$PSScriptRoot\..\data-seguranca\incidentes"
    ForensicsPath = "$PSScriptRoot\..\data-seguranca\forensics"
}

# Função para mostrar status das tarefas
function Show-IncidentStatus {
    param (
        [string]$Message,
        [string]$Status = "INFO",
        [switch]$NoNewLine
    )

    $colors = @{
        "SUCCESS" = "Green"
        "INFO" = "Cyan"
        "WARNING" = "Yellow"
        "ERROR" = "Red"
        "CRITICAL" = "DarkRed"
        "INCIDENT" = "Magenta"
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $statusText = "[$timestamp] [$Status] $Message"
    
    if ($colors.ContainsKey($Status)) {
        Write-Host $statusText -ForegroundColor $colors[$Status] -NoNewline:$NoNewLine
    } else {
        Write-Host $statusText -NoNewline:$NoNewLine
    }

    # Registrar em log
    $logFile = "$($global:CONFIG.LogPath)\incident-response-$(Get-Date -Format 'yyyy-MM-dd').log"
    try {
        if (-not (Test-Path $global:CONFIG.LogPath)) {
            New-Item -Path $global:CONFIG.LogPath -ItemType Directory -Force | Out-Null
        }
        Add-Content -Path $logFile -Value $statusText -Encoding UTF8
    } catch {
        Write-Host "Erro ao escrever no log: $_" -ForegroundColor Red
    }
}

# Função para criar/atualizar configuração
function Initialize-IncidentConfig {
    if (-not (Test-Path (Split-Path $global:CONFIG.ConfigPath -Parent))) {
        New-Item -Path (Split-Path $global:CONFIG.ConfigPath -Parent) -ItemType Directory -Force | Out-Null
    }

    if (-not (Test-Path $global:CONFIG.ConfigPath)) {
        $defaultConfig = @{
            IncidentResponse = @{
                Team = @(
                    @{
                        Role = "Coordenador de Incidentes"
                        Name = "[Nome do Coordenador]"
                        Email = "coordenador@acucaradas.com"
                        Phone = "(11) 98765-4321"
                        Responsibilities = @(
                            "Coordenar a resposta a incidentes",
                            "Tomar decisões críticas",
                            "Comunicar com a liderança",
                            "Aprovar comunicações externas"
                        )
                    },
                    @{
                        Role = "Analista de Segurança"
                        Name = "[Nome do Analista]"
                        Email = "analista@acucaradas.com"
                        Phone = "(11) 98765-4322"
                        Responsibilities = @(
                            "Investigar incidentes",
                            "Analisar logs e evidências",
                            "Implementar contenção",
                            "Documentar achados técnicos"
                        )
                    },
                    @{
                        Role = "Administrador de Sistemas"
                        Name = "[Nome do Administrador]"
                        Email = "sysadmin@acucaradas.com"
                        Phone = "(11) 98765-4323"
                        Responsibilities = @(
                            "Implementar mudanças técnicas",
                            "Restaurar sistemas",
                            "Aplicar patches e correções",
                            "Gerenciar backups"
                        )
                    },
                    @{
                        Role = "Comunicação"
                        Name = "[Nome do Comunicador]"
                        Email = "comunicacao@acucaradas.com"
                        Phone = "(11) 98765-4324"
                        Responsibilities = @(
                            "Preparar comunicados",
                            "Coordenar com relações públicas",
                            "Comunicar com clientes",
                            "Gerenciar comunicação interna"
                        )
                    },
                    @{
                        Role = "Jurídico"
                        Name = "[Nome do Advogado]"
                        Email = "juridico@acucaradas.com"
                        Phone = "(11) 98765-4325"
                        Responsibilities = @(
                            "Avaliar implicações legais",
                            "Orientar sobre requisitos de notificação",
                            "Gerenciar comunicações com autoridades",
                            "Avaliar responsabilidades contratuais"
                        )
                    }
                )
                SeverityLevels = @{
                    Critical = @{
                        Description = "Impacto severo na operação, dados sensíveis comprometidos, risco financeiro ou legal significativo"
                        ResponseTime = "Imediata (< 1 hora)"
                        Escalation = "CEO, CTO, Jurídico"
                        Examples = @(
                            "Vazamento confirmado de dados de clientes",
                            "Ransomware afetando sistemas críticos",
                            "Comprometimento de credenciais privilegiadas",
                            "Ataque em andamento com perda de serviço"
                        )
                    }
                    High = @{
                        Description = "Impacto significativo em sistemas importantes, potencial exposição de dados sensíveis"
                        ResponseTime = "Urgente (< 4 horas)"
                        Escalation = "CTO, Gerente de TI"
                        Examples = @(
                            "Tentativas de acesso não autorizado bem-sucedidas",
                            "Malware detectado em sistemas críticos",
                            "Atividade suspeita em contas privilegiadas",
                            "Vulnerabilidade crítica explorada"
                        )
                    }
                    Medium = @{
                        Description = "Impacto moderado, sistemas não críticos afetados, sem exposição imediata de dados sensíveis"
                        ResponseTime = "Prioritário (< 24 horas)"
                        Escalation = "Gerente de TI, Equipe de Segurança"
                        Examples = @(
                            "Malware detectado e contido",
                            "Tentativas repetidas de acesso não autorizado",
                            "Vulnerabilidade importante descoberta",
                            "Violação de política de segurança"
                        )
                    }
                    Low = @{
                        Description = "Impacto mínimo, eventos isolados, sem comprometimento de dados ou sistemas"
                        ResponseTime = "Rotina (< 72 horas)"
                        Escalation = "Equipe de Segurança"
                        Examples = @(
                            "Tentativas de login malsucedidas",
                            "Atividade de rede suspeita de baixo volume",
                            "Vulnerabilidade de baixo risco",
                            "Violações menores de política"
                        )
                    }
                }
                Phases = @{
                    Preparation = @{
                        Description = "Preparação e planejamento para resposta a incidentes"
                        Activities = @(
                            "Manter plano de resposta atualizado",
                            "Treinar equipe de resposta",
                            "Implementar ferramentas de detecção",
                            "Realizar simulações periódicas",
                            "Manter contatos atualizados"
                        )
                    }
                    Identification = @{
                        Description = "Detecção e análise inicial do incidente"
                        Activities = @(
                            "Receber e validar alertas",
                            "Determinar se é um incidente",
                            "Classificar severidade e tipo",
                            "Iniciar registro de incidente",
                            "Notificar partes relevantes"
                        )
                    }
                    Containment = @{
                        Description = "Limitar o impacto do incidente"
                        Activities = @(
                            "Isolar sistemas afetados",
                            "Bloquear acessos comprometidos",
                            "Preservar evidências",
                            "Implementar controles temporários",
                            "Monitorar atividade do atacante"
                        )
                    }
                    Eradication = @{
                        Description = "Remover a causa raiz do incidente"
                        Activities = @(
                            "Identificar e remover malware",
                            "Corrigir vulnerabilidades exploradas",
                            "Resetar credenciais comprometidas",
                            "Validar remoção completa da ameaça",
                            "Implementar correções permanentes"
                        )
                    }
                    Recovery = @{
                        Description = "Restaurar sistemas e operações normais"
                        Activities = @(
                            "Restaurar dados de backups limpos",
                            "Reconstruir sistemas se necessário",
                            "Implementar controles adicionais",
                            "Testar sistemas restaurados",
                            "Retornar à operação normal"
                        )
                    }
                    Lessons = @{
                        Description = "Análise pós-incidente e melhorias"
                        Activities = @(
                            "Conduzir análise pós-incidente",
                            "Documentar lições aprendidas",
                            "Atualizar planos e procedimentos",
                            "Implementar melhorias identificadas",
                            "Compartilhar conhecimento"
                        )
                    }
                }
                IncidentTypes = @{
                    Malware = @{
                        Description = "Infecção por software malicioso (vírus, ransomware, etc.)"
                        Procedures = "malware_procedure.md"
                        Checklist = "malware_checklist.md"
                    }
                    Unauthorized_Access = @{
                        Description = "Acesso não autorizado a sistemas ou dados"
                        Procedures = "unauthorized_access_procedure.md"
                        Checklist = "unauthorized_access_checklist.md"
                    }
                    Data_Breach = @{
                        Description = "Exposição ou exfiltração não autorizada de dados"
                        Procedures = "data_breach_procedure.md"
                        Checklist = "data_breach_checklist.md"
                    }
                    DDoS = @{
                        Description = "Ataque de negação de serviço distribuído"
                        Procedures = "ddos_procedure.md"
                        Checklist = "ddos_checklist.md"
                    }
                    Web_Application = @{
                        Description = "Ataque a aplicações web (SQL Injection, XSS, etc.)"
                        Procedures = "web_app_procedure.md"
                        Checklist = "web_app_checklist.md"
                    }
                    Social_Engineering = @{
                        Description = "Ataques de engenharia social (phishing, pretexting, etc.)"
                        Procedures = "social_engineering_procedure.md"
                        Checklist = "social_engineering_checklist.md"
                    }
                    Insider_Threat = @{
                        Description = "Ameaças internas (funcionários, contratados, etc.)"
                        Procedures = "insider_threat_procedure.md"
                        Checklist = "insider_threat_checklist.md"
                    }
                }
                Communication = @{
                    Internal = @{
                        Template = "internal_communication_template.md"
                        Approvers = @("Coordenador de Incidentes", "Jurídico")
                        Channels = @("Email", "Slack", "Reunião de Emergência")
                    }
                    Customers = @{
                        Template = "customer_communication_template.md"
                        Approvers = @("Coordenador de Incidentes", "Jurídico", "CEO")
                        Channels = @("Email", "Site", "Suporte")
                    }
                    Regulatory = @{
                        Template = "regulatory_communication_template.md"
                        Approvers = @("Jurídico", "CEO")
                        Timeframes = @{
                            "LGPD" = "48 horas"
                            "PCI-DSS" = "24 horas"
                        }
                    }
                    Media = @{
                        Template = "media_communication_template.md"
                        Approvers = @("CEO", "Jurídico", "Comunicação")
                        Spokesperson = "[Nome do Porta-voz]"
                    }
                }
                EvidenceCollection = @{
                    Types = @(
                        "Logs de sistema",
                        "Logs de aplicação",
                        "Logs de rede",
                        "Imagens de memória",
                        "Imagens de disco",
                        "Capturas de tela",
                        "Emails",
                        "Configurações"
                    )
                    Chain_of_Custody = "chain_of_custody_template.md"
                    Tools = @(
                        "Wireshark",
                        "Volatility",
                        "FTK Imager",
                        "KAPE",
                        "PowerShell Get-ForensicEventLog"
                    )
                }
                Contacts = @{
                    Law_Enforcement = @{
                        "Polícia Federal" = "[Contato Polícia Federal]"
                        "Delegacia de Crimes Cibernéticos" = "[Contato Delegacia]"
                    }
                    CERT = @{
                        "CERT.br" = "cert@cert.br"
                        "CTIR Gov" = "ctir@ctir.gov.br"
                    }
                    Legal = @{
                        "Escritório de Advocacia" = "[Contato Escritório]"
                        "Advogado Interno" = "[Contato Advogado]"
                    }
                    PR = @{
                        "Agência de Comunicação" = "[Contato Agência]"
                        "Assessoria de Imprensa" = "[Contato Assessoria]"
                    }
                }
            }
        }

        $defaultConfig | ConvertTo-Json -Depth 10 | Set-Content -Path $global:CONFIG.ConfigPath -Encoding UTF8
        Show-IncidentStatus "Configuração padrão criada em: $($global:CONFIG.ConfigPath)" "SUCCESS"
    } else {
        Show-IncidentStatus "Usando configuração existente: $($global:CONFIG.ConfigPath)" "INFO"
    }

    # Carregar configuração
    try {
        $config = Get-Content -Path $global:CONFIG.ConfigPath -Raw | ConvertFrom-Json
        return $config
    } catch {
        Show-IncidentStatus "Erro ao carregar configuração: $_" "ERROR"
        return $null
    }
}

# Função para criar templates de resposta a incidentes
function Initialize-IncidentTemplates {
    if (-not (Test-Path $global:CONFIG.TemplatePath)) {
        New-Item -Path $global:CONFIG.TemplatePath -ItemType Directory -Force | Out-Null
        Show-IncidentStatus "Diretório de templates criado: $($global:CONFIG.TemplatePath)" "INFO"
    }

    # Criar templates básicos
    $templates = @{
        "incident_report_template.md" = @"
# Relatório de Incidente de Segurança

## Informações Básicas

- **ID do Incidente**: [ID-INCIDENTE]
- **Data de Detecção**: [DATA-DETECÇÃO]
- **Data de Resolução**: [DATA-RESOLUÇÃO]
- **Severidade**: [SEVERIDADE]
- **Tipo de Incidente**: [TIPO-INCIDENTE]
- **Sistemas Afetados**: [SISTEMAS-AFETADOS]
- **Status Atual**: [STATUS]

## Resumo do Incidente

[Breve descrição do incidente, incluindo como foi detectado e impacto inicial]

## Cronologia

| Data/Hora | Evento | Responsável |
|-----------|--------|-------------|
| [DATA-HORA] | [DESCRIÇÃO-EVENTO] | [RESPONSÁVEL] |
| [DATA-HORA] | [DESCRIÇÃO-EVENTO] | [RESPONSÁVEL] |
| [DATA-HORA] | [DESCRIÇÃO-EVENTO] | [RESPONSÁVEL] |

## Análise Técnica

### Vetores de Ataque

[Descrição de como o incidente ocorreu, vulnerabilidades exploradas, etc.]

### Sistemas e Dados Afetados

[Detalhes sobre quais sistemas foram comprometidos e quais dados foram afetados]

### Evidências Coletadas

[Lista de evidências coletadas durante a investigação]

## Ações de Resposta

### Contenção

[Medidas tomadas para conter o incidente]

### Erradicação

[Ações realizadas para remover a ameaça]

### Recuperação

[Passos para restaurar sistemas e operações]

## Impacto

### Impacto Técnico

[Descrição do impacto técnico do incidente]

### Impacto ao Negócio

[Descrição do impacto ao negócio, incluindo tempo de inatividade, custos, etc.]

### Impacto a Dados

[Detalhes sobre dados comprometidos, se aplicável]

## Comunicações Realizadas

| Data | Público-Alvo | Mensagem | Aprovado Por |
|------|-------------|----------|-------------|
| [DATA] | [PÚBLICO] | [RESUMO-MENSAGEM] | [APROVADOR] |

## Lições Aprendidas

### O que Funcionou Bem

- [ITEM]
- [ITEM]

### O que Poderia Melhorar

- [ITEM]
- [ITEM]

### Recomendações

| Recomendação | Prioridade | Responsável | Prazo |
|--------------|------------|-------------|-------|
| [RECOMENDAÇÃO] | [PRIORIDADE] | [RESPONSÁVEL] | [PRAZO] |

## Aprovações

- **Coordenador de Incidentes**: [NOME] - [DATA]
- **Analista de Segurança**: [NOME] - [DATA]
- **Gerente de TI**: [NOME] - [DATA]

---

*Este documento é confidencial e para uso interno apenas.*
"@

        "internal_communication_template.md" = @"
# Comunicação Interna: Incidente de Segurança

**DE**: Equipe de Resposta a Incidentes  
**PARA**: [DESTINATÁRIOS]  
**DATA**: [DATA]  
**ASSUNTO**: [TIPO] Incidente de Segurança - Atualização [NÚMERO]

## Situação Atual

[Breve descrição da situação atual do incidente]

## O Que Aconteceu

[Descrição factual do incidente, sem especulações]

## Sistemas Afetados

[Lista de sistemas afetados e status atual]

## Impacto nas Operações

[Descrição do impacto nas operações diárias]

## Ações em Andamento

[Lista de ações sendo tomadas para resolver o incidente]

## O Que Você Deve Fazer

[Instruções específicas para os destinatários, se aplicável]

## Próximas Atualizações

[Quando esperar a próxima atualização]

## Contato para Dúvidas

Se você tiver dúvidas ou observar algo suspeito, entre em contato com [CONTATO] em [EMAIL/TELEFONE].

---

*Esta comunicação é confidencial e para uso interno apenas. Por favor, não compartilhe externamente.*
"@

        "customer_communication_template.md" = @"
# Comunicação ao Cliente: Notificação de Incidente de Segurança

**DE**: [NOME], [CARGO]  
**DATA**: [DATA]  
**ASSUNTO**: Notificação Importante: Incidente de Segurança

Prezado(a) Cliente,

## O Que Aconteceu

[Descrição clara e concisa do incidente, sem termos técnicos complexos]

## Quais Informações Foram Afetadas

[Descrição específica dos dados potencialmente afetados]

## O Que Estamos Fazendo

[Ações que a empresa está tomando para resolver o problema e proteger os dados]

## O Que Você Deve Fazer

[Recomendações específicas para os clientes, como alterar senhas]

## Próximos Passos

[Informações sobre como a empresa manterá os clientes informados]

## Mais Informações

Se você tiver dúvidas adicionais, entre em contato com nossa equipe de suporte em [CONTATO] ou visite [URL] para mais informações.

Agradecemos sua compreensão e confiança contínua.

Atenciosamente,

[NOME]  
[CARGO]  
Acucaradas Encomendas
"@

        "regulatory_communication_template.md" = @"
# Notificação de Violação de Dados à Autoridade Reguladora

**PARA**: [AUTORIDADE]  
**DE**: [NOME], [CARGO], Acucaradas Encomendas  
**DATA**: [DATA]  
**ASSUNTO**: Notificação de Violação de Dados Pessoais

Prezados Senhores,

Em conformidade com [LEI/REGULAMENTO APLICÁVEL], vimos por meio desta notificar a ocorrência de um incidente de segurança envolvendo dados pessoais sob nossa responsabilidade.

## Detalhes do Incidente

- **Data e Hora da Detecção**: [DATA-HORA]
- **Data e Hora da Ocorrência** (se conhecida): [DATA-HORA]
- **Natureza da Violação**: [DESCRIÇÃO]
- **Categorias de Dados Afetados**: [CATEGORIAS]
- **Número Aproximado de Titulares Afetados**: [NÚMERO]
- **Número Aproximado de Registros Afetados**: [NÚMERO]

## Possíveis Consequências

[Descrição das possíveis consequências da violação para os titulares dos dados]

## Medidas Implementadas

[Descrição das medidas já implementadas para mitigar possíveis efeitos adversos]

## Medidas Propostas

[Descrição das medidas propostas para remediar a situação e mitigar possíveis efeitos adversos]

## Contato para Mais Informações

- **Nome**: [NOME]
- **Cargo**: [CARGO]
- **Email**: [EMAIL]
- **Telefone**: [TELEFONE]

Permanecemos à disposição para fornecer informações adicionais que se façam necessárias.

Atenciosamente,

[NOME]  
[CARGO]  
Acucaradas Encomendas
"@

        "media_communication_template.md" = @"
# Comunicado à Imprensa: Incidente de Segurança

**PARA DIVULGAÇÃO IMEDIATA**  
**DATA**: [DATA]  
**CONTATO**: [NOME], [EMAIL], [TELEFONE]

# [TÍTULO: Acucaradas Encomendas Informa sobre Incidente de Segurança]

## Declaração

[Cidade], [Data] - A Acucaradas Encomendas informa que identificou um incidente de segurança em seus sistemas em [DATA]. Assim que detectado, nossa equipe de segurança implementou imediatamente o protocolo de resposta a incidentes para conter, investigar e remediar a situação.

## Sobre o Incidente

[Breve descrição factual do incidente, sem detalhes técnicos que possam comprometer a segurança]

## Impacto

[Descrição honesta do impacto, incluindo sistemas afetados e se dados de clientes foram comprometidos]

## Ações Tomadas

[Descrição das medidas já implementadas para resolver o problema e proteger os dados]

## Declaração do [CARGO]

"[Citação do porta-voz oficial sobre o compromisso da empresa com a segurança e transparência]"

## Sobre a Acucaradas Encomendas

[Breve descrição da empresa]

Para mais informações, entre em contato com [NOME] pelo email [EMAIL] ou telefone [TELEFONE].

---

*Fim do comunicado*
"@

        "chain_of_custody_template.md" = @"
# Formulário de Cadeia de Custódia de Evidências

## Informações do Incidente

- **ID do Incidente**: [ID-INCIDENTE]
- **Tipo de Incidente**: [TIPO-INCIDENTE]
- **Data do Incidente**: [DATA-INCIDENTE]

## Identificação da Evidência

- **ID da Evidência**: [ID-EVIDÊNCIA]
- **Tipo de Evidência**: [TIPO-EVIDÊNCIA]
- **Descrição**: [DESCRIÇÃO-DETALHADA]
- **Local de Coleta**: [LOCAL]
- **Data e Hora da Coleta**: [DATA-HORA]

## Coletado Por

- **Nome**: [NOME]
- **Cargo**: [CARGO]
- **Assinatura**: ________________________
- **Data e Hora**: [DATA-HORA]

## Método de Coleta

[Descrição detalhada do método utilizado para coletar a evidência, incluindo ferramentas e procedimentos]

## Hash da Evidência

- **Algoritmo**: [ALGORITMO] (ex: SHA-256)
- **Valor do Hash**: [HASH]

## Histórico de Custódia

| Data/Hora | Transferido De | Transferido Para | Motivo | Assinatura |
|-----------|---------------|-----------------|--------|------------|
| [DATA-HORA] | [NOME] | [NOME] | [MOTIVO] | __________ |
| [DATA-HORA] | [NOME] | [NOME] | [MOTIVO] | __________ |

## Condições de Armazenamento

- **Local de Armazenamento**: [LOCAL]
- **Método de Armazenamento**: [MÉTODO]
- **Controles de Acesso**: [CONTROLES]

## Observações Adicionais

[Quaisquer observações relevantes sobre a evidência ou sua manipulação]

## Verificação de Integridade

| Data/Hora | Verificado Por | Algoritmo | Valor do Hash | Status |
|-----------|---------------|-----------|---------------|--------|
| [DATA-HORA] | [NOME] | [ALGORITMO] | [HASH] | [OK/FALHA] |

---

*Este documento deve ser mantido com a evidência em todos os momentos para manter a cadeia de custódia.*
"@

        "malware_procedure.md" = @"
# Procedimento de Resposta a Incidentes: Malware

## 1. Identificação

### Indicadores de Comprometimento
- Alertas de antivírus/EDR
- Comportamento anormal do sistema
- Arquivos suspeitos
- Conexões de rede não autorizadas
- Processos desconhecidos em execução

### Análise Inicial
1. Verifique alertas de segurança nos sistemas de monitoramento
2. Confirme se é um verdadeiro positivo
3. Identifique sistemas potencialmente afetados
4. Determine o tipo de malware (ransomware, trojan, worm, etc.)
5. Avalie a severidade inicial

## 2. Contenção

### Contenção Imediata
1. Isole os sistemas afetados da rede
   - Desconecte cabos de rede
   - Desative adaptadores de rede
   - Implemente regras de firewall de emergência
2. Desative contas potencialmente comprometidas
3. Bloqueie IPs/domínios maliciosos no firewall/proxy
4. Preserve evidências antes de qualquer ação
   - Capture memória RAM
   - Colete logs relevantes
   - Faça imagem forense se necessário

### Contenção Estratégica
1. Identifique o vetor de infecção
2. Determine a extensão da infecção
3. Implemente controles adicionais em sistemas não afetados
4. Monitore tentativas de propagação

## 3. Erradicação

1. Identifique todos os componentes do malware
   - Arquivos
   - Registros
   - Tarefas agendadas
   - Serviços
2. Remova o malware usando ferramentas apropriadas
   - Ferramentas antimalware especializadas
   - Scripts de remoção personalizados
3. Corrija vulnerabilidades exploradas
4. Verifique persistência do malware
5. Realize varreduras completas em todos os sistemas potencialmente afetados

## 4. Recuperação

1. Restaure dados de backups limpos
   - Verifique a integridade dos backups antes da restauração
   - Confirme que os backups não estão infectados
2. Reconstrua sistemas se necessário
3. Aplique patches e atualizações
4. Redefina credenciais
5. Implemente controles adicionais
6. Realize verificações de segurança antes de reconectar
   - Varreduras de vulnerabilidade
   - Verificações de configuração
   - Testes de penetração focados
7. Monitore de perto após a reconexão

## 5. Lições Aprendidas

1. Conduza análise pós-incidente
   - Como o malware entrou no ambiente?
   - Como se propagou?
   - Por que não foi detectado antes?
   - Quão eficaz foi a resposta?
2. Atualize procedimentos de segurança
3. Melhore controles de detecção
4. Treine usuários sobre ameaças relevantes
5. Documente o incidente completamente

## Considerações Especiais para Ransomware

1. **NÃO** pague o resgate imediatamente
2. Consulte especialistas em resposta a ransomware
3. Verifique se existem ferramentas de descriptografia disponíveis
4. Avalie implicações legais e regulatórias
5. Prepare comunicações específicas para stakeholders

## Ferramentas Recomendadas

- Ferramentas de análise forense: Volatility, Redline, KAPE
- Ferramentas de remoção de malware: [específicas para o tipo de malware]
- Ferramentas de análise de malware: VirusTotal, Hybrid Analysis, ANY.RUN
- Ferramentas de monitoramento de rede: Wireshark, tcpdump

---

*Este procedimento deve ser adaptado com base no tipo específico de malware e no ambiente afetado.*
"@
    }

    foreach ($templateName in $templates.Keys) {
        $templatePath = Join-Path -Path $global:CONFIG.TemplatePath -ChildPath $templateName
        if (-not (Test-Path $templatePath)) {
            $templates[$templateName] | Set-Content -Path $templatePath -Encoding UTF8
            Show-IncidentStatus "Template criado: $templateName" "INFO"
        }
    }

    Show-IncidentStatus "Templates de resposta a incidentes inicializados" "SUCCESS"
}

# Função para inicializar diretórios de incidentes
function Initialize-IncidentDirectories {
    $directories = @(
        $global:CONFIG.IncidentesPath,
        "$($global:CONFIG.IncidentesPath)\ativos",
        "$($global:CONFIG.IncidentesPath)\encerrados",
        "$($global:CONFIG.IncidentesPath)\relatorios",
        $global:CONFIG.ForensicsPath,
        "$($global:CONFIG.ForensicsPath)\imagens",
        "$($global:CONFIG.ForensicsPath)\logs",
        "$($global:CONFIG.ForensicsPath)\evidencias"
    )

    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -Path $dir -ItemType Directory -Force | Out-Null
            Show-IncidentStatus "Diretório criado: $dir" "INFO"
        }
    }

    Show-IncidentStatus "Diretórios de incidentes inicializados" "SUCCESS"
}

# Função para criar um novo incidente
function New-SecurityIncident {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Title,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet("Malware", "Unauthorized_Access", "Data_Breach", "DDoS", "Web_Application", "Social_Engineering", "Insider_Threat", "Other")]
        [string]$Type,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet("Critical", "High", "Medium", "Low")]
        [string]$Severity,
        
        [string]$Description,
        
        [string[]]$AffectedSystems,
        
        [string]$ReportedBy,
        
        [DateTime]$DetectedAt = (Get-Date)
    )

    # Carregar configuração
    $config = Initialize-IncidentConfig

    # Gerar ID do incidente
    $incidentId = "INC-$(Get-Date -Format 'yyyyMMdd')-$(Get-Random -Minimum 1000 -Maximum 9999)"
    
    # Criar diretório do incidente
    $incidentDir = Join-Path -Path "$($global:CONFIG.IncidentesPath)\ativos" -ChildPath $incidentId
    New-Item -Path $incidentDir -ItemType Directory -Force | Out-Null
    
    # Criar subdiretórios
    $subDirs = @("evidencias", "comunicacoes", "logs", "relatorios")
    foreach ($dir in $subDirs) {
        New-Item -Path "$incidentDir\$dir" -ItemType Directory -Force | Out-Null
    }
    
    # Criar arquivo de metadados do incidente
    $incidentData = @{
        id = $incidentId
        title = $Title
        type = $Type
        severity = $Severity
        description = $Description
        affected_systems = $AffectedSystems
        reported_by = $ReportedBy
        detected_at = $DetectedAt.ToString("yyyy-MM-dd HH:mm:ss")
        created_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        status = "Active"
        phase = "Identification"
        assigned_to = ""
        timeline = @(
            @{
                timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                action = "Incidente criado"
                actor = $env:USERNAME
                details = "Incidente registrado no sistema"
            }
        )
    }
    
    $incidentData | ConvertTo-Json -Depth 10 | Set-Content -Path "$incidentDir\incident.json" -Encoding UTF8
    
    # Copiar templates relevantes
    $templateSource = $null
    if ($config.IncidentResponse.IncidentTypes.$Type.Procedures) {
        $templateSource = Join-Path -Path $global:CONFIG.TemplatePath -ChildPath $config.IncidentResponse.IncidentTypes.$Type.Procedures
        if (Test-Path $templateSource) {
            Copy-Item -Path $templateSource -Destination "$incidentDir\procedimento.md"
        }
    }
    
    if ($config.IncidentResponse.IncidentTypes.$Type.Checklist) {
        $templateSource = Join-Path -Path $global:CONFIG.TemplatePath -ChildPath $config.IncidentResponse.IncidentTypes.$Type.Checklist
        if (Test-Path $templateSource) {
            Copy-Item -Path $templateSource -Destination "$incidentDir\checklist.md"
        }
    }
    
    # Criar relatório inicial
    $reportTemplate = Join-Path -Path $global:CONFIG.TemplatePath -ChildPath "incident_report_template.md"
    if (Test-Path $reportTemplate) {
        $reportContent = Get-Content -Path $reportTemplate -Raw
        $reportContent = $reportContent.Replace("[ID-INCIDENTE]", $incidentId)
        $reportContent = $reportContent.Replace("[DATA-DETECÇÃO]", $DetectedAt.ToString("yyyy-MM-dd HH:mm:ss"))
        $reportContent = $reportContent.Replace("[DATA-RESOLUÇÃO]", "Em andamento")
        $reportContent = $reportContent.Replace("[SEVERIDADE]", $Severity)
        $reportContent = $reportContent.Replace("[TIPO-INCIDENTE]", $Type.Replace("_", " "))
        $reportContent = $reportContent.Replace("[SISTEMAS-AFETADOS]", ($AffectedSystems -join ", "))
        $reportContent = $reportContent.Replace("[STATUS]", "Ativo - Fase de Identificação")
        
        $reportContent | Set-Content -Path "$incidentDir\relatorios\relatorio_inicial.md" -Encoding UTF8
    }
    
    # Notificar sobre o novo incidente
    Show-IncidentStatus "Novo incidente criado: $incidentId - $Title" "INCIDENT"
    
    # Enviar notificação se o módulo estiver disponível
    if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
        Send-SecurityNotification `
            -Title "Novo Incidente de Segurança: $Title" `
            -Description "Um novo incidente de segurança foi registrado" `
            -Details "ID: $incidentId\nTipo: $Type\nSeveridade: $Severity\nSistemas Afetados: $($AffectedSystems -join ', ')" `
            -Severity $Severity.ToLower() `
            -Actions @(
                "Revisar detalhes do incidente",
                "Iniciar procedimentos de resposta",
                "Atribuir responsáveis para investigação"
            )
    }
    
    return $incidentId
}

# Função para atualizar o status de um incidente
function Update-IncidentStatus {
    param (
        [Parameter(Mandatory=$true)]
        [string]$IncidentId,
        
        [ValidateSet("Active", "Contained", "Eradicated", "Recovered", "Closed")]
        [string]$Status,
        
        [ValidateSet("Identification", "Containment", "Eradication", "Recovery", "Lessons")]
        [string]$Phase,
        
        [string]$AssignedTo,
        
        [string]$ActionDescription,
        
        [string]$ActionDetails
    )

    # Verificar se o incidente existe
    $incidentPath = "$($global:CONFIG.IncidentesPath)\ativos\$IncidentId\incident.json"
    if (-not (Test-Path $incidentPath)) {
        $incidentPath = "$($global:CONFIG.IncidentesPath)\encerrados\$IncidentId\incident.json"
        if (-not (Test-Path $incidentPath)) {
            Show-IncidentStatus "Incidente não encontrado: $IncidentId" "ERROR"
            return $false
        }
    }
    
    # Carregar dados do incidente
    $incidentData = Get-Content -Path $incidentPath -Raw | ConvertFrom-Json
    
    # Atualizar campos
    $updated = $false
    
    if ($Status -and $Status -ne $incidentData.status) {
        $incidentData.status = $Status
        $updated = $true
        
        # Se o status for alterado para Closed, mover para a pasta de encerrados
        if ($Status -eq "Closed" -and $incidentPath -like "*\ativos\*") {
            $sourceDir = "$($global:CONFIG.IncidentesPath)\ativos\$IncidentId"
            $targetDir = "$($global:CONFIG.IncidentesPath)\encerrados\$IncidentId"
            
            # Criar diretório de destino
            if (-not (Test-Path $targetDir)) {
                New-Item -Path $targetDir -ItemType Directory -Force | Out-Null
            }
            
            # Mover arquivos
            Get-ChildItem -Path $sourceDir -Recurse | ForEach-Object {
                $targetPath = $_.FullName.Replace($sourceDir, $targetDir)
                $targetParent = Split-Path -Path $targetPath -Parent
                
                if (-not (Test-Path $targetParent)) {
                    New-Item -Path $targetParent -ItemType Directory -Force | Out-Null
                }
                
                Move-Item -Path $_.FullName -Destination $targetPath -Force
            }
            
            # Remover diretório de origem
            Remove-Item -Path $sourceDir -Recurse -Force
            
            # Atualizar caminho do arquivo de incidente
            $incidentPath = "$targetDir\incident.json"
        }
    }
    
    if ($Phase -and $Phase -ne $incidentData.phase) {
        $incidentData.phase = $Phase
        $updated = $true
    }
    
    if ($AssignedTo -and $AssignedTo -ne $incidentData.assigned_to) {
        $incidentData.assigned_to = $AssignedTo
        $updated = $true
    }
    
    # Adicionar entrada na timeline
    if ($ActionDescription) {
        if (-not $incidentData.timeline) {
            $incidentData.timeline = @()
        }
        
        $timelineEntry = @{
            timestamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
            action = $ActionDescription
            actor = $env:USERNAME
            details = $ActionDetails
        }
        
        $incidentData.timeline += $timelineEntry
        $updated = $true
    }
    
    # Salvar alterações
    if ($updated) {
        $incidentData | ConvertTo-Json -Depth 10 | Set-Content -Path $incidentPath -Encoding UTF8
        Show-IncidentStatus "Incidente atualizado: $IncidentId" "INFO"
        
        # Enviar notificação se o módulo estiver disponível
        if (Get-Command "Send-SecurityNotification" -ErrorAction SilentlyContinue) {
            $notificationDetails = "ID: $IncidentId"
            
            if ($Status) { $notificationDetails += "\nStatus: $Status" }
            if ($Phase) { $notificationDetails += "\nFase: $Phase" }
            if ($AssignedTo) { $notificationDetails += "\nAtribuído para: $AssignedTo" }
            if ($ActionDescription) { $notificationDetails += "\nAção: $ActionDescription" }
            if ($ActionDetails) { $notificationDetails += "\nDetalhes: $ActionDetails" }
            
            Send-SecurityNotification `
                -Title "Atualização de Incidente: $($incidentData.title)" `
                -Description "O incidente de segurança foi atualizado" `
                -Details $notificationDetails `
                -Severity $incidentData.severity.ToLower() `
                -Actions @(
                    "Revisar atualizações do incidente",
                    "Verificar próximos passos necessários"
                )
        }
        
        return $true
    }
    
    return $false
}

# Função para adicionar evidência a um incidente
function Add-IncidentEvidence {
    param (
        [Parameter(Mandatory=$true)]
        [string]$IncidentId,
        
        [Parameter(Mandatory=$true)]
        [string]$EvidenceType,
        
        [Parameter(Mandatory=$true)]
        [string]$Description,
        
        [string]$SourcePath,
        
        [string]$CollectedBy = $env:USERNAME,
        
        [string]$CollectionMethod,
        
        [switch]$GenerateChainOfCustody
    )

    # Verificar se o incidente existe
    $incidentDir = "$($global:CONFIG.IncidentesPath)\ativos\$IncidentId"
    if (-not (Test-Path $incidentDir)) {
        $incidentDir = "$($global:CONFIG.IncidentesPath)\encerrados\$IncidentId"
        if (-not (Test-Path $incidentDir)) {
            Show-IncidentStatus "Incidente não encontrado: $IncidentId" "ERROR"
            return $false
        }
    }
    
    # Gerar ID da evidência
    $evidenceId = "EVID-$(Get-Date -Format 'yyyyMMdd')-$(Get-Random -Minimum 1000 -Maximum 9999)"
    
    # Criar diretório para a evidência
    $evidenceDir = "$incidentDir\evidencias\$evidenceId"
    New-Item -Path $evidenceDir -ItemType Directory -Force | Out-Null
    
    # Copiar arquivo de evidência se fornecido
    $targetPath = $null
    $fileHash = $null
    
    if ($SourcePath -and (Test-Path $SourcePath)) {
        $fileName = Split-Path -Path $SourcePath -Leaf
        $targetPath = "$evidenceDir\$fileName"
        Copy-Item -Path $SourcePath -Destination $targetPath -Force
        
        # Calcular hash do arquivo
        try {
            $fileHash = Get-FileHash -Path $targetPath -Algorithm SHA256
        } catch {
            Show-IncidentStatus "Erro ao calcular hash do arquivo: $_" "ERROR"
        }
    }
    
    # Criar metadados da evidência
    $evidenceData = @{
        id = $evidenceId
        incident_id = $IncidentId
        type = $EvidenceType
        description = $Description
        collected_at = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        collected_by = $CollectedBy
        collection_method = $CollectionMethod
        file_path = $targetPath
        file_hash = $fileHash.Hash
        hash_algorithm = "SHA256"
    }
    
    $evidenceData | ConvertTo-Json -Depth 10 | Set-Content -Path "$evidenceDir\metadata.json" -Encoding UTF8
    
    # Gerar formulário de cadeia de custódia se solicitado
    if ($GenerateChainOfCustody) {
        $custodyTemplate = Join-Path -Path $global:CONFIG.TemplatePath -ChildPath "chain_of_custody_template.md"
        if (Test-Path $custodyTemplate) {
            $custodyContent = Get-Content -Path $custodyTemplate -Raw
            
            # Carregar dados do incidente
            $incidentData = Get-Content -Path "$incidentDir\incident.json" -Raw | ConvertFrom-Json
            
            # Substituir placeholders
            $custodyContent = $custodyContent.Replace("[ID-INCIDENTE]", $IncidentId)
            $custodyContent = $custodyContent.Replace("[TIPO-INCIDENTE]", $incidentData.type.Replace("_", " "))
            $custodyContent = $custodyContent.Replace("[DATA-INCIDENTE]", $incidentData.detected_at)
            $custodyContent = $custodyContent.Replace("[ID-EVIDÊNCIA]", $evidenceId)
            $custodyContent = $custodyContent.Replace("[TIPO-EVIDÊNCIA]", $EvidenceType)
            $custodyContent = $custodyContent.Replace("[DESCRIÇÃO-DETALHADA]", $Description)
            $custodyContent = $custodyContent.Replace("[LOCAL]", $SourcePath)
            $custodyContent = $custodyContent.Replace("[DATA-HORA]", (Get-Date).ToString("yyyy-MM-dd HH:mm:ss"))
            $custodyContent = $custodyContent.Replace("[NOME]", $CollectedBy)
            $custodyContent = $custodyContent.Replace("[CARGO]", "")
            $custodyContent = $custodyContent.Replace("[ALGORITMO]", "SHA-256")
            $custodyContent = $custodyContent.Replace("[HASH]", $fileHash.Hash)
            
            $custodyContent | Set-Content -Path "$evidenceDir\chain_of_custody.md" -Encoding UTF8
        }
    }
    
    # Atualizar timeline do incidente
    Update-IncidentStatus -IncidentId $IncidentId -ActionDescription "Evidência adicionada" -ActionDetails "Tipo: $EvidenceType, ID: $evidenceId, Descrição: $Description"
    
    Show-IncidentStatus "Evidência adicionada ao incidente $IncidentId: $evidenceId" "INFO"
    return $evidenceId
}

# Função para gerar relatório de incidente
function New-IncidentReport {
    param (
        [Parameter(Mandatory=$true)]
        [string]$IncidentId,
        
        [ValidateSet("Full", "Executive", "Technical", "Lessons")]
        [string]$ReportType = "Full",
        
        [string]$OutputPath
    )

    # Verificar se o incidente existe
    $incidentDir = "$($global:CONFIG.IncidentesPath)\ativos\$IncidentId"
    $isClosed = $false
    
    if (-not (Test-Path $incidentDir)) {
        $incidentDir = "$($global:CONFIG.IncidentesPath)\encerrados\$IncidentId"
        $isClosed = $true
        
        if (-not (Test-Path $incidentDir)) {
            Show-IncidentStatus "Incidente não encontrado: $IncidentId" "ERROR"
            return $false
        }
    }
    
    # Carregar dados do incidente
    $incidentData = Get-Content -Path "$incidentDir\incident.json" -Raw | ConvertFrom-Json
    
    # Definir caminho de saída do relatório
    if (-not $OutputPath) {
        $reportFileName = "relatorio_${ReportType}_$(Get-Date -Format 'yyyyMMdd').md"
        $OutputPath = "$incidentDir\relatorios\$reportFileName"
    }
    
    # Criar diretório de relatórios se não existir
    $reportDir = Split-Path -Path $OutputPath -Parent
    if (-not (Test-Path $reportDir)) {
        New-Item -Path $reportDir -ItemType Directory -Force | Out-Null
    }
    
    # Gerar conteúdo do relatório com base no tipo
    $reportContent = "# Relatório de Incidente: $($incidentData.title)\n\n"
    $reportContent += "**ID do Incidente**: $IncidentId\n"
    $reportContent += "**Data do Relatório**: $(Get-Date -Format 'yyyy-MM-dd')\n"
    $reportContent += "**Tipo de Relatório**: $ReportType\n\n"
    
    switch ($ReportType) {
        "Executive" {
            $reportContent += "## Resumo Executivo\n\n"
            $reportContent += "$($incidentData.description)\n\n"
            
            $reportContent += "### Impacto\n\n"
            $reportContent += "- **Severidade**: $($incidentData.severity)\n"
            $reportContent += "- **Status**: $($incidentData.status)\n"
            $reportContent += "- **Sistemas Afetados**: $($incidentData.affected_systems -join ", ")\n\n"
            
            $reportContent += "### Cronologia Chave\n\n"
            $reportContent += "- **Detecção**: $($incidentData.detected_at)\n"
            
            if ($isClosed) {
                $closedEvent = $incidentData.timeline | Where-Object { $_.action -like "*encerrado*" -or $_.action -like "*fechado*" } | Select-Object -First 1
                if ($closedEvent) {
                    $reportContent += "- **Resolução**: $($closedEvent.timestamp)\n"
                }
            }
            
            $reportContent += "\n### Ações Tomadas\n\n"
            foreach ($event in $incidentData.timeline | Where-Object { $_.action -notlike "*criado*" -and $_.action -notlike "*atualizado*" } | Select-Object -First 5) {
                $reportContent += "- $($event.action)\n"
            }
            
            $reportContent += "\n### Recomendações\n\n"
            $reportContent += "1. [Recomendação 1]\n"
            $reportContent += "2. [Recomendação 2]\n"
            $reportContent += "3. [Recomendação 3]\n"
        }
        "Technical" {
            $reportContent += "## Relatório Técnico\n\n"
            $reportContent += "### Detalhes do Incidente\n\n"
            $reportContent += "- **Tipo**: $($incidentData.type.Replace("_", " "))\n"
            $reportContent += "- **Severidade**: $($incidentData.severity)\n"
            $reportContent += "- **Status**: $($incidentData.status)\n"
            $reportContent += "- **Fase**: $($incidentData.phase)\n"
            $reportContent += "- **Sistemas Afetados**: $($incidentData.affected_systems -join ", ")\n\n"
            
            $reportContent += "### Análise Técnica\n\n"
            $reportContent += "[Detalhes técnicos do incidente, incluindo vetores de ataque, vulnerabilidades exploradas, etc.]\n\n"
            
            $reportContent += "### Evidências Coletadas\n\n"
            $evidenceDirs = Get-ChildItem -Path "$incidentDir\evidencias" -Directory -ErrorAction SilentlyContinue
            if ($evidenceDirs) {
                $reportContent += "| ID | Tipo | Descrição | Coletado Por | Data |
|-----|------|-----------|-------------|------|
"
                foreach ($evidenceDir in $evidenceDirs) {
                    $metadataPath = "$($evidenceDir.FullName)\metadata.json"
                    if (Test-Path $metadataPath) {
                        $evidenceData = Get-Content -Path $metadataPath -Raw | ConvertFrom-Json
                        $reportContent += "| $($evidenceData.id) | $($evidenceData.type) | $($evidenceData.description) | $($evidenceData.collected_by) | $($evidenceData.collected_at) |\n"
                    }
                }
            } else {
                $reportContent += "Nenhuma evidência registrada.\n"
            }
            
            $reportContent += "\n### Cronologia Detalhada\n\n"
            $reportContent += "| Data/Hora | Ação | Responsável | Detalhes |\n|-----------|------|-------------|----------|"
            foreach ($event in $incidentData.timeline) {
                $reportContent += "\n| $($event.timestamp) | $($event.action) | $($event.actor) | $($event.details) |"
            }
            
            $reportContent += "\n\n### Ações Técnicas Realizadas\n\n"
            $reportContent += "[Detalhes das ações técnicas realizadas para conter, erradicar e recuperar do incidente]\n\n"
            
            $reportContent += "### Recomendações Técnicas\n\n"
            $reportContent += "1. [Recomendação técnica 1]\n"
            $reportContent += "2. [Recomendação técnica 2]\n"
            $reportContent += "3. [Recomendação técnica 3]\n"
        }
        "Lessons" {
            $reportContent += "## Lições Aprendidas\n\n"
            $reportContent += "### Resumo do Incidente\n\n"
            $reportContent += "$($incidentData.description)\n\n"
            
            $reportContent += "### O Que Funcionou Bem\n\n"
            $reportContent += "1. [Ponto positivo 1]\n"
            $reportContent += "2. [Ponto positivo 2]\n"
            $reportContent += "3. [Ponto positivo 3]\n\n"
            
            $reportContent += "### O Que Poderia Melhorar\n\n"
            $reportContent += "1. [Área de melhoria 1]\n"
            $reportContent += "2. [Área de melhoria 2]\n"
            $reportContent += "3. [Área de melhoria 3]\n\n"
            
            $reportContent += "### Recomendações para Prevenção\n\n"
            $reportContent += "1. [Recomendação 1]\n"
            $reportContent += "2. [Recomendação 2]\n"
            $reportContent += "3. [Recomendação 3]\n\n"
            
            $reportContent += "### Melhorias no Processo de Resposta\n\n"
            $reportContent += "1. [Melhoria 1]\n"
            $reportContent += "2. [Melhoria 2]\n"
            $reportContent += "3. [Melhoria 3]\n"
        }
        default { # Full report
            $reportContent += "## Detalhes do Incidente\n\n"
            $reportContent += "### Informações Básicas\n\n"
            $reportContent += "- **Tipo**: $($incidentData.type.Replace("_", " "))\n"
            $reportContent += "- **Severidade**: $($incidentData.severity)\n"
            $reportContent += "- **Status**: $($incidentData.status)\n"
            $reportContent += "- **Fase**: $($incidentData.phase)\n"
            $reportContent += "- **Sistemas Afetados**: $($incidentData.affected_systems -join ", ")\n"
            $reportContent += "- **Reportado Por**: $($incidentData.reported_by)\n"
            $reportContent += "- **Detectado Em**: $($incidentData.detected_at)\n\n"
            
            $reportContent += "### Descrição\n\n"
            $reportContent += "$($incidentData.description)\n\n"
            
            $reportContent += "## Análise do Incidente\n\n"
            $reportContent += "### Cronologia\n\n"
            $reportContent += "| Data/Hora | Ação | Responsável | Detalhes |\n|-----------|------|-------------|----------|"
            foreach ($event in $incidentData.timeline) {
                $reportContent += "\n| $($event.timestamp) | $($event.action) | $($event.actor) | $($event.details) |"
            }
            
            $reportContent += "\n\n### Evidências\n\n"
            if ($evidenceDirs) {
                $reportContent += "| ID | Tipo | Descrição | Coletado Por | Data |\n|-----|------|-----------|-------------|------|\n"
                foreach ($evidenceDir in $evidenceDirs) {
                    $metadataPath = "$($evidenceDir.FullName)\metadata.json"
                    if (Test-Path $metadataPath) {
                        $evidenceData = Get-Content -Path $metadataPath -Raw | ConvertFrom-Json
                        $reportContent += "| $($evidenceData.id) | $($evidenceData.type) | $($evidenceData.description) | $($evidenceData.collected_by) | $($evidenceData.collected_at) |\n"
                    }
                }
            } else {
                $reportContent += "Nenhuma evidência registrada.\n"
            }
            
            $reportContent += "\n### Análise Técnica\n\n"
            $reportContent += "[Detalhes técnicos do incidente, incluindo vetores de ataque, vulnerabilidades exploradas, etc.]\n\n"
            
            $reportContent += "### Impacto\n\n"
            $reportContent += "#### Impacto Técnico\n\n"
            $reportContent += "[Descrição do impacto técnico do incidente]\n\n"
            
            $reportContent += "#### Impacto ao Negócio\n\n"
            $reportContent += "[Descrição do impacto ao negócio, incluindo tempo de inatividade, custos, etc.]\n\n"
            
            $reportContent += "#### Impacto a Dados\n\n"
            $reportContent += "[Detalhes sobre dados comprometidos, se aplicável]\n\n"
            
            $reportContent += "## Resposta ao Incidente\n\n"
            $reportContent += "### Ações de Contenção\n\n"
            $reportContent += "[Medidas tomadas para conter o incidente]\n\n"
            
            $reportContent += "### Ações de Erradicação\n\n"
            $reportContent += "[Ações realizadas para remover a ameaça]\n\n"
            
            $reportContent += "### Ações de Recuperação\n\n"
            $reportContent += "[Passos para restaurar sistemas e operações]\n\n"
            
            $reportContent += "### Comunicações Realizadas\n\n"
            $reportContent += "[Detalhes sobre comunicações internas e externas realizadas]\n\n"
            
            $reportContent += "## Lições Aprendidas\n\n"
            $reportContent += "### O Que Funcionou Bem\n\n"
            $reportContent += "1. [Ponto positivo 1]\n"
            $reportContent += "2. [Ponto positivo 2]\n"
            $reportContent += "3. [Ponto positivo 3]\n\n"
            
            $reportContent += "### O Que Poderia Melhorar\n\n"
            $reportContent += "1. [Área de melhoria 1]\n"
            $reportContent += "2. [Área de melhoria 2]\n"
            $reportContent += "3. [Área de melhoria 3]\n\n"
            
            $reportContent += "### Recomendações\n\n"
            $reportContent += "| Recomendação | Prioridade | Responsável | Prazo |\n|--------------|------------|-------------|-------|\n"
            $reportContent += "| [Recomendação 1] | Alta | [Responsável] | [Prazo] |\n"
            $reportContent += "| [Recomendação 2] | Média | [Responsável] | [Prazo] |\n"
            $reportContent += "| [Recomendação 3] | Baixa | [Responsável] | [Prazo] |\n\n"
        }
    }
    
    # Salvar relatório
    $reportContent | Set-Content -Path $OutputPath -Encoding UTF8
    
    # Atualizar timeline do incidente
    Update-IncidentStatus -IncidentId $IncidentId -ActionDescription "Relatório gerado" -ActionDetails "Tipo: $ReportType, Caminho: $OutputPath"
    
    Show-IncidentStatus "Relatório de incidente gerado: $OutputPath" "SUCCESS"
    return $OutputPath
}

# Função para criar comunicação sobre incidente
function New-IncidentCommunication {
    param (
        [Parameter(Mandatory=$true)]
        [string]$IncidentId,
        
        [Parameter(Mandatory=$true)]
        [ValidateSet("Internal", "Customers", "Regulatory", "Media")]
        [string]$CommunicationType,
        
        [string]$Title,
        
        [string]$AdditionalDetails,
        
        [string[]]$ApprovedBy,
        
        [string]$OutputPath
    )

    # Verificar se o incidente existe
    $incidentDir = "$($global:CONFIG.IncidentesPath)\ativos\$IncidentId"
    if (-not (Test-Path $incidentDir)) {
        $incidentDir = "$($global:CONFIG.IncidentesPath)\encerrados\$IncidentId"
        if (-not (Test-Path $incidentDir)) {
            Show-IncidentStatus "Incidente não encontrado: $IncidentId" "ERROR"
            return $false
        }
    }
    
    # Carregar dados do incidente
    $incidentData = Get-Content -Path "$incidentDir\incident.json" -Raw | ConvertFrom-Json
    
    # Carregar configuração
    $config = Initialize-IncidentConfig
    
    # Definir caminho de saída da comunicação
    if (-not $OutputPath) {
        $commFileName = "${CommunicationType}_$(Get-Date -Format 'yyyyMMdd').md"
        $OutputPath = "$incidentDir\comunicacoes\$commFileName"
    }
    
    # Criar diretório de comunicações se não existir
    $commDir = Split-Path -Path $OutputPath -Parent
    if (-not (Test-Path $commDir)) {
        New-Item -Path $commDir -ItemType Directory -Force | Out-Null
    }
    
    # Obter template de comunicação
    $templateName = $config.IncidentResponse.Communication.$CommunicationType.Template
    $templatePath = Join-Path -Path $global:CONFIG.TemplatePath -ChildPath $templateName
    
    if (-not (Test-Path $templatePath)) {
        Show-IncidentStatus "Template de comunicação não encontrado: $templateName" "ERROR"
        return $false
    }
    
    # Carregar template
    $commContent = Get-Content -Path $templatePath -Raw
    
    # Substituir placeholders comuns
    $commContent = $commContent.Replace("[DATA]", (Get-Date -Format "dd/MM/yyyy"))
    $commContent = $commContent.Replace("[TIPO]", $incidentData.type.Replace("_", " "))
    
    if ($Title) {
        $commContent = $commContent.Replace("[TÍTULO]", $Title)
    } else {
        $commContent = $commContent.Replace("[TÍTULO]", "Comunicado sobre Incidente de Segurança")
    }
    
    # Salvar comunicação
    $commContent | Set-Content -Path $OutputPath -Encoding UTF8
    
    # Atualizar timeline do incidente
    Update-IncidentStatus -IncidentId $IncidentId -ActionDescription "Comunicação criada" -ActionDetails "Tipo: $CommunicationType, Caminho: $OutputPath"
    
    Show-IncidentStatus "Comunicação de incidente criada: $OutputPath" "SUCCESS"
    return $OutputPath
}

# Função para simular um incidente de segurança (para testes)
function Start-IncidentSimulation {
    param (
        [ValidateSet("Malware", "Unauthorized_Access", "Data_Breach", "DDoS", "Web_Application", "Social_Engineering", "Insider_Threat")]
        [string]$IncidentType = "Web_Application",
        
        [ValidateSet("Critical", "High", "Medium", "Low")]
        [string]$Severity = "Medium",
        
        [switch]$FullSimulation
    )

    Show-IncidentStatus "Iniciando simulação de incidente de segurança" "INFO"
    
    # Criar incidente simulado
    $incidentTitle = "[SIMULAÇÃO] Incidente de $($IncidentType.Replace('_', ' '))"
    $incidentDesc = "Este é um incidente simulado para fins de teste e treinamento do plano de resposta a incidentes."
    $affectedSystems = @("sistema-web.acucaradas.com", "api.acucaradas.com")
    
    $incidentId = New-SecurityIncident -Title $incidentTitle -Type $IncidentType -Severity $Severity -Description $incidentDesc -AffectedSystems $affectedSystems -ReportedBy "Sistema de Simulação"
    
    if (-not $incidentId) {
        Show-IncidentStatus "Falha ao criar incidente simulado" "ERROR"
        return $false
    }
    
    # Adicionar evidências simuladas
    $evidenceTypes = @("Log de Sistema", "Captura de Tela", "Alerta de Segurança")
    $evidenceDescs = @(
        "Log do servidor web mostrando tentativas de acesso não autorizado",
        "Captura de tela da interface de administração com atividade suspeita",
        "Alerta do sistema de monitoramento de segurança indicando possível comprometimento"
    )
    
    for ($i = 0; $i -lt $evidenceTypes.Count; $i++) {
        Add-IncidentEvidence -IncidentId $incidentId -EvidenceType $evidenceTypes[$i] -Description $evidenceDescs[$i] -CollectedBy "Sistema de Simulação" -CollectionMethod "Automático" -GenerateChainOfCustody
    }
    
    # Atualizar status do incidente para simular progresso
    Update-IncidentStatus -IncidentId $incidentId -Phase "Identification" -ActionDescription "Análise inicial" -ActionDetails "Verificando logs e sistemas afetados"
    Start-Sleep -Seconds 2
    
    Update-IncidentStatus -IncidentId $incidentId -Phase "Containment" -ActionDescription "Contenção iniciada" -ActionDetails "Isolando sistemas afetados e bloqueando acessos suspeitos"
    Start-Sleep -Seconds 2
    
    if ($FullSimulation) {
        Update-IncidentStatus -IncidentId $incidentId -Phase "Eradication" -ActionDescription "Erradicação iniciada" -ActionDetails "Removendo componentes maliciosos e corrigindo vulnerabilidades"
        Start-Sleep -Seconds 2
        
        Update-IncidentStatus -IncidentId $incidentId -Phase "Recovery" -ActionDescription "Recuperação iniciada" -ActionDetails "Restaurando sistemas e serviços afetados"
        Start-Sleep -Seconds 2
        
        Update-IncidentStatus -IncidentId $incidentId -Phase "Lessons" -ActionDescription "Análise pós-incidente" -ActionDetails "Documentando lições aprendidas e recomendações"
        Start-Sleep -Seconds 2
        
        # Gerar relatório completo
        New-IncidentReport -IncidentId $incidentId -ReportType "Full"
        
        # Criar comunicações simuladas
        New-IncidentCommunication -IncidentId $incidentId -CommunicationType "Internal"
        
        # Encerrar incidente
        Update-IncidentStatus -IncidentId $incidentId -Status "Closed" -ActionDescription "Incidente encerrado" -ActionDetails "Simulação concluída com sucesso"
    }
    
    Show-IncidentStatus "Simulação de incidente concluída: $incidentId" "SUCCESS"
    return $incidentId
}

# Função para executar verificação de prontidão do plano de resposta
function Test-IncidentResponseReadiness {
    param (
        [switch]$VerifyConfig,
        [switch]$VerifyTemplates,
        [switch]$VerifyDirectories,
        [switch]$RunSimulation,
        [switch]$GenerateReport
    )

    $results = @{
        ConfigStatus = "Não verificado"
        TemplatesStatus = "Não verificado"
        DirectoriesStatus = "Não verificado"
        SimulationStatus = "Não executado"
        Issues = @()
        Recommendations = @()
    }
    
    Show-IncidentStatus "Iniciando verificação de prontidão do plano de resposta a incidentes" "INFO"
    
    # Verificar configuração
    if ($VerifyConfig -or (-not $VerifyConfig -and -not $VerifyTemplates -and -not $VerifyDirectories -and -not $RunSimulation)) {
        Show-IncidentStatus "Verificando configuração..." "INFO" -NoNewLine
        $config = Initialize-IncidentConfig
        
        if ($config) {
            $results.ConfigStatus = "OK"
            Show-IncidentStatus " OK" "SUCCESS"
            
            # Verificar equipe de resposta
            if ($config.IncidentResponse.Team.Count -lt 3) {
                $results.Issues += "Equipe de resposta insuficiente (mínimo recomendado: 3 membros)"
                $results.Recommendations += "Adicione mais membros à equipe de resposta a incidentes"
            }
            
            # Verificar tipos de incidentes
            if ($config.IncidentResponse.IncidentTypes.Count -lt 5) {
                $results.Issues += "Poucos tipos de incidentes definidos (mínimo recomendado: 5 tipos)"
                $results.Recommendations += "Adicione mais tipos de incidentes à configuração"
            }
        } else {
            $results.ConfigStatus = "Falha"
            $results.Issues += "Falha ao carregar configuração"
            $results.Recommendations += "Verifique o arquivo de configuração e permissões"
            Show-IncidentStatus " Falha" "ERROR"
        }
    }
    
    # Verificar templates
    if ($VerifyTemplates -or (-not $VerifyConfig -and -not $VerifyTemplates -and -not $VerifyDirectories -and -not $RunSimulation)) {
        Show-IncidentStatus "Verificando templates..." "INFO" -NoNewLine
        
        if (Test-Path $global:CONFIG.TemplatePath) {
            $templates = Get-ChildItem -Path $global:CONFIG.TemplatePath -Filter "*.md" -ErrorAction SilentlyContinue
            
            if ($templates -and $templates.Count -ge 5) {
                $results.TemplatesStatus = "OK ($($templates.Count) templates)"
                Show-IncidentStatus " OK ($($templates.Count) templates)" "SUCCESS"
            } else {
                $results.TemplatesStatus = "Incompleto"
                $results.Issues += "Poucos templates encontrados (mínimo recomendado: 5 templates)"
                $results.Recommendations += "Execute Initialize-IncidentTemplates para criar templates padrão"
                Show-IncidentStatus " Incompleto" "WARNING"
            }
        } else {
            $results.TemplatesStatus = "Diretório não encontrado"
            $results.Issues += "Diretório de templates não encontrado"
            $results.Recommendations += "Execute Initialize-IncidentTemplates para criar o diretório e templates padrão"
            Show-IncidentStatus " Diretório não encontrado" "ERROR"
        }
    }
    
    # Verificar diretórios
    if ($VerifyDirectories -or (-not $VerifyConfig -and -not $VerifyTemplates -and -not $VerifyDirectories -and -not $RunSimulation)) {
        Show-IncidentStatus "Verificando diretórios..." "INFO" -NoNewLine
        
        $requiredDirs = @(
            $global:CONFIG.IncidentesPath,
            "$($global:CONFIG.IncidentesPath)\ativos",
            "$($global:CONFIG.IncidentesPath)\encerrados",
            $global:CONFIG.ForensicsPath
        )
        
        $missingDirs = @()
        foreach ($dir in $requiredDirs) {
            if (-not (Test-Path $dir)) {
                $missingDirs += $dir
            }
        }
        
        if ($missingDirs.Count -eq 0) {
            $results.DirectoriesStatus = "OK"
            Show-IncidentStatus " OK" "SUCCESS"
        } else {
            $results.DirectoriesStatus = "Incompleto"
            $results.Issues += "Diretórios necessários não encontrados: $($missingDirs -join ", ")"
            $results.Recommendations += "Execute Initialize-IncidentDirectories para criar os diretórios necessários"
            Show-IncidentStatus " Incompleto" "WARNING"
        }
    }
    
    # Executar simulação
    if ($RunSimulation) {
        Show-IncidentStatus "Executando simulação de incidente..." "INFO"
        $simulationId = Start-IncidentSimulation -IncidentType "Web_Application" -Severity "Medium"
        
        if ($simulationId) {
            $results.SimulationStatus = "Sucesso"
            Show-IncidentStatus "Simulação concluída com sucesso: $simulationId" "SUCCESS"
        } else {
            $results.SimulationStatus = "Falha"
            $results.Issues += "Falha ao executar simulação de incidente"
            $results.Recommendations += "Verifique logs de erro e permissões"
            Show-IncidentStatus "Falha ao executar simulação" "ERROR"
        }
    }
    
    # Gerar relatório
    if ($GenerateReport) {
        $reportPath = "$($global:CONFIG.LogPath)\readiness_report_$(Get-Date -Format 'yyyyMMdd').md"
        
        # Criar diretório de logs se não existir
        if (-not (Test-Path $global:CONFIG.LogPath)) {
            New-Item -Path $global:CONFIG.LogPath -ItemType Directory -Force | Out-Null
        }
        
        $reportContent = "# Relatório de Prontidão do Plano de Resposta a Incidentes\n\n"
        $reportContent += "**Data**: $(Get-Date -Format 'dd/MM/yyyy')\n"
        $reportContent += "**Executado por**: $env:USERNAME\n\n"
        
        $reportContent += "## Resultados da Verificação\n\n"
        $reportContent += "| Componente | Status |\n|------------|--------|\n"
        $reportContent += "| Configuração | $($results.ConfigStatus) |\n"
        $reportContent += "| Templates | $($results.TemplatesStatus) |\n"
        $reportContent += "| Diretórios | $($results.DirectoriesStatus) |\n"
        $reportContent += "| Simulação | $($results.SimulationStatus) |\n\n"
        
        if ($results.Issues.Count -gt 0) {
            $reportContent += "## Problemas Identificados\n\n"
            foreach ($issue in $results.Issues) {
                $reportContent += "- $issue\n"
            }
            $reportContent += "\n"
        }
        
        if ($results.Recommendations.Count -gt 0) {
            $reportContent += "## Recomendações\n\n"
            foreach ($recommendation in $results.Recommendations) {
                $reportContent += "- $recommendation\n"
            }
            $reportContent += "\n"
        }
        
        $reportContent += "## Próximos Passos\n\n"
        $reportContent += "1. Resolver problemas identificados\n"
        $reportContent += "2. Realizar treinamento da equipe de resposta\n"
        $reportContent += "3. Conduzir simulação completa de incidente\n"
        $reportContent += "4. Revisar e atualizar procedimentos conforme necessário\n"
        
        $reportContent | Set-Content -Path $reportPath -Encoding UTF8
        Show-IncidentStatus "Relatório de prontidão gerado: $reportPath" "SUCCESS"
    }
    
    return $results
}

# Função principal para inicializar o sistema de resposta a incidentes
function Initialize-IncidentResponseSystem {
    param (
        [switch]$Force,
        [switch]$SkipSimulation,
        [switch]$GenerateReadinessReport
    )

    Show-IncidentStatus "Inicializando sistema de resposta a incidentes" "INFO"
    
    # Inicializar configuração
    $config = Initialize-IncidentConfig
    if (-not $config -and -not $Force) {
        Show-IncidentStatus "Falha ao inicializar configuração. Use -Force para continuar mesmo assim." "ERROR"
        return $false
    }
    
    # Inicializar templates
    Initialize-IncidentTemplates
    
    # Inicializar diretórios
    Initialize-IncidentDirectories
    
    # Verificar prontidão
    if ($GenerateReadinessReport) {
        Test-IncidentResponseReadiness -VerifyConfig -VerifyTemplates -VerifyDirectories -GenerateReport
    }
    
    # Executar simulação
    if (-not $SkipSimulation) {
        Start-IncidentSimulation -IncidentType "Web_Application" -Severity "Low"
    }
    
    Show-IncidentStatus "Sistema de resposta a incidentes inicializado com sucesso" "SUCCESS"
    return $true
}

# Inicializar o sistema automaticamente ao carregar o script
Initialize-IncidentResponseSystem -SkipSimulation