# Guia de Implementação de Notificações Push com Firebase Cloud Messaging

## Próximos Passos para Implementação

A configuração básica do Firebase Cloud Messaging (FCM) já foi implementada no arquivo `src/config/firebase.ts`. Agora, precisamos completar a implementação para garantir que as notificações push funcionem corretamente em todas as plataformas. Aqui estão os próximos passos:

## 1. Verificar Arquivos de Configuração

### Para iOS:

- Confirmar que o arquivo `GoogleService-Info.plist` está corretamente adicionado ao projeto iOS
- Verificar se o APNs (Apple Push Notification service) está configurado no console do Firebase
- Adicionar as capacidades de notificação push no Xcode:
  - Background Modes > Remote Notifications
  - Push Notifications

### Para Android:

- Confirmar que o arquivo `google-services.json` está na raiz do projeto
- Verificar se o arquivo está referenciado corretamente no `app.config.ts`

## 2. Implementar Solicitação de Permissões

Já existe uma função `requestNotificationPermission()` no arquivo `src/config/notifications.ts`, mas precisamos garantir que ela seja chamada no momento apropriado:

```typescript
// Em um componente de inicialização ou no contexto de autenticação
import { requestNotificationPermission } from '../config/notifications';

// Solicitar permissão quando o usuário fizer login ou quando o app iniciar
useEffect(() => {
  const setupNotifications = async () => {
    const token = await requestNotificationPermission();
    if (token) {
      // Salvar o token no perfil do usuário no Firestore
      await updateUserProfile(userId, { fcmToken: token });
    }
  };

  setupNotifications();
}, [userId]);
```

## 3. Implementar Handlers para Notificações

### Notificações em Primeiro Plano

Implementar um handler para notificações recebidas enquanto o app está aberto:

```typescript
import * as Notifications from 'expo-notifications';

// Configurar comportamento de notificações em primeiro plano
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Em um componente ou contexto
useEffect(() => {
  const subscription = Notifications.addNotificationReceivedListener(notification => {
    // Processar a notificação recebida
    console.log('Notificação recebida:', notification);
    // Atualizar a interface do usuário ou estado do app conforme necessário
  });

  return () => subscription.remove();
}, []);
```

### Notificações em Segundo Plano

Implementar um handler para quando o usuário toca em uma notificação:

```typescript
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(response => {
    const { notification } = response;
    const data = notification.request.content.data;

    // Navegar para a tela apropriada com base nos dados da notificação
    if (data.type === 'NEW_ORDER') {
      navigation.navigate('OrderDetails', { orderId: data.orderId });
    } else if (data.type === 'ORDER_STATUS_UPDATE') {
      navigation.navigate('Orders');
    }
  });

  return () => subscription.remove();
}, [navigation]);
```

## 4. Integrar com o Firestore

Implementar um sistema para salvar e atualizar tokens FCM no Firestore:

```typescript
import { db } from '../config/firebase';
import { doc, setDoc, updateDoc } from 'firebase/firestore';

// Função para salvar o token FCM no perfil do usuário
export const saveUserFCMToken = async (userId, token) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      fcmToken: token,
      tokenUpdatedAt: new Date().toISOString(),
      platform: Platform.OS,
    });
    console.log('Token FCM salvo com sucesso');
    return true;
  } catch (error) {
    console.error('Erro ao salvar token FCM:', error);
    return false;
  }
};
```

## 5. Implementar Envio de Notificações

Criar funções para enviar notificações a partir do servidor (Cloud Functions ou API):

```typescript
// Esta função seria implementada no lado do servidor (Cloud Functions)
export const sendNotificationToUser = async (userId, notification) => {
  // Buscar o token FCM do usuário no Firestore
  const userDoc = await db.collection('users').doc(userId).get();
  const userData = userDoc.data();

  if (!userData || !userData.fcmToken) {
    console.log('Usuário não tem token FCM registrado');
    return false;
  }

  // Enviar notificação via FCM
  const message = {
    token: userData.fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification.data || {},
  };

  try {
    await admin.messaging().send(message);
    return true;
  } catch (error) {
    console.error('Erro ao enviar notificação:', error);
    return false;
  }
};
```

## 6. Testar Notificações

1. **Teste Local**:

   - Usar o console do Firebase para enviar notificações de teste
   - Verificar se o app recebe notificações em primeiro e segundo plano

2. **Teste de Produção**:
   - Implementar eventos que disparam notificações (novo pedido, atualização de status)
   - Testar em diferentes dispositivos e condições de rede

## 7. Considerações Adicionais

- **Badges**: Implementar contagem de badges para iOS
- **Sons Personalizados**: Configurar sons diferentes para tipos diferentes de notificações
- **Imagens**: Adicionar suporte para notificações com imagens
- **Ações**: Implementar botões de ação nas notificações
- **Agendamento**: Permitir o agendamento de notificações locais

## 8. Integração com OneSignal (Opcional)

O projeto já possui configuração para OneSignal (`src/config/onesignal.ts`). Se preferir usar o OneSignal em vez do FCM diretamente, você pode:

1. Completar a configuração do OneSignal
2. Usar a API do OneSignal para gerenciar notificações
3. Aproveitar recursos adicionais como segmentação avançada e análises

## Conclusão

A implementação do Firebase Cloud Messaging está parcialmente concluída. Seguindo os passos acima, você terá um sistema completo de notificações push funcionando em todas as plataformas suportadas pelo aplicativo Açucaradas Encomendas.
