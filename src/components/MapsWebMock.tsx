import React from 'react';
import { View, Text } from 'react-native';

const MapView = ({ children, style }: any) => (
  <View style={[{ backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' }, style]}>
    <Text>Mapa não disponível na versão Web</Text>
    {children}
  </View>
);

export const Marker = ({ children }: any) => <View>{children}</View>;
export const Polyline = () => null;
export const PROVIDER_GOOGLE = 'google';

export default MapView;
