import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { loggingService } from '../services/LoggingService';
import securityConfig from '../config/securityConfig';

interface DynamicWatermarkProps {
  /** Texto a ser exibido na marca d'água */
  text?: string;
  /** Informações do usuário para personalizar a marca d'água */
  userInfo?: {
    id?: string;
    email?: string;
    name?: string;
  };
  /** Opacidade da marca d'água (0-1) */
  opacity?: number;
  /** Rotação da marca d'água em graus */
  rotation?: number;
  /** Intervalo em ms para atualizar a marca d'água */
  updateInterval?: number;
  /** Estilo personalizado para o container */
  containerStyle?: object;
  /** Estilo personalizado para o texto */
  textStyle?: object;
  /** Função para gerar texto personalizado */
  customTextGenerator?: (userInfo?: any) => string;
  /** Habilitar registro de logs */
  enableLogging?: boolean;
}

/**
 * Componente que adiciona uma marca d'água dinâmica sobre o conteúdo
 * para rastrear a origem de possíveis vazamentos de informações
 */
export const DynamicWatermark: React.FC<DynamicWatermarkProps> = ({
  text,
  userInfo,
  opacity = securityConfig.watermark?.opacity || 0.3,
  rotation = securityConfig.watermark?.rotation || -45,
  updateInterval = securityConfig.watermark?.updateInterval || 30000,
  containerStyle,
  textStyle,
  customTextGenerator,
  enableLogging = securityConfig.watermark?.enableLogging || false,
}) => {
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [timestamp, setTimestamp] = useState<string>('');

  // Gerar texto da marca d'água
  const generateWatermarkText = () => {
    try {
      // Usar gerador personalizado se fornecido
      if (customTextGenerator && typeof customTextGenerator === 'function') {
        return customTextGenerator(userInfo);
      }

      // Texto padrão com informações do usuário e timestamp
      const currentDate = new Date();
      const formattedDate = `${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`;
      setTimestamp(formattedDate);

      // Texto personalizado ou padrão
      const baseText = text || securityConfig.watermark?.defaultText || 'CONFIDENCIAL';
      
      // Adicionar informações do usuário se disponíveis
      let userText = '';
      if (userInfo) {
        if (userInfo.email) {
          // Mascarar parte do email para segurança
          const maskedEmail = userInfo.email.replace(/(.{2})(.*)(@.*)/, '$1***$3');
          userText = maskedEmail;
        } else if (userInfo.name) {
          userText = userInfo.name;
        } else if (userInfo.id) {
          userText = `ID:${userInfo.id.substring(0, 8)}`;
        }
      }

      return userText ? `${baseText} - ${userText} - ${formattedDate}` : `${baseText} - ${formattedDate}`;
    } catch (error) {
      // Converter para ExtendedError para manter consistência com o padrão do app
      const extError = error as any;
      if (enableLogging) {
        loggingService.error('Erro ao gerar texto da marca d\'água', {
          error: extError,
          component: 'DynamicWatermark',
        });
      }
      return 'CONFIDENCIAL';
    }
  };

  // Atualizar marca d'água periodicamente
  useEffect(() => {
    // Gerar texto inicial
    setWatermarkText(generateWatermarkText());

    // Configurar intervalo para atualização
    const intervalId = setInterval(() => {
      setWatermarkText(generateWatermarkText());
    }, updateInterval);

    if (enableLogging) {
      loggingService.info('Marca d\'água dinâmica ativada', {
        component: 'DynamicWatermark',
        updateInterval,
      });
    }

    // Limpar intervalo ao desmontar
    return () => {
      clearInterval(intervalId);
    };
  }, [updateInterval, text, userInfo]);

  // Calcular dimensões da tela para posicionar a marca d'água
  const { width, height } = Dimensions.get('window');

  return (
    <View style={[styles.container, containerStyle]}>
      <View
        style={[
          styles.watermarkContainer,
          {
            width: width * 2,
            height: height * 2,
            opacity,
            transform: [{ rotate: `${rotation}deg` }],
          },
        ]}
      >
        {/* Repetir a marca d'água em um padrão para cobrir toda a tela */}
        {Array.from({ length: 10 }).map((_, rowIndex) => (
          <View key={`row-${rowIndex}`} style={styles.watermarkRow}>
            {Array.from({ length: 3 }).map((_, colIndex) => (
              <Text
                key={`text-${rowIndex}-${colIndex}`}
                style={[styles.watermarkText, textStyle]}
              >
                {watermarkText}
              </Text>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999,
    pointerEvents: 'none', // Permitir interação com elementos abaixo
  },
  watermarkContainer: {
    position: 'absolute',
    top: -Dimensions.get('window').height / 2,
    left: -Dimensions.get('window').width / 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginVertical: 60,
  },
  watermarkText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '300',
    marginHorizontal: 40,
  },
});