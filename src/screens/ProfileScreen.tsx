import React, { useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Avatar, Title, Caption, Text, TouchableRipple, List } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { MainTabNavigationProp } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { UserUtils } from '../utils/UserUtils';
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
      if (logout) {
        await logout();
      }
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      secureLoggingService.security('Erro ao fazer logout', {
        userId: user?.id,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        timestamp: new Date().toISOString()
      });
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    }
  };

  const navigateToAdminPanel = () => {
    try {
      secureLoggingService.security('Acesso ao painel de administração', {
        userId: user?.id,
        isAdmin: user?.isAdmin,
        timestamp: new Date().toISOString()
      });
      navigation.navigate('AdminPanel');
    } catch (error) {
      console.error('Erro ao navegar para o painel de admin:', error);
    }
  };

  if (!user) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={theme?.colors?.primary || '#000000'} />
      </View>
    );
  }

  return (
    <ScreenshotProtection
      enabled={true}
      blurContent={true}
      onScreenshotDetected={() => {
        setSecurityMessage('Captura de tela detectada! Por motivos de segurança, esta ação não é permitida.');
        secureLoggingService.security('Tentativa de captura de tela na tela de perfil', { 
          userId: UserUtils.getUserId(user),
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
            <Avatar.Icon icon="account" size={80} style={{ backgroundColor: theme?.colors?.primary || '#000000' }} />
          )}
          <View style={styles.userInfo}>
            <Title style={styles.title}>{UserUtils.getUserName(user) || 'Usuário'}</Title>
            <Caption style={styles.caption}>{UserUtils.getUserEmail(user) || ''}</Caption>
          </View>
        </View>
      </View>

      {(isProdutor || isAdmin) && (
        <View style={styles.producerSection}>
          <Text style={styles.menuSectionTitle}>Área do Produtor</Text>
          <List.Section>
            <List.Item
              title="Minha Loja (Produtos)"
              description="Adicionar e gerenciar produtos"
              left={props => <List.Icon {...props} icon="store" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                try {
                  navigation.navigate('ProductManagement' as any);
                } catch (error) {
                  console.error('Erro ao navegar para ProductManagement:', error);
                }
              }}
            />
            <List.Item
              title="Pedidos Recebidos"
              description="Gerenciar pedidos dos clientes"
              left={props => <List.Icon {...props} icon="clipboard-list" />}
              right={props => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => {
                try {
                  navigation.navigate('OrderManagement' as any);
                } catch (error) {
                  console.error('Erro ao navegar para OrderManagement:', error);
                }
              }}
            />
          </List.Section>
          
          {isAdmin && (
            <TouchableRipple onPress={navigateToAdminPanel}>
              <View style={styles.adminButton}>
                <MaterialCommunityIcons name="shield-account" color={theme?.colors?.background || '#FFFFFF'} size={22} />
                <Text style={styles.adminButtonText}>Painel de Administração</Text>
              </View>
            </TouchableRipple>
          )}
        </View>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Configurações da Conta</Text>

        <List.Section>
          <List.Item
            title="Editar Perfil"
            left={props => <List.Icon {...props} icon="account-edit" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('EditProfile');
              } catch (error) {
                console.error('Erro ao navegar para EditProfile:', error);
              }
            }}
          />
          <List.Item
            title="Endereços"
            left={props => <List.Icon {...props} icon="map-marker" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('Address');
              } catch (error) {
                console.error('Erro ao navegar para Address:', error);
              }
            }}
          />
          <List.Item
            title="Métodos de Pagamento"
            left={props => <List.Icon {...props} icon="credit-card" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('PaymentMethods');
              } catch (error) {
                console.error('Erro ao navegar para PaymentMethods:', error);
              }
            }}
          />
          <List.Item
            title="Configurações de Notificação"
            left={props => <List.Icon {...props} icon="bell" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('NotificationSettings');
              } catch (error) {
                console.error('Erro ao navegar para NotificationSettings:', error);
              }
            }}
          />
          <List.Item
            title="Configurações de Notificação V2"
            left={props => <List.Icon {...props} icon="bell-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('NotificationSettingsV2');
              } catch (error) {
                console.error('Erro ao navegar para NotificationSettingsV2:', error);
              }
            }}
          />
          <List.Item
            title="Migração de Notificações"
            description="Migre para o novo sistema de notificações"
            left={props => <List.Icon {...props} icon="bell-ring" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('NotificationSettingsMigration');
              } catch (error) {
                console.error('Erro ao navegar para NotificationSettingsMigration:', error);
              }
            }}
          />
        </List.Section>

        <List.Section>
          <Text style={styles.menuSectionTitle}>Trabalhe Conosco</Text>
          <List.Item
            title="Seja um Entregador"
            description="Cadastre-se para realizar entregas"
            left={props => <List.Icon {...props} icon="motorbike" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('DeliveryDriverRegistration' as any);
              } catch (error) {
                console.error('Erro ao navegar para DeliveryDriverRegistration:', error);
              }
            }}
          />
        </List.Section>

        <List.Section>
          <Text style={styles.menuSectionTitle}>Suporte</Text>
          <List.Item
            title="Central de Ajuda"
            left={props => <List.Icon {...props} icon="help-circle" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('HelpCenter');
              } catch (error) {
                console.error('Erro ao navegar para HelpCenter:', error);
              }
            }}
          />
          <List.Item
            title="Política de Privacidade"
            left={props => <List.Icon {...props} icon="shield-lock" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('PrivacySettings');
              } catch (error) {
                console.error('Erro ao navegar para PrivacySettings:', error);
              }
            }}
          />
          <List.Item
            title="Termos de Uso"
            left={props => <List.Icon {...props} icon="file-document" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              try {
                navigation.navigate('TermsOfUse');
              } catch (error) {
                console.error('Erro ao navegar para TermsOfUse:', error);
              }
            }}
          />
        </List.Section>

        <TouchableRipple onPress={handleLogout}>
          <View style={styles.logoutButton}>
            <MaterialCommunityIcons name="logout" color={theme?.colors?.background || '#FFFFFF'} size={22} />
            <Text style={styles.logoutButtonText}>Sair</Text>
          </View>
        </TouchableRipple>

        <View style={styles.footer}>
          <Text style={styles.versionText}>Versão 1.1.8 (Build 1105)</Text>
        </View>
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
    backgroundColor: theme?.colors?.background || '#FFFFFF',
  },
  userInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: theme?.colors?.card || '#FFFFFF',
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
    fontSize: 24,
    fontWeight: 'bold',
    color: theme?.colors?.text?.primary || '#000000',
  },
  caption: {
    fontSize: 14,
    lineHeight: 14,
    color: theme?.colors?.text?.secondary || '#666666',
  },
  producerSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  adminButton: {
    backgroundColor: theme?.colors?.primary || '#E91E63',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 5,
  },
  adminButtonText: {
    color: theme?.colors?.background || '#FFFFFF',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  menuSection: {
    flex: 1,
    backgroundColor: theme?.colors?.card || '#FFFFFF',
    paddingTop: 20,
  },
  menuSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 20,
    marginBottom: 10,
    color: theme?.colors?.text?.primary || '#000000',
  },
  logoutButton: {
    backgroundColor: theme?.colors?.error || '#FF0000',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginVertical: 20,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: theme?.colors?.background || '#FFFFFF',
    marginLeft: 10,
    fontWeight: 'bold',
  },
  footer: {
    marginTop: 32,
    marginBottom: 40,
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: '#9E9E9E',
    opacity: 0.8,
  },
  securityMessageContainer: {
    backgroundColor: theme?.colors?.error || '#FF0000',
    padding: 10,
    margin: 20,
    borderRadius: 5,
  },
  securityMessageText: {
    color: theme?.colors?.background || '#FFFFFF',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
