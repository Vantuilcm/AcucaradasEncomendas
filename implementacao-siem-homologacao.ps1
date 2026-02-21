# Script de Implementação do SIEM em Ambiente de Homologação
# Açucaradas Encomendas

# Configurações
$logFile = "$PSScriptRoot\implementacao-siem-homologacao.log"
$homologacaoDir = "$PSScriptRoot\siem-homologacao"
$configDir = "$homologacaoDir\config"
$dataDir = "$homologacaoDir\data"
$logsDir = "$homologacaoDir\logs"

# Funções de Utilidade
function Write-Log {
    param (
        [string]$Message,
        [string]$Level = "INFO"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logMessage = "[$timestamp] [$Level] $Message"
    Add-Content -Path $logFile -Value $logMessage
    Write-Host $logMessage
}

function Initialize-Environment {
    # Criar diretórios necessários
    if (-not (Test-Path $homologacaoDir)) {
        New-Item -Path $homologacaoDir -ItemType Directory | Out-Null
        Write-Log "Diretório de homologação criado: $homologacaoDir" "INFO"
    }
    
    if (-not (Test-Path $configDir)) {
        New-Item -Path $configDir -ItemType Directory | Out-Null
        Write-Log "Diretório de configuração criado: $configDir" "INFO"
    }
    
    if (-not (Test-Path $dataDir)) {
        New-Item -Path $dataDir -ItemType Directory | Out-Null
        Write-Log "Diretório de dados criado: $dataDir" "INFO"
    }
    
    if (-not (Test-Path $logsDir)) {
        New-Item -Path $logsDir -ItemType Directory | Out-Null
        Write-Log "Diretório de logs criado: $logsDir" "INFO"
    }
    
    # Verificar se o script de configuração do SIEM existe
    $siemScript = "$PSScriptRoot\siem-setup.ps1"
    if (-not (Test-Path $siemScript)) {
        Write-Log "Script de configuração do SIEM não encontrado: $siemScript" "ERROR"
        Write-Host "O script de configuração do SIEM não foi encontrado. Por favor, certifique-se de que o arquivo siem-setup.ps1 existe no diretório do projeto." -ForegroundColor Red
        return $false
    }
    
    # Verificar se a documentação do SIEM existe
    $siemDocs = "$PSScriptRoot\SIEM_DOCUMENTATION.md"
    if (-not (Test-Path $siemDocs)) {
        Write-Log "Documentação do SIEM não encontrada: $siemDocs" "WARNING"
        Write-Host "A documentação do SIEM não foi encontrada. Recomenda-se revisar a documentação antes de prosseguir com a implementação." -ForegroundColor Yellow
    }
    
    return $true
}

function Create-ElasticsearchConfig {
    $elasticsearchConfig = @"
# Configuração do Elasticsearch para ambiente de homologação
cluster.name: acucaradas-homolog
node.name: node-1
path.data: $dataDir\elasticsearch
path.logs: $logsDir\elasticsearch
network.host: 127.0.0.1
http.port: 9200
discovery.type: single-node
xpack.security.enabled: true
xpack.security.transport.ssl.enabled: true
xpack.monitoring.collection.enabled: true
"@
    
    $elasticsearchConfig | Set-Content -Path "$configDir\elasticsearch.yml"
    Write-Log "Configuração do Elasticsearch criada" "INFO"
}

function Create-LogstashConfig {
    $logstashPipeline = @"
# Configuração de pipeline do Logstash para ambiente de homologação
input {
  beats {
    port => 5044
  }
  tcp {
    port => 5000
    codec => json
  }
  udp {
    port => 5000
    codec => json
  }
}

filter {
  if [type] == "syslog" {
    grok {
      match => { "message" => "%{SYSLOGTIMESTAMP:syslog_timestamp} %{SYSLOGHOST:syslog_hostname} %{DATA:syslog_program}(?:\[%{POSINT:syslog_pid}\])?: %{GREEDYDATA:syslog_message}" }
      add_field => [ "received_at", "%{@timestamp}" ]
      add_field => [ "received_from", "%{host}" ]
    }
    date {
      match => [ "syslog_timestamp", "MMM  d HH:mm:ss", "MMM dd HH:mm:ss" ]
    }
  }
  
  if [type] == "web_access" {
    grok {
      match => { "message" => "%{COMBINEDAPACHELOG}" }
    }
    geoip {
      source => "clientip"
    }
    useragent {
      source => "agent"
      target => "useragent"
    }
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "%{[@metadata][beat]}-%{[@metadata][version]}-%{+YYYY.MM.dd}"
    user => "elastic"
    password => "changeme"
  }
}
"@
    
    $logstashPipeline | Set-Content -Path "$configDir\logstash-pipeline.conf"
    Write-Log "Configuração do pipeline do Logstash criada" "INFO"
    
    $logstashConfig = @"
# Configuração do Logstash para ambiente de homologação
path.config: $configDir\logstash-pipeline.conf
path.data: $dataDir\logstash
path.logs: $logsDir\logstash
pipeline.workers: 2
pipeline.batch.size: 125
pipeline.batch.delay: 50
"@
    
    $logstashConfig | Set-Content -Path "$configDir\logstash.yml"
    Write-Log "Configuração do Logstash criada" "INFO"
}

function Create-KibanaConfig {
    $kibanaConfig = @"
# Configuração do Kibana para ambiente de homologação
server.port: 5601
server.host: "localhost"
server.name: "acucaradas-kibana"
elasticsearch.hosts: ["http://localhost:9200"]
elasticsearch.username: "kibana_system"
elasticsearch.password: "changeme"
monitoring.ui.container.elasticsearch.enabled: true
"@
    
    $kibanaConfig | Set-Content -Path "$configDir\kibana.yml"
    Write-Log "Configuração do Kibana criada" "INFO"
}

function Create-FilebeatConfig {
    $filebeatConfig = @"
# Configuração do Filebeat para ambiente de homologação
filebeat.inputs:
- type: log
  enabled: true
  paths:
    - C:\Windows\System32\winevt\Logs\*.evtx
  tags: ["windows", "events"]

- type: log
  enabled: true
  paths:
    - C:\inetpub\logs\LogFiles\W3SVC*\*.log
  tags: ["iis", "web"]

filebeat.modules:
  path: ${path.config}/modules.d/*.yml
  reload.enabled: true

setup.template.settings:
  index.number_of_shards: 1

setup.kibana:
  host: "localhost:5601"

output.logstash:
  hosts: ["localhost:5044"]

processors:
  - add_host_metadata: ~
  - add_cloud_metadata: ~
"@
    
    $filebeatConfig | Set-Content -Path "$configDir\filebeat.yml"
    Write-Log "Configuração do Filebeat criada" "INFO"
}

function Create-WazuhConfig {
    $wazuhConfig = @"
# Configuração do Wazuh Manager para ambiente de homologação
<ossec_config>
  <global>
    <jsonout_output>yes</jsonout_output>
    <alerts_log>yes</alerts_log>
    <logall>no</logall>
    <logall_json>no</logall_json>
    <email_notification>no</email_notification>
    <smtp_server>smtp.example.wazuh.com</smtp_server>
    <email_from>wazuh@example.wazuh.com</email_from>
    <email_to>recipient@example.wazuh.com</email_to>
    <email_maxperhour>12</email_maxperhour>
    <email_log_source>alerts.log</email_log_source>
    <agents_disconnection_time>10m</agents_disconnection_time>
    <agents_disconnection_alert_time>0</agents_disconnection_alert_time>
  </global>

  <alerts>
    <log_alert_level>3</log_alert_level>
    <email_alert_level>12</email_alert_level>
  </alerts>

  <remote>
    <connection>secure</connection>
    <port>1514</port>
    <protocol>tcp</protocol>
    <queue_size>131072</queue_size>
  </remote>

  <rootcheck>
    <disabled>no</disabled>
    <check_files>yes</check_files>
    <check_trojans>yes</check_trojans>
    <check_dev>yes</check_dev>
    <check_sys>yes</check_sys>
    <check_pids>yes</check_pids>
    <check_ports>yes</check_ports>
    <check_if>yes</check_if>
    <frequency>43200</frequency>
    <rootkit_files>etc/rootcheck/rootkit_files.txt</rootkit_files>
    <rootkit_trojans>etc/rootcheck/rootkit_trojans.txt</rootkit_trojans>
    <skip_nfs>yes</skip_nfs>
  </rootcheck>

  <wodle name="open-scap">
    <disabled>yes</disabled>
    <timeout>1800</timeout>
    <interval>1d</interval>
    <scan-on-start>yes</scan-on-start>
  </wodle>

  <wodle name="cis-cat">
    <disabled>yes</disabled>
    <timeout>1800</timeout>
    <interval>1d</interval>
    <scan-on-start>yes</scan-on-start>
  </wodle>

  <wodle name="vulnerability-detector">
    <disabled>no</disabled>
    <interval>1d</interval>
    <run_on_start>yes</run_on_start>
    <update_interval>1h</update_interval>
    <provider name="nvd">
      <enabled>yes</enabled>
      <update_interval>1h</update_interval>
    </provider>
  </wodle>

  <syscheck>
    <disabled>no</disabled>
    <frequency>43200</frequency>
    <scan_on_start>yes</scan_on_start>
    <alert_new_files>yes</alert_new_files>
    <auto_ignore>no</auto_ignore>
    <directories check_all="yes">C:\Windows\System32\drivers\etc</directories>
    <directories check_all="yes">C:\Windows\System32\Config</directories>
    <directories check_all="yes">C:\Program Files</directories>
    <directories check_all="yes">C:\inetpub</directories>
    <ignore>C:\Program Files (x86)\Steam\steamapps</ignore>
    <ignore type="sregex">\\Recycler$</ignore>
    <ignore type="sregex">\\System Volume Information$</ignore>
    <nodiff>C:\Program Files\Wazuh-agent\etc\ossec.conf</nodiff>
  </syscheck>

  <active-response>
    <disabled>no</disabled>
    <ca_store>etc/wpk_root.pem</ca_store>
    <ca_verification>yes</ca_verification>
  </active-response>

  <localfile>
    <log_format>syslog</log_format>
    <location>Application</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>Security</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>System</location>
  </localfile>

  <localfile>
    <log_format>syslog</log_format>
    <location>Microsoft-Windows-Sysmon/Operational</location>
  </localfile>

  <localfile>
    <log_format>iis</log_format>
    <location>C:\inetpub\logs\LogFiles\W3SVC1\u_ex*.log</location>
  </localfile>
</ossec_config>
"@
    
    $wazuhConfig | Set-Content -Path "$configDir\ossec.conf"
    Write-Log "Configuração do Wazuh Manager criada" "INFO"
}

function Create-CustomRules {
    $customRules = @"
<!-- Regras personalizadas para a Açucaradas Encomendas -->
<group name="acucaradas,">
  <!-- Regra para detectar tentativas de login com força bruta -->
  <rule id="100001" level="10">
    <if_sid>5710</if_sid>
    <match>^Maximum authentication attempts exceeded</match>
    <description>Múltiplas tentativas de autenticação falhadas - possível ataque de força bruta</description>
    <group>authentication_failures,pci_dss_10.2.4,pci_dss_10.2.5,</group>
  </rule>

  <!-- Regra para detectar atividade suspeita em horário não comercial -->
  <rule id="100002" level="7">
    <if_sid>5715</if_sid>
    <time>0-7,19-23</time>
    <description>Login administrativo fora do horário comercial</description>
    <group>suspicious_time,pci_dss_10.6.1,</group>
  </rule>

  <!-- Regra para detectar acesso a arquivos sensíveis -->
  <rule id="100003" level="8">
    <if_sid>550</if_sid>
    <match>\\config\\|\\credentials\\|\\secrets\\|password.txt|apikey</match>
    <description>Acesso a arquivo potencialmente sensível</description>
    <group>sensitive_files,pci_dss_10.5.2,</group>
  </rule>

  <!-- Regra para detectar instalação de software não autorizado -->
  <rule id="100004" level="8">
    <if_sid>530</if_sid>
    <match>^New software installed: </match>
    <description>Software não autorizado instalado</description>
    <group>software_change,pci_dss_10.2.7,</group>
  </rule>

  <!-- Regra para detectar ataques de injeção SQL -->
  <rule id="100005" level="12">
    <if_sid>31101</if_sid>
    <match>SELECT|INSERT|UPDATE|DELETE|DROP|UNION|1=1</match>
    <description>Possível ataque de injeção SQL detectado</description>
    <group>web_attack,sql_injection,pci_dss_6.5.1,pci_dss_11.4,</group>
  </rule>

  <!-- Regra para detectar ataques XSS -->
  <rule id="100006" level="12">
    <if_sid>31101</if_sid>
    <match><![CDATA[<script>|javascript:|alert\(|\\x|%3C|%3E]]></match>
    <description>Possível ataque XSS detectado</description>
    <group>web_attack,xss,pci_dss_6.5.7,pci_dss_11.4,</group>
  </rule>

  <!-- Regra para detectar tentativas de acesso a arquivos de backup -->
  <rule id="100007" level="10">
    <if_sid>31101</if_sid>
    <match>\.bak$|\.backup$|\.old$|\.sql$|\.zip$|\.tar$|\.gz$</match>
    <description>Tentativa de acesso a possível arquivo de backup</description>
    <group>web_attack,sensitive_files,pci_dss_10.5.2,</group>
  </rule>

  <!-- Regra para detectar tentativas de path traversal -->
  <rule id="100008" level="12">
    <if_sid>31101</if_sid>
    <match>\.\.\\|\.\./|%2e%2e%2f|%252e%252e%252f</match>
    <description>Tentativa de path traversal detectada</description>
    <group>web_attack,path_traversal,pci_dss_6.5.8,pci_dss_11.4,</group>
  </rule>
</group>
"@
    
    $customRules | Set-Content -Path "$configDir\custom_rules.xml"
    Write-Log "Regras personalizadas criadas" "INFO"
}

function Create-DashboardsConfig {
    $dashboardsConfig = @"
# Configuração de dashboards para o Kibana
[
  {
    "id": "acucaradas-security-overview",
    "title": "Açucaradas - Visão Geral de Segurança",
    "panels": [
      {
        "title": "Eventos por Severidade",
        "type": "pie",
        "source": "wazuh-alerts-*",
        "field": "rule.level"
      },
      {
        "title": "Top 10 Alertas",
        "type": "bar",
        "source": "wazuh-alerts-*",
        "field": "rule.description"
      },
      {
        "title": "Atividade por Hora",
        "type": "line",
        "source": "wazuh-alerts-*",
        "field": "@timestamp"
      },
      {
        "title": "Eventos por Origem",
        "type": "pie",
        "source": "wazuh-alerts-*",
        "field": "agent.name"
      }
    ]
  },
  {
    "id": "acucaradas-web-security",
    "title": "Açucaradas - Segurança Web",
    "panels": [
      {
        "title": "Requisições por Código de Status",
        "type": "pie",
        "source": "filebeat-*",
        "field": "http.response.status_code"
      },
      {
        "title": "Top 10 IPs por Requisição",
        "type": "bar",
        "source": "filebeat-*",
        "field": "source.ip"
      },
      {
        "title": "Requisições por Método HTTP",
        "type": "pie",
        "source": "filebeat-*",
        "field": "http.request.method"
      },
      {
        "title": "Top 10 URLs Acessadas",
        "type": "bar",
        "source": "filebeat-*",
        "field": "url.original"
      }
    ]
  },
  {
    "id": "acucaradas-authentication",
    "title": "Açucaradas - Autenticação e Acesso",
    "panels": [
      {
        "title": "Eventos de Login por Resultado",
        "type": "pie",
        "source": "wazuh-alerts-*",
        "field": "data.win.eventdata.status"
      },
      {
        "title": "Top 10 Usuários com Falhas de Login",
        "type": "bar",
        "source": "wazuh-alerts-*",
        "field": "data.win.eventdata.targetUserName"
      },
      {
        "title": "Eventos de Login por Hora",
        "type": "line",
        "source": "wazuh-alerts-*",
        "field": "@timestamp"
      },
      {
        "title": "Eventos de Elevação de Privilégios",
        "type": "bar",
        "source": "wazuh-alerts-*",
        "field": "rule.description"
      }
    ]
  }
]
"@
    
    $dashboardsConfig | Set-Content -Path "$configDir\dashboards.json"
    Write-Log "Configuração de dashboards criada" "INFO"
}

function Create-AlertsConfig {
    $alertsConfig = @"
# Configuração de alertas para o Wazuh e Elasticsearch
[
  {
    "name": "Tentativa de Força Bruta",
    "description": "Alerta quando múltiplas tentativas de login falham para o mesmo usuário",
    "type": "wazuh",
    "rule_id": "100001",
    "level": "high",
    "actions": ["email", "slack"]
  },
  {
    "name": "Acesso Administrativo Fora do Horário",
    "description": "Alerta quando ocorre login administrativo fora do horário comercial",
    "type": "wazuh",
    "rule_id": "100002",
    "level": "medium",
    "actions": ["email"]
  },
  {
    "name": "Acesso a Arquivo Sensível",
    "description": "Alerta quando há acesso a arquivos potencialmente sensíveis",
    "type": "wazuh",
    "rule_id": "100003",
    "level": "high",
    "actions": ["email", "slack"]
  },
  {
    "name": "Instalação de Software Não Autorizado",
    "description": "Alerta quando software não autorizado é instalado",
    "type": "wazuh",
    "rule_id": "100004",
    "level": "medium",
    "actions": ["email"]
  },
  {
    "name": "Ataque de Injeção SQL",
    "description": "Alerta quando um possível ataque de injeção SQL é detectado",
    "type": "wazuh",
    "rule_id": "100005",
    "level": "critical",
    "actions": ["email", "slack", "webhook"]
  },
  {
    "name": "Ataque XSS",
    "description": "Alerta quando um possível ataque XSS é detectado",
    "type": "wazuh",
    "rule_id": "100006",
    "level": "critical",
    "actions": ["email", "slack", "webhook"]
  },
  {
    "name": "Acesso a Arquivo de Backup",
    "description": "Alerta quando há tentativa de acesso a possíveis arquivos de backup",
    "type": "wazuh",
    "rule_id": "100007",
    "level": "high",
    "actions": ["email", "slack"]
  },
  {
    "name": "Tentativa de Path Traversal",
    "description": "Alerta quando uma tentativa de path traversal é detectada",
    "type": "wazuh",
    "rule_id": "100008",
    "level": "critical",
    "actions": ["email", "slack", "webhook"]
  },
  {
    "name": "Tráfego Web Anômalo",
    "description": "Alerta quando há um aumento significativo no tráfego web",
    "type": "elasticsearch",
    "index": "filebeat-*",
    "threshold": {
      "field": "http.response.status_code",
      "value": 100,
      "timeframe": "5m"
    },
    "level": "medium",
    "actions": ["email"]
  },
  {
    "name": "Alto Número de Erros 4xx/5xx",
    "description": "Alerta quando há um número elevado de erros HTTP 4xx ou 5xx",
    "type": "elasticsearch",
    "index": "filebeat-*",
    "query": "http.response.status_code:[400 TO 599]",
    "threshold": {
      "value": 20,
      "timeframe": "5m"
    },
    "level": "high",
    "actions": ["email", "slack"]
  }
]
"@
    
    $alertsConfig | Set-Content -Path "$configDir\alerts.json"
    Write-Log "Configuração de alertas criada" "INFO"
}

function Create-StartScript {
    $startScript = @"
# Script para iniciar o ambiente de homologação do SIEM
# Açucaradas Encomendas

# Configurações
`$logFile = "`$PSScriptRoot\siem-homologacao-start.log"
`$configDir = "`$PSScriptRoot\config"
`$dataDir = "`$PSScriptRoot\data"
`$logsDir = "`$PSScriptRoot\logs"

# Funções de Utilidade
function Write-Log {
    param (
        [string]`$Message,
        [string]`$Level = "INFO"
    )
    
    `$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    `$logMessage = "[`$timestamp] [`$Level] `$Message"
    Add-Content -Path `$logFile -Value `$logMessage
    Write-Host `$logMessage
}

# Verificar se o Docker está instalado
if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Log "Docker não está instalado. Por favor, instale o Docker antes de prosseguir." "ERROR"
    Write-Host "Docker não está instalado. Por favor, instale o Docker antes de prosseguir." -ForegroundColor Red
    exit 1
}

# Iniciar o Elasticsearch
Write-Host "Iniciando o Elasticsearch..." -ForegroundColor Cyan
Write-Log "Iniciando o Elasticsearch" "INFO"
docker run -d --name elasticsearch-homolog \
    -p 9200:9200 -p 9300:9300 \
    -e "discovery.type=single-node" \
    -e "xpack.security.enabled=true" \
    -e "ELASTIC_PASSWORD=changeme" \
    -v "`$configDir\elasticsearch.yml:/usr/share/elasticsearch/config/elasticsearch.yml" \
    -v "`$dataDir\elasticsearch:/usr/share/elasticsearch/data" \
    -v "`$logsDir\elasticsearch:/usr/share/elasticsearch/logs" \
    docker.elastic.co/elasticsearch/elasticsearch:7.14.0

# Aguardar o Elasticsearch iniciar
Write-Host "Aguardando o Elasticsearch iniciar..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Iniciar o Logstash
Write-Host "Iniciando o Logstash..." -ForegroundColor Cyan
Write-Log "Iniciando o Logstash" "INFO"
docker run -d --name logstash-homolog \
    -p 5044:5044 -p 5000:5000/tcp -p 5000:5000/udp \
    -v "`$configDir\logstash.yml:/usr/share/logstash/config/logstash.yml" \
    -v "`$configDir\logstash-pipeline.conf:/usr/share/logstash/pipeline/logstash.conf" \
    -v "`$dataDir\logstash:/usr/share/logstash/data" \
    -v "`$logsDir\logstash:/usr/share/logstash/logs" \
    --link elasticsearch-homolog:elasticsearch \
    docker.elastic.co/logstash/logstash:7.14.0

# Iniciar o Kibana
Write-Host "Iniciando o Kibana..." -ForegroundColor Cyan
Write-Log "Iniciando o Kibana" "INFO"
docker run -d --name kibana-homolog \
    -p 5601:5601 \
    -v "`$configDir\kibana.yml:/usr/share/kibana/config/kibana.yml" \
    --link elasticsearch-homolog:elasticsearch \
    docker.elastic.co/kibana/kibana:7.14.0

# Iniciar o Wazuh Manager
Write-Host "Iniciando o Wazuh Manager..." -ForegroundColor Cyan
Write-Log "Iniciando o Wazuh Manager" "INFO"
docker run -d --name wazuh-manager-homolog \
    -p 1514:1514 -p 1515:1515 -p 55000:55000 \
    -v "`$configDir\ossec.conf:/var/ossec/etc/ossec.conf" \
    -v "`$configDir\custom_rules.xml:/var/ossec/etc/rules/custom_rules.xml" \
    -v "`$dataDir\wazuh:/var/ossec/data" \
    -v "`$logsDir\wazuh:/var/ossec/logs" \
    wazuh/wazuh-manager:4.2.5

# Iniciar o Filebeat
Write-Host "Iniciando o Filebeat..." -ForegroundColor Cyan
Write-Log "Iniciando o Filebeat" "INFO"
docker run -d --name filebeat-homolog \
    -v "`$configDir\filebeat.yml:/usr/share/filebeat/filebeat.yml:ro" \
    -v "/var/run/docker.sock:/var/run/docker.sock:ro" \
    -v "/var/lib/docker/containers:/var/lib/docker/containers:ro" \
    -v "`$logsDir\filebeat:/usr/share/filebeat/logs" \
    --link elasticsearch-homolog:elasticsearch \
    --link logstash-homolog:logstash \
    docker.elastic.co/beats/filebeat:7.14.0

Write-Host ""
Write-Host "Ambiente de homologação do SIEM iniciado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Elasticsearch: http://localhost:9200" -ForegroundColor Yellow
Write-Host "Kibana: http://localhost:5601" -ForegroundColor Yellow
Write-Host "Wazuh API: https://localhost:55000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Credenciais padrão:" -ForegroundColor Yellow
Write-Host "Elasticsearch: elastic / changeme" -ForegroundColor Yellow
Write-Host "Wazuh API: wazuh / wazuh" -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANTE: Este é um ambiente de homologação. Não use estas credenciais em produção." -ForegroundColor Red
Write-Host "Para parar o ambiente, execute: docker stop elasticsearch-homolog logstash-homolog kibana-homolog wazuh-manager-homolog filebeat-homolog" -ForegroundColor Cyan

Write-Log "Ambiente de homologação do SIEM iniciado com sucesso" "INFO"
"@
    
    $startScript | Set-Content -Path "$homologacaoDir\start-siem-homologacao.ps1"
    Write-Log "Script de inicialização criado" "INFO"
}

function Create-ReadmeFile {
    $readmeContent = @"
# Ambiente de Homologação do SIEM - Açucaradas Encomendas

## Visão Geral

Este diretório contém a configuração e os scripts necessários para executar um ambiente de homologação do SIEM (Security Information and Event Management) para a Açucaradas Encomendas. O ambiente inclui os seguintes componentes:

- Elasticsearch: Armazenamento e indexação de dados
- Logstash: Processamento e normalização de logs
- Kibana: Visualização e análise de dados
- Wazuh Manager: Monitoramento de segurança e detecção de ameaças
- Filebeat: Coleta de logs

## Pré-requisitos

- Docker Desktop instalado e em execução
- PowerShell 5.1 ou superior
- Pelo menos 8GB de RAM disponível
- Pelo menos 20GB de espaço em disco disponível

## Estrutura de Diretórios

- `config/`: Arquivos de configuração para os componentes do SIEM
- `data/`: Diretório para armazenamento de dados persistentes
- `logs/`: Diretório para armazenamento de logs

## Instalação e Uso

1. Certifique-se de que o Docker Desktop está instalado e em execução
2. Abra o PowerShell como administrador
3. Navegue até este diretório
4. Execute o script de inicialização:

```powershell
.\start-siem-homologacao.ps1
```

5. Aguarde até que todos os serviços sejam iniciados (pode levar alguns minutos)
6. Acesse o Kibana em http://localhost:5601

## Credenciais Padrão

- Elasticsearch: `elastic` / `changeme`
- Kibana: `elastic` / `changeme`
- Wazuh API: `wazuh` / `wazuh`

**IMPORTANTE**: Estas são credenciais padrão para o ambiente de homologação. Em um ambiente de produção, você deve alterar todas as senhas para valores seguros.

## Configuração Personalizada

Os arquivos de configuração estão localizados no diretório `config/`. Você pode modificá-los conforme necessário para atender aos requisitos específicos do seu ambiente.

## Dashboards e Visualizações

O arquivo `config/dashboards.json` contém a configuração para os dashboards pré-configurados. Após iniciar o ambiente, você pode importar esses dashboards no Kibana.

## Alertas

O arquivo `config/alerts.json` contém a configuração para os alertas pré-configurados. Estes alertas podem ser configurados no Wazuh e no Elasticsearch.

## Regras Personalizadas

O arquivo `config/custom_rules.xml` contém regras personalizadas para o Wazuh Manager, específicas para o ambiente da Açucaradas Encomendas.

## Parando o Ambiente

Para parar todos os serviços, execute o seguinte comando:

```powershell
docker stop elasticsearch-homolog logstash-homolog kibana-homolog wazuh-manager-homolog filebeat-homolog
```

Para remover os contêineres (isso não afetará os dados persistentes):

```powershell
docker rm elasticsearch-homolog logstash-homolog kibana-homolog wazuh-manager-homolog filebeat-homolog
```

## Migração para Produção

Após validar o ambiente de homologação, você pode migrar para o ambiente de produção seguindo estas etapas:

1. Revise e ajuste todas as configurações com base na experiência em homologação
2. Altere todas as senhas padrão para valores seguros
3. Configure backups regulares para os dados do Elasticsearch
4. Implemente alta disponibilidade para componentes críticos
5. Configure integrações adicionais conforme necessário
6. Implemente monitoramento do próprio SIEM

## Suporte

Para obter suporte ou relatar problemas, entre em contato com a equipe de segurança da informação.
"@
    
    $readmeContent | Set-Content -Path "$homologacaoDir\README.md"
    Write-Log "Arquivo README criado" "INFO"
}

function Show-Menu {
    Clear-Host
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host "      IMPLEMENTAÇÃO DO SIEM EM HOMOLOGAÇÃO - AÇUCARADAS ENCOMENDAS" -ForegroundColor Cyan
    Write-Host "=================================================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Menu Principal:" -ForegroundColor Yellow
    Write-Host "1. Inicializar ambiente"
    Write-Host "2. Criar configurações do Elasticsearch"
    Write-Host "3. Criar configurações do Logstash"
    Write-Host "4. Criar configurações do Kibana"
    Write-Host "5. Criar configurações do Filebeat"
    Write-Host "6. Criar configurações do Wazuh"
    Write-Host "7. Criar regras personalizadas"
    Write-Host "8. Criar configurações de dashboards"
    Write-Host "9. Criar configurações de alertas"
    Write-Host "10. Criar script de inicialização"
    Write-Host "11. Criar arquivo README"
    Write-Host "12. Criar todas as configurações"
    Write-Host "0. Sair"
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Cyan
    
    $choice = Read-Host "Digite sua opção"
    return $choice
}

# Inicialização
Write-Host "Inicializando implementação do SIEM em ambiente de homologação..." -ForegroundColor Cyan
$initialized = Initialize-Environment

if (-not $initialized) {
    Write-Host "Falha na inicialização do ambiente. Verifique os erros acima." -ForegroundColor Red
    exit 1
}

# Menu principal
$exit = $false
while (-not $exit) {
    $choice = Show-Menu
    
    switch ($choice) {
        "0" { $exit = $true }
        "1" { 
            if (Initialize-Environment) {
                Write-Host "Ambiente inicializado com sucesso!" -ForegroundColor Green
            } else {
                Write-Host "Falha na inicialização do ambiente." -ForegroundColor Red
            }
            Read-Host "Pressione Enter para continuar"
        }
        "2" { 
            Create-ElasticsearchConfig
            Write-Host "Configurações do Elasticsearch criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "3" { 
            Create-LogstashConfig
            Write-Host "Configurações do Logstash criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "4" { 
            Create-KibanaConfig
            Write-Host "Configurações do Kibana criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "5" { 
            Create-FilebeatConfig
            Write-Host "Configurações do Filebeat criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "6" { 
            Create-WazuhConfig
            Write-Host "Configurações do Wazuh criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "7" { 
            Create-CustomRules
            Write-Host "Regras personalizadas criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "8" { 
            Create-DashboardsConfig
            Write-Host "Configurações de dashboards criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "9" { 
            Create-AlertsConfig
            Write-Host "Configurações de alertas criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "10" { 
            Create-StartScript
            Write-Host "Script de inicialização criado com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "11" { 
            Create-ReadmeFile
            Write-Host "Arquivo README criado com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        "12" { 
            Create-ElasticsearchConfig
            Create-LogstashConfig
            Create-KibanaConfig
            Create-FilebeatConfig
            Create-WazuhConfig
            Create-CustomRules
            Create-DashboardsConfig
            Create-AlertsConfig
            Create-StartScript
            Create-ReadmeFile
            Write-Host "Todas as configurações criadas com sucesso!" -ForegroundColor Green
            Read-Host "Pressione Enter para continuar"
        }
        default { Write-Host "Opção inválida!" -ForegroundColor Red; Read-Host "Pressione Enter para continuar" }
    }
}

Write-Host "Programa finalizado." -ForegroundColor Cyan