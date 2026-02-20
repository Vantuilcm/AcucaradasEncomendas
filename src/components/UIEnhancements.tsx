import React from 'react';
import { View, ActivityIndicator, StyleSheet, Animated } from 'react-native';

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const LoadingOverlay: React.FC = () => (
  <View style={styles.overlay}>
    <ActivityIndicator size="large" color="#ff69b4" />
  </View>
);

interface FadeInViewProps {
  children?: React.ReactNode;
}

export const FadeInView: React.FC<FadeInViewProps> = ({ children }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  return <Animated.View style={{ opacity: fadeAnim }}>{children}</Animated.View>;
};
