# Script de Configuração de Monitoramento de Segurança (SIEM)
# Utiliza ELK Stack (Elasticsearch, Logstash, Kibana) e Wazuh

# Configurações
$elkVersion = "7.17.0"
$wazuhVersion = "4.3.10"
$installPath = "C:\ELK"
$logPath = "C:\Logs\AcucaradasApp"

# Cria diretórios necessários
Write-Host "Criando diretórios..." -ForegroundColor Cyan
if (-not (Test-Path $installPath)) {
    New-Item -Path $installPath -ItemType Directory -Force | Out-Null
}

if (-not (Test-Path $logPath)) {
    New-Item -Path $logPath -ItemType Directory -Force | Out-Null
}

# Função para baixar arquivos
function Download-File {
    param (
        [string]$url,
        [string]$output
    )
    
    Write-Host "Baixando $url para $output" -ForegroundColor Yellow
    Invoke-WebRequest -Uri $url -OutFile $output
}

# Configuração do Elasticsearch
Write-Host "Configurando Elasticsearch..." -ForegroundColor Green
$elasticsearchConfig = @"
# Configuração do Elasticsearch para Açucaradas Encomendas SIEM
cluster.name: acucaradas-security
node.name: security-node-1
path.data: $installPath\elasticsearch\data
path.logs: $installPath\elasticsearch\logs
network.host: 127.0.0.1
http.port: 9200
discovery.type: single-node
xpack.security.enabled: true
xpack.security.authc.api_key.enabled: true
"@

# Salva a configuração do Elasticsearch
New-Item -Path "$installPath\elasticsearch" -ItemType Directory -Force | Out-Null
$elasticsearchConfig | Out-File -FilePath "$installPath\elasticsearch\elasticsearch.yml" -Encoding utf8

# Configuração do Logstash
Write-Host "Configurando Logstash..." -ForegroundColor Green
$logstashConfig = @"
# Configuração do Logstash para Açucaradas Encomendas SIEM
input {
  file {
    path => "$logPath\*.log"
    start_position => "beginning"
    sincedb_path => "$installPath\logstash\sincedb"
    type => "acucaradas-app-logs"
  }
  beats {
    port => 5044
    host => "127.0.0.1"
    type => "beats"
  }
  http {
    port => 8080
    host => "127.0.0.1"
    type => "http"
  }
}

filter {
  if [type] == "acucaradas-app-logs" {
    grok {
      match => { "message" => "%{TIMESTAMP_ISO8601:timestamp} %{LOGLEVEL:log_level} %{GREEDYDATA:log_message}" }
    }
    date {
      match => [ "timestamp", "ISO8601" ]
      target => "@timestamp"
    }
    if [log_message] =~ "error|exception|fail|failed" {
      mutate {
        add_tag => ["error"]
      }
    }
    if [log_message] =~ "login|auth|password|credential" {
      mutate {
        add_tag => ["authentication"]
      }
    }
    if [log_message] =~ "admin|permission|role|access" {
      mutate {
        add_tag => ["authorization"]
      }
    }
  }
  
  # Detecção de ataques
  if [message] =~ "<script>|alert\\(|eval\\(|javascript:|onerror=|onclick=" {
    mutate {
      add_tag => ["xss_attempt"]
      add_field => { "security_incident" => "true" }
      add_field => { "incident_type" => "XSS Attack" }
    }
  }
  
  if [message] =~ "SELECT.*FROM|INSERT.*INTO|UPDATE.*SET|DELETE.*FROM|UNION.*SELECT|DROP.*TABLE" {
    mutate {
      add_tag => ["sql_injection_attempt"]
      add_field => { "security_incident" => "true" }
      add_field => { "incident_type" => "SQL Injection" }
    }
  }
  
  if [message] =~ "Failed login attempt|Invalid password|Brute force|Too many attempts" {
    mutate {
      add_tag => ["brute_force_attempt"]
      add_field => { "security_incident" => "true" }
      add_field => { "incident_type" => "Brute Force Attack" }
    }
  }
}

output {
  elasticsearch {
    hosts => ["127.0.0.1:9200"]
    index => "acucaradas-logs-%{+YYYY.MM.dd}"
    user => "elastic"
    password => "AcucaradasSecure123"
  }
  
  # Alertas para incidentes de segurança
  if [security_incident] == "true" {
    email {
      to => "security@acucaradas.com"
      from => "siem@acucaradas.com"
      subject => "[ALERTA DE SEGURANÇA] %{incident_type} detectado"
      body => "Um possível incidente de segurança foi detectado:\n\nTipo: %{incident_type}\nMensagem: %{message}\nTimestamp: %{@timestamp}\nIP de origem: %{[client][ip]}\n\nPor favor, investigue imediatamente."
      domain => "acucaradas.com"
      port => 25
    }
  }
}
"@

# Salva a configuração do Logstash
New-Item -Path "$installPath\logstash" -ItemType Directory -Force | Out-Null
$logstashConfig | Out-File -FilePath "$installPath\logstash\acucaradas-pipeline.conf" -Encoding utf8

# Configuração do Kibana
Write-Host "Configurando Kibana..." -ForegroundColor Green
$kibanaConfig = @"
# Configuração do Kibana para Açucaradas Encomendas SIEM
server.port: 5601
server.host: "127.0.0.1"
server.name: "acucaradas-kibana"
elasticsearch.hosts: ["http://127.0.0.1:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "AcucaradasSecure123"
xpack.security.enabled: true
xpack.reporting.enabled: true
xpack.watcher.enabled: true
"@

# Salva a configuração do Kibana
New-Item -Path "$installPath\kibana" -ItemType Directory -Force | Out-Null
$kibanaConfig | Out-File -FilePath "$installPath\kibana\kibana.yml" -Encoding utf8

# Configuração do Filebeat para coleta de logs
Write-Host "Configurando Filebeat..." -ForegroundColor Green
$filebeatConfig = @"
# Configuração do Filebeat para Açucaradas Encomendas SIEM
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - $logPath\*.log
  fields:
    app: acucaradas
    environment: production
  fields_under_root: true
  json.keys_under_root: true
  json.add_error_key: true

- type: log
  enabled: true
  paths:
    - C:\Windows\System32\winevt\Logs\Security.evtx
  fields:
    source: windows_security
  fields_under_root: true

filebeat.modules:
- module: system
  syslog:
    enabled: true
  auth:
    enabled: true

- module: nginx
  access:
    enabled: true
  error:
    enabled: true

- module: iis
  access:
    enabled: true
  error:
    enabled: true

setup.kibana:
  host: "127.0.0.1:5601"
  username: "kibana_system"
  password: "AcucaradasSecure123"

setup.dashboards.enabled: true
setup.template.enabled: true

output.elasticsearch:
  hosts: ["127.0.0.1:9200"]
  username: "elastic"
  password: "AcucaradasSecure123"
  index: "filebeat-%{[agent.version]}-%{+yyyy.MM.dd}"

processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~
  - add_docker_metadata: ~
  - add_kubernetes_metadata: ~
"@

# Salva a configuração do Filebeat
New-Item -Path "$installPath\filebeat" -ItemType Directory -Force | Out-Null
$filebeatConfig | Out-File -FilePath "$installPath\filebeat\filebeat.yml" -Encoding utf8

# Configuração do Wazuh Manager
Write-Host "Configurando Wazuh Manager..." -ForegroundColor Green
$wazuhConfig = @"
<ossec_config>
  <global>
    <jsonout_output>yes</jsonout_output>
    <alerts_log>yes</alerts_log>
    <logall>no</logall>
    <logall_json>no</logall_json>
    <email_notification>yes</email_notification>
    <email_to>security@acucaradas.com</email_to>
    <email_from>wazuh@acucaradas.com</email_from>
    <email_maxperhour>12</email_maxperhour>
    <email_log_source>alerts.log</email_log_source>
    <smtp_server>smtp.acucaradas.com</smtp_server>
    <smtp_port>25</smtp_port>
  </global>

  <alerts>
    <log_alert_level>3</log_alert_level>
    <email_alert_level>7</email_alert_level>
  </alerts>

  <!-- Regras específicas para aplicativos web -->
  <ruleset>
    <!-- Regras padrão do Wazuh -->
    <decoder_dir>ruleset/decoders</decoder_dir>
    <rule_dir>ruleset/rules</rule_dir>
    <rule_exclude>0215-policy_rules.xml</rule_exclude>
    
    <!-- Regras personalizadas para Açucaradas Encomendas -->
    <decoder_dir>etc/decoders</decoder_dir>
    <rule_dir>etc/rules</rule_dir>
  </ruleset>

  <!-- Monitoramento de integridade de arquivos -->
  <syscheck>
    <disabled>no</disabled>
    <frequency>43200</frequency>
    <scan_on_start>yes</scan_on_start>
    <alert_new_files>yes</alert_new_files>
    <auto_ignore>no</auto_ignore>
    <directories check_all="yes">C:\Acucaradas\src</directories>
    <directories check_all="yes">C:\Acucaradas\public</directories>
    <ignore>C:\Acucaradas\node_modules</ignore>
  </syscheck>

  <!-- Detecção de rootkits -->
  <rootcheck>
    <disabled>no</disabled>
    <check_unixaudit>yes</check_unixaudit>
    <check_files>yes</check_files>
    <check_trojans>yes</check_trojans>
    <check_dev>yes</check_dev>
    <check_sys>yes</check_sys>
    <check_pids>yes</check_pids>
    <check_ports>yes</check_ports>
    <check_if>yes</check_if>
    <frequency>36000</frequency>
    <rootkit_files>C:\Program Files\Wazuh-agent\etc\shared\rootkit_files.txt</rootkit_files>
    <rootkit_trojans>C:\Program Files\Wazuh-agent\etc\shared\rootkit_trojans.txt</rootkit_trojans>
  </rootcheck>

  <!-- Monitoramento de logs do sistema -->
  <localfile>
    <log_format>json</log_format>
    <location>$logPath\*.log</location>
  </localfile>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>Security</location>
  </localfile>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>Application</location>
  </localfile>

  <localfile>
    <log_format>eventchannel</log_format>
    <location>System</location>
  </localfile>

  <!-- Configuração de resposta ativa -->
  <active-response>
    <disabled>no</disabled>
    <command>firewall-drop</command>
    <location>local</location>
    <level>7</level>
    <timeout>600</timeout>
  </active-response>
</ossec_config>
"@

# Salva a configuração do Wazuh
New-Item -Path "$installPath\wazuh" -ItemType Directory -Force | Out-Null
$wazuhConfig | Out-File -FilePath "$installPath\wazuh\ossec.conf" -Encoding utf8

# Cria regras personalizadas para o Wazuh
Write-Host "Criando regras personalizadas para o Wazuh..." -ForegroundColor Green
$wazuhRules = @"
<group name="acucaradas,web,attack,">
  <!-- Regras para detecção de ataques XSS -->
  <rule id="100001" level="10">
    <if_sid>31101</if_sid>
    <match>XSS attack detected</match>
    <description>XSS attack detected in Açucaradas Encomendas application</description>
    <group>web_attack,xss,pci_dss_6.5.7,gdpr_IV_35.7.d,</group>
  </rule>

  <!-- Regras para detecção de ataques SQL Injection -->
  <rule id="100002" level="12">
    <if_sid>31101</if_sid>
    <match>SQL injection attempt</match>
    <description>SQL injection attempt detected in Açucaradas Encomendas application</description>
    <group>web_attack,sql_injection,pci_dss_6.5.1,gdpr_IV_35.7.d,</group>
  </rule>

  <!-- Regras para detecção de tentativas de login malsucedidas -->
  <rule id="100003" level="7">
    <if_sid>31101</if_sid>
    <match>Failed login attempt</match>
    <description>Failed login attempt detected in Açucaradas Encomendas application</description>
    <group>authentication_failed,pci_dss_10.2.4,gdpr_IV_35.7.d,</group>
  </rule>

  <!-- Regras para detecção de tentativas de força bruta -->
  <rule id="100004" level="10" frequency="8" timeframe="120">
    <if_matched_sid>100003</if_matched_sid>
    <same_source_ip />
    <description>Multiple failed login attempts from same source (possible brute force attack)</description>
    <group>authentication_failures,brute_force,pci_dss_10.2.4,pci_dss_10.2.5,gdpr_IV_35.7.d,</group>
  </rule>

  <!-- Regras para detecção de acesso não autorizado -->
  <rule id="100005" level="9">
    <if_sid>31101</if_sid>
    <match>Unauthorized access attempt</match>
    <description>Unauthorized access attempt detected in Açucaradas Encomendas application</description>
    <group>access_denied,pci_dss_10.2.4,pci_dss_10.2.5,gdpr_IV_35.7.d,</group>
  </rule>

  <!-- Regras para detecção de modificação de arquivos críticos -->
  <rule id="100006" level="7">
    <if_sid>550</if_sid>
    <regex>\.(js|html|php|json)$</regex>
    <description>Critical web file modified in Açucaradas Encomendas application</description>
    <group>file_modified,pci_dss_10.5.2,gdpr_II_5.1.f,</group>
  </rule>
</group>
"@

# Salva as regras personalizadas do Wazuh
New-Item -Path "$installPath\wazuh\rules" -ItemType Directory -Force | Out-Null
$wazuhRules | Out-File -FilePath "$installPath\wazuh\rules\acucaradas_rules.xml" -Encoding utf8

# Cria script para iniciar os serviços
Write-Host "Criando script de inicialização..." -ForegroundColor Green
$startScript = @"
# Script para iniciar os serviços de monitoramento de segurança

# Inicia o Elasticsearch
Write-Host "Iniciando Elasticsearch..." -ForegroundColor Cyan
Start-Process -FilePath "$installPath\elasticsearch\bin\elasticsearch.bat" -WindowStyle Hidden

# Aguarda o Elasticsearch iniciar
Start-Sleep -Seconds 30

# Inicia o Logstash
Write-Host "Iniciando Logstash..." -ForegroundColor Cyan
Start-Process -FilePath "$installPath\logstash\bin\logstash.bat" -ArgumentList "-f", "$installPath\logstash\acucaradas-pipeline.conf" -WindowStyle Hidden

# Inicia o Kibana
Write-Host "Iniciando Kibana..." -ForegroundColor Cyan
Start-Process -FilePath "$installPath\kibana\bin\kibana.bat" -WindowStyle Hidden

# Inicia o Filebeat
Write-Host "Iniciando Filebeat..." -ForegroundColor Cyan
Start-Process -FilePath "$installPath\filebeat\filebeat.exe" -ArgumentList "-c", "$installPath\filebeat\filebeat.yml" -WindowStyle Hidden

# Inicia o Wazuh Manager
Write-Host "Iniciando Wazuh Manager..." -ForegroundColor Cyan
Start-Process -FilePath "$installPath\wazuh\bin\wazuh-manager.exe" -WindowStyle Hidden

Write-Host "Todos os serviços de monitoramento de segurança foram iniciados." -ForegroundColor Green
Write-Host "Acesse o dashboard do Kibana em: http://localhost:5601" -ForegroundColor Yellow
"@

# Salva o script de inicialização
$startScript | Out-File -FilePath "$installPath\start-security-monitoring.ps1" -Encoding utf8

# Cria um arquivo README com instruções
Write-Host "Criando documentação..." -ForegroundColor Green
$readmeContent = @"
# Monitoramento de Segurança (SIEM) - Açucaradas Encomendas

## Visão Geral

Este sistema de monitoramento de segurança utiliza o ELK Stack (Elasticsearch, Logstash, Kibana) em conjunto com o Wazuh para fornecer detecção de ameaças, monitoramento de logs e alertas de segurança em tempo real.

## Componentes

1. **Elasticsearch**: Armazenamento e indexação de logs
2. **Logstash**: Processamento e enriquecimento de logs
3. **Kibana**: Visualização e dashboards
4. **Filebeat**: Coleta de logs do sistema e aplicação
5. **Wazuh**: Detecção de intrusão e monitoramento de integridade

## Instalação

### Pré-requisitos

- Windows Server 2016 ou superior
- PowerShell 5.1 ou superior
- Java 11 ou superior
- Pelo menos 8GB de RAM e 4 núcleos de CPU
- 50GB de espaço em disco

### Passos para Instalação

1. Baixe e instale o Java 11 (ou superior)
2. Baixe os pacotes do ELK Stack e Wazuh
3. Execute o script de configuração: `siem-setup.ps1`
4. Inicie os serviços: `start-security-monitoring.ps1`

## Configuração

Todos os arquivos de configuração estão localizados em `$installPath` com a seguinte estrutura:

- `elasticsearch/elasticsearch.yml`: Configuração do Elasticsearch
- `logstash/acucaradas-pipeline.conf`: Pipeline de processamento de logs
- `kibana/kibana.yml`: Configuração do Kibana
- `filebeat/filebeat.yml`: Configuração de coleta de logs
- `wazuh/ossec.conf`: Configuração do Wazuh Manager
- `wazuh/rules/acucaradas_rules.xml`: Regras personalizadas

## Uso

### Acessando o Dashboard

Após iniciar todos os serviços, acesse o dashboard do Kibana em:

```
http://localhost:5601
```

Credenciais padrão:
- Usuário: `elastic`
- Senha: `AcucaradasSecure123`

### Dashboards Principais

1. **Visão Geral de Segurança**: Resumo de todos os eventos de segurança
2. **Detecção de Ameaças**: Alertas de segurança e possíveis ataques
3. **Monitoramento de Autenticação**: Tentativas de login e atividades de usuários
4. **Integridade de Arquivos**: Alterações em arquivos críticos
5. **Logs de Aplicação**: Eventos específicos da aplicação Açucaradas Encomendas

## Alertas

O sistema está configurado para enviar alertas por e-mail para `security@acucaradas.com` quando:

1. Tentativas de ataques são detectadas (XSS, SQL Injection, etc.)
2. Múltiplas falhas de autenticação ocorrem (possível força bruta)
3. Arquivos críticos são modificados
4. Comportamento anômalo é detectado

## Manutenção

### Rotação de Logs

Os índices do Elasticsearch são rotacionados diariamente. A política de retenção padrão mantém logs por 30 dias.

### Backup

Recomenda-se configurar backups regulares do Elasticsearch usando snapshots:

```
PUT /_snapshot/backup_repository
{
  "type": "fs",
  "settings": {
    "location": "$installPath\\elasticsearch\\backups"
  }
}
```

### Atualização

Para atualizar os componentes, baixe as novas versões e atualize os arquivos de configuração conforme necessário.

## Solução de Problemas

### Logs de Serviços

- Elasticsearch: `$installPath\elasticsearch\logs`
- Logstash: `$installPath\logstash\logs`
- Kibana: `$installPath\kibana\logs`
- Filebeat: `$installPath\filebeat\logs`
- Wazuh: `$installPath\wazuh\logs`

### Problemas Comuns

1. **Elasticsearch não inicia**: Verifique a configuração de memória e permissões
2. **Logstash não processa logs**: Verifique a sintaxe do pipeline e permissões de arquivo
3. **Alertas não são enviados**: Verifique a configuração de e-mail e conectividade SMTP

## Contato

Para suporte, entre em contato com a equipe de segurança em `security@acucaradas.com`.
"@

# Salva o README
$readmeContent | Out-File -FilePath "$installPath\README.md" -Encoding utf8

Write-Host "Configuração de monitoramento de segurança (SIEM) concluída com sucesso!" -ForegroundColor Green
Write-Host "Todos os arquivos de configuração foram criados em: $installPath" -ForegroundColor Yellow
Write-Host "Para iniciar os serviços, execute: $installPath\start-security-monitoring.ps1" -ForegroundColor Yellow
Write-Host "Para mais informações, consulte: $installPath\README.md" -ForegroundColor Yellow