import { Linking } from 'react-native';

export interface EmailContent {
  subject: string;
  body: string;
  toAddresses: string[];
  ccAddresses?: string[];
  bccAddresses?: string[];
}

/**
 * Envia um email usando o cliente de email padrão do dispositivo
 */
export const sendEmail = async (content: EmailContent): Promise<boolean> => {
  try {
    const { subject, body, toAddresses, ccAddresses = [], bccAddresses = [] } = content;

    const to = toAddresses.join(',');
    const cc = ccAddresses.join(',');
    const bcc = bccAddresses.join(',');

    let url = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    if (cc) {
      url += `&cc=${encodeURIComponent(cc)}`;
    }

    if (bcc) {
      url += `&bcc=${encodeURIComponent(bcc)}`;
    }

    const canOpen = await Linking.canOpenURL(url);

    if (!canOpen) {
      throw new Error('Não foi possível abrir o cliente de email');
    }

    await Linking.openURL(url);
    return true;
  } catch (error) {
    console.error('Erro ao enviar email:', error);
    return false;
  }
};
