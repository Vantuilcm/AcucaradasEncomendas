import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Avatar, Title, Caption, Text, Button, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';

export function DeliveryDriverProfileScreen() {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      if (logout) await logout();
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="motorbike" />
          <Title style={styles.title}>{user?.nome || user?.name || 'Entregador'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
          <Text style={styles.roleText}>Perfil: ENTREGADOR</Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Build atual:</Text>
          <Text style={styles.infoValue}>Versão 1.1.8 (Build 1117)</Text>
        </View>

        <Button 
          mode="contained" 
          onPress={handleLogout} 
          style={styles.logoutButton}
          buttonColor="#FF3B30"
        >
          Sair da Conta
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { padding: 20, alignItems: 'center' },
  header: { alignItems: 'center', marginVertical: 30 },
  title: { marginTop: 15, fontSize: 22, fontWeight: 'bold' },
  caption: { fontSize: 14, color: '#666' },
  roleText: { marginTop: 10, fontWeight: 'bold', color: '#4CAF50', textTransform: 'uppercase' },
  divider: { width: '100%', marginVertical: 20 },
  infoSection: { width: '100%', alignItems: 'center', marginBottom: 40 },
  infoLabel: { fontSize: 12, color: '#999' },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  logoutButton: { width: '100%', marginTop: 20 },
});
