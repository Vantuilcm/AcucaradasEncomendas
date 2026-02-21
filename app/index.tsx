import React from 'react';
import { View, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  SlideInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { Button } from '../src/components/base/Button';

export default function Home() {
  const router = useRouter();
  const scale = useSharedValue(1);

  // Iniciar a animação de pulsação suave
  React.useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }),
        withTiming(1, { duration: 1500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) })
      ),
      -1, // Repetir infinitamente
      true // Reverter
    );
  }, []);

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/logo.png')}
        style={[styles.logo, logoStyle]}
        entering={ZoomIn.duration(800)}
        resizeMode="contain"
      />

      <Animated.Text style={styles.title} entering={FadeIn.delay(300).duration(800)}>
        Açucaradas Encomendas
      </Animated.Text>

      <Animated.View style={styles.buttonContainer} entering={SlideInUp.delay(600).duration(500)}>
        <Button
          title="Ver Pedidos"
          onPress={() => router.push('/pedidos')}
          variant="primary"
          style={styles.button}
        />

        <Button
          title="Realizar Encomenda"
          onPress={() => router.push('/novo-pedido')}
          variant="secondary"
          style={styles.button}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 40,
    color: '#333',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
  },
  button: {
    width: '100%',
  },
});
