import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, Button, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export const CompradorProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => logout && await logout() }
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="account" style={{ backgroundColor: '#E91E63' }} />
          <Title style={styles.title}>{user?.nome || user?.name || 'Comprador'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
          <Text style={styles.roleTag}>PERFIL: COMPRADOR</Text>
        </View>

        <Divider style={styles.divider} />

        <List.Section style={styles.menu}>
          <List.Item
            title="Meus Endereços"
            left={props => <List.Icon {...props} icon="map-marker" />}
            onPress={() => navigation.navigate('Address')}
          />
          <List.Item
            title="Formas de Pagamento"
            left={props => <List.Icon {...props} icon="credit-card" />}
            onPress={() => navigation.navigate('PaymentMethods')}
          />
          <List.Item
            title="Histórico de Pedidos"
            left={props => <List.Icon {...props} icon="history" />}
            onPress={() => navigation.navigate('Orders')}
          />
          <List.Item
            title="Meus Favoritos"
            left={props => <List.Icon {...props} icon="heart" />}
            onPress={() => {}}
          />
        </List.Section>

        <View style={styles.footer}>
          <Text style={styles.buildText}>Versão 1.1.8 (Build 1130)</Text>
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
  roleTag: { color: '#E91E63', fontWeight: 'bold', marginTop: 5 },
  divider: { marginVertical: 20 },
  menu: { paddingHorizontal: 10 },
  footer: { padding: 20, alignItems: 'center' },
  buildText: { fontSize: 12, color: '#999', marginBottom: 15 },
  logoutBtn: { width: '100%', borderRadius: 12 }
});
