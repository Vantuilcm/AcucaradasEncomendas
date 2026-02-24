# Guia Completo de Publicação do App Açucaradas Encomendas

Este guia contém todas as etapas necessárias para publicar o aplicativo Açucaradas Encomendas na Google Play Store, desde a geração do AAB até a configuração do teste interno e lançamento.

## 1. Geração do AAB (Android App Bundle)

### Opção 1: Usando EAS Build (Recomendado)

```bash
# Certifique-se de estar logado no Expo
npx eas login

# Inicie o build para produção
npx eas build --platform android --profile production
```

Após iniciar o build, você pode acompanhar o progresso em:
- https://expo.dev/accounts/[seu-username]/projects/acucaradas-encomendas/builds

### Opção 2: Geração Local do AAB

Se o EAS Build falhar, você pode tentar gerar o AAB localmente:

1. Gere os arquivos nativos do Android:
   ```bash
   npx expo prebuild -p android --clean
   ```

2. Navegue para o diretório Android:
   ```bash
   cd android
   ```

3. Execute o Gradle para gerar o AAB:
   ```bash
   ./gradlew bundleRelease
   ```

4. O AAB será gerado em:
   ```
   android/app/build/outputs/bundle/release/app-release.aab
   ```

## 2. Configuração da Google Play Console

### 2.1. Acesso à Google Play Console

1. Acesse [Google Play Console](https://play.google.com/console)
2. Faça login com sua conta de desenvolvedor Google
3. Se ainda não tiver uma conta de desenvolvedor, crie uma (taxa única de $25)

### 2.2. Criação do Aplicativo

1. Na página inicial da Play Console, clique em "Criar app"
2. Preencha as informações básicas:
   - Nome do app: Açucaradas Encomendas
   - Idioma padrão: Português (Brasil)
   - App ou jogo: App
   - Gratuito ou pago: Gratuito
   - Declarações: Marque as opções aplicáveis

### 2.3. Configuração da Ficha da Play Store

#### Informações do App

1. **Descrição curta** (até 80 caracteres):
   ```
   Gerencie seus pedidos de doces e bolos com facilidade e praticidade.
   ```

2. **Descrição completa** (até 4000 caracteres):
   ```
   O aplicativo Açucaradas Encomendas é a solução perfeita para quem deseja encomendar deliciosos doces e bolos artesanais com facilidade e praticidade.

   Com uma interface intuitiva e amigável, você pode navegar pelo catálogo de produtos, visualizar detalhes, preços e disponibilidade, além de fazer seus pedidos diretamente pelo aplicativo.

   Principais funcionalidades:

   • Catálogo completo de produtos com fotos e descrições detalhadas
   • Sistema de pedidos simplificado
   • Acompanhamento do status da sua encomenda em tempo real
   • Histórico de pedidos anteriores
   • Avaliações e comentários sobre os produtos
   • Notificações sobre promoções e novidades
   • Contato direto com o atendimento

   Experimente o Açucaradas Encomendas e descubra como é fácil e prático encomendar doces e bolos artesanais para suas festas e eventos especiais!
   ```

3. **Recursos do aplicativo** (liste pelo menos 3):
   ```
   • Catálogo de produtos com fotos e descrições
   • Sistema de pedidos simplificado
   • Acompanhamento de status em tempo real
   • Histórico de pedidos anteriores
   • Avaliações e comentários
   ```

#### Recursos Gráficos

1. **Ícone do aplicativo**:
   - Já disponível em `assets/icon.png`
   - Certifique-se de que está no formato 512x512 pixels

2. **Imagem de destaque gráfico**:
   - Crie uma imagem de 1024x500 pixels
   - Deve mostrar claramente o nome e a marca do aplicativo

3. **Screenshots**:
   - Siga o guia em `store_assets/screenshots_guide.md`
   - Faça upload de pelo menos 2 screenshots para cada tipo de dispositivo
   - Formatos recomendados:
     - Telefone: 16:9 (1920x1080 pixels)
     - Tablet: 16:10 (2560x1600 pixels)

### 2.4. Classificação de Conteúdo

1. Acesse a seção "Classificação de conteúdo"
2. Preencha o questionário honestamente
3. Recomendações para este app:
   - Não contém violência
   - Não contém conteúdo sexual
   - Não contém linguagem imprópria
   - Não contém uso de substâncias
   - Não permite compras no app
   - Não compartilha localização
   - Não permite interação entre usuários

### 2.5. Configuração de Preço e Distribuição

1. Acesse a seção "Preço e distribuição"
2. Defina como aplicativo gratuito
3. Selecione os países onde o app estará disponível
4. Confirme conformidade com leis de exportação dos EUA
5. Confirme que o app não contém anúncios (se aplicável)

### 2.6. Política de Privacidade

1. Acesse a seção "Política de privacidade"
2. Insira o URL da sua política de privacidade
3. Se não tiver uma, use o modelo em `store_assets/politica_privacidade.md`

## 3. Configuração do Teste Interno

### 3.1. Criação do Teste Interno

1. No menu lateral, acesse "Testes > Teste interno"
2. Clique em "Criar versão"
3. Faça upload do arquivo AAB gerado
4. Preencha as notas da versão (use o conteúdo de `store_assets/release_notes.txt`)
5. Clique em "Salvar"

### 3.2. Configuração de Testadores

1. Na seção "Testadores", clique em "Criar lista de e-mails"
2. Dê um nome à lista (ex: "Testadores Iniciais")
3. Adicione os e-mails dos testadores (use a lista em `store_assets/lista_testadores.csv`)
4. Clique em "Salvar"

### 3.3. Iniciando o Teste

1. Verifique se todas as informações estão corretas
2. Clique em "Iniciar teste"
3. O teste ficará disponível em alguns minutos/horas
4. Os testadores receberão um e-mail com instruções para acessar o app

## 4. Monitoramento e Feedback

### 4.1. Acompanhamento do Teste

1. Monitore a seção "Teste interno" para ver quantos testadores instalaram o app
2. Verifique se há relatórios de erros ou problemas

### 4.2. Coleta de Feedback

1. Crie um formulário para coletar feedback dos testadores
2. Solicite informações sobre:
   - Bugs encontrados
   - Sugestões de melhorias
   - Avaliação da experiência do usuário
   - Desempenho em diferentes dispositivos

## 5. Lançamento para Produção

Após concluir os testes e corrigir possíveis problemas:

1. Acesse "Produção" no menu lateral
2. Clique em "Criar versão"
3. Selecione o mesmo AAB usado no teste interno (ou uma versão atualizada)
4. Preencha as notas da versão
5. Revise todas as informações
6. Clique em "Iniciar lançamento para produção"

## Recursos Adicionais

- [Documentação oficial da Google Play Console](https://support.google.com/googleplay/android-developer)
- [Melhores práticas para fichas de apps](https://developer.android.com/distribute/best-practices/launch/store-listing)
- [Guia de qualidade de apps](https://developer.android.com/docs/quality-guidelines)

---

Lembre-se de que o processo de revisão da Google Play pode levar de algumas horas a alguns dias. Certifique-se de que seu aplicativo cumpre todas as políticas da Google Play para evitar rejeições.