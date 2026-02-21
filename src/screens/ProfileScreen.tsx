import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, TouchableRipple, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { secureLoggingService } from '../services/SecureLoggingService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation();
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      secureLoggingService.security('Erro ao fazer logout', {
        userId: user?.uid,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const navigateToAdminPanel = () => {
    secureLoggingService.security('Acesso ao painel de administração', {
      userId: user?.uid,
      role: user?.role,
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
          userId: user?.uid,
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
          <Avatar.Image
            source={
              user?.photoURL ? { uri: user.photoURL } : require('../assets/default-avatar.png')
            }
            size={80}
          />
          <View style={styles.userInfo}>
            <Title style={styles.title}>{user?.displayName || 'Usuário'}</Title>
            <Caption style={styles.caption}>{user?.email || ''}</Caption>
          </View>
        </View>
      </View>

      {(user?.role === 'admin' || user?.role === 'producer') && (
        <TouchableRipple onPress={navigateToAdminPanel}>
          <View style={styles.adminButton}>
            <MaterialCommunityIcons name="shield-account" color="#fff" size={22} />
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
            <MaterialCommunityIcons name="logout" color="#fff" size={22} />
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
  adminButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 5,
  },
  adminButtonText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  menuSection: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 10,
    color: '#555',
  },
  logoutButton: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#fff',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  securityMessageContainer: {
    backgroundColor: '#FF6B6B',
    padding: 10,
    margin: 20,
    borderRadius: 5,
  },
  securityMessageText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
