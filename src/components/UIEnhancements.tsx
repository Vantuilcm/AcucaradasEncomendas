import React from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { useFonts } from 'expo-font';

export const LoadingOverlay = () => (
  <View style={styles.overlay}>
    <ActivityIndicator size="large" color="#ff69b4" />
  </View>
);

export const FadeInView = ({ children }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return <Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>;
};
