import React from 'react';
import { View } from 'react-native';

const MapView: React.FC<any> = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};

export const Marker: React.FC<any> = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};

export const Polyline: React.FC<any> = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};

export const PROVIDER_GOOGLE = 'google';

export default MapView;
