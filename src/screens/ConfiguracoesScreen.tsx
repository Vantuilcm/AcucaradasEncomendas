import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { wp, hp, fontSize, spacing } from '../utils/responsive';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

// Lista de idiomas suportados para o reconhecimento de voz
const IDIOMAS_RECONHECIMENTO = [
  { codigo: 'pt-BR', nome: 'Português (Brasil)' },
  { codigo: 'en-US', nome: 'English (United States)' },
  { codigo: 'es-ES', nome: 'Español (España)' },
  { codigo: 'fr-FR', nome: 'Français (France)' },
];

const CHAVE_IDIOMA_VOZ = 'configuracoes:idioma_voz';

export default function ConfiguracoesScreen() {
  const navigation = useNavigation<any>();
  const [idiomaVoz, setIdiomaVoz] = useState('pt-BR');
  const [permissaoMicrofone, setPermissaoMicrofone] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Carregar configurações salvas
  useEffect(() => {
    const carregarConfiguracoes = async () => {
      try {
        // Carregar idioma de voz
        const idiomaVozSalvo = await AsyncStorage.getItem(CHAVE_IDIOMA_VOZ);
        if (idiomaVozSalvo) {
          setIdiomaVoz(idiomaVozSalvo);
        }

        // Verificar permissão de microfone (se necessário, em uma implementação real)
        // No Android e iOS, a permissão seria verificada usando as APIs específicas
        // Aqui apenas simulamos que já temos a permissão
        setPermissaoMicrofone(true);
      } catch (erro) {
        logger.error('Erro ao carregar configurações:', erro instanceof Error ? erro : new Error(String(erro)));
      } finally {
        setCarregando(false);
      }
    };

    carregarConfiguracoes();
  }, []);

  // Salvar idioma selecionado
  const selecionarIdioma = async (codigo: string) => {
    try {
      setIdiomaVoz(codigo);
      await AsyncStorage.setItem(CHAVE_IDIOMA_VOZ, codigo);

      // Exibir confirmação
      Alert.alert(
        'Idioma Atualizado',
        `O reconhecimento de voz agora usará o idioma: ${IDIOMAS_RECONHECIMENTO.find(i => i.codigo === codigo)?.nome}`,
        [{ text: 'OK' }]
      );
    } catch (erro) {
      logger.error('Erro ao salvar idioma:', erro instanceof Error ? erro : new Error(String(erro)));
      Alert.alert('Erro', 'Não foi possível salvar a configuração de idioma.');
    }
  };

  // Solicitar permissão de microfone (em uma implementação real)
  const solicitarPermissaoMicrofone = async () => {
    try {
      // Aqui você usaria a API específica de cada plataforma para solicitar permissão
      // No Expo, usaria o expo-permissions
      // Esta é uma simulação simplificada
      setPermissaoMicrofone(true);
      Alert.alert('Permissão Concedida', 'A permissão para usar o microfone foi concedida.', [
        { text: 'OK' },
      ]);
    } catch (erro) {
      logger.error('Erro ao solicitar permissão:', erro instanceof Error ? erro : new Error(String(erro)));
      Alert.alert('Erro', 'Não foi possível obter permissão para o microfone.');
    }
  };

  // Testar reconhecimento de voz
  const testarReconhecimentoVoz = () => {
    navigation.navigate('VoiceTest');
  };

  if (carregando) {
    return (
      <View style={styles.container}>
        <Text style={styles.carregandoTexto}>Carregando configurações...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Animated.View entering={FadeIn.duration(400)}>
        <Text style={styles.titulo}>Configurações</Text>

        {/* Configurações de Reconhecimento de Voz */}
        <View style={styles.secao}>
          <Animated.Text style={styles.secaoTitulo} entering={FadeIn.delay(100).duration(400)}>
            Reconhecimento de Voz
          </Animated.Text>

          {/* Permissão de Microfone */}
          <Animated.View
            style={styles.opcaoContainer}
            entering={FadeInDown.delay(200).duration(400)}
          >
            <View style={styles.opcaoInfo}>
              <Text style={styles.opcaoTitulo}>Permissão do Microfone</Text>
              <Text style={styles.opcaoDescricao}>
                {permissaoMicrofone ? 'Permissão concedida' : 'Necessário para busca por voz'}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.botao,
                permissaoMicrofone ? styles.botaoDesativado : styles.botaoAtivado,
              ]}
              onPress={solicitarPermissaoMicrofone}
              disabled={permissaoMicrofone}
            >
              <Text style={styles.botaoTexto}>{permissaoMicrofone ? 'Concedido' : 'Conceder'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Idioma Padrão */}
          <Animated.View
            style={styles.opcaoContainer}
            entering={FadeInDown.delay(300).duration(400)}
          >
            <View style={styles.opcaoInfo}>
              <Text style={styles.opcaoTitulo}>Idioma para Reconhecimento</Text>
              <Text style={styles.opcaoDescricao}>
                Selecione o idioma padrão para reconhecimento de voz
              </Text>
            </View>
          </Animated.View>

          {/* Lista de Idiomas */}
          <View style={styles.idiomasContainer}>
            {IDIOMAS_RECONHECIMENTO.map((idioma, index) => (
              <Animated.View
                key={idioma.codigo}
                style={styles.idiomaItem}
                entering={FadeInDown.delay(400 + index * 100).duration(400)}
              >
                <TouchableOpacity
                  style={[
                    styles.idiomaSelector,
                    idiomaVoz === idioma.codigo && styles.idiomaSelecionado,
                  ]}
                  onPress={() => selecionarIdioma(idioma.codigo)}
                >
                  <Text
                    style={[
                      styles.idiomaCodigo,
                      idiomaVoz === idioma.codigo && styles.idiomaCodigoSelecionado,
                    ]}
                  >
                    {idioma.codigo.split('-')[0]}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.idiomaNome}>{idioma.nome}</Text>
              </Animated.View>
            ))}
          </View>

          {/* Testar Reconhecimento */}
          <Animated.View entering={FadeInDown.delay(800).duration(400)}>
            <TouchableOpacity style={styles.botaoTestar} onPress={testarReconhecimentoVoz}>
              <Text style={styles.botaoTestarTexto}>Testar Reconhecimento de Voz</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: spacing(16),
  },
  carregandoTexto: {
    fontSize: fontSize(16),
    color: '#666',
    textAlign: 'center',
    marginTop: hp(30),
  },
  titulo: {
    fontSize: fontSize(24),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(24),
  },
  secao: {
    marginBottom: spacing(24),
    backgroundColor: 'white',
    borderRadius: wp(12),
    padding: spacing(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  secaoTitulo: {
    fontSize: fontSize(18),
    fontWeight: 'bold',
    color: '#333',
    marginBottom: spacing(16),
  },
  opcaoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing(12),
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  opcaoInfo: {
    flex: 1,
    paddingRight: spacing(12),
  },
  opcaoTitulo: {
    fontSize: fontSize(16),
    fontWeight: '500',
    color: '#333',
    marginBottom: spacing(4),
  },
  opcaoDescricao: {
    fontSize: fontSize(14),
    color: '#666',
  },
  botao: {
    paddingVertical: spacing(8),
    paddingHorizontal: spacing(16),
    borderRadius: wp(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoAtivado: {
    backgroundColor: '#3498db',
  },
  botaoDesativado: {
    backgroundColor: '#95a5a6',
  },
  botaoTexto: {
    color: '#fff',
    fontSize: fontSize(14),
    fontWeight: '500',
  },
  idiomasContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginVertical: spacing(16),
  },
  idiomaItem: {
    alignItems: 'center',
    marginHorizontal: spacing(6),
    marginBottom: spacing(16),
  },
  idiomaSelector: {
    width: wp(50),
    height: wp(50),
    borderRadius: wp(25),
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    marginBottom: spacing(8),
  },
  idiomaSelecionado: {
    backgroundColor: '#3498db',
  },
  idiomaCodigo: {
    fontSize: fontSize(16),
    fontWeight: 'bold',
    color: '#666',
  },
  idiomaCodigoSelecionado: {
    color: '#fff',
  },
  idiomaNome: {
    fontSize: fontSize(12),
    color: '#666',
    textAlign: 'center',
  },
  botaoTestar: {
    backgroundColor: '#2ecc71',
    borderRadius: wp(8),
    paddingVertical: spacing(12),
    paddingHorizontal: spacing(16),
    alignItems: 'center',
    marginTop: spacing(16),
  },
  botaoTestarTexto: {
    color: '#fff',
    fontSize: fontSize(16),
    fontWeight: '500',
  },
});
