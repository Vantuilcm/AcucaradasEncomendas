# Monitoramento Contínuo de Documentos Legais

Este documento descreve como implementar e manter o monitoramento contínuo dos documentos legais (Política de Privacidade e Termos de Uso) do aplicativo Açucaradas Encomendas.

## 1. Importância do Monitoramento

Manter os documentos legais acessíveis é crucial pelos seguintes motivos:

- **Requisito das lojas de aplicativos**: Apple App Store e Google Play Store exigem que os documentos legais estejam sempre acessíveis
- **Conformidade legal**: A LGPD e outras legislações exigem transparência nas políticas de privacidade
- **Confiança do usuário**: Documentos acessíveis demonstram compromisso com a transparência
- **Prevenção de problemas**: Detectar e resolver problemas antes que afetem usuários ou resultem em suspensão do app

## 2. Componentes de Monitoramento Implementados

### 2.1 Utilitários de Verificação

Os seguintes componentes foram implementados para monitorar os documentos legais:

- `src/utils/legalDocuments.ts` - Funções para acessar e verificar documentos legais
- `src/utils/checkWebsiteStatus.ts` - Funções para verificar disponibilidade do site
- `src/utils/domainVerifier.ts` - Funções para verificação detalhada da configuração do domínio
- `scripts/pre-publish-check.ts` - Script para verificação pré-publicação

### 2.2 Componentes Visuais

- `src/components/LegalDocumentLinks.tsx` - Componente para exibir links para documentos legais
- `src/components/LegalDocsMonitor.tsx` - Componente para monitoramento em tempo real

## 3. Implementando o Monitoramento em Produção

### 3.1 Uso do Componente de Monitoramento

O componente `LegalDocsMonitor` pode ser adicionado a telas administrativas:

```tsx
import React from 'react';
import { View } from 'react-native';
import LegalDocsMonitor from '../components/LegalDocsMonitor';

const AdminDashboard = () => {
  const handleStatusChange = (status: Record<string, boolean>) => {
    // Lógica para lidar com mudanças de status
    // Por exemplo, enviar notificação se algum documento ficar indisponível
    if (!status.privacyPolicy || !status.termsOfUse) {
      // Enviar alerta para administradores
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Outros componentes do dashboard */}

      <LegalDocsMonitor
        monitoringInterval={30} // Verificar a cada 30 minutos
        onStatusChange={handleStatusChange}
        developmentOnly={false} // Mostrar também em produção
      />
    </View>
  );
};
```

### 3.2 Verificações Periódicas em Segundo Plano

Para aplicativos em produção, é recomendável configurar verificações periódicas usando serviços em nuvem:

1. **Usando Firebase Cloud Functions**:

   ```javascript
   // Exemplo de Cloud Function que verifica os documentos a cada 6 horas
   exports.checkLegalDocsAvailability = functions.pubsub
     .schedule('every 6 hours')
     .onRun(async () => {
       const fetch = require('node-fetch');

       try {
         // Verificar disponibilidade dos documentos
         const privacyResponse = await fetch(
           'https://www.acucaradas.com.br/politica-privacidade.html'
         );
         const termsResponse = await fetch('https://www.acucaradas.com.br/termos-uso.html');

         const privacyOk = privacyResponse.status === 200;
         const termsOk = termsResponse.status === 200;

         // Se algum documento não estiver disponível, enviar alerta
         if (!privacyOk || !termsOk) {
           // Enviar email ou notificação para administradores
           await sendAlertEmail({
             subject: 'ALERTA: Documentos legais indisponíveis',
             body: `Os seguintes documentos estão indisponíveis:\n
             ${!privacyOk ? '- Política de Privacidade\n' : ''}
             ${!termsOk ? '- Termos de Uso\n' : ''}
             \nVerifique a hospedagem do site imediatamente.`,
           });
         }

         // Registrar resultado no Firestore para histórico
         await admin.firestore().collection('monitoring').add({
           type: 'legal_docs_check',
           timestamp: admin.firestore.FieldValue.serverTimestamp(),
           privacyOk,
           termsOk,
         });

         return { success: true };
       } catch (error) {
         console.error('Erro na verificação dos documentos legais:', error);

         // Registrar erro e enviar alerta
         await admin.firestore().collection('monitoring').add({
           type: 'legal_docs_check_error',
           timestamp: admin.firestore.FieldValue.serverTimestamp(),
           error: error.toString(),
         });

         await sendAlertEmail({
           subject: 'ERRO: Falha no monitoramento de documentos legais',
           body: `Ocorreu um erro ao verificar a disponibilidade dos documentos legais: ${error}`,
         });

         return { success: false, error: error.toString() };
       }
     });
   ```

2. **Usando serviços de monitoramento externos**:
   - Configurar alertas no [UptimeRobot](https://uptimerobot.com/) para monitorar as URLs
   - Utilizar [Pingdom](https://www.pingdom.com/) para monitoramento avançado
   - Configura [StatusCake](https://www.statuscake.com/) para verificações de conteúdo

## 4. Alertas e Notificações

### 4.1 Configuração de Alertas

Recomenda-se configurar os seguintes tipos de alertas:

1. **Alertas imediatos**:

   - Quando qualquer documento ficar indisponível por mais de 5 minutos
   - Quando o site principal ficar fora do ar
   - Quando a resposta demorar mais de 5 segundos

2. **Alertas de degradação**:

   - Quando o tempo de resposta começar a aumentar significativamente
   - Quando houver intermitência na disponibilidade

3. **Verificações de conteúdo**:
   - Quando o conteúdo dos documentos for alterado inesperadamente
   - Quando o tamanho do documento mudar significativamente

### 4.2 Canais de Notificação

Configure múltiplos canais para garantir que os alertas sejam recebidos:

1. **Email**: Enviar alertas para pelo menos dois endereços diferentes
2. **SMS**: Para alertas críticos quando o site fica completamente indisponível
3. **Notificações push**: Para a equipe técnica através do próprio aplicativo
4. **Integração com Slack ou MS Teams**: Para colaboração rápida da equipe

## 5. Procedimentos de Recuperação

Em caso de falha na disponibilidade dos documentos, siga estes procedimentos:

### 5.1 Indisponibilidade do site completo

1. Verifique a hospedagem (Hostigator) para confirmar se o serviço está ativo
2. Verifique as configurações de DNS para certificar-se de que estão apontando corretamente
3. Restaure o site a partir do backup mais recente
4. Se necessário, use uma página temporária enquanto resolve o problema principal

### 5.2 Indisponibilidade apenas dos documentos legais

1. Verifique se os arquivos HTML estão presentes no servidor
2. Restaure os arquivos a partir dos backups ou da pasta `conectando site`
3. Verifique permissões de arquivo no servidor
4. Se necessário, faça deploy temporário dos documentos em uma hospedagem alternativa e atualize as URLs no `app.json`

## 6. Manutenção e Atualizações

### 6.1 Atualizações dos documentos legais

Ao atualizar os documentos legais, siga este processo:

1. Atualize os arquivos Markdown no repositório (`politica_privacidade.md` e `termos_uso.md`)
2. Atualize os arquivos HTML na pasta `conectando site`
3. Faça deploy dos novos arquivos HTML para o servidor
4. Execute o script de verificação para confirmar que estão acessíveis:
   ```
   npm run check:legal-docs
   ```
5. Atualize a data da última modificação nos documentos

### 6.2 Manutenção do sistema de monitoramento

Periodicamente, faça estas verificações:

1. Valide que os scripts de monitoramento estão funcionando corretamente
2. Verifique os logs para confirmar que as verificações automáticas estão ocorrendo
3. Realize um teste de falha simulada para garantir que os alertas estão funcionando
4. Atualize as informações de contato nos alertas se houver mudanças na equipe

---

**Lembre-se**: O monitoramento proativo é mais eficiente que a reação a problemas. Mantenha os sistemas de alertas ativos e responda rapidamente a qualquer notificação de indisponibilidade.
