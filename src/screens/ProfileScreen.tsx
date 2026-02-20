import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Avatar, Title, Caption, Text, TouchableRipple, List, SegmentedButtons, Switch, Snackbar, Button, useTheme, Divider } from 'react-native-paper';
import { UserProfileService } from '../services/UserProfileService';
import type { UserStats } from '../services/UserProfileService';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { Role, PermissionsService } from '../services/PermissionsService';
import { usePermissions } from '../hooks/usePermissions';
import { secureLoggingService } from '../services/SecureLoggingService';
import { loggingService } from '../services/LoggingService';
import { ScreenshotProtection } from '../components/ScreenshotProtection';

export const ProfileScreen = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { updatePermissions } = usePermissions();
  const rawRole: any = (user as any)?.activeRole ?? user?.role ?? 'customer';
  const isCourier = rawRole === 'courier' || rawRole === 'entregador';
  const isAdmin = user?.role === 'admin' || (user as any)?.activeRole === 'admin';
  const isProducerRole = PermissionsService.getInstance().isProducerRole(rawRole);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Array<'customer' | 'producer' | 'courier'>>(['customer']);
  const [activeRole, setActiveRole] = useState<'customer' | 'producer' | 'courier'>('customer');
  const [producerEnabled, setProducerEnabled] = useState<boolean>(false);
  const [courierEnabled, setCourierEnabled] = useState<boolean>(false);
  const [snackVisible, setSnackVisible] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(false);
  const [producerStatus, setProducerStatus] = useState<string | null>(null);
  const [courierStatus, setCourierStatus] = useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const rolesEnum = await PermissionsService.getInstance().getUserRoles();
        const mapped = rolesEnum.map(r => r === Role.GERENTE ? 'producer' : r === Role.ENTREGADOR ? 'courier' : 'customer');
        const uniq = Array.from(new Set(mapped));
        setAvailableRoles(uniq);
        setProducerEnabled(uniq.includes('producer'));
        setCourierEnabled(uniq.includes('courier'));
        const raw: any = (user as any)?.activeRole ?? (user as any)?.role ?? 'customer';
        const next: any = String(raw).toLowerCase();
        setActiveRole(next === 'courier' || next === 'entregador' ? 'courier' : (next === 'producer' || next === 'produtor' || next === 'admin') ? 'producer' : 'customer');

        // Buscar status dos perfis
        const { ProducerService } = await import('../services/ProducerService');
        const { DeliveryDriverService } = await import('../services/DeliveryDriverService');
        
        const producer = await ProducerService.getInstance().getProducerByUserId(user?.id || '');
        if (producer) setProducerStatus(producer.status);

        const driver = await DeliveryDriverService.getInstance().getDriverByUserId(user?.id || '');
        if (driver) setCourierStatus(driver.status);
      } catch {}
    })();
  }, [user?.id]);

  React.useEffect(() => {
    (async () => {
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
    })();
  }, [user?.id]);

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
    if (isAdmin) {
      navigation.navigate('AdminPanel');
      return;
    }
    if (isProducerRole) {
      navigation.navigate('AdminDashboard');
      return;
    }
    navigation.navigate('AdminPanel');
  };

  const trocarPapel = async (value: 'customer' | 'producer' | 'courier') => {
    try {
      if (!user?.id) {
        Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
        return;
      }
      const enumRole = value === 'producer' ? Role.GERENTE : value === 'courier' ? Role.ENTREGADOR : Role.CLIENTE;
      
      // Validação extra ao trocar de papel
      if (enumRole !== Role.CLIENTE) {
        const isReady = await PermissionsService.getInstance().isUserReadyForRole(user?.id || '', enumRole);
        if (!isReady) {
          Alert.alert(
            'Documentação Incompleta',
            'Seu cadastro para este perfil ainda não está completo ou não foi aprovado.',
            [{ text: 'OK' }]
          );
          // Reverter UI se necessário
          const raw: any = (user as any)?.activeRole ?? user?.role ?? 'customer';
          setActiveRole(raw === 'producer' ? 'producer' : raw === 'courier' ? 'courier' : 'customer');
          return;
        }
      }

      const ok = await PermissionsService.getInstance().setActiveRole(enumRole);
      if (!ok) {
        const raw: any = (user as any)?.activeRole ?? user?.role ?? 'customer';
        setActiveRole(raw === 'producer' ? 'producer' : raw === 'courier' ? 'courier' : 'customer');
        Alert.alert('Erro', 'Não foi possível atualizar o papel. Tente novamente.');
        return;
      }

      setActiveRole(value);
      await updatePermissions();
      const nextTabRaw = PermissionsService.getInstance().getDefaultTabForRole(value);
      const nextTab = (['Home', 'Profile', 'Orders'] as const).includes(nextTabRaw as any) ? nextTabRaw : 'Home';
      navigation.navigate('MainTabs');
      navigation.navigate('MainTabs', { screen: nextTab } as any);
    } catch (error) {
      loggingService.error('Erro ao trocar papel', error instanceof Error ? error : undefined);
    }
  };

  const showSnack = (msg: string) => { setSnackMsg(msg); setSnackVisible(true); };

  const toggleProducer = async (value: boolean) => {
    try {
      if (value) {
        const isReady = await PermissionsService.getInstance().isUserReadyForRole(user?.id || '', Role.GERENTE);
        if (!isReady) {
          Alert.alert(
            'Documentação Necessária',
            'Para se tornar um produtor, você precisa completar seu cadastro de loja e fornecer os documentos necessários (CPF/CNPJ).',
            [
              { text: 'Agora não', style: 'cancel', onPress: () => setProducerEnabled(false) },
              { 
                text: 'Completar Cadastro', 
                onPress: () => {
                  setProducerEnabled(false);
                  navigation.navigate('ProducerRegistration');
                } 
              }
            ]
          );
          return;
        }

        setProducerEnabled(true);
        const success = await PermissionsService.getInstance().addUserRole(Role.GERENTE, true);
        if (success) {
          setAvailableRoles(prev => Array.from(new Set([...prev, 'producer'])));
          await trocarPapel('producer');
          await updatePermissions();
          showSnack('Produtor habilitado');
        } else {
          setProducerEnabled(false);
          showSnack('Erro ao habilitar papel de Produtor');
        }
      } else {
        setProducerEnabled(false);
        await PermissionsService.getInstance().removeUserRole(Role.GERENTE);
        setAvailableRoles(prev => prev.filter(r => r !== 'producer'));
        if (activeRole === 'producer') {
          const next = availableRoles.includes('courier') ? 'courier' : 'customer';
          await trocarPapel(next as any);
        }
        await updatePermissions();
        showSnack('Produtor desabilitado');
      }
    } catch (error) { 
      loggingService.error('Erro ao alternar papel de produtor', error instanceof Error ? error : undefined);
      showSnack('Não foi possível atualizar papel Produtor'); 
    }
  };

  const toggleCourier = async (value: boolean) => {
    try {
      if (value) {
        const isReady = await PermissionsService.getInstance().isUserReadyForRole(user?.id || '', Role.ENTREGADOR);
        if (!isReady) {
          Alert.alert(
            'Documentação Necessária',
            'Para se tornar um entregador, você precisa completar seu cadastro, enviar foto dos documentos e realizar a validação facial.',
            [
              { text: 'Agora não', style: 'cancel', onPress: () => setCourierEnabled(false) },
              { 
                text: 'Completar Cadastro', 
                onPress: () => {
                  setCourierEnabled(false);
                  navigation.navigate('DeliveryDriverRegistration');
                } 
              }
            ]
          );
          return;
        }

        setCourierEnabled(true);
        const success = await PermissionsService.getInstance().addUserRole(Role.ENTREGADOR, false);
        if (success) {
          setAvailableRoles(prev => Array.from(new Set([...prev, 'courier'])));
          await updatePermissions();
          showSnack('Entregador habilitado');
        } else {
          setCourierEnabled(false);
          showSnack('Erro ao habilitar papel de Entregador');
        }
      } else {
        setCourierEnabled(false);
        await PermissionsService.getInstance().removeUserRole(Role.ENTREGADOR);
        setAvailableRoles(prev => prev.filter(r => r !== 'courier'));
        if (activeRole === 'courier') {
          const next = availableRoles.includes('producer') ? 'producer' : 'customer';
          await trocarPapel(next as any);
        }
        await updatePermissions();
        showSnack('Entregador desabilitado');
      }
    } catch (error) { 
      loggingService.error('Erro ao alternar papel de entregador', error instanceof Error ? error : undefined);
      showSnack('Não foi possível atualizar papel Entregador'); 
    }
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
              user?.perfil?.fotoPerfil ? { uri: user.perfil.fotoPerfil } : require('../../assets/icon.png')
            }
            size={80}
          />
          <View style={styles.userInfo}>
            <Title style={styles.title}>{user?.displayName || 'Usuário'}</Title>
            <Caption style={styles.caption}>{user?.email || ''}</Caption>
          </View>
      </View>
    </View>

      {isCourier && (
        <TouchableRipple onPress={() => navigation.navigate('DeliveryDriverProfile')}>
          <View style={[styles.adminButton, { backgroundColor: theme.colors.secondary, marginTop: 12 }]}>
            <MaterialCommunityIcons name="moped" color="#fff" size={22} />
            <Text style={styles.adminButtonText}>Perfil do Entregador</Text>
          </View>
        </TouchableRipple>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Estatísticas</Text>
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

      {(() => {
        const raw: any = (user as any)?.activeRole ?? (user as any)?.role;
        return PermissionsService.getInstance().isProducerRole(raw);
      })() && (
        <TouchableRipple onPress={navigateToAdminPanel}>
          <View style={styles.adminButton}>
            <MaterialCommunityIcons name="shield-account" color="#fff" size={22} />
            <Text style={styles.adminButtonText}>
              {isProducerRole && !isAdmin ? 'Painel do Produtor' : 'Painel de Administração'}
            </Text>
          </View>
        </TouchableRipple>
      )}

      <View style={styles.menuSection}>
        <Text style={styles.menuSectionTitle}>Configurações da Conta</Text>

        <List.Section>
          <List.Item
            title="Financeiro"
            description="Ver meus pagamentos, recebimentos e histórico financeiro"
            left={props => <List.Icon {...props} icon="cash-register" color={theme.colors.primary} />}
            onPress={() => {
              if (activeRole === 'producer') navigation.navigate('ProducerFinanceDashboard');
              else if (activeRole === 'courier') navigation.navigate('DriverFinanceDashboard');
              else navigation.navigate('CustomerFinanceDashboard');
            }}
          />
          <Divider />
          <View style={{ paddingHorizontal: 20, marginBottom: 8, marginTop: 16 }}>
            <Text style={styles.menuSectionTitle}>Gerenciar Papéis</Text>
            <View style={{ paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text>Habilitar Produtor</Text>
                  {producerStatus && (
                    <Text style={{ fontSize: 12, color: producerStatus === 'active' ? 'green' : producerStatus === 'pending' ? 'orange' : 'red' }}>
                      Status: {producerStatus === 'active' ? 'Ativo' : producerStatus === 'pending' ? 'Pendente' : 'Bloqueado'}
                    </Text>
                  )}
                </View>
                <Switch value={producerEnabled} onValueChange={toggleProducer} />
              </View>
            </View>

            <View style={{ paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                  <Text>Habilitar Entregador</Text>
                  {courierStatus && (
                    <Text style={{ fontSize: 12, color: courierStatus === 'active' ? 'green' : courierStatus === 'pending' ? 'orange' : 'red' }}>
                      Status: {courierStatus === 'active' ? 'Ativo' : courierStatus === 'pending' ? 'Pendente' : 'Bloqueado'}
                    </Text>
                  )}
                </View>
                <Switch value={courierEnabled} onValueChange={toggleCourier} />
              </View>
            </View>
          </View>
          {availableRoles.length > 1 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 8 }}>
              <Text style={styles.menuSectionTitle}>Papel ativo</Text>
              <SegmentedButtons
                value={activeRole}
                onValueChange={v => trocarPapel(v as any)}
                buttons={[
                  { value: 'customer', label: 'Comprador' },
                  { value: 'producer', label: 'Produtor', disabled: !availableRoles.includes('producer') },
                  { value: 'courier', label: 'Entregador', disabled: !availableRoles.includes('courier') },
                ]}
                style={{ marginTop: 8 }}
              />
            </View>
          )}

          {activeRole === 'courier' && (
            <View style={{ paddingHorizontal: 20, marginBottom: 16 }}>
              <Button
                mode="contained"
                icon="truck-delivery"
                onPress={() => navigation.navigate('DeliveryDriverProfile')}
                style={{ backgroundColor: theme.colors.primary }}
              >
                Perfil do Entregador
              </Button>
            </View>
          )}

          <List.Item
            title="Financeiro"
            description="Meus gastos e cashback"
            left={props => <List.Icon {...props} icon="bank-outline" />}
            right={props => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => {
              const role = (user as any)?.activeRole ?? (user as any)?.role;
              if (role === 'producer') {
                navigation.navigate('ProducerFinanceDashboard');
              } else if (role === 'courier' || role === 'driver') {
                navigation.navigate('DeliveryDriverProfile'); // Driver dashboard is linked from profile
              } else {
                navigation.navigate('CustomerFinanceDashboard');
              }
            }}
          />
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
            onPress={() => navigation.navigate('PrivacyPolicy' as any)}
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
