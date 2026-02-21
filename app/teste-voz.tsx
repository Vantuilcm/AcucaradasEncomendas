import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-voice/voice';

import { Card } from '../src/components/base/Card';
import { VoiceSearch } from '../src/components/VoiceSearch';
import { wp, hp, fontSize, spacing } from '../src/utils/responsive';

// Constante para armazenar a chave do idioma no AsyncStorage
const CHAVE_IDIOMA_VOZ = 'configuracoes:idioma_voz';

// Lista de idiomas disponíveis
const IDIOMAS_TESTE = [
  {
    codigo: 'pt-BR',
    nome: 'Português (Brasil)',
    fraseExemplo: 'Olá, como posso ajudar?',
    traducao: 'Olá, como posso ajudar?',
  },
  {
    codigo: 'en-US',
    nome: 'English (US)',
    fraseExemplo: 'Hello, how can I help?',
    traducao: 'Olá, como posso ajudar?',
  },
  {
    codigo: 'es-ES',
    nome: 'Español',
    fraseExemplo: 'Hola, ¿cómo puedo ayudar?',
    traducao: 'Olá, como posso ajudar?',
  },
  {
    codigo: 'fr-FR',
    nome: 'Français',
    fraseExemplo: 'Bonjour, comment puis-je aider?',
    traducao: 'Olá, como posso ajudar?',
  },
];

// Frases para testar em diferentes contextos
const FRASES_TESTE = [
  { categoria: 'Saudações', frases: ['Olá', 'Bom dia', 'Boa tarde', 'Boa noite'] },
  { categoria: 'Produtos', frases: ['Bolo de chocolate', 'Brigadeiros', 'Doces', 'Salgados'] },
  { categoria: 'Comandos', frases: ['Buscar produtos', 'Mostrar categorias', 'Ver carrinho'] },
];

export default function TesteVoz() {
  const router = useRouter();
  const [idiomaAtual, setIdiomaAtual] = useState('pt-BR');
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [resultados, setResultados] = useState<{ texto: string; idioma: string }[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  // Animated values
  const cardScale = useSharedValue(0.95);
  const resultadosHeight = useSharedValue(0);

  // Efeito para carregar o idioma escolhido nas configurações
  useEffect(() => {
    const carregarIdioma = async () => {
      try {
        const idiomaVozSalvo = await AsyncStorage.getItem(CHAVE_IDIOMA_VOZ);
        if (idiomaVozSalvo) {
          setIdiomaAtual(idiomaVozSalvo);
        }
      } catch (error) {
        console.error('Erro ao carregar idioma:', error);
      } finally {
        setIsLoading(false);
      }
    };

    carregarIdioma();
  }, []);

  // Estilos animados
  const cardAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: cardScale.value }],
    };
  });

  const resultadosAnimatedStyle = useAnimatedStyle(() => {
    return {
      height: resultadosHeight.value,
      overflow: 'hidden',
    };
  });

  // Mudar idioma para teste
  const mudarIdioma = (codigo: string) => {
    setIdiomaAtual(codigo);
    cardScale.value = withSpring(1.03, { damping: 12 }, () => {
      cardScale.value = withSpring(1);
    });
  };

  // Tratar resultado de voz
  const handleVoiceResult = (texto: string) => {
    // Adicionar novo resultado à lista
    const novoResultado = {
      texto,
      idioma: idiomaAtual,
    };

    setResultados(prev => [novoResultado, ...prev].slice(0, 10)); // Manter apenas os 10 mais recentes
    resultadosHeight.value = withSpring(Math.min(resultados.length + 1, 5) * hp(70));

    // Feedback de animação
    cardScale.value = withSpring(1.02, { damping: 12 }, () => {
      cardScale.value = withSpring(1);
    });
  };

  // Tratar erros de voz
  const handleVoiceError = (error: string) => {
    setErro(error);
    setTimeout(() => {
      setErro(null);
    }, 3000);
  };

  // Limpar histórico de resultados
  const limparResultados = () => {
    setResultados([]);
    resultadosHeight.value = withSpring(0);
  };

  // Testar reconhecimento diretamente com a API Voice
  const testarReconhecimentoDireto = async (frase: string) => {
    try {
      Alert.alert('Teste de Frase', `Por favor, diga: "${frase}"`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Iniciar',
          onPress: async () => {
            setIsListening(true);

            try {
              await Voice.start(idiomaAtual);

              // Configurar eventos temporários
              Voice.onSpeechResults = (e: SpeechResultsEvent) => {
                if (e.value && e.value.length > 0) {
                  handleVoiceResult(e.value[0]);
                  Voice.stop();
                }
              };

              Voice.onSpeechError = (e: SpeechErrorEvent) => {
                handleVoiceError('Erro durante o reconhecimento. Tente novamente.');
                Voice.stop();
              };

              Voice.onSpeechEnd = () => {
                setIsListening(false);
                // Remover os listeners temporários
                Voice.onSpeechResults = null;
                Voice.onSpeechError = null;
                Voice.onSpeechEnd = null;
              };
            } catch (error) {
              setIsListening(false);
              handleVoiceError('Erro ao iniciar reconhecimento de voz');
            }
          },
        },
      ]);
    } catch (error) {
      handleVoiceError('Erro ao configurar o teste de voz');
    }
  };

  // Renderizar item de frase para teste
  const renderFraseItem = (frase: string, index: number) => (
    <Animated.View key={`frase-${index}`} entering={FadeInDown.delay(index * 100).duration(400)}>
      <TouchableOpacity style={styles.fraseItem} onPress={() => testarReconhecimentoDireto(frase)}>
        <Text style={styles.fraseTexto}>{frase}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3498db" />
        <Text style={styles.loadingText}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>← Voltar</Text>
          </TouchableOpacity>

          <Text style={styles.title}>Teste de Reconhecimento de Voz</Text>
        </View>

        {/* Componente de teste de voz */}
        <Animated.View style={[styles.voiceSearchContainer, cardAnimatedStyle]}>
          <Text style={styles.voiceSearchTitle}>Teste com o componente VoiceSearch</Text>

          <Text style={styles.idiomaSelecionadoText}>
            Idioma selecionado:{' '}
            {IDIOMAS_TESTE.find(i => i.codigo === idiomaAtual)?.nome || idiomaAtual}
          </Text>

          <View style={styles.voiceButtonContainer}>
            <VoiceSearch
              onVoiceResult={handleVoiceResult}
              onError={handleVoiceError}
              placeholder="Diga algo para testar..."
              language={idiomaAtual}
              accessibilityHint="Botão para testar o reconhecimento de voz"
              style={styles.voiceButton}
            />
          </View>

          {erro && (
            <Animated.View entering={SlideInDown.duration(300)} style={styles.errorContainer}>
              <Text style={styles.errorText}>{erro}</Text>
            </Animated.View>
          )}
        </Animated.View>

        {/* Seleção de idiomas para teste */}
        <Card style={styles.idiomasCard}>
          <Text style={styles.cardTitle}>Mudar Idioma para Teste</Text>

          <View style={styles.idiomasGrid}>
            {IDIOMAS_TESTE.map((idioma, index) => (
              <Animated.View
                key={idioma.codigo}
                style={styles.idiomaItemContainer}
                entering={FadeInDown.delay(index * 100).duration(400)}
              >
                <TouchableOpacity
                  style={[
                    styles.idiomaButton,
                    idiomaAtual === idioma.codigo && styles.idiomaButtonActive,
                  ]}
                  onPress={() => mudarIdioma(idioma.codigo)}
                >
                  <Text
                    style={[
                      styles.idiomaButtonText,
                      idiomaAtual === idioma.codigo && styles.idiomaButtonTextActive,
                    ]}
                  >
                    {idioma.codigo.split('-')[0]}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.idiomaNomeText}>{idioma.nome}</Text>
                <Text style={styles.idiomaExemploText}>"{idioma.fraseExemplo}"</Text>
              </Animated.View>
            ))}
          </View>
        </Card>

        {/* Frases de teste */}
        <Card style={styles.frasesCard}>
          <Text style={styles.cardTitle}>Frases para Testar</Text>
          <Text style={styles.cardSubtitle}>Selecione uma frase para testar o reconhecimento</Text>

          {FRASES_TESTE.map((categoria, catIndex) => (
            <View key={`cat-${catIndex}`} style={styles.categoriaContainer}>
              <Animated.Text
                style={styles.categoriaTitle}
                entering={FadeInDown.delay(catIndex * 200).duration(400)}
              >
                {categoria.categoria}
              </Animated.Text>

              <View style={styles.frasesContainer}>
                {categoria.frases.map((frase, index) => renderFraseItem(frase, index))}
              </View>
            </View>
          ))}
        </Card>

        {/* Resultados */}
        <Card style={styles.resultadosCard}>
          <View style={styles.resultadosHeader}>
            <Text style={styles.cardTitle}>Resultados</Text>

            {resultados.length > 0 && (
              <TouchableOpacity style={styles.limparButton} onPress={limparResultados}>
                <Text style={styles.limparButtonText}>Limpar</Text>
              </TouchableOpacity>
            )}
          </View>

          <Animated.View style={[styles.resultadosContainer, resultadosAnimatedStyle]}>
            {resultados.length > 0 ? (
              resultados.map((resultado, index) => (
                <Animated.View
                  key={`resultado-${index}`}
                  style={styles.resultadoItem}
                  entering={SlideInDown.delay(index * 100).duration(400)}
                >
                  <Text style={styles.resultadoTexto}>{resultado.texto}</Text>
                  <View style={styles.resultadoInfo}>
                    <Text style={styles.resultadoIdioma}>
                      {IDIOMAS_TESTE.find(i => i.codigo === resultado.idioma)?.nome ||
                        resultado.idioma}
                    </Text>
                  </View>
                </Animated.View>
              ))
            ) : (
              <Text style={styles.emptyResultText}>
                Nenhum resultado ainda. Teste o reconhecimento de voz acima.
              </Text>
            )}
          </Animated.View>
        </Card>

        {/* Dicas */}
        <Card style={styles.dicasCard}>
          <Text style={styles.cardTitle}>Dicas para Melhores Resultados</Text>

          <View style={styles.dicaItem}>
            <Text style={styles.dicaNumero}>1.</Text>
            <Text style={styles.dicaTexto}>Fale claramente e em um ritmo natural.</Text>
          </View>

          <View style={styles.dicaItem}>
            <Text style={styles.dicaNumero}>2.</Text>
            <Text style={styles.dicaTexto}>Evite ambientes muito barulhentos.</Text>
          </View>

          <View style={styles.dicaItem}>
            <Text style={styles.dicaNumero}>3.</Text>
            <Text style={styles.dicaTexto}>
              Mantenha o microfone a uma distância adequada (15-20cm).
            </Text>
          </View>

          <View style={styles.dicaItem}>
            <Text style={styles.dicaNumero}>4.</Text>
            <Text style={styles.dicaTexto}>
              Para melhor precisão, use o idioma nativo do seu dispositivo.
            </Text>
          </View>
        </Card>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
  },
  loadingText: {
    marginTop: spacing(16),
    fontSize: fontSize(16),
    color: '#666',
  },
  header: {
    padding: spacing(16),
    paddingBottom: spacing(8),
  },
  backButton: {
    padding: spacing(8),
    marginBottom: spacing(4),
  },
  backButtonText: {
    fontSize: fontSize(16),
    color: '#3498db',
    fontWeight: '500',
  },
  title: {
    fontSize: fontSize(24),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(8),
  },
  voiceSearchContainer: {
    backgroundColor: 'white',
    borderRadius: wp(12),
    margin: spacing(16),
    marginTop: spacing(8),
    padding: spacing(16),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  voiceSearchTitle: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(12),
    textAlign: 'center',
  },
  idiomaSelecionadoText: {
    fontSize: fontSize(16),
    color: '#666',
    marginBottom: spacing(16),
    textAlign: 'center',
  },
  voiceButtonContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing(16),
  },
  voiceButton: {
    transform: [{ scale: 1.2 }],
  },
  errorContainer: {
    backgroundColor: '#ffecec',
    padding: spacing(12),
    borderRadius: wp(8),
    marginTop: spacing(12),
    width: '100%',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: fontSize(14),
    textAlign: 'center',
  },
  idiomasCard: {
    margin: spacing(16),
    marginTop: spacing(8),
    padding: spacing(16),
  },
  cardTitle: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(12),
  },
  cardSubtitle: {
    fontSize: fontSize(14),
    color: '#666',
    marginBottom: spacing(16),
  },
  idiomasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  idiomaItemContainer: {
    alignItems: 'center',
    width: '48%',
    marginBottom: spacing(20),
  },
  idiomaButton: {
    width: wp(60),
    height: wp(60),
    borderRadius: wp(30),
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing(8),
  },
  idiomaButtonActive: {
    backgroundColor: '#3498db',
  },
  idiomaButtonText: {
    fontSize: fontSize(20),
    fontWeight: 'bold',
    color: '#666',
  },
  idiomaButtonTextActive: {
    color: 'white',
  },
  idiomaNomeText: {
    fontSize: fontSize(14),
    fontWeight: '500',
    color: '#333',
    marginBottom: spacing(4),
  },
  idiomaExemploText: {
    fontSize: fontSize(12),
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  frasesCard: {
    margin: spacing(16),
    marginTop: spacing(8),
    padding: spacing(16),
  },
  categoriaContainer: {
    marginBottom: spacing(16),
  },
  categoriaTitle: {
    fontSize: fontSize(16),
    fontWeight: '600',
    color: '#333',
    marginBottom: spacing(8),
  },
  frasesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  fraseItem: {
    backgroundColor: '#e8f4fc',
    borderRadius: wp(16),
    paddingHorizontal: spacing(12),
    paddingVertical: spacing(8),
    marginRight: spacing(8),
    marginBottom: spacing(8),
  },
  fraseTexto: {
    fontSize: fontSize(14),
    color: '#3498db',
  },
  resultadosCard: {
    margin: spacing(16),
    marginTop: spacing(8),
    padding: spacing(16),
  },
  resultadosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing(12),
  },
  limparButton: {
    backgroundColor: '#f1f1f1',
    paddingHorizontal: spacing(12),
    paddingVertical: spacing(6),
    borderRadius: wp(16),
  },
  limparButtonText: {
    fontSize: fontSize(14),
    color: '#666',
  },
  resultadosContainer: {
    minHeight: hp(80),
  },
  resultadoItem: {
    backgroundColor: '#f8f8f8',
    borderRadius: wp(8),
    padding: spacing(12),
    marginBottom: spacing(8),
  },
  resultadoTexto: {
    fontSize: fontSize(16),
    color: '#333',
    marginBottom: spacing(4),
  },
  resultadoInfo: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  resultadoIdioma: {
    fontSize: fontSize(12),
    color: '#777',
    fontStyle: 'italic',
  },
  emptyResultText: {
    fontSize: fontSize(14),
    color: '#999',
    textAlign: 'center',
    marginVertical: spacing(20),
    fontStyle: 'italic',
  },
  dicasCard: {
    margin: spacing(16),
    marginTop: spacing(8),
    padding: spacing(16),
    marginBottom: spacing(30),
  },
  dicaItem: {
    flexDirection: 'row',
    marginBottom: spacing(12),
  },
  dicaNumero: {
    fontSize: fontSize(16),
    fontWeight: 'bold',
    color: '#3498db',
    width: wp(24),
  },
  dicaTexto: {
    fontSize: fontSize(15),
    color: '#666',
    flex: 1,
  },
});
