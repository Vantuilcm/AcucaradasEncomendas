import React from 'react';
import { View, Text } from 'react-native';

// Fallback genérico exigido pelo Expo Router
// Em web, o arquivo admin-monitoring.web.tsx será preferido.
// Em plataformas nativas, admin-monitoring.native.tsx será preferido.
export default function AdminMonitoringFallback() {
  return (
    <View style={{ padding: 16 }}>
      <Text>Admin Monitoring</Text>
    </View>
  );
}