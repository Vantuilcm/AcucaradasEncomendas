# Instruções para Publicação - Açucaradas Encomendas

## Pré-requisitos

1. Conta de desenvolvedor na Apple App Store (US$ 99/ano)
2. Conta de desenvolvedor no Google Play Console (taxa única de US$ 25)
3. Arquivos de credenciais configurados:
   - `google-service-account.json` para Android
   - Certificado de distribuição para iOS

## Passos para Publicação

### Android (Google Play Store)

1. **Preparar o build de produção**:

   ```
   eas build --platform android --profile production
   ```

2. **Enviar para a Google Play Store**:
   ```
   eas submit --platform android --profile production
   ```

### iOS (Apple App Store)

1. **Preparar o build de produção**:

   ```
   eas build --platform ios --profile production
   ```

2. **Enviar para a Apple App Store**:
   ```
   eas submit --platform ios --profile production
   ```

## Verificações Importantes Antes da Publicação

1. Verifique se todas as informações no arquivo `app.json` estão corretas:

   - Nome do aplicativo
   - Versão
   - Ícones e splash screens
   - Permissões necessárias

2. Certifique-se de que a política de privacidade está atualizada e acessível

3. Prepare materiais para as lojas:

   - Screenshots do aplicativo (diferentes tamanhos de tela)
   - Descrição curta e longa do aplicativo
   - Palavras-chave para busca
   - Categoria do aplicativo

4. Teste o aplicativo em diferentes dispositivos antes de enviar

## Solução de Problemas Comuns

### Erro no EAS Build

Se encontrar erros durante o build, verifique:

- Credenciais configuradas corretamente
- Dependências atualizadas
- Permissões necessárias no `app.json`

### Rejeição na App Store

Motivos comuns para rejeição:

- Funcionalidade incompleta ou com bugs
- Violação de diretrizes de design
- Informações de privacidade inadequadas
- Falta de valor para o usuário

### Rejeição na Play Store

Motivos comuns para rejeição:

- Violação de políticas de conteúdo
- Problemas de desempenho ou crashes
- Permissões excessivas ou injustificadas
- Descrição ou screenshots enganosos

## Contato para Suporte

Em caso de dúvidas ou problemas durante o processo de publicação, entre em contato:

**Suporte Técnico Açucaradas**  
E-mail: suporte@acucaradas.com.br  
Telefone: (21) 98812-7973  
Endereço: Rua Miguel Fernandes 543, Meier, Rio de Janeiro - RJ
