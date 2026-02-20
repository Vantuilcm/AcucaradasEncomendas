import React, { useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  SlideInRight,
  ZoomIn,
} from 'react-native-reanimated';

interface AnimacaoExemploProps {
  titulo?: string;
  onPress?: () => void;
}

export const AnimacaoExemplo: React.FC<AnimacaoExemploProps> = ({
  titulo = 'Exemplo de Animação',
  onPress,
}) => {
  // Valores compartilhados para animações
  const rotacao = useSharedValue(0);
  const escala = useSharedValue(1);
  const posicaoY = useSharedValue(0);
  const opacidade = useSharedValue(1);

  // Iniciar animações quando o componente montar
  useEffect(() => {
    // Animação de rotação contínua
    rotacao.value = withRepeat(
      withTiming(360, { duration: 2000, easing: Easing.linear }),
      -1, // Repetir infinitamente
      false // Não reverter
    );

    // Animação de pulsação
    escala.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration: 1000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      ),
      -1, // Repetir infinitamente
      true // Reverter
    );

    // Animação de flutuação
    posicaoY.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 1500, easing: Easing.bezier(0.42, 0, 0.58, 1) }),
        withTiming(0, { duration: 1500, easing: Easing.bezier(0.42, 0, 0.58, 1) })
      ),
      -1, // Repetir infinitamente
      true // Reverter
    );
  }, []);

  // Estilos animados
  const estiloCirculo = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotacao.value}deg` },
        { scale: escala.value },
      ],
    };
  });

  const estiloQuadrado = useAnimatedStyle(() => {
    return {
      transform: [
        { translateY: posicaoY.value },
        { scale: escala.value },
      ],
    };
  });

  const estiloTriangulo = useAnimatedStyle(() => {
    return {
      opacity: opacidade.value,
      transform: [
        { translateY: posicaoY.value * -1 }, // Movimento oposto ao quadrado
        { scale: escala.value },
      ],
    };
  });

  // Função para animar ao pressionar
  const animarAoPresionar = () => {
    // Animação de opacidade
    opacidade.value = withSequence(
      withTiming(0.3, { duration: 300 }),
      withTiming(1, { duration: 300 })
    );

    // Animação de escala com spring
    escala.value = withSequence(
      withSpring(1.3),
      withSpring(1)
    );

    // Executar callback se fornecido
    if (onPress) {
      onPress();
    }
  };

  return (
    <Animated.View 
      style={styles.container}
      entering={FadeIn.duration(800)}
    >
      <Animated.Text 
        style={styles.titulo}
        entering={SlideInRight.duration(500)}
      >
        {titulo}
      </Animated.Text>

      <View style={styles.formasContainer}>
        {/* Círculo animado */}
        <TouchableOpacity onPress={animarAoPresionar}>
          <Animated.View 
            style={[styles.circulo, estiloCirculo]}
            entering={ZoomIn.delay(200).duration(500)}
          />
        </TouchableOpacity>

        {/* Quadrado animado */}
        <TouchableOpacity onPress={animarAoPresionar}>
          <Animated.View 
            style={[styles.quadrado, estiloQuadrado]}
            entering={ZoomIn.delay(400).duration(500)}
          />
        </TouchableOpacity>

        {/* Triângulo animado */}
        <TouchableOpacity onPress={animarAoPresionar}>
          <Animated.View 
            style={[styles.triangulo, estiloTriangulo]}
            entering={ZoomIn.delay(600).duration(500)}
          >
            <View style={styles.trianguloInterno} />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.botao} 
        onPress={animarAoPresionar}
      >
        <Text style={styles.textoBotao}>Animar</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    margin: 10,
  },
  titulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#333',
  },
  formasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  circulo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ff7675',
  },
  quadrado: {
    width: 60,
    height: 60,
    backgroundColor: '#74b9ff',
  },
  triangulo: {
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trianguloInterno: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 30,
    borderRightWidth: 30,
    borderBottomWidth: 60,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#55efc4',
  },
  botao: {
    backgroundColor: '#6c5ce7',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  textoBotao: {
    color: 'white',
    fontWeight: 'bold',
  },
});