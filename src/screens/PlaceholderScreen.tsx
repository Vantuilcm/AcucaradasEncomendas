import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';

export const PlaceholderScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  
  const getTitle = () => {
    switch (route.name) {
      case 'OrdersHistory': return 'Histórico de Pedidos';
      case 'Favorites': return 'Meus Favoritos';
      case 'Reports': return 'Financeiro e Vendas';
      case 'DriverVehicle': return 'Meu Veículo';
      case 'DriverPix': return 'Dados Bancários (Pix)';
      case 'DriverDocuments': return 'Meus Documentos';
      case 'DriverEarnings': return 'Resumo de Ganhos';
      case 'DriverHistory': return 'Histórico de Corridas';
      default: return 'Funcionalidade';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <IconButton icon="hammer-wrench" size={80} iconColor="#E91E63" />
        <Text variant="headlineSmall" style={styles.title}>{getTitle()}</Text>
        <Text variant="bodyLarge" style={styles.subtitle}>
          Esta funcionalidade está sendo preparada e estará disponível no próximo build.
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()} 
          style={styles.button}
        >
          Voltar
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontWeight: 'bold', marginVertical: 10, textAlign: 'center' },
  subtitle: { textAlign: 'center', color: '#666', marginBottom: 30 },
  button: { borderRadius: 12, width: '100%' }
});
