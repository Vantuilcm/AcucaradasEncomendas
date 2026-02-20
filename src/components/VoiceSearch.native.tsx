import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
  AccessibilityInfo,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Svg, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-voice/voice';
import { wp, hp, fontSize, spacing } from '../utils/responsive';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

// Interface para as props do componente
interface VoiceSearchProps {
  onVoiceResult: (text: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  isListening?: boolean;
  style?: any;
  language?: string;
  accessibilityHint?: string;
}

// Lista de idiomas suportados
const SUPPORTED_LANGUAGES = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
  'es-ES': 'Español',
  'fr-FR': 'Français',
};

/**
 * Componente para realizar busca por voz
 */
export const VoiceSearch = ({
  onVoiceResult,
  onError,
  placeholder = 'Diga o que está procurando...',
  isListening: externalIsListening,
  style,
  language = 'pt-BR',
  accessibilityHint = 'Pressione para ativar a busca por voz',
}: VoiceSearchProps) => {
  const [isListening, setIsListening] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(language);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);

  // Referência para gerenciar eventos do Voice
  const voiceRef = useRef({
    initialized: false,
  });

  // Valores animados
  const micScale = useSharedValue(1);
  const rippleScale = useSharedValue(0);
  const rippleOpacity = useSharedValue(1);
  const dotSize = useSharedValue(0);

  // Verificar se o leitor de tela está ativado
  useEffect(() => {
    AccessibilityInfo.isScreenReaderEnabled().then(screenReaderEnabled => {
      setIsScreenReaderEnabled(screenReaderEnabled);
    });

    // Ouvir mudanças no estado do leitor de tela
    const listener = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      screenReaderEnabled => {
        setIsScreenReaderEnabled(screenReaderEnabled);
      }
    );

    return () => {
      listener.remove();
    };
  }, []);

  // Inicializar Voice e configurar handlers
  useEffect(() => {
    const initVoice = async () => {
      try {
        // Configurar event handlers para o voice
        Voice.onSpeechStart = onSpeechStartHandler;
        Voice.onSpeechEnd = onSpeechEndHandler;
        Voice.onSpeechResults = onSpeechResultsHandler;
        Voice.onSpeechError = onSpeechErrorHandler;
        Voice.onSpeechPartialResults = onSpeechPartialResultsHandler;

        // Obter línguas disponíveis
        const languages = await Voice.getSpeechRecognitionServices();
        if (languages && languages.length > 0) {
          setAvailableLanguages(languages);
        }

        voiceRef.current.initialized = true;
      } catch (e) {
        logger.error('Erro ao inicializar o Voice:', e instanceof Error ? e : new Error(String(e)));
        setError('Não foi possível inicializar o reconhecimento de voz');
      }
    };

    if (!voiceRef.current.initialized) {
      initVoice();
    }

    // Cleanup
    return () => {
      if (voiceRef.current.initialized) {
        stopVoiceRecognition();
        Voice.destroy()
          .then(() => {
            voiceRef.current.initialized = false;
          })
          .catch(e => {
            logger.error('Erro ao destruir o Voice:', e instanceof Error ? e : new Error(String(e)));
          });

        Voice.removeAllListeners();
      }
    };
  }, []);

  // Controle externo do estado de escuta (opcional)
  useEffect(() => {
    if (externalIsListening !== undefined) {
      if (externalIsListening && !isListening) {
        startListening();
      } else if (!externalIsListening && isListening) {
        stopListening();
      }
    }
  }, [externalIsListening, isListening]);

  // Event handlers para o Voice
  const onSpeechStartHandler = () => {
    setIsListening(true);
    setError(null);
  };

  const onSpeechEndHandler = () => {
    // Não definimos isListening como false aqui, pois queremos esperar pelos resultados
    if (isScreenReaderEnabled) {
      // Notificar usuários de leitores de tela que o reconhecimento acabou
      AccessibilityInfo.announceForAccessibility('Reconhecimento finalizado');
    }
  };

  const onSpeechResultsHandler = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      const recognizedText = e.value[0];
      setRecognizedText(recognizedText);

      // Pequeno delay para mostrar o texto reconhecido antes de fechar
      setTimeout(() => {
        stopListening();
        onVoiceResult(recognizedText);
      }, 1000);
    } else {
      setError('Não consegui entender. Tente novamente.');
    }
  };

  const onSpeechPartialResultsHandler = (e: SpeechResultsEvent) => {
    if (e.value && e.value.length > 0) {
      setRecognizedText(e.value[0]);
    }
  };

  const onSpeechErrorHandler = (e: SpeechErrorEvent) => {
    // Mapear códigos de erro para mensagens amigáveis
    const errorMessages: Record<string, string> = {
      '7': 'Sem permissão para acessar o microfone',
      '5': 'Reconhecimento interrompido',
      '6': 'Reconhecimento cancelado',
      '1': 'Microfone não disponível',
      '2': 'Serviço de reconhecimento não disponível',
      '3': 'Erro de rede',
      '4': 'Sem resultados do reconhecimento',
    };

    // Derivar uma chave segura para indexar o mapa de mensagens
    const rawCode = e && e.error ? e.error.code : undefined;
    const codeKey =
      typeof rawCode === 'number' || typeof rawCode === 'string'
        ? String(rawCode)
        : undefined;

    const errorMessage = codeKey && errorMessages[codeKey]
      ? errorMessages[codeKey]
      : 'Erro no reconhecimento de voz. Tente novamente.';

    setError(errorMessage);
    setIsListening(false);

    if (onError) {
      onError(errorMessage);
    }

    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility(`Erro: ${errorMessage}`);
    }
  };

  // Estilos animados
  const micAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: micScale.value }],
    };
  });

  const rippleAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: rippleScale.value }],
      opacity: rippleOpacity.value,
    };
  });

  const dotsAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: dotSize.value,
    };
  });

  // Função para iniciar o reconhecimento de voz real
  const startVoiceRecognition = async () => {
    try {
      if (!voiceRef.current.initialized) {
        setError('Sistema de reconhecimento de voz não inicializado');
        return;
      }

      // Verificar se já está em escuta
      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        await Voice.stop();
        // Breve atraso para garantir que a instância anterior seja encerrada
        setTimeout(async () => {
          await Voice.start(selectedLanguage);
        }, 300);
      } else {
        await Voice.start(selectedLanguage);
      }

      setError(null);
    } catch (e) {
      logger.error('Erro ao iniciar reconhecimento:', e instanceof Error ? e : new Error(String(e)));
      setError('Não foi possível iniciar o reconhecimento de voz');
      setIsListening(false);

      if (onError) {
        onError('Falha ao iniciar reconhecimento de voz');
      }
    }
  };

  // Função para parar o reconhecimento de voz real
  const stopVoiceRecognition = async () => {
    try {
      const isRecognizing = await Voice.isRecognizing();
      if (isRecognizing) {
        await Voice.stop();
      }
    } catch (e) {
      logger.error('Erro ao parar reconhecimento:', e instanceof Error ? e : new Error(String(e)));
    }
  };

  // Inicia a escuta
  const startListening = () => {
    setModalVisible(true);
    setIsListening(true);
    setRecognizedText('');
    setError(null);

    // Feedback tátil
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }

    // Animar o microfone pulsando
    micScale.value = withRepeat(
      withSequence(
        withTiming(1.2, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1, // -1 para repetir indefinidamente
      true // reverse para ir e voltar
    );

    // Animar o efeito de "ripple" (ondas saindo do microfone)
    const startRippleAnimation = () => {
      rippleScale.value = 1;
      rippleOpacity.value = 1;

      rippleScale.value = withTiming(2, { duration: 1500 });
      rippleOpacity.value = withTiming(0, { duration: 1500 }, () => {
        rippleScale.value = 1;
        rippleOpacity.value = 1;

        // Repetir a animação enquanto estiver escutando
        if (isListening) {
          startRippleAnimation();
        }
      });
    };

    startRippleAnimation();

    // Animar "dots" de áudio
    dotSize.value = withRepeat(
      withSequence(
        withTiming(hp(30), { duration: 300 }),
        withTiming(hp(5), { duration: 200 }),
        withTiming(hp(20), { duration: 250 }),
        withTiming(hp(10), { duration: 200 })
      ),
      -1
    );

    // Notificar leitores de tela
    if (isScreenReaderEnabled) {
      AccessibilityInfo.announceForAccessibility('Iniciando reconhecimento de voz. Fale agora.');
    }

    // Iniciar reconhecimento real de voz
    startVoiceRecognition();
  };

  // Para a escuta
  const stopListening = () => {
    setIsListening(false);
    setModalVisible(false);

    // Cancelar animações
    cancelAnimation(micScale);
    cancelAnimation(rippleScale);
    cancelAnimation(rippleOpacity);
    cancelAnimation(dotSize);

    micScale.value = withTiming(1);

    // Parar o reconhecimento real
    stopVoiceRecognition();

    // Feedback tátil
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  // Mudar o idioma de reconhecimento
  const changeLanguage = (lang: string) => {
    setSelectedLanguage(lang);

    // Se estiver ouvindo, reiniciar com novo idioma
    if (isListening) {
      stopVoiceRecognition().then(() => {
        setTimeout(() => {
          startVoiceRecognition();
        }, 300);
      });
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={startListening}
        style={styles.micButton}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel="Busca por voz"
        accessibilityHint={accessibilityHint}
      >
        <Animated.View style={[styles.rippleEffect, rippleAnimatedStyle]} />
        <Animated.View style={[styles.micIconContainer, micAnimatedStyle]}>
          <Svg
            width={wp(24)}
            height={wp(24)}
            viewBox="0 0 24 24"
            fill="none"
            accessibilityElementsHidden={true}
          >
            <Circle cx="12" cy="12" r="11" stroke="#3498db" strokeWidth="2" />
            <Circle cx="12" cy="12" r="5" fill="#3498db" />
          </Svg>
        </Animated.View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={stopListening}
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View
            style={styles.modalContent}
            accessible={true}
            accessibilityViewIsModal={true}
            accessibilityLabel={
              error
                ? `Erro: ${error}`
                : recognizedText
                  ? `Reconhecido: ${recognizedText}`
                  : 'Aguardando fala'
            }
          >
            <Text style={styles.modalTitle}>
              {error ? 'Erro no reconhecimento' : recognizedText ? 'Reconhecido:' : placeholder}
            </Text>

            {/* Mostrar seletor de idioma */}
            <View style={styles.languageSelector}>
              {Object.entries(SUPPORTED_LANGUAGES).map(([langCode, langName]) => (
                <TouchableOpacity
                  key={langCode}
                  style={[
                    styles.languageOption,
                    selectedLanguage === langCode && styles.languageOptionSelected,
                  ]}
                  onPress={() => changeLanguage(langCode)}
                  accessible={true}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selectedLanguage === langCode }}
                  accessibilityLabel={`Idioma ${langName}`}
                >
                  <Text
                    style={[
                      styles.languageText,
                      selectedLanguage === langCode && styles.languageTextSelected,
                    ]}
                  >
                    {langCode.split('-')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
                <TouchableOpacity
                  style={[styles.actionButton, styles.retryButton]}
                  onPress={() => {
                    setError(null);
                    startVoiceRecognition();
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Tentar novamente"
                >
                  <Text style={styles.actionButtonText}>Tentar Novamente</Text>
                </TouchableOpacity>
              </View>
            ) : recognizedText ? (
              <Text style={styles.recognizedText}>{recognizedText}</Text>
            ) : (
              <View style={styles.listeningContainer}>
                <View style={styles.dotContainer}>
                  <Animated.View
                    style={[styles.dot, dotsAnimatedStyle, { backgroundColor: '#3498db' }]}
                  />
                  <Animated.View
                    style={[
                      styles.dot,
                      dotsAnimatedStyle,
                      { backgroundColor: '#e74c3c', marginTop: -hp(5) },
                    ]}
                  />
                  <Animated.View
                    style={[
                      styles.dot,
                      dotsAnimatedStyle,
                      { backgroundColor: '#2ecc71', marginTop: -hp(10) },
                    ]}
                  />
                </View>
                <Text style={styles.listeningText}>Ouvindo...</Text>
              </View>
            )}

            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={stopListening}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={recognizedText ? 'Cancelar' : 'Cancelar reconhecimento'}
              >
                <Text style={styles.actionButtonText}>
                  {recognizedText ? 'Cancelar' : 'Cancelar'}
                </Text>
              </TouchableOpacity>

              {recognizedText && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={() => {
                    stopListening();
                    onVoiceResult(recognizedText);
                  }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar pesquisa"
                >
                  <Text style={styles.actionButtonText}>Confirmar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  micButton: {
    width: wp(44),
    height: wp(44),
    borderRadius: wp(22),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  micIconContainer: {
    width: wp(24),
    height: wp(24),
    justifyContent: 'center',
    alignItems: 'center',
  },
  rippleEffect: {
    position: 'absolute',
    width: wp(44),
    height: wp(44),
    borderRadius: wp(22),
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: wp(16),
    padding: spacing(20),
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    marginBottom: spacing(10),
    color: '#333',
    textAlign: 'center',
  },
  languageSelector: {
    flexDirection: 'row',
    marginBottom: spacing(20),
    borderRadius: wp(20),
    backgroundColor: '#f5f5f5',
    padding: spacing(4),
  },
  languageOption: {
    paddingHorizontal: spacing(12),
    paddingVertical: spacing(6),
    borderRadius: wp(15),
    marginHorizontal: spacing(2),
  },
  languageOptionSelected: {
    backgroundColor: '#3498db',
  },
  languageText: {
    fontSize: fontSize(14),
    color: '#666',
    fontWeight: '500',
  },
  languageTextSelected: {
    color: 'white',
  },
  listeningContainer: {
    height: hp(100),
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: hp(50),
    marginBottom: spacing(20),
  },
  dot: {
    width: wp(8),
    height: hp(10),
    borderRadius: wp(4),
    marginHorizontal: spacing(3),
  },
  listeningText: {
    fontSize: fontSize(16),
    color: '#666',
    marginTop: spacing(10),
  },
  recognizedText: {
    fontSize: fontSize(22),
    color: '#3498db',
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: spacing(20),
  },
  errorContainer: {
    alignItems: 'center',
    marginVertical: spacing(20),
  },
  errorText: {
    fontSize: fontSize(16),
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: spacing(15),
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: spacing(20),
  },
  actionButton: {
    paddingVertical: spacing(10),
    paddingHorizontal: spacing(20),
    borderRadius: wp(20),
    minWidth: wp(100),
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f1f1f1',
  },
  confirmButton: {
    backgroundColor: '#3498db',
  },
  retryButton: {
    backgroundColor: '#e67e22',
  },
  actionButtonText: {
    fontSize: fontSize(16),
    fontWeight: '500',
    color: '#333',
  },
  closeButton: {
    marginTop: spacing(20),
    paddingVertical: spacing(10),
    paddingHorizontal: spacing(20),
    backgroundColor: '#3498db',
    borderRadius: wp(20),
  },
  closeButtonText: {
    fontSize: fontSize(16),
    color: 'white',
    fontWeight: '500',
  },
});
