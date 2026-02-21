# 🔑 Guia Passo a Passo: Obtenção do Número DUNS

Este documento fornece instruções detalhadas para obter o número DUNS (Data Universal Numbering System), que é o principal bloqueador atual para a publicação do aplicativo Açucaradas Encomendas nas lojas de aplicativos.

## 📋 O que é o número DUNS?

O número DUNS (Data Universal Numbering System) é um identificador único de nove dígitos atribuído pela Dun & Bradstreet (D&B) que identifica empresas em uma localização específica. Este número é amplamente utilizado como um identificador comercial padrão e é **obrigatório** para publicar aplicativos na Apple App Store como empresa.

## ⏱️ Tempo Estimado

- **Solicitação inicial**: 5-10 minutos para preencher o formulário
- **Processamento pela D&B**: 1-2 semanas
- **Integração com Apple/Google**: 1-2 dias adicionais após recebimento

## 🔍 Verificar se a Empresa já possui um número DUNS

Antes de solicitar um novo número DUNS, verifique se a Açucaradas Encomendas já possui um:

1. Acesse a ferramenta de busca DUNS da Apple: [https://developer.apple.com/enroll/duns-lookup/](https://developer.apple.com/enroll/duns-lookup/#!/search)
2. Preencha as informações da empresa:
   - Nome legal da empresa (conforme CNPJ)
   - País/região: Brasil
   - Número do CNPJ
   - Endereço completo da empresa

## 📝 Solicitar um novo número DUNS (se necessário)

Se a empresa não possuir um número DUNS, siga estes passos para solicitar gratuitamente:

### Método 1: Através da Apple (Recomendado)

1. Acesse: [https://developer.apple.com/enroll/duns-lookup/](https://developer.apple.com/enroll/duns-lookup/#!/search)
2. Preencha as informações da empresa conforme mencionado acima
3. Quando o sistema informar que não encontrou um número DUNS, clique na opção para solicitar um novo
4. Complete o formulário com os seguintes dados:
   - Informações legais da empresa (nome, CNPJ, endereço)
   - Informações de contato do representante legal
   - Número de funcionários
   - Ano de fundação
   - Site da empresa

### Método 2: Diretamente com a D&B

Alternativamente, você pode solicitar diretamente à D&B:

1. Acesse o site da D&B Brasil: [https://www.dnb.com.br/](https://www.dnb.com.br/)
2. Procure pela opção "Solicitar um D-U-N-S Number"
3. Preencha o formulário com as informações da empresa

## 📄 Documentos Necessários

Prepare os seguintes documentos, que podem ser solicitados durante o processo:

- Comprovante de registro da empresa (CNPJ)
- Documento que comprove a autoridade do solicitante para representar a empresa
- Documento de identidade pessoal do representante
- Comprovante de endereço da empresa

## 📨 Após a Submissão

1. Você receberá um e-mail de confirmação da equipe da D&B logo após preencher o formulário
2. O número DUNS será enviado para o seu e-mail em até 5 dias úteis (pode levar até 14 dias em alguns casos)
3. Após receber o número DUNS, aguarde 1-2 dias úteis para que a Apple e o Google recebam as informações sobre sua empresa

## 🚨 Dicas Importantes

- **Consistência**: Certifique-se de que todas as informações fornecidas correspondam exatamente aos documentos oficiais da empresa
- **Acompanhamento**: Se após 5 dias úteis você não receber o número DUNS, entre em contato com o suporte da D&B
- **Armazenamento**: Guarde o número DUNS em um local seguro, pois ele será necessário para todos os processos futuros com a Apple e Google

## 📞 Contatos Úteis

- **Suporte D&B Brasil**: [https://www.dnb.com.br/contato](https://www.dnb.com.br/contato)
- **Suporte Apple Developer**: [https://developer.apple.com/contact/](https://developer.apple.com/contact/)

## 🔄 Próximos Passos Após Obter o DUNS

Assim que receber o número DUNS:

1. Criar conta Apple Developer (seguir instruções em `INSTRUCOES_CONTAS_LOJAS.md`)
2. Criar conta Google Play Console (seguir instruções em `INSTRUCOES_CONTAS_LOJAS.md`)
3. Configurar secrets EAS com credenciais reais (usar script `setup-publication-secrets.ps1`)
4. Testar builds completos
5. Submeter para review

---

**Status**: Aguardando obtenção do número DUNS  
**Próxima ação**: Solicitar número DUNS seguindo este guia  
**Tempo estimado para conclusão**: 1-2 semanas