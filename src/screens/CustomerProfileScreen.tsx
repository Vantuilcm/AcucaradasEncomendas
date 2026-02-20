import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, TouchableRipple, List, Button, useTheme, Snackbar, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfileService } from '@/services/UserProfileService';
import type { UserStats } from '@/services/UserProfileService';
import { secureLoggingService } from '@/services/SecureLoggingService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ScreenshotProtection } from '@/components/ScreenshotProtection';

export const CustomerProfileScreen = () => {
  const { user, logout, deleteAccount } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        if (!user?.id) return;
        setStatsLoading(true);
        const svc = UserProfileService.getInstance();
        const s = await svc.getUserStats(user.id);
        setStats(s);
      } catch {}
      finally {
        setStatsLoading(false);
      }
    };
    loadStats();
  }, [user?.id]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      secureLoggingService.security('Erro ao fazer logout (comprador)', {
        userId: user?.uid,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const showSnack = (msg: string) => {
    setSnackMsg(msg);
    setSnackVisible(true);
  };

  return (
    <ScreenshotProtection
      enabled
      blurContent
      onScreenshotDetected={() => {
        setSecurityMessage('Captura de tela detectada.');
        secureLoggingService.security('Tentativa de captura de tela na tela de perfil do comprador', {
          userId: user?.uid,
          timestamp: new Date().toISOString(),
          severity: 'medium'
        });
        setTimeout(() => setSecurityMessage(null), 5000);
      }}
    >
      <ScrollView style={styles.container}>
        <View style={styles.userInfoSection}>
          <View style={styles.userRow}>
            <Avatar.Image
              source={
                user?.perfil?.fotoPerfil ? { uri: user.perfil.fotoPerfil } : require('../../assets/icon.png')
              }
              size={80}
            />
            <View style={styles.userInfo}>
              <Title style={styles.title}>{user?.displayName || 'Comprador'}</Title>
              <Caption style={styles.caption}>{user?.email || ''}</Caption>
            </View>
          </View>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Resumo de uso</Text>
          <List.Section>
            {statsLoading ? (
              <View style={{ paddingHorizontal: 20, paddingVertical: 8 }}>
                <Text>Carregando...</Text>
              </View>
            ) : (
              <View style={{ paddingHorizontal: 20 }}>
                <List.Item title={`Total de pedidos: ${stats?.totalPedidos ?? 0}`} />
                <List.Item title={`Média de avaliações: ${stats ? stats.mediaAvaliacoes : 0}`} />
                <List.Item title={`Último pedido: ${stats?.ultimoPedido ?? '—'}`} />
              </View>
            )}
          </List.Section>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Minha conta</Text>
          <List.Section>
            <List.Item
              title="Meus gastos e cashback"
              left={props => <List.Icon {...props} icon="bank-outline" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('CustomerFinanceDashboard')}
            />
            <Divider />
            <List.Item
              title="Editar Perfil"
              left={props => <List.Icon {...props} icon="account-edit" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('EditProfile')}
            />
            <List.Item
              title="Endereços"
              left={props => <List.Icon {...props} icon="map-marker" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('Address')}
            />
            <List.Item
              title="Métodos de Pagamento"
              left={props => <List.Icon {...props} icon="credit-card" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('PaymentMethods')}
            />
            <List.Item
              title="Configurações de Notificação"
              left={props => <List.Icon {...props} icon="bell" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('NotificationSettingsV2')}
            />
          </List.Section>
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.menuSectionTitle}>Ajuda e privacidade</Text>
          <List.Section>
            <List.Item
              title="Central de Ajuda"
              left={props => <List.Icon {...props} icon="help-circle" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('HelpCenter')}
            />
            <List.Item
              title="Política de Privacidade"
              left={props => <List.Icon {...props} icon="shield-lock" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('PrivacyPolicy' as any)}
            />
            <List.Item
              title="Termos de Uso"
              left={props => <List.Icon {...props} icon="file-document" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => navigation.navigate('TermsOfUse')}
            />
          </List.Section>
        </View>

        <TouchableRipple onPress={handleLogout}>
          <View style={styles.logoutButton}>
            <MaterialCommunityIcons name="logout" color="#fff" size={22} />
            <Text style={styles.logoutButtonText}>Sair</Text>
          </View>
        </TouchableRipple>

        {typeof deleteAccount === 'function' && (
          <TouchableRipple onPress={deleteAccount}>
            <View style={styles.deleteAccountButton}>
              <MaterialCommunityIcons name="account-remove" color="#fff" size={22} />
              <Text style={styles.deleteAccountButtonText}>Excluir conta</Text>
            </View>
          </TouchableRipple>
        )}

        <Snackbar visible={snackVisible} onDismiss={() => setSnackVisible(false)} duration={2500}>
          {snackMsg}
        </Snackbar>

        {securityMessage && (
          <View style={styles.securityMessageContainer}>
            <Text style={styles.securityMessageText}>{securityMessage}</Text>
          </View>
        )}
      </ScrollView>
    </ScreenshotProtection>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: '#fff',
    marginBottom: 20,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  caption: {
    fontSize: 14,
    lineHeight: 14,
    color: '#999',
  },
  menuSection: {
    marginTop: 10,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
  },
  logoutButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  deleteAccountButton: {
    backgroundColor: '#9e9e9e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 5,
  },
  deleteAccountButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  securityMessageContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 10,
    borderRadius: 4,
    backgroundColor: '#ffebee',
  },
  securityMessageText: {
    color: '#b71c1c',
    fontSize: 12,
  },
});

export default CustomerProfileScreen;
