import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, TouchableRipple, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { MainTabNavigationProp } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { secureLoggingService } from '../services/SecureLoggingService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';
import { useAppTheme } from '../components/ThemeProvider';
import { usePermissions } from '../hooks/usePermissions';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const { isProdutor, isAdmin } = usePermissions();
  const navigation = useNavigation<MainTabNavigationProp<'Profile'>>();
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      secureLoggingService.security('Erro ao fazer logout', {
        userId: user?.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const navigateToAdminPanel = () => {
    secureLoggingService.security('Acesso ao painel de administração', {
      userId: user?.id,
      isAdmin: user?.isAdmin,
      timestamp: new Date().toISOString()
    });
    navigation.navigate('AdminPanel');
  };

  return (
    <ScreenshotProtection
      enabled={true}
      blurContent={true}
      onScreenshotDetected={() => {
        setSecurityMessage('Captura de tela detectada! Por motivos de segurança, esta ação não é permitida.');
        secureLoggingService.security('Tentativa de captura de tela na tela de perfil', { 
          userId: user?.id,
          timestamp: new Date().toISOString(),
          severity: 'high'
        });
        
        // Limpar a mensagem após 5 segundos
        setTimeout(() => setSecurityMessage(null), 5000);
      }}
    >
      <ScrollView style={styles.container}>
      <View style={styles.userInfoSection}>
        <View style={styles.userRow}>
          {user?.perfil?.fotoPerfil ? (
            <Avatar.Image source={{ uri: user.perfil.fotoPerfil }} size={80} />
          ) : (
            <Avatar.Icon icon="account" size={80} style={{ backgroundColor: theme.colors.primary }} />
          )}
          <View style={styles.userInfo}>
            <Title style={styles.title}>{user?.nome || 'Usuário'}</Title>
            <Caption style={styles.caption}>{user?.email || ''}</Caption>
          </View>
        </View>
      </View>

      {(isProdutor || isAdmin) && (
        <TouchableRipple onPress={navigateToAdminPanel}>
          <View style={styles.adminButton}>
            <MaterialCommunityIcons name="shield-account" color={theme.colors.background} size={22} />
            <Text style={styles.adminButtonText}>Painel de Administração</Text>
          </View>
        </TouchableRipple>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Configurações da Conta</Text>

        <List.Section>
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
            onPress={() => navigation.navigate('NotificationSettings')}
          />
          <List.Item
            title="Configurações de Notificação V2"
            left={props => <List.Icon {...props} icon="bell-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('NotificationSettingsV2')}
          />
          <List.Item
            title="Migração de Notificações"
            description="Migre para o novo sistema de notificações"
            left={props => <List.Icon {...props} icon="bell-ring" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('NotificationSettingsMigration')}
          />
        </List.Section>

        <List.Section>
          <Text style={styles.menuSectionTitle}>Suporte</Text>
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
            onPress={() => navigation.navigate('PrivacySettings')}
          />
          <List.Item
            title="Termos de Uso"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('TermsOfUse')}
          />
        </List.Section>

        <TouchableRipple onPress={handleLogout}>
          <View style={styles.logoutButton}>
            <MaterialCommunityIcons name="logout" color={theme.colors.background} size={22} />
            <Text style={styles.logoutButtonText}>Sair</Text>
          </View>
        </TouchableRipple>
      </View>
      
      {securityMessage && (
        <View style={styles.securityMessageContainer}>
          <Text style={styles.securityMessageText}>{securityMessage}</Text>
        </View>
      )}
    </ScrollView>
    </ScreenshotProtection>
  );
};

const createStyles = (theme: { colors: any }) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  userInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: theme.colors.card,
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
    color: theme.colors.text.primary,
  },
  caption: {
    fontSize: 14,
    lineHeight: 14,
    color: theme.colors.text.secondary,
  },
  adminButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 5,
  },
  adminButtonText: {
    color: theme.colors.background,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  menuSection: {
    flex: 1,
    backgroundColor: theme.colors.card,
    paddingTop: 20,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 10,
    color: theme.colors.text.primary,
  },
  logoutButton: {
    backgroundColor: theme.colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: theme.colors.background,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  securityMessageContainer: {
    backgroundColor: theme.colors.error,
    padding: 10,
    margin: 20,
    borderRadius: 5,
  },
  securityMessageText: {
    color: theme.colors.background,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
