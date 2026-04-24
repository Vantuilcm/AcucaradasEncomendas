# Guia para Preenchimento da Ficha de Segurança de Dados na Google Play Store

## Introdução

A Ficha de Segurança de Dados (Data Safety Section) é um requisito obrigatório para todos os aplicativos na Google Play Store. Esta seção informa aos usuários quais dados o aplicativo coleta e como esses dados são usados, ajudando os usuários a tomarem decisões informadas sobre a instalação do aplicativo.

Este documento fornece orientações detalhadas para o preenchimento correto da Ficha de Segurança de Dados para o aplicativo Acucaradas Encomendas, garantindo conformidade com as políticas da Google Play e transparência com os usuários.

## Acesso à Ficha de Segurança de Dados

1. Faça login no [Google Play Console](https://play.google.com/console/)
2. Selecione o aplicativo Acucaradas Encomendas
3. No menu lateral, acesse **Política > Segurança de dados**
4. Clique em **Iniciar** ou **Editar** para começar a preencher ou atualizar as informações

## Visão Geral das Categorias de Dados

A Google Play organiza os dados em categorias específicas. Para o Acucaradas Encomendas, as categorias relevantes são:

### Dados Coletados e Compartilhados

#### 1. Informações Pessoais

- **Nome**: Coletado para identificação de usuários e clientes
- **E-mail**: Coletado para autenticação e comunicação
- **Número de telefone**: Coletado para contato com clientes
- **Endereço**: Coletado para entrega de pedidos

#### 2. Informações Financeiras

- **Registros de compras**: Coletados para histórico de pedidos
- **Informações de pagamento**: Registros de pagamentos recebidos (sem armazenar dados completos de cartões)

#### 3. Localização

- **Localização aproximada**: Baseada na rede, não GPS preciso (opcional)

#### 4. Informações do Aplicativo e Desempenho

- **Dados de uso do aplicativo**: Como o usuário interage com o aplicativo
- **Diagnóstico**: Logs de falhas e desempenho

## Preenchimento Passo a Passo

### Etapa 1: Coleta de Dados

Para cada categoria de dados, você precisará responder:

1. **O aplicativo coleta ou compartilha este tipo de dado?**
   - Selecione **Sim** ou **Não**

2. **Este dado é processado de forma opcional?**
   - **Opcional**: O usuário pode escolher se fornece ou não
   - **Obrigatório**: Necessário para o funcionamento do aplicativo

3. **Qual é a finalidade da coleta?**
   - Funcionalidade do aplicativo
   - Análise
   - Personalização
   - Publicidade
   - Prevenção de fraudes

4. **Os dados são criptografados em trânsito?**
   - Selecione **Sim** (o Acucaradas Encomendas usa HTTPS/SSL)

5. **Os usuários podem solicitar a exclusão dos dados?**
   - Selecione **Sim** e forneça o método (ex: função no aplicativo ou e-mail de contato)

### Etapa 2: Compartilhamento de Dados

Para cada categoria de dados, indique:

1. **Os dados são compartilhados com terceiros?**
   - Selecione **Sim** ou **Não**

2. **Com quem os dados são compartilhados?**
   - Processadores de dados (serviços de nuvem, análise)
   - Provedores de serviços de pagamento
   - Outros parceiros (especificar)

3. **Qual é a finalidade do compartilhamento?**
   - Selecione as finalidades aplicáveis

### Etapa 3: Práticas de Segurança

Indique as práticas de segurança implementadas:

1. **Dados podem ser excluídos?**
   - Selecione **Sim** e explique como (ex: função no aplicativo, solicitação por e-mail)

2. **O aplicativo segue as Práticas de Segurança de Famílias?**
   - Para o Acucaradas Encomendas, selecione **Não** (não é direcionado a crianças)

## Recomendações de Preenchimento para o Acucaradas Encomendas

Com base nas funcionalidades do aplicativo, recomendamos as seguintes respostas:

### 1. Informações Pessoais

#### Nome
- **Coleta**: Sim
- **Opcional**: Não (obrigatório para identificação)
- **Finalidade**: Funcionalidade do aplicativo
- **Compartilhamento**: Não
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

#### E-mail
- **Coleta**: Sim
- **Opcional**: Não (obrigatório para autenticação)
- **Finalidade**: Funcionalidade do aplicativo
- **Compartilhamento**: Não
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

#### Número de telefone
- **Coleta**: Sim
- **Opcional**: Não (obrigatório para contato)
- **Finalidade**: Funcionalidade do aplicativo
- **Compartilhamento**: Não
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

#### Endereço
- **Coleta**: Sim
- **Opcional**: Não (obrigatório para entregas)
- **Finalidade**: Funcionalidade do aplicativo
- **Compartilhamento**: Não
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

### 2. Informações Financeiras

#### Registros de compras
- **Coleta**: Sim
- **Opcional**: Não (parte essencial do aplicativo)
- **Finalidade**: Funcionalidade do aplicativo
- **Compartilhamento**: Não
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

#### Informações de pagamento
- **Coleta**: Sim
- **Opcional**: Não (necessário para registro de pagamentos)
- **Finalidade**: Funcionalidade do aplicativo
- **Compartilhamento**: Não (ou Sim, se usar processador de pagamento externo)
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

### 3. Localização

#### Localização aproximada
- **Coleta**: Sim
- **Opcional**: Sim (o usuário pode desativar)
- **Finalidade**: Funcionalidade do aplicativo (otimização regional)
- **Compartilhamento**: Não
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

### 4. Informações do Aplicativo e Desempenho

#### Dados de uso do aplicativo
- **Coleta**: Sim
- **Opcional**: Sim (o usuário pode desativar nas configurações)
- **Finalidade**: Análise e melhoria do aplicativo
- **Compartilhamento**: Sim (com serviços de análise como Firebase Analytics)
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

#### Diagnóstico
- **Coleta**: Sim
- **Opcional**: Sim (o usuário pode desativar nas configurações)
- **Finalidade**: Análise e melhoria do aplicativo
- **Compartilhamento**: Sim (com serviços como Firebase Crashlytics)
- **Criptografia em trânsito**: Sim
- **Exclusão possível**: Sim (via função no aplicativo)

## Justificativas para Revisão da Google

Ao preencher a Ficha de Segurança de Dados, é importante fornecer justificativas claras para a coleta de cada tipo de dado. Estas justificativas ajudam a equipe de revisão da Google a entender por que o aplicativo precisa desses dados.

### Exemplos de Justificativas

#### Para Dados Pessoais

> "O nome e informações de contato são necessários para identificar usuários e seus clientes, permitindo o gerenciamento eficiente de pedidos de confeitaria. Estas informações são essenciais para a funcionalidade principal do aplicativo, que é gerenciar pedidos de doces e bolos."

#### Para Informações Financeiras

> "Os registros de pagamentos são necessários para rastrear o status financeiro dos pedidos. O aplicativo não armazena dados completos de cartões de crédito, apenas registros de transações concluídas para fins de histórico e contabilidade."

#### Para Localização

> "A localização aproximada (baseada na rede, não GPS preciso) é usada apenas para otimizar funcionalidades regionais, como cálculo de distância para entregas. Esta funcionalidade é opcional e pode ser desativada pelo usuário."

#### Para Dados de Uso e Diagnóstico

> "Os dados de uso e diagnóstico são coletados para melhorar a experiência do usuário e identificar problemas técnicos. Estes dados são anônimos e usados apenas para análise de desempenho e correção de bugs."

## Verificação e Envio

Antes de enviar a Ficha de Segurança de Dados:

1. **Revise todas as informações** para garantir precisão e completude
2. **Compare com a Política de Privacidade** para garantir consistência
3. **Verifique se todas as justificativas são claras e específicas**
4. **Confirme que todas as práticas declaradas são realmente implementadas no aplicativo**

Após a verificação, clique em **Salvar** e depois em **Enviar** para submeter a Ficha de Segurança de Dados para revisão da Google.

## Atualizações Futuras

A Ficha de Segurança de Dados deve ser atualizada sempre que houver mudanças nas práticas de coleta ou processamento de dados do aplicativo. Isso inclui:

- Adição de novas funcionalidades que coletam dados adicionais
- Mudanças nos terceiros com quem os dados são compartilhados
- Alterações nas finalidades da coleta de dados
- Implementação de novas medidas de segurança

## Conclusão

O preenchimento correto e transparente da Ficha de Segurança de Dados é essencial para a aprovação do aplicativo na Google Play Store e para construir confiança com os usuários. Seguindo as orientações deste documento, o Acucaradas Encomendas estará em conformidade com as políticas da Google Play e demonstrará compromisso com a privacidade e segurança dos dados dos usuários.