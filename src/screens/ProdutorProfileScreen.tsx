import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Avatar, Title, Caption, Text, Button, Divider, Surface } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as RootNavigation from '../services/RootNavigation';
import { AppVersion } from '../utils/AppVersion';
import { DocumentacaoScreen } from './DocumentacaoScreen';

export const ProdutorProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<any>();
  const [showDocumentacao, setShowDocumentacao] = useState(false);

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => logout && await logout() }
    ]);
  };

  const handleMenuPress = (route: string, label: string) => {
    if (route === 'Documentacao') {
      setShowDocumentacao(true);
      return;
    }

    // TODO FASE 2: Habilitar rotas reais quando as telas forem implementadas
    if (!route || route === 'Reports' || route === 'NotificationSettings') {
      Alert.alert('Em breve 💝', `A funcionalidade "${label}" estará disponível em breve.`);
      return;
    }
    
    // Rota ContaBancaria liberada
    try {
      // Validação preventiva de permissão no frontend
      const role = (user?.role || user?.activeRole || '').toLowerCase();
      if (role !== 'produtor' && role !== 'producer' && user?.role !== 'admin') {
        Alert.alert('ACESSO NEGADO', 'Seu perfil ainda não está configurado como Produtor.');
        return;
      }

      if (RootNavigation.navigationRef.isReady()) {
        RootNavigation.navigate(route);
        return;
      }

      if (navigation) {
        navigation.navigate(route);
        return;
      }
    } catch (error) {
      Alert.alert('ERRO DE SISTEMA', `Não foi possível abrir a tela: ${label}.`);
    }
  };

  const MenuItem = ({ title, subtitle, icon, route, color = "#9C27B0" }: { title: string, subtitle?: string, icon: string, route: string, color?: string }) => (
    <TouchableOpacity 
      onPress={() => handleMenuPress(route, title)}
      style={styles.menuItem}
      activeOpacity={0.7}
    >
      <Surface style={styles.menuSurface} elevation={1}>
        <View style={styles.menuItemContent}>
          <View style={styles.menuLeft}>
            <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
              <MaterialCommunityIcons name={icon as any} size={24} color={color} />
            </View>
            <View>
              <Text style={styles.menuTitle}>{title}</Text>
              {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#CCC" />
        </View>
      </Surface>
    </TouchableOpacity>
  );

  if (showDocumentacao) {
    return <DocumentacaoScreen onBack={() => setShowDocumentacao(false)} />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} bounces={false}>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="store" style={{ backgroundColor: '#9C27B0' }} />
          <Title style={styles.title}>{user?.nome || user?.name || 'Minha Confeitaria'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
        </View>

        <View style={styles.aiInsightContainer}>
          <Surface style={styles.aiInsightSurface} elevation={2}>
            <View style={styles.aiHeader}>
              <MaterialCommunityIcons name="robot-outline" size={20} color="#9C27B0" />
              <Text style={styles.aiTitle}>Assistente Açucaradas</Text>
            </View>
            <Text style={styles.aiText}>
              Sua estimativa de recebimento (Stripe) para esta semana é de <Text style={styles.aiHighlight}>R$ 850,00</Text>. Continue divulgando seus produtos!
            </Text>
          </Surface>
        </View>

        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>💰 Financeiro</Text>
          <MenuItem title="Carteira e Ganhos" subtitle="Saldo, repasses e histórico" icon="wallet" route="Reports" color="#4CAF50" />
          <MenuItem title="Conta Bancária" subtitle="Stripe Connect e Repasses" icon="bank" route="ContaBancaria" color="#2196F3" />

          <Text style={styles.sectionTitle}>📄 Identidade</Text>
          <MenuItem title="Documentação" subtitle="CPF/CNPJ e Verificação" icon="file-document-outline" route="Documentacao" color="#FF9800" />
          
          <Text style={styles.sectionTitle}>⚙️ Ajustes</Text>
          <MenuItem title="Preferências" subtitle="Notificações e WhatsApp" icon="bell-outline" route="NotificationSettings" color="#E91E63" />
          <MenuItem title="Segurança" subtitle="Senha e Login" icon="shield-lock-outline" route="" color="#607D8B" />
        </View>

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
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { paddingBottom: 40 },
  header: { alignItems: 'center', marginTop: 20, paddingBottom: 10, zIndex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 12, color: '#1A1A1A' },
  caption: { fontSize: 14, color: '#666' },
  
  aiInsightContainer: { paddingHorizontal: 16, marginTop: 10, marginBottom: 5 },
  aiInsightSurface: { borderRadius: 16, backgroundColor: '#F3E5F5', padding: 16, borderWidth: 1, borderColor: '#E1BEE7' },
  aiHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  aiTitle: { fontSize: 14, fontWeight: 'bold', color: '#9C27B0', marginLeft: 8 },
  aiText: { fontSize: 14, color: '#4A148C', lineHeight: 20 },
  aiHighlight: { fontWeight: 'bold' },

  menuContainer: { paddingHorizontal: 16, marginTop: 10, zIndex: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 12, marginLeft: 4 },
  menuItem: { marginBottom: 12, elevation: 1 },
  menuSurface: { borderRadius: 16, backgroundColor: '#fff', padding: 12 },
  menuItemContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuTitle: { fontSize: 16, color: '#333', fontWeight: 'bold' },
  menuSubtitle: { fontSize: 13, color: '#888', marginTop: 2 },
  
  footer: { padding: 30, alignItems: 'center', zIndex: 1, marginTop: 20 },
  buildText: { fontSize: 12, color: '#999', marginBottom: 15 },
  logoutBtn: { width: '100%', borderRadius: 12, height: 48, justifyContent: 'center' }
});
