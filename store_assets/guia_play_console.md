# Guia de Configuração do Teste Interno no Google Play Console

## Acesso ao Console
1. Acesse https://play.google.com/console
2. Faça login com a conta de desenvolvedor

## Configuração do Teste Interno

### Passo 1: Upload do AAB
1. No menu lateral, selecione **Testes > Teste interno**
2. Clique em **Criar nova versão**
3. Faça upload do arquivo AAB gerado pelo EAS Build
4. Aguarde a análise do arquivo (pode levar alguns minutos)

### Passo 2: Informações da Versão
1. Preencha as **Notas da versão** (copie do arquivo `release_notes.txt`)
2. Defina o **Nome da versão** (ex: "Beta 1.0.0")
3. Verifique se o **Código da versão** corresponde ao `versionCode` no `app.json` (deve ser 1)

### Passo 3: Gerenciar Testadores
1. Na seção **Testadores**, clique em **Gerenciar testadores**
2. Adicione os e-mails dos testadores (use o arquivo `lista_testadores.csv` como referência)
3. Você pode adicionar até 100 testadores para o teste interno

### Passo 4: Iniciar o Teste
1. Revise todas as informações
2. Clique em **Salvar** e depois em **Iniciar teste**
3. Aguarde a aprovação (geralmente é rápida para testes internos)

### Passo 5: Distribuir o Link
1. Após a aprovação, copie o link de convite
2. Envie o link para os testadores junto com as instruções
3. Os testadores precisarão aceitar o convite antes de baixar o app

## Monitoramento do Teste
- Acompanhe os relatórios de erros na seção **Android vitals**
- Verifique os comentários dos testadores
- Monitore a taxa de instalação e retenção

## Finalização do Teste
Quando estiver pronto para lançar uma nova versão:
1. Encerre o teste atual
2. Crie uma nova versão com as correções necessárias
3. Ou promova a versão atual para produção

## Suporte
Em caso de problemas com o Google Play Console, consulte:
- [Central de Ajuda do Google Play Console](https://support.google.com/googleplay/android-developer)
- [Documentação para Desenvolvedores](https://developer.android.com/distribute/console)