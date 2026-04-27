import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  StyleProp,
  ViewStyle,
} from 'react-native';
import { openPrivacyPolicy, openTermsOfUse, openWebsite } from '../utils/legalDocuments';
import { checkWebsiteStatus } from '../utils/checkWebsiteStatus';

interface LegalDocumentLinksProps {
  style?: StyleProp<ViewStyle>;
  darkMode?: boolean;
  showWebsiteLink?: boolean;
  horizontal?: boolean;
  contextMessage?: string;
}

/**
 * Componente que exibe links para os documentos legais (Termos de Uso e Política de Privacidade)
 */
export const LegalDocumentLinks: React.FC<LegalDocumentLinksProps> = ({
  style,
  darkMode = false,
  showWebsiteLink = false,
  horizontal = false,
  contextMessage = 'Ao utilizar o aplicativo, você concorda com nossos',
}) => {
  const handleLinkPress = async (openDocument: () => Promise<void>, documentName: string) => {
    try {
      // Verificar o status do site antes de abrir o documento
      const status = await checkWebsiteStatus();

      if (!status.isOnline) {
        Alert.alert(
          'Site indisponível',
          `Não foi possível acessar o site da Açucaradas. Verifique sua conexão com a internet ou tente novamente mais tarde.`
        );
        return;
      }

      if (documentName === 'Política de Privacidade' && !status.documentsAvailable.privacyPolicy) {
        Alert.alert(
          'Documento indisponível',
          `A Política de Privacidade não está acessível no momento. Por favor, tente novamente mais tarde.`
        );
        return;
      }

      if (documentName === 'Termos de Uso' && !status.documentsAvailable.termsOfUse) {
        Alert.alert(
          'Documento indisponível',
          `Os Termos de Uso não estão acessíveis no momento. Por favor, tente novamente mais tarde.`
        );
        return;
      }

      // Abrir o documento
      await openDocument();
    } catch (error) {
      console.error(`Erro ao abrir ${documentName}:`, error);
      Alert.alert(
        'Erro',
        `Não foi possível abrir o documento. Por favor, tente novamente mais tarde.`
      );
    }
  };

  return (
    <View style={[horizontal ? styles.containerHorizontal : styles.containerVertical, style]}>
      {contextMessage ? (
        <Text style={[styles.contextText, darkMode && styles.textDark]}>{contextMessage}</Text>
      ) : null}

      <View style={horizontal ? styles.linksHorizontal : styles.linksVertical}>
        <TouchableOpacity
          onPress={() => handleLinkPress(openTermsOfUse, 'Termos de Uso')}
          accessibilityLabel="Abrir Termos de Uso"
          accessibilityRole="link"
        >
          <Text style={[styles.linkText, darkMode && styles.textDark]}>Termos de Uso</Text>
        </TouchableOpacity>

        {horizontal && <Text style={[styles.separator, darkMode && styles.textDark]}>e</Text>}

        <TouchableOpacity
          onPress={() => handleLinkPress(openPrivacyPolicy, 'Política de Privacidade')}
          accessibilityLabel="Abrir Política de Privacidade"
          accessibilityRole="link"
        >
          <Text style={[styles.linkText, darkMode && styles.textDark]}>
            Política de Privacidade
          </Text>
        </TouchableOpacity>

        {showWebsiteLink && (
          <>
            {horizontal && <Text style={[styles.separator, darkMode && styles.textDark]}>|</Text>}
            <TouchableOpacity
              onPress={() => handleLinkPress(openWebsite, 'Site da Açucaradas')}
              accessibilityLabel="Abrir site da Açucaradas Encomendas"
              accessibilityRole="link"
            >
              <Text style={[styles.linkText, darkMode && styles.textDark]}>Site Oficial</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  containerVertical: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  containerHorizontal: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  linksVertical: {
    alignItems: 'center',
    gap: 8,
  },
  linksHorizontal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  contextText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#FF69B4',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  separator: {
    fontSize: 14,
    color: '#666',
    marginHorizontal: 4,
  },
  textDark: {
    color: '#eee',
  },
});

export default LegalDocumentLinks;
