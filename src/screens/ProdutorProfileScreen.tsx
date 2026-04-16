import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, Button, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';

export const ProdutorProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => logout && await logout() }
    ]);
  };

  const navigateTo = (route: string) => {
    try {
      console.log(`🚀 [PRODUTOR_NAV] Navegando para: ${route}`);
      navigation.navigate(route);
    } catch (error) {
      console.error(`❌ [PRODUTOR_NAV] Erro ao navegar para ${route}:`, error);
      Alert.alert('Erro', 'Não foi possível abrir esta tela. Tente novamente.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="store" style={{ backgroundColor: '#9C27B0' }} />
          <Title style={styles.title}>{user?.nome || user?.name || 'Produtor'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
          <Text style={styles.roleTag}>PERFIL: PRODUTOR</Text>
        </View>

        <Divider style={styles.divider} />

        <List.Section style={styles.menu}>
          <List.Item
            title="Minha Loja"
            left={props => <List.Icon {...props} icon="store-cog" />}
            onPress={() => navigateTo('StorePreview')}
          />
          <List.Item
            title="Gerenciar Produtos"
            left={props => <List.Icon {...props} icon="package-variant-closed" />}
            onPress={() => navigateTo('ProductManagement')}
          />
          <List.Item
            title="Horários de Funcionamento"
            left={props => <List.Icon {...props} icon="clock-outline" />}
            onPress={() => navigateTo('EditProfile')}
          />
          <List.Item
            title="Pedidos Recebidos"
            left={props => <List.Icon {...props} icon="clipboard-list" />}
            onPress={() => navigateTo('OrderManagement')}
          />
          <List.Item
            title="Financeiro e Vendas"
            left={props => <List.Icon {...props} icon="cash-multiple" />}
            onPress={() => navigateTo('Reports')}
          />
        </List.Section>

        <View style={styles.footer}>
          <Text style={styles.buildText}>Versão 1.1.8 (Build 1133)</Text>
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
  roleTag: { color: '#9C27B0', fontWeight: 'bold', marginTop: 5 },
  divider: { marginVertical: 20 },
  menu: { paddingHorizontal: 10 },
  footer: { padding: 20, alignItems: 'center' },
  buildText: { fontSize: 12, color: '#999', marginBottom: 15 },
  logoutBtn: { width: '100%', borderRadius: 12 }
});
