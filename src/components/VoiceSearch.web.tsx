import React, { useEffect, useRef, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';

interface VoiceSearchProps {
  onVoiceResult: (text: string) => void;
  onError?: (error: string) => void;
  placeholder?: string;
  isListening?: boolean;
  style?: any;
  language?: string;
  accessibilityHint?: string;
}

export const VoiceSearch = ({
  onVoiceResult,
  onError,
  placeholder = 'Diga o que está procurando...',
  style,
  accessibilityHint = 'Ativar busca por voz',
}: VoiceSearchProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setIsSupported(false);
      return;
    }
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'pt-BR';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const result = event?.results?.[0]?.[0]?.transcript;
      if (result && String(result).trim()) {
        onVoiceResult(String(result).trim());
      } else {
        onError?.('Não foi possível reconhecer a fala');
      }
    };
    recognition.onerror = (event: any) => {
      onError?.(event?.error ? `Erro no reconhecimento: ${event.error}` : 'Erro no reconhecimento de voz');
    };
    recognition.onend = () => {
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    return () => {
      try {
        recognition.stop();
      } catch {}
      recognitionRef.current = null;
    };
  }, [onError, onVoiceResult]);

  const startListening = () => {
    if (!isSupported) {
      onError?.('Reconhecimento de voz não suportado neste navegador');
      return;
    }
    try {
      setIsListening(true);
      recognitionRef.current?.start();
    } catch {
      setIsListening(false);
      onError?.('Não foi possível iniciar o reconhecimento de voz');
    }
  };

  const stopListening = () => {
    try {
      recognitionRef.current?.stop();
    } catch {}
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        accessibilityHint={accessibilityHint}
        style={[styles.button, isListening ? styles.buttonActive : null]}
        onPress={isListening ? stopListening : startListening}
      >
        <Text style={styles.buttonText}>
          {isListening ? 'Parar busca por voz' : placeholder}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4A90E2',
  },
  buttonActive: {
    backgroundColor: '#2B6CB0',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
});
