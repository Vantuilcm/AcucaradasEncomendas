import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { UserProfileService } from '../services/UserProfileService';
import { Permission } from '../services/PermissionsService';
import { ProtectedRoute } from '../components/ProtectedRoute';
import LoggingService from '../services/LoggingService';

const logger = LoggingService.getInstance();

const ProfileSettingsScreen = () => {
  const navigation = useNavigation<any>();
  const { user, loading: authLoading } = useAuth();
  const { hasPermission, userRole, loading: permissionsLoading } = usePermissions();
  const nativeAppVersion = Application.nativeApplicationVersion;
  const nativeBuildVersion = Application.nativeBuildVersion;
  const [loading, setLoading] = useState(false);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [profileData, setProfileData] = useState({
    nome: '',
    email: '',
    telefone: '',
    endereco: [] as any[],
    perfil: {
      fotoPerfil: '',
      notificacoes: {
        email: true,
        push: true,
        sms: false,
      },
      preferencias: {
        tema: 'sistema' as 'claro' | 'escuro' | 'sistema',
        linguagem: 'pt-BR',
      },
    },
  });

  const profileService = UserProfileService.getInstance();

  // Carregar dados do perfil
  useEffect(() => {
    const loadProfile = async () => {
      const userId = (user as any)?.uid ?? (user as any)?.id;
      if (!userId) return;

      try {
        setLoading(true);
        const profileWithReviews = await profileService.obterPerfilCompleto(userId);

        if (profileWithReviews) {
          setProfileData({
            nome: profileWithReviews.nome || '',
            email: profileWithReviews.email || '',
            telefone: profileWithReviews.telefone || '',
            endereco: profileWithReviews.endereco || [],
            perfil: {
              fotoPerfil: profileWithReviews.perfil?.fotoPerfil || '',
              notificacoes: {
                email: profileWithReviews.perfil?.notificacoes?.email ?? true,
                push: profileWithReviews.perfil?.notificacoes?.push ?? true,
                sms: profileWithReviews.perfil?.notificacoes?.sms ?? false,
              },
              preferencias: {
                tema: profileWithReviews.perfil?.preferencias?.tema ?? 'sistema',
                linguagem: profileWithReviews.perfil?.preferencias?.linguagem ?? 'pt-BR',
              },
            },
          });
        }
      } catch (error) {
        logger.error('Erro ao carregar perfil:', error instanceof Error ? error : new Error(String(error)));
        Alert.alert('Erro', 'Não foi possível carregar os dados do perfil.');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [user]);

  // Atualizar perfil básico
  const handleUpdateProfile = async () => {
    const userId = (user as any)?.uid ?? (user as any)?.id;
    if (!userId) return;

    try {
      setLoading(true);

      await profileService.atualizarPerfil(userId, {
        nome: profileData.nome,
        telefone: profileData.telefone,
      });

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (error) {
      logger.error('Erro ao atualizar perfil:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Não foi possível atualizar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar preferências
  const handleUpdatePreferences = async () => {
    const userId = (user as any)?.uid ?? (user as any)?.id;
    if (!userId) return;

    try {
      setLoading(true);

      await profileService.atualizarPreferencias(
        userId,
        profileData.perfil.preferencias.tema,
        profileData.perfil.preferencias.linguagem
      );
      await profileService.atualizarNotificacoes(userId, profileData.perfil.notificacoes);

      Alert.alert('Sucesso', 'Preferências atualizadas com sucesso!');
    } catch (error) {
      logger.error('Erro ao atualizar preferências:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Não foi possível atualizar as preferências.');
    } finally {
      setLoading(false);
    }
  };

  // Selecionar e carregar nova foto de perfil
  const handleSelectProfilePhoto = async () => {
    try {
      // Solicitar permissões
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permissão Negada', 'Precisamos de permissão para acessar suas fotos.');
        return;
      }

      // Selecionar imagem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.cancelled && result.assets && result.assets[0].uri) {
        setLoadingPhoto(true);

        try {
          const userId = (user as any)?.uid ?? (user as any)?.id;
          const photoUrl = await profileService.atualizarFotoPerfil(userId!, result.assets[0].uri);

          setProfileData({
            ...profileData,
            perfil: {
              ...profileData.perfil,
              fotoPerfil: photoUrl,
            },
          });

          Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');
        } catch (error) {
          logger.error('Erro ao atualizar foto:', error instanceof Error ? error : new Error(String(error)));
          Alert.alert('Erro', 'Não foi possível atualizar a foto de perfil.');
        } finally {
          setLoadingPhoto(false);
        }
      }
    } catch (error) {
      logger.error('Erro ao selecionar foto:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Ocorreu um erro ao selecionar a foto.');
    }
  };

  // Remover foto de perfil
  const handleRemoveProfilePhoto = async () => {
    try {
      const confirmacao = await new Promise<boolean>(resolve => {
        Alert.alert('Confirmar Exclusão', 'Tem certeza que deseja remover sua foto de perfil?', [
          { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Remover', style: 'destructive', onPress: () => resolve(true) },
        ]);
      });

      if (!confirmacao) return;

      setLoadingPhoto(true);

      try {
        const userId = (user as any)?.uid ?? (user as any)?.id;
        await profileService.removerFotoPerfil(userId!);

        setProfileData({
          ...profileData,
          perfil: {
            ...profileData.perfil,
            fotoPerfil: '',
          },
        });

        Alert.alert('Sucesso', 'Foto de perfil removida com sucesso!');
      } catch (error) {
        logger.error('Erro ao remover foto:', error instanceof Error ? error : new Error(String(error)));
        Alert.alert('Erro', 'Não foi possível remover a foto de perfil.');
      } finally {
        setLoadingPhoto(false);
      }
    } catch (error) {
      logger.error('Erro ao remover foto:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Ocorreu um erro ao remover a foto.');
    }
  };

  // Navegar para a tela de gestão de endereços
  const navigateToAddressManagement = () => {
    navigation.navigate('Address');
  };

  // Navegar para a tela de gerenciamento de usuários (se tiver permissão)
  const navigateToUserManagement = () => {
    navigation.navigate('AdminPanel');
  };

  // Navegar para a tela de configurações de segurança
  const navigateToSecuritySettings = () => {
    navigation.navigate('TwoFactorAuth');
  };

  // Logout
  const handleLogout = async () => {
    try {
      setLoading(true);
      // Implementar lógica de logout
      navigation.navigate('Login');
    } catch (error) {
      logger.error('Erro ao fazer logout:', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Erro', 'Não foi possível fazer logout.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || permissionsLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B6B" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <ProtectedRoute requiredPermissions={[Permission.EDITAR_PERFIL]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Configurações de Perfil</Text>
          <Text style={styles.subtitle}>Gerencie suas informações e preferências</Text>
        </View>

        {/* Seção de Foto de Perfil */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Foto de Perfil</Text>

          <View style={styles.photoContainer}>
            {loadingPhoto ? (
              <View style={styles.photoPlaceholder}>
                <ActivityIndicator size="large" color="#FF6B6B" />
              </View>
            ) : profileData.perfil.fotoPerfil ? (
              <Image source={{ uri: profileData.perfil.fotoPerfil }} style={styles.profilePhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="person" size={60} color="#DDD" />
              </View>
            )}

            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoButton} onPress={handleSelectProfilePhoto}>
                <Ionicons name="camera-outline" size={20} color="#FF6B6B" />
                <Text style={styles.photoButtonText}>Alterar Foto</Text>
              </TouchableOpacity>

              {profileData.perfil.fotoPerfil && (
                <TouchableOpacity
                  style={[styles.photoButton, styles.removeButton]}
                  onPress={handleRemoveProfilePhoto}
                >
                  <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  <Text style={[styles.photoButtonText, styles.removeButtonText]}>Remover</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Seção de Informações Pessoais */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Informações Pessoais</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome</Text>
            <TextInput
              style={styles.input}
              value={profileData.nome}
              onChangeText={text => setProfileData({ ...profileData, nome: text })}
              placeholder="Seu nome completo"
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>E-mail</Text>
            <TextInput
              style={[styles.input, styles.disabledInput]}
              value={profileData.email}
              editable={false}
            />
            <Text style={styles.helperText}>O e-mail não pode ser alterado diretamente</Text>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Telefone</Text>
            <TextInput
              style={styles.input}
              value={profileData.telefone}
              onChangeText={text => setProfileData({ ...profileData, telefone: text })}
              placeholder="(00) 00000-0000"
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleUpdateProfile}>
            <Text style={styles.buttonText}>Salvar Alterações</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Endereços */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Endereços</Text>

          <View style={styles.addressSummary}>
            <Text style={styles.addressCount}>
              {profileData.endereco.length}{' '}
              {profileData.endereco.length === 1 ? 'endereço cadastrado' : 'endereços cadastrados'}
            </Text>

            <TouchableOpacity style={styles.linkButton} onPress={navigateToAddressManagement}>
              <Text style={styles.linkButtonText}>Gerenciar Endereços</Text>
              <Ionicons name="chevron-forward" size={16} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Seção de Preferências */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferências</Text>

          <View style={styles.preferenceGroup}>
            <Text style={styles.label}>Tema</Text>
            <View style={styles.radioGroup}>
              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setProfileData({
                    ...profileData,
                    perfil: {
                      ...profileData.perfil,
                      preferencias: {
                        ...profileData.perfil.preferencias,
                        tema: 'claro',
                      },
                    },
                  })
                }
              >
                <View
                  style={[
                    styles.radio,
                    profileData.perfil.preferencias.tema === 'claro' && styles.radioSelected,
                  ]}
                >
                  {profileData.perfil.preferencias.tema === 'claro' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>Claro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setProfileData({
                    ...profileData,
                    perfil: {
                      ...profileData.perfil,
                      preferencias: {
                        ...profileData.perfil.preferencias,
                        tema: 'escuro',
                      },
                    },
                  })
                }
              >
                <View
                  style={[
                    styles.radio,
                    profileData.perfil.preferencias.tema === 'escuro' && styles.radioSelected,
                  ]}
                >
                  {profileData.perfil.preferencias.tema === 'escuro' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>Escuro</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.radioOption}
                onPress={() =>
                  setProfileData({
                    ...profileData,
                    perfil: {
                      ...profileData.perfil,
                      preferencias: {
                        ...profileData.perfil.preferencias,
                        tema: 'sistema',
                      },
                    },
                  })
                }
              >
                <View
                  style={[
                    styles.radio,
                    profileData.perfil.preferencias.tema === 'sistema' && styles.radioSelected,
                  ]}
                >
                  {profileData.perfil.preferencias.tema === 'sistema' && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <Text style={styles.radioLabel}>Sistema</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.preferenceGroup}>
            <Text style={styles.label}>Idioma</Text>
            <TouchableOpacity
              style={styles.selectInput}
              onPress={() =>
                Alert.alert('Em Breve', 'Esta funcionalidade estará disponível em breve!')
              }
            >
              <Text>Português (Brasil)</Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          <Text style={styles.subsectionTitle}>Notificações</Text>

          <View style={styles.switchItem}>
            <View>
              <Text style={styles.switchLabel}>Notificações por E-mail</Text>
              <Text style={styles.switchDescription}>Receber atualizações por e-mail</Text>
            </View>
            <Switch
              value={profileData.perfil.notificacoes.email}
              onValueChange={value =>
                setProfileData({
                  ...profileData,
                  perfil: {
                    ...profileData.perfil,
                    notificacoes: {
                      ...profileData.perfil.notificacoes,
                      email: value,
                    },
                  },
                })
              }
              trackColor={{ false: '#CCC', true: '#FFD0D0' }}
              thumbColor={profileData.perfil.notificacoes.email ? '#FF6B6B' : '#F4F4F4'}
            />
          </View>

          <View style={styles.switchItem}>
            <View>
              <Text style={styles.switchLabel}>Notificações Push</Text>
              <Text style={styles.switchDescription}>Receber alertas no aplicativo</Text>
            </View>
            <Switch
              value={profileData.perfil.notificacoes.push}
              onValueChange={value =>
                setProfileData({
                  ...profileData,
                  perfil: {
                    ...profileData.perfil,
                    notificacoes: {
                      ...profileData.perfil.notificacoes,
                      push: value,
                    },
                  },
                })
              }
              trackColor={{ false: '#CCC', true: '#FFD0D0' }}
              thumbColor={profileData.perfil.notificacoes.push ? '#FF6B6B' : '#F4F4F4'}
            />
          </View>

          <View style={styles.switchItem}>
            <View>
              <Text style={styles.switchLabel}>Notificações por SMS</Text>
              <Text style={styles.switchDescription}>Receber alertas por mensagem de texto</Text>
            </View>
            <Switch
              value={profileData.perfil.notificacoes.sms}
              onValueChange={value =>
                setProfileData({
                  ...profileData,
                  perfil: {
                    ...profileData.perfil,
                    notificacoes: {
                      ...profileData.perfil.notificacoes,
                      sms: value,
                    },
                  },
                })
              }
              trackColor={{ false: '#CCC', true: '#FFD0D0' }}
              thumbColor={profileData.perfil.notificacoes.sms ? '#FF6B6B' : '#F4F4F4'}
            />
          </View>

          <TouchableOpacity style={styles.button} onPress={handleUpdatePreferences}>
            <Text style={styles.buttonText}>Salvar Preferências</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Segurança */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Segurança</Text>

          <TouchableOpacity style={styles.menuItem} onPress={navigateToSecuritySettings}>
            <View style={styles.menuItemContent}>
              <Ionicons name="lock-closed-outline" size={22} color="#333" style={styles.menuIcon} />
              <View>
                <Text style={styles.menuItemTitle}>Configurações de Segurança</Text>
                <Text style={styles.menuItemDescription}>
                  Alterar senha, verificação em duas etapas
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
          </TouchableOpacity>
        </View>

        {/* Seção Admin (condicional) */}
        {hasPermission(Permission.GERENCIAR_USUARIOS) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Administração</Text>

            <TouchableOpacity style={styles.menuItem} onPress={navigateToUserManagement}>
              <View style={styles.menuItemContent}>
                <Ionicons name="people-outline" size={22} color="#333" style={styles.menuIcon} />
                <View>
                  <Text style={styles.menuItemTitle}>Gerenciar Usuários</Text>
                  <Text style={styles.menuItemDescription}>
                    Listar, editar e gerenciar usuários
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#CCC" />
            </TouchableOpacity>
          </View>
        )}

        {/* Botão de Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sair da Conta</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Perfil: {userRole || 'Cliente'}</Text>
          <Text style={styles.footerVersion}>
            Versão {nativeAppVersion || '—'}{nativeBuildVersion ? ` (${nativeBuildVersion})` : ''}
          </Text>
        </View>
      </ScrollView>
    </ProtectedRoute>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8F8',
  },
  contentContainer: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 16,
  },
  header: {
    backgroundColor: '#FF6B6B',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 10,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 12,
    marginTop: 4,
  },
  photoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  profilePhoto: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  photoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoButtons: {
    flex: 1,
    marginLeft: 20,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  photoButtonText: {
    marginLeft: 8,
    color: '#FF6B6B',
    fontSize: 14,
  },
  removeButton: {
    marginTop: 4,
  },
  removeButtonText: {
    color: '#FF3B30',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  disabledInput: {
    backgroundColor: '#F5F5F5',
    color: '#999',
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#FF6B6B',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  addressSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addressCount: {
    fontSize: 15,
    color: '#666',
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkButtonText: {
    color: '#FF6B6B',
    fontWeight: '500',
    marginRight: 4,
  },
  preferenceGroup: {
    marginBottom: 16,
  },
  radioGroup: {
    flexDirection: 'row',
    marginTop: 6,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  radio: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CCC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  radioSelected: {
    borderColor: '#FF6B6B',
  },
  radioInner: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B6B',
  },
  radioLabel: {
    fontSize: 14,
    color: '#666',
  },
  selectInput: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 16,
  },
  switchItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  switchLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#555',
  },
  switchDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    marginRight: 12,
  },
  menuItemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  logoutButton: {
    margin: 16,
    padding: 14,
    borderRadius: 8,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  logoutButtonText: {
    color: '#FF3B30',
    fontWeight: '600',
    fontSize: 16,
  },
  footer: {
    marginVertical: 16,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  footerText: {
    color: '#999',
    fontSize: 14,
    marginBottom: 8,
  },
  footerVersion: {
    color: '#CCC',
    fontSize: 12,
  },
});

export default ProfileSettingsScreen;
