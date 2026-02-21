# Instruções para Upload do AAB na Google Play Store

## Informações do Aplicativo
- **Nome:** Açucaradas Encomendas
- **Package:** com.acucaradas.encomendas
- **Versão:** 1.0.0 (código 1)
- **Localização do AAB:** `./build/app-release.aab` (gerado pelo EAS Build)

## Passo a Passo para Upload

### 1. Acesse o Google Play Console
- Entre em https://play.google.com/console
- Faça login com sua conta de desenvolvedor

### 2. Selecione o Aplicativo
- Selecione "Açucaradas Encomendas" na lista de aplicativos
- Caso seja o primeiro envio, clique em "Criar aplicativo"
  - Selecione "Aplicativo" como tipo
  - Defina o nome como "Açucaradas Encomendas"
  - Defina o idioma padrão como "Português (Brasil)"
  - Selecione "Aplicativo gratuito" como tipo de app
  - Marque a declaração de conformidade com as diretrizes

### 3. Prepare o Lançamento
- No menu lateral, vá para "Produção" > "Lançamentos"
- Clique em "Criar novo lançamento"

### 4. Faça Upload do AAB
- Na seção "App Bundles", clique em "Adicionar do Android Studio ou upload"
- Selecione o arquivo AAB gerado pelo EAS Build (localizado em `./build/app-release.aab`)
- Aguarde o upload e processamento
- Verifique se o código da versão (1) e o nome da versão (1.0.0) estão corretos

### 5. Preencha as Informações de Lançamento
- Adicione notas de lançamento:
  ```
  Versão inicial do aplicativo Açucaradas Encomendas.
  
  Recursos incluídos:
  - Catálogo de produtos
  - Gerenciamento de pedidos
  - Notificações de status
  - Perfil de cliente
  ```
- Especifique o nome da versão: "Lançamento inicial v1.0.0"

### 6. Configurações de Lançamento
- Para o primeiro lançamento, recomendamos seguir esta sequência:
  1. **Teste interno:** Comece com um grupo pequeno de testadores (5-10 pessoas)
     - Adicione os e-mails dos testadores na seção "Testadores"
     - Compartilhe o link de convite que será gerado após a aprovação
  2. **Teste aberto:** Após validação inicial, expanda para um grupo maior
  3. **Produção:** Somente após correção de bugs e feedback positivo

### 7. Revisão e Envio
- Revise todas as informações
- Verifique a seção "Política de privacidade" (use o link do arquivo `termos_uso.md`)
- Confirme que todas as seções da ficha do aplicativo estão preenchidas
- Clique em "Iniciar lançamento para revisão"
- O Google Play fará a revisão do aplicativo (geralmente 1-3 dias para novos apps)

## Observações Importantes

### Teste Interno
- Para teste interno, adicione os seguintes e-mails:
  - equipe@acucaradas.com.br
  - dev@acucaradas.com.br
  - teste@acucaradas.com.br
- Compartilhe o link de convite via WhatsApp no grupo "Testadores Açucaradas"
- Solicite feedback específico sobre:
  - Desempenho em diferentes dispositivos
  - Funcionalidade de pedidos
  - Interface do usuário

### Requisitos de Metadados
Certifique-se de que você já configurou:
- **Ícone do aplicativo:** Use o arquivo em `assets/icon.png`
- **Capturas de tela:** Use as imagens em `store_assets/screenshots/`
- **Descrição curta:** "Gerencie seus pedidos de doces e bolos com facilidade"
- **Descrição completa:** Veja o arquivo `store_assets/descricao_completa.txt`
- **Política de privacidade:** Use o link para o arquivo `termos_uso.md`

### Monitoramento Pós-Lançamento
- Após o lançamento, monitore:
  - Relatórios de falhas no Firebase Crashlytics
  - Avaliações e comentários na Play Store (responda em até 24h)
  - Métricas de desempenho no Google Analytics

## Solução de Problemas Comuns

### Rejeição do Aplicativo
Se o aplicativo for rejeitado:
1. Leia atentamente o motivo da rejeição no e-mail recebido
2. Consulte a documentação específica em [Políticas do Desenvolvedor](https://play.google.com/about/developer-content-policy/)
3. Faça as correções necessárias no código ou metadados
4. Incremente o versionCode no arquivo `app.json` (de 1 para 2)
5. Gere um novo AAB usando o comando `./gerar-aab-eas.ps1`

### Problemas com AAB
- **Erro de assinatura:** Verifique se o EAS Build está configurado corretamente no `eas.json`
- **Permissões ausentes:** Verifique o arquivo `android/app/src/main/AndroidManifest.xml`
- **Problemas de compatibilidade:** Confirme que targetSdkVersion está definido como 33 ou superior

## Checklist Final de Publicação
- [ ] AAB gerado com sucesso via EAS Build
- [ ] Metadados completos na Play Store
- [ ] Política de privacidade atualizada
- [ ] Capturas de tela em diferentes dispositivos
- [ ] Testado em pelo menos 3 dispositivos diferentes
- [ ] Verificado com o Firebase Test Lab

## Próximos Passos Recomendados
1. Configure o Google Play App Signing para maior segurança
2. Implemente atualizações in-app para melhor experiência do usuário
3. Configure o Firebase Analytics para monitorar o uso do aplicativo
4. Planeje a próxima versão com melhorias baseadas no feedback dos usuários