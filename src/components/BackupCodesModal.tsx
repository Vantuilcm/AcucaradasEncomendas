import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  Share,
  Clipboard,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface BackupCodesModalProps {
  visible: boolean;
  onClose: () => void;
  backupCodes: string[];
}

const BackupCodesModal: React.FC<BackupCodesModalProps> = ({ visible, onClose, backupCodes }) => {
  const [copied, setCopied] = useState(false);
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);

  // Copiar todos os códigos para a área de transferência
  const handleCopy = () => {
    const codesText = backupCodes.join('\n');
    Clipboard.setString(codesText);
    setCopied(true);

    // Indicação visual temporária
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  // Compartilhar códigos
  const handleShare = async () => {
    try {
      await Share.share({
        message:
          'Códigos de backup para autenticação de dois fatores:\n\n' + backupCodes.join('\n'),
        title: 'Seus códigos de backup para 2FA',
      });
    } catch (error) {
      console.error('Erro ao compartilhar códigos:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar os códigos de backup.');
    }
  };

  // Exportar para PDF e salvar
  const handleExportPDF = async () => {
    try {
      const codesHtml = backupCodes
        .map(
          code =>
            `<div style="font-family: monospace; padding: 8px; margin: 5px 0; background-color: #f5f5f5; border-radius: 4px;">${code}</div>`
        )
        .join('');

      const html = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 20px; }
              h1 { font-size: 24px; color: #333; margin-bottom: 20px; }
              p { font-size: 16px; color: #666; margin-bottom: 20px; }
              .warning { color: #e74c3c; font-weight: bold; margin: 20px 0; }
            </style>
          </head>
          <body>
            <h1>Seus códigos de backup para autenticação de dois fatores</h1>
            <p>Guarde estes códigos em um local seguro. Cada código pode ser usado apenas uma vez.</p>
            <div>${codesHtml}</div>
            <p class="warning">IMPORTANTE: Estes códigos são a única maneira de acessar sua conta caso você perca acesso ao seu email.</p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });

      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri);
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      Alert.alert('Erro', 'Não foi possível exportar os códigos para PDF.');
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Códigos de Backup</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Guarde estes códigos de backup em um local seguro. Você poderá usá-los para acessar sua
            conta caso perca acesso ao seu email.
          </Text>

          <Text style={styles.warning}>• Cada código pode ser usado apenas uma vez</Text>
          <Text style={styles.warning}>• Mantenha-os seguros e confidenciais</Text>
          <Text style={styles.warning}>
            • Sem estes códigos, você pode perder acesso à sua conta
          </Text>

          <ScrollView
            ref={scrollViewRef}
            style={styles.codesContainer}
            contentContainerStyle={styles.codesContent}
          >
            {backupCodes.map((code, index) => (
              <View key={index} style={styles.codeRow}>
                <Text style={styles.codeIndex}>{index + 1}.</Text>
                <Text style={styles.code}>{code}</Text>
              </View>
            ))}
          </ScrollView>

          <View style={styles.actionsContainer}>
            <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>{copied ? 'Copiado!' : 'Copiar'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Ionicons name="share-outline" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Compartilhar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleExportPDF}>
              <Ionicons name="document-outline" size={20} color="#FFF" />
              <Text style={styles.actionButtonText}>Exportar PDF</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  header: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  closeButton: {
    marginRight: 15,
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    marginTop: -20,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  description: {
    fontSize: 16,
    color: '#555',
    marginBottom: 20,
    lineHeight: 22,
  },
  warning: {
    fontSize: 14,
    color: '#E74C3C',
    marginBottom: 8,
  },
  codesContainer: {
    marginTop: 20,
    marginBottom: 20,
    borderRadius: 10,
    backgroundColor: '#F9F9F9',
    padding: 15,
    maxHeight: 300,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  codesContent: {
    paddingRight: 10,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  codeIndex: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    width: 25,
  },
  code: {
    fontSize: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 1,
    color: '#333',
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  actionButtonText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 14,
    marginLeft: 5,
  },
});

export default BackupCodesModal;
