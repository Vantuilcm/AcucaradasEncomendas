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
          <Avatar.Icon size={80} icon="moped" style={{ backgroundColor: '#E8F5E9' }} color="#4CAF50" />
          <Title style={styles.title}>{user?.nome || user?.name || 'Entregador'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
          <View style={styles.roleTagContainer}>
            <Text style={styles.roleTag}>Parceiro de Entregas Açucaradas 🛵</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        <List.Section style={styles.menu}>
          <View style={styles.menuCard}>
            <List.Item
              title="Meu Veículo"
              titleStyle={styles.menuTitle}
              left={props => <List.Icon {...props} icon="car-info" color="#555" />}
              onPress={() => navigateTo('DriverVehicle')}
              style={styles.menuItem}
            />
          </View>
          <View style={styles.menuCard}>
            <List.Item
              title="Dados Bancários (Pix)"
              titleStyle={styles.menuTitle}
              left={props => <List.Icon {...props} icon="bank" color="#555" />}
              onPress={() => navigateTo('DriverPix')}
              style={styles.menuItem}
            />
          </View>
          <View style={styles.menuCard}>
            <List.Item
              title="Meus Documentos"
              titleStyle={styles.menuTitle}
              left={props => <List.Icon {...props} icon="file-document-outline" color="#555" />}
              onPress={() => navigateTo('DriverDocuments')}
              style={styles.menuItem}
            />
          </View>
          <View style={styles.menuCard}>
            <List.Item
              title="Resumo de Ganhos"
              titleStyle={styles.menuTitle}
              left={props => <List.Icon {...props} icon="cash-check" color="#4CAF50" />}
              onPress={() => navigateTo('DriverEarnings')}
              style={styles.menuItem}
            />
          </View>
          <View style={styles.menuCard}>
            <List.Item
              title="Histórico de Corridas"
              titleStyle={styles.menuTitle}
              left={props => <List.Icon {...props} icon="map-marker-distance" color="#555" />}
              onPress={() => navigateTo('DriverHistory')}
              style={styles.menuItem}
            />
          </View>
        </List.Section>

        <View style={styles.footer}>
          <Text style={styles.buildText}>{AppVersion.getDisplayString()}</Text>
          <Button mode="contained" onPress={handleLogout} style={styles.logoutBtn} labelStyle={styles.logoutBtnText} buttonColor="#FF3B30">
            Sair da Conta
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingBottom: 30 },
  header: { alignItems: 'center', marginTop: 30, paddingHorizontal: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 16, color: '#333' },
  caption: { fontSize: 14, color: '#666', marginTop: 4 },
  roleTagContainer: { backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginTop: 12 },
  roleTag: { color: '#2E7D32', fontWeight: 'bold', fontSize: 12 },
  divider: { marginVertical: 24, backgroundColor: '#eee', height: 1 },
  menu: { paddingHorizontal: 16 },
  menuCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    overflow: 'hidden',
  },
  menuItem: { paddingVertical: 4 },
  menuTitle: { fontSize: 16, fontWeight: '500', color: '#424242' },
  footer: { padding: 24, alignItems: 'center', marginTop: 16 },
  buildText: { fontSize: 12, color: '#9E9E9E', marginBottom: 16 },
  logoutBtn: { width: '100%', borderRadius: 12, paddingVertical: 6 },
  logoutBtnText: { fontSize: 16, fontWeight: 'bold', letterSpacing: 0.5 }
});
