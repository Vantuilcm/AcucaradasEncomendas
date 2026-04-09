import React, { useState, useEffect, useCallback } from 'react';
import { f } from '../config/firebase';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, Alert, RefreshControl, ScrollView, } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db } from '../config/firebase';
const { collection, query, where, getDocs, orderBy, limit } = f;
import { UserUtils } from '../utils/UserUtils';
import { User } from '../models/User';
import usePermissions from '../hooks/usePermissions';
import ProtectedRoute from '../components/ProtectedRoute';
import { PermissionsService } from '../services/PermissionsService';
import { UserProfileService } from '../services/UserProfileService';
import { useAppTheme } from '../components/ThemeProvider';

const USUARIOS_POR_PAGINA = 10;

const UserManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAdmin } = usePermissions();
  const { theme } = useAppTheme();
  const permissionsService = (PermissionsService as any).getInstance();
  const profileService = UserProfileService.getInstance();

  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ultimoUsuario, setUltimoUsuario] = useState<any>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<string | 'todos'>('todos');

  const carregarUsuarios = useCallback(
    async (limpar = false) => {
      try {
        if (limpar) {
          setLoading(true);
          setUltimoUsuario(null);
        } else {
          setCarregandoMais(true);
        }

        const usuariosRef = collection(db, 'usuarios');
        let q;

        if (filtroPapel !== 'todos') {
          q = query(
            usuariosRef,
            where('role', '==', filtroPapel),
            orderBy('dataCriacao', 'desc'),
            limit(USUARIOS_POR_PAGINA)
          );
        } else {
          q = query(usuariosRef, orderBy('dataCriacao', 'desc'), limit(USUARIOS_POR_PAGINA));
        }

        if (ultimoUsuario && !limpar) {
          q = query(
            usuariosRef,
            orderBy('dataCriacao', 'desc'),
            // firestoreStartAfter(ultimoUsuario),
            limit(USUARIOS_POR_PAGINA)
          ); 
        }

        const snapshot = await getDocs(q);
        const listaUsuarios: User[] = [];

        snapshot.docs.forEach((doc: any) => {
          listaUsuarios.push({ id: doc.id, ...doc.data() } as User);
        });

        if (limpar) {
          setUsuarios(listaUsuarios);
        } else {
          setUsuarios(prev => [...prev, ...listaUsuarios]);
        }

        setTemMais(listaUsuarios.length === USUARIOS_POR_PAGINA);

        if (listaUsuarios.length > 0) {
          setUltimoUsuario(snapshot.docs[snapshot.docs.length - 1]);
        }
      } catch (error) {
        console.error('Erro ao carregar usuários:', error);
        Alert.alert('Erro', 'Não foi possível carregar a lista de usuários.');
      } finally {
        setLoading(false);
        setCarregandoMais(false);
        setRefreshing(false);
      }
    },
    [ultimoUsuario, filtroPapel]
  );

  const buscarUsuario = useCallback(async () => {
    if (!termoBusca || termoBusca.length < 3) {
      carregarUsuarios(true);
      return;
    }

    try {
      setLoading(true);
      const usuariosEncontrados = await profileService.searchUsers(termoBusca, 20);
      setUsuarios(usuariosEncontrados);
      setTemMais(false);
    } catch (error) {
      console.error('Erro ao buscar usuários:', error);
      Alert.alert('Erro', 'Não foi possível realizar a busca.');
    } finally {
      setLoading(false);
    }
  }, [termoBusca, carregarUsuarios]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    carregarUsuarios(true);
  }, [carregarUsuarios]);

  useEffect(() => {
    const verificarPermissoes = async () => {
      if (!isAdmin) {
        Alert.alert('Acesso Negado', 'Você não tem permissão para acessar esta área.');
        navigation.goBack();
      }
    };

    verificarPermissoes();
    carregarUsuarios(true);
  }, [carregarUsuarios, isAdmin, navigation]);

  const mudarPapelUsuario = async (userId: string, novoRole: string) => {
    try {
      const confirmacao = await new Promise<boolean>(resolve => {
        Alert.alert(
          'Confirmar Alteração',
          `Deseja alterar o papel deste usuário para ${novoRole}?`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirmar', onPress: () => resolve(true) },
          ]
        );
      });

      if (!confirmacao) return;

      setLoading(true);
      const sucesso = await permissionsService.changeUserRole(userId, novoRole);

      if (sucesso) {
        // Atualizar o usuário na lista
        setUsuarios(
          usuarios.map(user => {
            if (UserUtils.getUserId(user) === userId) {
              return { ...user, role: novoRole };
            }
            return user;
          })
        );

        Alert.alert('Sucesso', 'Papel do usuário alterado com sucesso!');
      } else {
        Alert.alert('Erro', 'Não foi possível alterar o papel do usuário.');
      }
    } catch (error) {
      console.error('Erro ao alterar papel do usuário:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao alterar o papel do usuário.');
    } finally {
      setLoading(false);
    }
  };

  const resetarPermissoes = async (userId: string) => {
    try {
      const confirmacao = await new Promise<boolean>(resolve => {
        Alert.alert(
          'Confirmar Reset',
          'Deseja redefinir as permissões deste usuário para o padrão do seu papel?',
          [
            { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Confirmar', onPress: () => resolve(true) },
          ]
        );
      });

      if (!confirmacao) return;

      setLoading(true);
      const sucesso = await permissionsService.resetPermissionsToDefault(userId);

      if (sucesso) {
        Alert.alert('Sucesso', 'Permissões redefinidas com sucesso!');
      } else {
        Alert.alert('Erro', 'Não foi possível redefinir as permissões do usuário.');
      }
    } catch (error) {
      console.error('Erro ao redefinir permissões:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao redefinir as permissões do usuário.');
    } finally {
      setLoading(false);
    }
  };

  const editarUsuario = (usuario: User) => {
    (navigation as any).navigate('UserEditScreen', { userId: UserUtils.getUserId(usuario) });
  };

  const renderItem = ({ item }: { item: User }) => {
    const role = UserUtils.getUserRole(item) || 'cliente';
    let roleColor = theme?.colors?.disabled || '#9E9E9E';

    switch (role) {
      case 'admin':
        roleColor = theme?.colors?.error || '#F44336';
        break;
      case 'gerente':
        roleColor = theme?.colors?.tertiary || '#795548';
        break;
      case 'atendente':
        roleColor = theme?.colors?.info || '#2196F3';
        break;
      case 'entregador':
        roleColor = theme?.colors?.success || '#4CAF50';
        break;
      case 'produtor':
        roleColor = theme?.colors?.primary || '#E91E63';
        break;
    }

    const userId = UserUtils.getUserId(item);
    const userName = UserUtils.getUserName(item);
    const userEmail = UserUtils.getUserEmail(item);

    return (
      <View style={[styles.userCard, { backgroundColor: theme?.colors?.card || '#FFFFFF' }]}>
        <View style={styles.userInfo}>
          <View style={[styles.userImagePlaceholder, { backgroundColor: theme?.colors?.primary || '#E91E63' }]}>
            <Text style={styles.userInitials}>
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme?.colors?.text?.primary || '#000000' }]}>{userName || 'Usuário'}</Text>
            <Text style={[styles.userEmail, { color: theme?.colors?.text?.secondary || '#757575' }]}>{userEmail || ''}</Text>
            <View style={[styles.roleBadge, { backgroundColor: roleColor }]}>
              <Text style={styles.roleText}>
                {role === 'admin'
                  ? 'Administrador'
                  : role === 'gerente'
                    ? 'Gerente'
                    : role === 'atendente'
                      ? 'Atendente'
                      : role === 'entregador'
                        ? 'Entregador'
                        : role === 'produtor'
                          ? 'Produtor'
                          : 'Comprador'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.userActions, { borderTopColor: theme?.colors?.border || '#EEEEEE' }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme?.colors?.surface || '#F5F5F5' }]} 
            onPress={() => editarUsuario(item)}
          >
            <Ionicons name="create-outline" size={22} color={theme?.colors?.info || '#2196F3'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme?.colors?.surface || '#F5F5F5' }]}
            onPress={() =>
              userId && mudarPapelUsuario(
                userId,
                role === 'admin'
                  ? 'gerente'
                  : role === 'gerente'
                    ? 'atendente'
                    : role === 'atendente'
                      ? 'cliente'
                      : role === 'cliente'
                        ? 'entregador'
                        : role === 'entregador'
                          ? 'produtor'
                          : 'cliente'
              )
            }
          >
            <Ionicons name="swap-vertical" size={22} color={theme?.colors?.tertiary || '#795548'} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme?.colors?.surface || '#F5F5F5' }]} 
            onPress={() => userId && resetarPermissoes(userId)}
          >
            <Ionicons name="refresh" size={22} color={theme?.colors?.warning || '#FF9800'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ProtectedRoute requiredPermissions={['manageUsers'] as any}>
      <View style={[styles.container, { backgroundColor: theme?.colors?.background || '#F5F5F5' }]}>
        <View style={[styles.header, { backgroundColor: theme?.colors?.primary || '#E91E63' }]}>
          <Text style={styles.title}>Gerenciamento de Usuários</Text>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => (navigation as any).navigate('UserEditScreen', { isNew: true })}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme?.colors?.card || '#FFFFFF', borderBottomColor: theme?.colors?.border || '#EEEEEE' }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme?.colors?.surface || '#F5F5F5' }]}>
            <Ionicons name="search" size={20} color={theme?.colors?.text?.secondary || '#757575'} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme?.colors?.text?.primary || '#000000' }]}
              placeholder="Buscar usuários..."
              placeholderTextColor={theme?.colors?.text?.disabled || '#9E9E9E'}
              value={termoBusca}
              onChangeText={setTermoBusca}
              onSubmitEditing={buscarUsuario}
              returnKeyType="search"
            />
            {termoBusca.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setTermoBusca('');
                  carregarUsuarios(true);
                }}
                style={styles.clearButton}
              >
                <Ionicons name="close-circle" size={20} color={theme?.colors?.text?.secondary || '#757575'} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme?.colors?.surface || '#F5F5F5' },
                  filtroPapel === 'todos' && { backgroundColor: theme?.colors?.primary || '#E91E63' },
                ]}
                onPress={() => {
                  setFiltroPapel('todos');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: theme?.colors?.text?.secondary || '#757575' },
                    filtroPapel === 'todos' && { color: '#FFF' },
                  ]}
                >
                  Todos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme?.colors?.surface || '#F5F5F5' },
                  filtroPapel === 'admin' && { backgroundColor: theme?.colors?.primary || '#E91E63' },
                ]}
                onPress={() => {
                  setFiltroPapel('admin');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: theme?.colors?.text?.secondary || '#757575' },
                    filtroPapel === 'admin' && { color: '#FFF' },
                  ]}
                >
                  Admins
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme?.colors?.surface || '#F5F5F5' },
                  filtroPapel === 'gerente' && { backgroundColor: theme?.colors?.primary || '#E91E63' },
                ]}
                onPress={() => {
                  setFiltroPapel('gerente');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: theme?.colors?.text?.secondary || '#757575' },
                    filtroPapel === 'gerente' && { color: '#FFF' },
                  ]}
                >
                  Gerentes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme?.colors?.surface || '#F5F5F5' },
                  filtroPapel === 'atendente' && { backgroundColor: theme?.colors?.primary || '#E91E63' },
                ]}
                onPress={() => {
                  setFiltroPapel('atendente');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: theme?.colors?.text?.secondary || '#757575' },
                    filtroPapel === 'atendente' && { color: '#FFF' },
                  ]}
                >
                  Atendentes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme?.colors?.surface || '#F5F5F5' },
                  filtroPapel === 'entregador' && { backgroundColor: theme?.colors?.primary || '#E91E63' },
                ]}
                onPress={() => {
                  setFiltroPapel('entregador');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: theme?.colors?.text?.secondary || '#757575' },
                    filtroPapel === 'entregador' && { color: '#FFF' },
                  ]}
                >
                  Entregadores
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme?.colors?.surface || '#F5F5F5' },
                  filtroPapel === 'cliente' && { backgroundColor: theme?.colors?.primary || '#E91E63' },
                ]}
                onPress={() => {
                  setFiltroPapel('cliente');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: theme?.colors?.text?.secondary || '#757575' },
                    filtroPapel === 'cliente' && { color: '#FFF' },
                  ]}
                >
                  Clientes
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme?.colors?.primary || '#E91E63'} />
            <Text style={[styles.loadingText, { color: theme?.colors?.text?.secondary || '#757575' }]}>Carregando usuários...</Text>
          </View>
        ) : (
          <FlatList
            data={usuarios}
            keyExtractor={item => UserUtils.getUserId(item) || Math.random().toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme?.colors?.primary || '#E91E63']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={60} color={theme?.colors?.text?.disabled || '#9E9E9E'} />
                <Text style={[styles.emptyText, { color: theme?.colors?.text?.secondary || '#757575' }]}>
                  {termoBusca ? 'Nenhum usuário encontrado' : 'Não há usuários cadastrados'}
                </Text>
              </View>
            }
            onEndReached={() => {
              if (!carregandoMais && temMais && !termoBusca) {
                carregarUsuarios();
              }
            }}
            onEndReachedThreshold={0.1}
            ListFooterComponent={
              carregandoMais ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color={theme?.colors?.primary || '#E91E63'} />
                  <Text style={[styles.footerText, { color: theme?.colors?.text?.secondary || '#757575' }]}>Carregando mais usuários...</Text>
                </View>
              ) : null
            }
          />
        )}
      </View>
    </ProtectedRoute>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFF',
    letterSpacing: 0.5,
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 16,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    marginTop: -10,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
  },
  clearButton: {
    padding: 8,
  },
  filterContainer: {
    marginTop: 12,
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  },
  filterText: {
    fontWeight: '600',
    fontSize: 14,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  userImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userInitials: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 6,
    opacity: 0.8,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    marginTop: 50,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    textAlign: 'center',
  },
  footerLoading: {
    padding: 10,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 5,
    fontSize: 14,
  },
});

export default UserManagementScreen;