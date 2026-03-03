import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { LEGAL_DOCUMENTS } from './legalDocuments';
import { runDomainDiagnostics } from './domainVerifier';

// Configuração das notificações locais
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

interface AlertOptions {
  sendEmail?: boolean;
  sendNotification?: boolean;
  logToConsole?: boolean;
  logToServer?: boolean;
  emailRecipients?: string[];
}

const DEFAULT_OPTIONS: AlertOptions = {
  sendEmail: false, // Desativado por padrão, pois requer configuração adicional
  sendNotification: true,
  logToConsole: true,
  logToServer: true,
  emailRecipients: ['admin@acucaradas.com.br', 'suporte@acucaradas.com.br'],
};

/**
 * Envia um alerta quando os documentos legais estão indisponíveis
 * @param status Status de disponibilidade dos documentos
 * @param options Opções de alerta
 */
export async function sendLegalDocsAlert(
  status: Record<string, boolean>,
  options: AlertOptions = DEFAULT_OPTIONS
): Promise<void> {
  // Verificar se é necessário enviar alerta
  const allAvailable = status.website && status.privacyPolicy && status.termsOfUse;
  if (allAvailable) {
    return; // Não há necessidade de alerta se tudo estiver disponível
  }

  // Construir mensagem de alerta
  let title = 'Alerta: Documentos Legais Indisponíveis';
  let body = 'Problemas detectados nos documentos legais:\n';

  if (!status.website) {
    body += '- Site principal indisponível!\n';
  }
  if (!status.privacyPolicy) {
    body += '- Política de Privacidade indisponível!\n';
  }
  if (!status.termsOfUse) {
    body += '- Termos de Uso indisponíveis!\n';
  }

  body += '\nVerifique imediatamente a hospedagem e os documentos.';

  // Executar diagnóstico detalhado para incluir no alerta
  const diagnostics = await runDomainDiagnostics();

  // Log no console (desenvolvimento/depuração)
  if (options.logToConsole) {
    console.error(title);
    console.error(body);
    console.error('Diagnóstico detalhado:', diagnostics);
  }

  // Enviar notificação local no dispositivo (útil para equipe interna)
  if (options.sendNotification && Platform.OS !== 'web') {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: { diagnostics },
      },
      trigger: null, // Mostrar imediatamente
    });
  }

  // Enviar email (requer implementação adicional)
  if (options.sendEmail && options.emailRecipients && options.emailRecipients.length > 0) {
    await sendEmailAlert({
      recipients: options.emailRecipients,
      subject: title,
      body: `${body}\n\nDiagnóstico:\n${JSON.stringify(diagnostics, null, 2)}`,
      isHtml: false,
    });
  }

  // Registrar no servidor (Firebase ou outro backend)
  if (options.logToServer) {
    await logToServer({
      type: 'legal_docs_alert',
      title,
      body,
      timestamp: new Date().toISOString(),
      status,
      diagnostics,
    });
  }
}

/**
 * Função auxiliar para enviar emails
 * Nota: Esta é uma implementação básica que precisa ser adaptada conforme o serviço de email utilizado
 */
async function sendEmailAlert({
  recipients,
  subject,
  body,
  isHtml = false,
}: {
  recipients: string[];
  subject: string;
  body: string;
  isHtml?: boolean;
}): Promise<void> {
  try {
    // Implementação depende do serviço de email utilizado
    // Exemplo usando API REST:
    const response = await fetch('https://api.acucaradas.com.br/send-alert-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_API_KEY', // Substitua por autenticação real
      },
      body: JSON.stringify({
        recipients,
        subject,
        body,
        isHtml,
      }),
    });

    if (!response.ok) {
      throw new Error(`Falha ao enviar email: ${response.status}`);
    }
  } catch (error) {
    console.error('Erro ao enviar email de alerta:', error);
    // Falha silenciosa - não queremos que um erro no envio de email impeça outras notificações
  }
}

/**
 * Função auxiliar para registrar logs no servidor
 */
async function logToServer(data: Record<string, string | number | boolean>): Promise<void> {
  try {
    // Implementação depende do backend utilizado
    // Exemplo usando Firebase:
    /*
    import { getFirestore, collection, addDoc } from 'firebase/firestore';
    const db = getFirestore();
    await addDoc(collection(db, 'monitoring_logs'), data);
    */

    // Implementação temporária usando API REST:
    const response = await fetch('https://api.acucaradas.com.br/monitoring/logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer YOUR_API_KEY', // Substitua por autenticação real
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Falha ao registrar log: ${response.status}`);
    }
  } catch (error) {
    console.error('Erro ao registrar log no servidor:', error);
    // Falha silenciosa - não queremos que um erro no registro impeça outras notificações
  }
}

/**
 * Configurar verificação periódica e alertas
 * @param intervalMinutes Intervalo em minutos entre verificações
 * @param options Opções de alerta
 * @returns Função para parar a verificação periódica
 */
export function setupPeriodicMonitoring(
  intervalMinutes: number = 60,
  options: AlertOptions = DEFAULT_OPTIONS
): () => void {
  // Verificação inicial
  checkAndAlert();

  // Configurar verificação periódica
  const intervalId = setInterval(checkAndAlert, intervalMinutes * 60 * 1000);

  // Função para verificar e alertar
  async function checkAndAlert() {
    try {
      // Verificar disponibilidade dos documentos
      const privacyResponse = await fetch(LEGAL_DOCUMENTS.PRIVACY_POLICY, { method: 'HEAD' }).catch(
        () => null
      );
      const termsResponse = await fetch(LEGAL_DOCUMENTS.TERMS_OF_USE, { method: 'HEAD' }).catch(
        () => null
      );
      const websiteResponse = await fetch(LEGAL_DOCUMENTS.WEBSITE, { method: 'HEAD' }).catch(
        () => null
      );

      const status = {
        privacyPolicy: !!privacyResponse && privacyResponse.ok,
        termsOfUse: !!termsResponse && termsResponse.ok,
        website: !!websiteResponse && websiteResponse.ok,
      };

      // Enviar alerta se necessário
      await sendLegalDocsAlert(status, options);
    } catch (error) {
      console.error('Erro na verificação periódica:', error);
    }
  }

  // Retornar função para parar a verificação
  return () => clearInterval(intervalId);
}
