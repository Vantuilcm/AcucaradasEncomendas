# Medidas de Segurança Implementadas - Açucaradas Encomendas

Este documento descreve as medidas de segurança implementadas no aplicativo Açucaradas Encomendas para garantir a proteção dos dados dos usuários e prevenir acessos não autorizados.

## 1. Autenticação e Autorização

### 1.1 Controle de Acesso com JWT

- Implementação de JSON Web Tokens (JWT) para autenticação stateless
- Tokens com tempo de expiração configurável (padrão: 24 horas)
- Validação de tokens tanto no cliente quanto no servidor
- Payload do token contém informações mínimas necessárias (ID do usuário, email)
- Tokens armazenados de forma segura utilizando SecureStore/AsyncStorage criptografado

### 1.2 Proteção contra Tentativas de Login Inválidas

- Bloqueio temporário após 5 tentativas de login mal-sucedidas
- Período de bloqueio de 15 minutos com contagem regressiva
- Registro de tentativas de login suspeitas no log de segurança
- Alertas para o usuário informando o bloqueio temporário

### 1.3 Registro de Dispositivos Confiáveis

- Identificação única de dispositivos para detecção de novos acessos
- Lista de até 5 dispositivos confiáveis por usuário
- Interface para gerenciamento de dispositivos autorizados
- Notificação ao usuário quando um novo dispositivo é registrado

### 1.4 Validação de Sessão

- Verificação da validade do token a cada inicialização do aplicativo
- Timeout por inatividade (sessão encerrada após 30 minutos sem atividade)
- Monitoramento de atividade do usuário para resetar o timer de inatividade
- Logout automático quando o token expira

## 2. Segurança de Dados

### 2.1 Armazenamento Seguro

- Uso de Expo SecureStore para armazenamento de dados sensíveis em dispositivos móveis
- Fallback seguro para localStorage com criptografia em ambiente web
- Chaves de API e tokens nunca armazenados em texto plano
- Remoção de dados sensíveis ao fazer logout do aplicativo

### 2.2 Criptografia

- Senhas armazenadas com hash seguro utilizando bcrypt
- Salt único para cada senha para prevenir ataques de rainbow table
- Criptografia de dados sensíveis durante o trânsito (HTTPS/TLS)
- Implementação de assinaturas digitais para verificação de integridade

### 2.3 Sanitização de Inputs

- Sanitização de todas as entradas de usuário para prevenir XSS e injeção
- Validação rigorosa de formato de e-mail, telefone, CPF/CNPJ e CEP
- Escape de caracteres especiais em dados exibidos na interface
- Validação de tipos de arquivos para uploads

## 3. Proteção de Rotas no Firestore

### 3.1 Regras de Segurança Granulares

- Perfil do usuário: acesso restrito ao próprio usuário e administradores
- Produtos e categorias: leitura pública, escrita apenas por administradores
- Pedidos: usuários podem ver apenas seus próprios pedidos, admins veem todos
- Configurações: leitura pública, escrita apenas por administradores

### 3.2 Validação de Dados

- Validação de estrutura de dados antes de salvar no Firestore
- Verificação de propriedade de documentos antes de permitir operações
- Funções auxiliares para verificar permissões de administrador
- Regras diferentes para ambientes de desenvolvimento e produção

## 4. Políticas de Senha

### 4.1 Requisitos de Senha Forte

- Mínimo de 8 caracteres
- Obrigatoriedade de letras maiúsculas e minúsculas
- Obrigatoriedade de números e caracteres especiais
- Verificação de senhas comuns ou de fácil adivinhação
- Feedback visual sobre a força da senha durante o cadastro

### 4.2 Recuperação de Senha

- Processo seguro de recuperação via e-mail com token de uso único
- Expiração de tokens de recuperação após 1 hora
- Verificação de validação em duas etapas para redefinição
- Limitação de frequência de solicitações de recuperação

## 5. Logging e Monitoramento

### 5.1 Logging de Segurança

- Registro de todas as operações sensíveis (login, alteração de dados, etc.)
- Logs estruturados com contexto de usuário, dispositivo e timestamp
- Níveis de log apropriados para diferentes tipos de eventos
- Retenção adequada de logs para auditoria

### 5.2 Detecção de Atividades Suspeitas

- Monitoramento de padrões de acesso incomuns
- Detecção de tentativas de acesso de novos dispositivos ou localizações
- Alertas para administradores sobre atividades potencialmente maliciosas
- Sistema para bloquear contas temporariamente em caso de suspeita

## 6. Segurança no Aplicativo Móvel

### 6.1 Proteção de Dados Locais

- Limpeza de dados sensíveis da memória após o uso
- Restrição de capturas de tela em telas com informações sensíveis
- Prevenção contra "app overlay attacks" em Android
- Verificação de integridade do aplicativo

### 6.2 Comunicação Segura

- Certificados SSL pinning para prevenir ataques man-in-the-middle
- Verificação de integridade de respostas da API
- Timeout configurável para requisições HTTP
- Retry com backoff exponencial para falhas de rede

## 7. Considerações para Lojas de Aplicativos

### 7.1 Publicação Segura

- Diferentes configurações de segurança para ambientes de desenvolvimento e produção
- Substituição de arquivos de configuração do Firebase antes da publicação
- Verificação de integridade do pacote antes do envio para as lojas
- Processo de aprovação interna antes da submissão para as lojas

### 7.2 Atualizações

- Plano de resposta para vulnerabilidades descobertas
- Processo de atualização rápida para correções de segurança críticas
- Canal de comunicação com usuários para alertas de segurança
- Política de EOL (End-of-Life) para versões antigas do aplicativo

## 8. Conformidade e Privacidade

### 8.1 LGPD (Lei Geral de Proteção de Dados)

- Política de privacidade clara e acessível
- Consentimento explícito para coleta e uso de dados
- Funcionalidade para usuários solicitarem cópia ou exclusão de seus dados
- Tempo de retenção de dados adequado conforme finalidade

### 8.2 Segurança de Pagamentos

- Integração segura com gateway de pagamento (Stripe)
- Não armazenamento de dados de cartão de crédito
- Tokenização de informações de pagamento
- Conformidade com padrões PCI DSS para processamento de pagamentos

---

Este documento deve ser revisado e atualizado regularmente para garantir que todas as medidas de segurança estejam atualizadas conforme as melhores práticas do mercado e novas ameaças identificadas.
