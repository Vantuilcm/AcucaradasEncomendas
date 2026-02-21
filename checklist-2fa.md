# Checklist de Validação - Autenticação de Dois Fatores (2FA)

## 1. Implantação da Função

- [ ] Função `sendVerificationCode` implantada com sucesso
- [ ] Variáveis de ambiente configuradas corretamente:
  - [ ] `email.user` = notificacao@acucaradas.com.br
  - [ ] `email.password` = app-senha-segura-123 (confirmar no console)
  - [ ] `email.sender` = notificacao@acucaradas.com.br
- [ ] Função visível no console do Firebase
- [ ] Tamanho e tempo de execução da função dentro dos limites do plano

## 2. Testes de Funcionalidade

- [ ] Teste via console do Firebase executado com sucesso
- [ ] Script de teste (`test-2fa.js`) executado com sucesso
- [ ] E-mail recebido corretamente contendo o código de verificação
- [ ] Formato do e-mail correto (HTML, branding, etc.)
- [ ] E-mail exibe o código corretamente

## 3. Testes no Aplicativo

- [ ] Login efetuado com sucesso
- [ ] Habilitação de 2FA funcionando corretamente
- [ ] Envio de código de verificação via app funcionando
- [ ] Verificação de código funciona corretamente
- [ ] Códigos de backup gerados e funcionando
- [ ] Desabilitação de 2FA funcionando corretamente

## 4. Cenários de Erro

- [ ] Teste com usuário não autenticado (deve falhar corretamente)
- [ ] Teste com e-mail incorreto (deve falhar corretamente)
- [ ] Teste com código expirado (deve falhar corretamente)
- [ ] Teste com código inválido (deve falhar corretamente)

## 5. Segurança

- [ ] Verificação de autenticação implementada corretamente
- [ ] E-mail de usuário verificado antes do envio
- [ ] Logs não contêm informações sensíveis
- [ ] Códigos expiram no tempo correto (5 minutos)
- [ ] Limite de tentativas implementado para evitar força bruta

## 6. Monitoramento

- [ ] Alertas configurados para falhas na função
- [ ] Logs acessíveis e contendo informações suficientes
- [ ] Métricas de uso visíveis no console

## 7. Documentação

- [ ] README atualizado com instruções de implantação
- [ ] Processo de manutenção documentado
- [ ] Guia de solução de problemas atualizado

---

## Notas e Observações

**Data da implantação**: **_/_**/**\_\_**

**Responsável pela implantação**: ************\_\_************

**Problemas encontrados**:

-
-

## **Soluções aplicadas**:

-
