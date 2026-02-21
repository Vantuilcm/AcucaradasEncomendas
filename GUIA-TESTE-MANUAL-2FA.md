# Guia de Teste Manual - Autenticação de Dois Fatores (2FA)

Como estamos enfrentando problemas com o PowerShell e a execução de scripts de teste, este guia apresenta uma alternativa manual para testar e validar a função `sendVerificationCode` no Firebase.

## 1. Teste via Console do Firebase

### 1.1. Acesse o Console do Firebase

1. Abra o navegador e acesse [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Faça login com a conta associada ao projeto `acucaradas-encomendas`
3. Selecione o projeto `acucaradas-encomendas` na lista de projetos

### 1.2. Teste a função usando o Console do Firebase

1. No menu lateral, clique em "Functions"
2. Encontre a função `sendVerificationCode` na lista
3. Clique no botão "..." (três pontos) à direita da função e selecione "Test function"
4. No campo "Testing data", insira o seguinte JSON:
   ```json
   {
     "data": {
       "email": "teste@acucaradas.com.br",
       "code": "123456"
     },
     "auth": {
       "uid": "UID_DO_USUARIO_DE_TESTE"
     }
   }
   ```
   > Substitua "UID_DO_USUARIO_DE_TESTE" pelo ID do usuário de teste que criou anteriormente.
5. Clique em "Test function" para executar o teste
6. Verifique a saída do teste na seção "Result" e nos Logs

## 2. Teste via Aplicativo

### 2.1. Preparação

1. Certifique-se de que a função está implantada corretamente (verifique no Console do Firebase)
2. Verifique se as variáveis de ambiente estão configuradas:
   ```
   firebase functions:config:get
   ```

### 2.2. Teste no aplicativo

1. Abra o aplicativo Açucaradas Encomendas em um dispositivo físico ou emulador
2. Faça login com uma conta de teste
3. Navegue até a área de configurações de conta
4. Ative a opção de autenticação de dois fatores
5. Quando solicitado, verifique o email de teste para o código de verificação
6. Insira o código recebido

## 3. Verificação de Logs

### 3.1. Verifique os logs da função no Console do Firebase

1. No menu lateral do Console do Firebase, clique em "Functions"
2. Clique na aba "Logs"
3. Pesquise por logs relacionados à função `sendVerificationCode`
4. Analise os logs para identificar possíveis erros ou problemas

### 3.2. Verifique os logs da plataforma de e-mail (opcional)

Se possível, verifique a plataforma de e-mail configurada para verificar se os e-mails estão sendo enviados corretamente.

## 4. Resolução de Problemas Comuns

### 4.1. Email não recebido

- Verifique a pasta de spam
- Confira as configurações de e-mail no Firebase Functions
- Verifique os logs para erros de envio de e-mail

### 4.2. Erro de autenticação

- Certifique-se de que o usuário está autenticado antes de chamar a função
- Verifique se o e-mail usado na chamada da função corresponde ao e-mail do usuário autenticado

### 4.3. Função não disponível

- Verifique se a função foi implantada corretamente
- Confirme que o nome da função está correto em ambos os lados: no Cloud Functions e na chamada do cliente

## 5. Checklist de Verificação

Use a checklist abaixo para verificar se a implementação está funcionando corretamente:

- [ ] Função `sendVerificationCode` está implantada e visível no Console
- [ ] Variáveis de ambiente estão configuradas corretamente
- [ ] A função pode ser chamada com sucesso via Console do Firebase
- [ ] E-mails são enviados corretamente quando a função é chamada
- [ ] O código de verificação é apresentado corretamente no e-mail
- [ ] O aplicativo consegue chamar a função e processar a resposta
- [ ] Os logs mostram a execução correta da função
- [ ] Não há erros de execução nos logs da função

---

## Notas Finais

Após concluir os testes, atualize o arquivo `README-2FA-DEPLOY.md` com quaisquer informações adicionais ou correções necessárias para a implantação da função em produção.

Se os testes forem bem-sucedidos, avance para a implantação completa da funcionalidade de autenticação de dois fatores no aplicativo.
