import React from 'react';
import { View } from 'react-native';

export const BlurView: React.FC<any> = ({ children, ...props }) => {
  return <View {...props}>{children}</View>;
};
