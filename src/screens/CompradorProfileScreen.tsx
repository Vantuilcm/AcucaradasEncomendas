import React from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, Button, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import * as RootNavigation from '../services/RootNavigation';
import { AppVersion } from '../utils/AppVersion';
import { useAppTheme } from '../components/ThemeProvider';

export const CompradorProfileScreen = () => {
  const { user, logout } = useAuth();
  const { theme } = useAppTheme();

  const handleLogout = async () => {
    Alert.alert('Sair', 'Deseja realmente sair?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: async () => logout && await logout() }
    ]);
  };

  const navigateTo = (route: string) => {
    try {
      RootNavigation.navigate(route);
    } catch (error) {
      console.log('Route not found:', route);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar.Icon size={80} icon="account" style={{ backgroundColor: theme.colors.primary }} />
          <Title style={styles.title}>{user?.nome || user?.name || 'Membro'}</Title>
          <Caption style={styles.caption}>{user?.email || '-'}</Caption>
          <View style={[styles.roleBadge, { backgroundColor: theme.colors.surfaceVariant || '#FCE4EC' }]}>
            <Text style={[styles.roleTag, { color: theme.colors.primary }]}>Membro Açucaradas</Text>
          </View>
        </View>

        <Divider style={styles.divider} />

        {/* Sugestões e Preferências Açucaradas */}
        <View style={styles.suggestionsContainer}>
          <Text style={styles.sectionTitle}>Feito para você 💝</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionScroll}>
            {['Doces Finos', 'Kits Presente', 'Sobremesas'].map((item, idx) => (
              <View key={idx} style={[styles.suggestionCard, { backgroundColor: theme.colors.surfaceVariant || '#F5F5F5' }]}>
                <Text style={styles.suggestionText}>{item}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <List.Section style={styles.menu}>
          <List.Item
            title="Meus Endereços"
            left={props => <List.Icon {...props} icon="map-marker" color={theme.colors.text.secondary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateTo('Address')}
          />
          <List.Item
            title="Formas de Pagamento"
            left={props => <List.Icon {...props} icon="credit-card" color={theme.colors.text.secondary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateTo('PaymentMethods')}
          />
          <List.Item
            title="Histórico de Pedidos"
            left={props => <List.Icon {...props} icon="history" color={theme.colors.text.secondary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateTo('OrdersHistory')}
          />
          <List.Item
            title="Meus Favoritos"
            left={props => <List.Icon {...props} icon="heart" color={theme.colors.text.secondary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateTo('Favorites')}
          />
          <List.Item
            title="Preferências"
            left={props => <List.Icon {...props} icon="cog-outline" color={theme.colors.text.secondary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateTo('NotificationSettings')}
          />
          <List.Item
            title="Central de Ajuda"
            left={props => <List.Icon {...props} icon="help-circle-outline" color={theme.colors.text.secondary} />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigateTo('HelpCenter')}
          />
        </List.Section>

        <View style={styles.footer}>
          <Text style={styles.buildText}>{AppVersion.getDisplayString()}</Text>
          <Button 
            mode="contained" 
            onPress={handleLogout} 
            style={styles.logoutBtn} 
            buttonColor={theme.colors.error || '#D32F2F'}
          >
            Sair da Conta
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 30 },
  header: { alignItems: 'center', marginTop: 30 },
  title: { fontSize: 22, fontWeight: 'bold', marginTop: 12, color: '#1A1A1A' },
  caption: { fontSize: 14, color: '#666' },
  roleBadge: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  roleTag: { fontWeight: 'bold', fontSize: 12 },
  divider: { marginVertical: 20 },
  suggestionsContainer: { paddingLeft: 20, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
  suggestionScroll: { paddingRight: 20 },
  suggestionCard: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionText: { fontWeight: '600', color: '#444' },
  menu: { paddingHorizontal: 10 },
  footer: { padding: 20, alignItems: 'center', marginTop: 20 },
  buildText: { fontSize: 12, color: '#999', marginBottom: 15 },
  logoutBtn: { width: '100%', borderRadius: 12 }
});
