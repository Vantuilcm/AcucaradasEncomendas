import React from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Avatar, Title, Caption, Text, Button, Divider, List, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as RootNavigation from '../services/RootNavigation';

export const ProdutorProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => logout && await logout() }
    ]);
  };

  const navigateTo = (route: string, label: string) => {
    try {
      console.log(`🚀 [PRODUTOR_NAV] Navegando via RootService para: ${label} -> Rota: ${route}`);
      // Usar o serviço de navegação global para garantir que saia das abas e encontre o Root Stack
      RootNavigation.navigate(route);
    } catch (error) {
      console.error(`❌ [PRODUTOR_NAV] Erro ao navegar para ${route}:`, error);
      Alert.alert('ERRO ROTA', `Não foi possível abrir a tela: ${label}`);
    }
  };

  const MenuItem = ({ title, icon, route }: { title: string, icon: string, route: string }) => (
    <TouchableOpacity 
      onPress={() => navigateTo(route, title)}
      style={styles.menuItem}
      activeOpacity={0.7}
    >
      <Surface style={styles.menuSurface} elevation={1}>
        <View style={styles.menuItemContent}>
          <View style={styles.menuLeft}>
            <MaterialCommunityIcons name={icon as any} size={24} color="#9C27B0" />
            <Text style={styles.menuTitle}>{title}</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
        </View>
      </Surface>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="store" style={{ backgroundColor: '#9C27B0' }} />
          <Title style={styles.title}>{user?.nome || user?.name || 'Produtor'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
          <Text style={styles.roleTag}>PERFIL: PRODUTOR</Text>
        </View>

        <Divider style={styles.divider} />

        <View style={styles.menuContainer}>
          <MenuItem title="Minha Loja" icon="store-cog" route="StorePreview" />
          <MenuItem title="Gerenciar Produtos" icon="package-variant-closed" route="ProductManagement" />
          <MenuItem title="Horários de Funcionamento" icon="clock-outline" route="EditProfile" />
          <MenuItem title="Pedidos Recebidos" icon="clipboard-list" route="OrderManagement" />
          <MenuItem title="Financeiro e Vendas" icon="cash-multiple" route="Reports" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.buildText}>Versão 1.1.8 (Build 1138)</Text>
          <Button mode="contained" onPress={handleLogout} style={styles.logoutBtn} buttonColor="#FF3B30">
            Sair da Conta
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  content: { paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 30, backgroundColor: '#fff', paddingBottom: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 10 },
  caption: { fontSize: 14, color: '#666' },
  roleTag: { color: '#9C27B0', fontWeight: 'bold', marginTop: 5 },
  divider: { marginVertical: 10, backgroundColor: 'transparent' },
  menuContainer: { paddingHorizontal: 16, marginTop: 10 },
  menuItem: { marginBottom: 12 },
  menuSurface: { borderRadius: 12, backgroundColor: '#fff', padding: 16 },
  menuItemContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuLeft: { flexDirection: 'row', alignItems: 'center' },
  menuTitle: { fontSize: 16, marginLeft: 16, color: '#333', fontWeight: '500' },
  footer: { padding: 30, alignItems: 'center' },
  buildText: { fontSize: 12, color: '#999', marginBottom: 15 },
  logoutBtn: { width: '100%', borderRadius: 12, height: 48, justifyContent: 'center' }
});
