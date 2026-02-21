# Instruções para Criação de Contas nas Lojas de Aplicativos

Este documento fornece orientações detalhadas para a criação e configuração de contas de desenvolvedor no Google Play Store e Apple App Store para o aplicativo Açucaradas Encomendas.

## 1. Google Play Console

### 1.1 Criar Conta

1. Acesse [Google Play Console]
2. Faça login com uma conta Google (recomendamos criar uma conta específica para a empresa)
3. Aceite o Contrato de Distribuição para Desenvolvedores do Google Play
4. Pague a taxa de registro única de US$ 25 (aproximadamente R$ 140,00)
   - É necessário um cartão de crédito internacional
   - Você receberá um recibo por email após a confirmação do pagamento

### 1.2 Verificação da Conta

1. A verificação pode levar até 48 horas
2. Você receberá um email de confirmação quando a conta estiver ativa
3. Após a verificação, acesse a [Google Play Console](https://play.google.com/console)

### 1.3 Configuração da Conta

1. **Informações da Empresa**:

   - Nome da empresa: Açucaradas Encomendas
   - Endereço de contato: [Inserir endereço completo da empresa]
   - Website: [Inserir URL do site]
   - Email de contato: contato@acucaradas.com.br
   - Telefone: [Inserir telefone com DDD]

2. **Configurações Fiscais**:

   - Preencha o formulário de informações fiscais
   - Forneça o CNPJ da empresa
   - Selecione a classificação fiscal correta para aplicativos de serviço
   - Configure a retenção de impostos conforme a legislação brasileira

3. **Configurações de Pagamento**:
   - Adicione uma conta bancária para receber pagamentos
   - Opção de pagamento: Transferência bancária (Wire Transfer)
   - Frequência de pagamento: Mensal (quando o saldo for maior que US$ 100)

### 1.4 Preparação para Publicação

1. **Criar Aplicativo**:

   - Clique em "Criar aplicativo"
   - Idioma padrão: Português (Brasil)
   - Nome do aplicativo: Açucaradas Encomendas
   - Tipo de aplicativo: Aplicativo
   - Declaração: Confirme que o aplicativo atende às diretrizes do Google Play

2. **Informações Necessárias**:
   - Prepare todos os textos de marketing (já criados em `store_assets/textos_marketing.md`)
   - Prepare os assets gráficos (conforme especificado em `store_assets/assets_reference.md`)
   - Links para a Política de Privacidade e Termos de Uso (precisam estar hospedados online)
   - Classificação de conteúdo (preencher questionário)
   - Informações de contato para suporte

## 2. Apple Developer Program

### 2.1 Criar Conta de Desenvolvedor

1. Acesse [Apple Developer](https://developer.apple.com/programs/enroll/)
2. Clique em "Start Your Enrollment"
3. Faça login com um Apple ID (recomendamos criar um Apple ID específico para a empresa)
   - Caso não tenha um Apple ID, crie em [appleid.apple.com](https://appleid.apple.com)
4. Selecione "Company/Organization" como tipo de entidade
5. Preencha as informações da empresa e seus dados pessoais como contato
6. Ative a verificação em duas etapas para o Apple ID

### 2.2 Verificação da Empresa

1. A Apple verificará a autenticidade da empresa através do D-U-N-S Number
   - Se você não tiver o D-U-N-S Number, a Apple ajudará você a obter gratuitamente
   - Este processo pode levar de 1 a 2 semanas
2. A Apple entrará em contato com o representante legal da empresa para confirmar o registro
3. Prepare documentos como:
   - Comprovante de registro da empresa (CNPJ)
   - Documento que comprove sua autoridade para vincular a empresa juridicamente
   - Documento de identidade pessoal

### 2.3 Inscrição no Developer Program

1. Após a verificação da empresa, você receberá um email para continuar o processo
2. Faça login no [Apple Developer Program](https://developer.apple.com/programs/)
3. Aceite o contrato de licença do Apple Developer Program
4. Pague a taxa anual de US$ 99 (aproximadamente R$ 550,00)
   - É necessário um cartão de crédito internacional
   - Esta é uma assinatura anual que deve ser renovada

### 2.4 Configuração da Conta

1. **App Store Connect**:

   - Acesse [App Store Connect](https://appstoreconnect.apple.com/)
   - Configure usuários e funções para sua equipe
   - Atribua funções adequadas (Admin, Marketing, Desenvolvedor, etc.)

2. **Certificados e Identificadores**:

   - Gere um certificado de distribuição (para assinatura do aplicativo)
   - Crie um App ID para o Açucaradas Encomendas
   - Configure as capacidades necessárias (Push Notifications, In-App Purchase, etc.)

3. **Configurações Fiscais e Bancárias**:
   - Acesse "Agreements, Tax, and Banking" no App Store Connect
   - Complete os contratos necessários
   - Configure as informações fiscais (W-8BEN ou W-8BEN-E para empresas fora dos EUA)
   - Adicione uma conta bancária para receber pagamentos

### 2.5 Preparação para Publicação

1. **Criar Novo Aplicativo**:

   - Em App Store Connect, vá para "Meus Apps"
   - Clique no botão "+" e selecione "Novo Aplicativo"
   - Plataforma: iOS
   - Nome: Açucaradas Encomendas
   - Idioma principal: Português (Brasil)
   - Bundle ID: selecione o ID criado anteriormente
   - SKU: número único para identificação interna (ex: ACUCARADAS001)

2. **Informações Necessárias**:
   - Prepare todos os textos de marketing (já criados em `store_assets/textos_marketing.md`)
   - Prepare os assets gráficos (conforme especificado em `store_assets/assets_reference.md`)
   - Links para a Política de Privacidade e Termos de Uso (precisam estar hospedados online)
   - Classificação de conteúdo (preencher questionário na seção "Classificação do App")
   - Informações de contato para suporte e marketing

## 3. Requisitos Comuns para Ambas as Lojas

### 3.1 Website da Empresa

É extremamente recomendável ter um website da empresa com:

- Sobre nós (história e informações da empresa)
- Página do aplicativo com capturas de tela e recursos
- Política de Privacidade hospedada com URL acessível
- Termos de Uso hospedados com URL acessível
- Formulário ou email de contato

### 3.2 Email Corporativo

Use um email corporativo (ex: contato@acucaradas.com.br) em vez de um email pessoal ou genérico.

### 3.3 Documentação Legal

Os arquivos `politica_privacidade.md` e `termos_uso.md` precisam ser convertidos em HTML e hospedados online em um endereço web acessível. Opções para hospedagem:

- Website da empresa
- GitHub Pages
- Serviços como Notion, Google Sites ou similar

### 3.4 Informações Fiscais

Tenha em mãos:

- CNPJ da empresa
- Documentação fiscal atualizada
- Dados bancários completos para recebimento

## 4. Estimativa de Custos

| Item                    | Custo Aproximado | Periodicidade |
| ----------------------- | ---------------- | ------------- |
| Google Play Console     | US$ 25 (R$ 140)  | Taxa única    |
| Apple Developer Program | US$ 99 (R$ 550)  | Anual         |
| Domínio para website    | R$ 40            | Anual         |
| Hospedagem básica       | R$ 15-30         | Mensal        |
| **Total inicial**       | **~R$ 800**      | -             |

## 5. Tempo Estimado para Conclusão

| Etapa                                    | Tempo Estimado  |
| ---------------------------------------- | --------------- |
| Criação da conta Google Play             | 2-3 dias        |
| Verificação da empresa na Apple          | 1-2 semanas     |
| Inscrição no Apple Developer Program     | 1-2 dias        |
| Configuração completa de ambas as contas | 3-5 dias        |
| **Total aproximado**                     | **2-3 semanas** |

---

Ao seguir estas instruções, você estará pronto para publicar o aplicativo Açucaradas Encomendas em ambas as lojas. Recomendamos iniciar o processo o quanto antes, especialmente para a App Store, devido ao tempo necessário para verificação da empresa.
