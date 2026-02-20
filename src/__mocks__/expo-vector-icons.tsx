import React from 'react';
import { View, Text } from 'react-native';

export const Ionicons = ({ name, size, color, style }: any) => (
  <View style={style} testID="ionicons">
    <Text>{name}</Text>
  </View>
);

export const MaterialCommunityIcons = ({ name, size, color, style }: any) => (
  <View style={style} testID="mci">
    <Text>{name}</Text>
  </View>
);

export default {
  Ionicons,
  MaterialCommunityIcons,
};
