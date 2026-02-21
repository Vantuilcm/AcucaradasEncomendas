# Checklist para Produção - Sistema de Autenticação de Dois Fatores

Use este checklist para garantir que o sistema de autenticação de dois fatores está pronto para produção.

## Dependências e Configuração

- [ ] `expo-crypto` instalado e funcionando corretamente (substituindo o obsoleto `expo-random`)
- [ ] `nodemailer` instalado nas Cloud Functions
- [ ] `firebase/functions` instalado no aplicativo
- [ ] Variáveis de ambiente configuradas no Firebase (email.user, email.password, email.sender)
- [ ] Conta de email dedicada configurada para envio de códigos
- [ ] Senha de app gerada para a conta de email (se usando Gmail)

## Implementações de Código

- [ ] `TwoFactorAuthService.ts` atualizado para usar `expo-crypto` em vez de `expo-random`
- [ ] Método `generateAndSendVerificationCode` configurado para chamar a Cloud Function
- [ ] Cloud Function `sendVerificationCode` implementada para enviar emails
- [ ] Templates de email configurados e testados
- [ ] Sistema de tratamento de erros implementado

## Testes

- [ ] Teste em ambiente de desenvolvimento confirmado (código aparece no console)
- [ ] Teste em ambiente de produção confirmado (email recebido)
- [ ] Verificado o tempo de resposta da Cloud Function (deve ser < 3 segundos)
- [ ] Teste de recepção de email em diferentes clientes (Gmail, Outlook, etc.)
- [ ] Teste de aparência do email em diferentes dispositivos (desktop, mobile)
- [ ] Teste de limite de taxa implementado e funcionando
- [ ] Teste de recuperação de erro em caso de falha de envio

## Segurança

- [ ] Verificação de autenticação implementada na Cloud Function
- [ ] Verificação de correspondência de email implementada
- [ ] CORS configurado corretamente
- [ ] Logs configurados sem expor dados sensíveis
- [ ] Limites de taxa implementados para evitar abusos
- [ ] Senhas e credenciais armazenadas com segurança

## Monitoramento

- [ ] Logs configurados para todas as operações importantes
- [ ] Alertas configurados para erros críticos
- [ ] Dashboard de monitoramento configurado (opcional)
- [ ] Sistema de notificação para falhas recorrentes (opcional)

## Experiência do Usuário

- [ ] Mensagens claras para o usuário em caso de erro
- [ ] Feedback visual durante o processo de verificação
- [ ] Interface para regenerar códigos em caso de não recebimento
- [ ] Interface para usar códigos de backup quando necessário
- [ ] Design responsivo para todos os dispositivos

## Conformidade

- [ ] Política de privacidade atualizada para mencionar o uso de 2FA
- [ ] Termos de serviço atualizados para cobrir o uso de 2FA
- [ ] Conformidade com regulamentações de proteção de dados (LGPD, GDPR, etc.)
- [ ] Retenção de dados configurada adequadamente
- [ ] Processo de desativação de 2FA documentado

## Documentação

- [ ] Guia do usuário atualizado para incluir instruções sobre 2FA
- [ ] Documentação técnica atualizada
- [ ] Processo de suporte documentado para problemas relacionados a 2FA
- [ ] FAQs atualizadas com informações sobre 2FA

## Plano de Contingência

- [ ] Plano para falhas de envio de email documentado
- [ ] Processo de recuperação de acesso documentado
- [ ] Contatos de suporte técnico atualizados
- [ ] Processo de rollback documentado em caso de problemas críticos
