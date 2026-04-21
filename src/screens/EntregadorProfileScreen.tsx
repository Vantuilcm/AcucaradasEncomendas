import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, Button, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import * as RootNavigation from '../services/RootNavigation';
import { AppVersion } from '../utils/AppVersion';

export const EntregadorProfileScreen = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => logout && await logout() }
    ]);
  };

  const navigateTo = (route: string) => {
    RootNavigation.navigate(route);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="motorbike" style={{ backgroundColor: '#4CAF50' }} />
          <Title style={styles.title}>{user?.nome || user?.name || 'Entregador'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
          <Text style={styles.roleTag}>PERFIL: ENTREGADOR</Text>
        </View>

        <Divider style={styles.divider} />

        <List.Section style={styles.menu}>
          <List.Item
            title="Meu Veículo"
            left={props => <List.Icon {...props} icon="car-info" />}
            onPress={() => navigateTo('DriverVehicle')}
          />
          <List.Item
            title="Dados Bancários (Pix)"
            left={props => <List.Icon {...props} icon="bank" />}
            onPress={() => navigateTo('DriverPix')}
          />
          <List.Item
            title="Meus Documentos"
            left={props => <List.Icon {...props} icon="file-document-outline" />}
            onPress={() => navigateTo('DriverDocuments')}
          />
          <List.Item
            title="Resumo de Ganhos"
            left={props => <List.Icon {...props} icon="cash-check" />}
            onPress={() => navigateTo('DriverEarnings')}
          />
          <List.Item
            title="Histórico de Corridas"
            left={props => <List.Icon {...props} icon="map-marker-distance" />}
            onPress={() => navigateTo('DriverHistory')}
          />
        </List.Section>

        <View style={styles.footer}>
          <Text style={styles.buildText}>{AppVersion.getDisplayString()}</Text>
          <Button mode="contained" onPress={handleLogout} style={styles.logoutBtn} buttonColor="#FF3B30">
            Sair da Conta
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 30 },
  header: { alignItems: 'center', marginTop: 30 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  caption: { fontSize: 14, color: '#666' },
  roleTag: { color: '#4CAF50', fontWeight: 'bold', marginTop: 5 },
  divider: { marginVertical: 20 },
  menu: { paddingHorizontal: 10 },
  footer: { padding: 20, alignItems: 'center' },
  buildText: { fontSize: 12, color: '#999', marginBottom: 15 },
  logoutBtn: { width: '100%', borderRadius: 12 }
});
