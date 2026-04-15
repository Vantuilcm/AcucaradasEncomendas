import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, Button, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    try {
      Alert.alert(
        'Sair',
        'Deseja realmente sair da sua conta?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { 
            text: 'Sair', 
            style: 'destructive',
            onPress: async () => {
              if (logout) await logout();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  const safeNavigate = (screen: string) => {
    try {
      navigation.navigate(screen);
    } catch (error) {
      console.error(`Navigation to ${screen} failed`, error);
      Alert.alert('Erro', 'Não foi possível abrir esta tela no momento.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header Blindado */}
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="account" />
          <Title style={styles.title}>{user?.nome || user?.name || 'Usuário'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
          <Text style={styles.roleText}>Perfil: {user?.role || '-'}</Text>
        </View>

        <Divider style={styles.divider} />

        {/* Ações Reintroduzidas com Try/Catch (Build 1120) */}
        <View style={styles.menuSection}>
          <List.Item
            title="Editar Perfil"
            left={props => <List.Icon {...props} icon="account-edit" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => safeNavigate('EditProfile')}
          />
          <Divider />
          <List.Item
            title="Meus Endereços"
            left={props => <List.Icon {...props} icon="map-marker" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => safeNavigate('Address')}
          />
        </View>

        <View style={styles.infoSection}>
          <Text style={styles.infoLabel}>Build atual:</Text>
          <Text style={styles.infoValue}>Versão 1.1.8 (Build 1122)</Text>
        </View>

        <Button 
          mode="contained" 
          onPress={handleLogout} 
          style={styles.logoutButton}
          buttonColor="#FF3B30"
          icon="logout"
        >
          Sair da Conta
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { paddingBottom: 40 },
  header: { alignItems: 'center', marginVertical: 30, paddingHorizontal: 20 },
  title: { marginTop: 15, fontSize: 22, fontWeight: 'bold' },
  caption: { fontSize: 14, color: '#666' },
  roleText: { marginTop: 10, fontWeight: 'bold', color: '#E91E63', textTransform: 'uppercase' },
  divider: { width: '100%', marginVertical: 10 },
  menuSection: { width: '100%', backgroundColor: '#fff', marginBottom: 20 },
  infoSection: { width: '100%', alignItems: 'center', marginVertical: 30 },
  infoLabel: { fontSize: 12, color: '#999' },
  infoValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  logoutButton: { marginHorizontal: 20, marginTop: 10 },
});
