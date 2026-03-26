import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { db } from '../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
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
            if (user.id === userId) {
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
    (navigation as any).navigate('UserEditScreen', { userId: usuario.id });
  };

  const renderItem = ({ item }: { item: User }) => {
    const role = ((item as any).role as string) || 'cliente';
    let roleColor = theme.colors.disabled;

    switch (role) {
      case 'admin':
        roleColor = theme.colors.error;
        break;
      case 'gerente':
        roleColor = theme.colors.tertiary;
        break;
      case 'atendente':
        roleColor = theme.colors.info;
        break;
      case 'entregador':
        roleColor = theme.colors.success;
        break;
    }

    return (
      <View style={[styles.userCard, { backgroundColor: theme.colors.card }]}>
        <View style={styles.userInfo}>
          <View style={[styles.userImagePlaceholder, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.userInitials}>
              {item.nome ? item.nome.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.colors.text.primary }]}>{item.nome || 'Usuário'}</Text>
            <Text style={[styles.userEmail, { color: theme.colors.text.secondary }]}>{item.email}</Text>
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
                        : 'Cliente'}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.userActions, { borderTopColor: theme.colors.border }]}>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]} 
            onPress={() => editarUsuario(item)}
          >
            <Ionicons name="create-outline" size={22} color={theme.colors.info} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]}
            onPress={() =>
              mudarPapelUsuario(
                item.id,
                role === 'admin'
                  ? 'gerente'
                  : role === 'gerente'
                    ? 'atendente'
                    : role === 'atendente'
                      ? 'cliente'
                      : role === 'cliente'
                        ? 'entregador'
                        : 'cliente'
              )
            }
          >
            <Ionicons name="swap-vertical" size={22} color={theme.colors.tertiary} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: theme.colors.surface }]} 
            onPress={() => resetarPermissoes(item.id)}
          >
            <Ionicons name="refresh" size={22} color={theme.colors.warning} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ProtectedRoute requiredPermissions={['manageUsers'] as any}>
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.title}>Gerenciamento de Usuários</Text>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => (navigation as any).navigate('UserEditScreen', { isNew: true })}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={[styles.searchContainer, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
          <View style={[styles.searchInputContainer, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="search" size={20} color={theme.colors.text.secondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text.primary }]}
              placeholder="Buscar usuários..."
              placeholderTextColor={theme.colors.text.disabled}
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
                <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.colors.surface },
                  filtroPapel === 'todos' && { backgroundColor: theme.colors.primary },
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
                    { color: theme.colors.text.secondary },
                    filtroPapel === 'todos' && { color: '#FFF' },
                  ]}
                >
                  Todos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.colors.surface },
                  filtroPapel === 'admin' && { backgroundColor: theme.colors.primary },
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
                    { color: theme.colors.text.secondary },
                    filtroPapel === 'admin' && { color: '#FFF' },
                  ]}
                >
                  Admins
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.colors.surface },
                  filtroPapel === 'gerente' && { backgroundColor: theme.colors.primary },
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
                    { color: theme.colors.text.secondary },
                    filtroPapel === 'gerente' && { color: '#FFF' },
                  ]}
                >
                  Gerentes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.colors.surface },
                  filtroPapel === 'atendente' && { backgroundColor: theme.colors.primary },
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
                    { color: theme.colors.text.secondary },
                    filtroPapel === 'atendente' && { color: '#FFF' },
                  ]}
                >
                  Atendentes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.colors.surface },
                  filtroPapel === 'entregador' && { backgroundColor: theme.colors.primary },
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
                    { color: theme.colors.text.secondary },
                    filtroPapel === 'entregador' && { color: '#FFF' },
                  ]}
                >
                  Entregadores
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  { backgroundColor: theme.colors.surface },
                  filtroPapel === 'cliente' && { backgroundColor: theme.colors.primary },
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
                    { color: theme.colors.text.secondary },
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
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>Carregando usuários...</Text>
          </View>
        ) : (
          <FlatList
            data={usuarios}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.colors.primary]} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={60} color={theme.colors.text.disabled} />
                <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
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
                  <ActivityIndicator size="small" color={theme.colors.primary} />
                  <Text style={[styles.footerText, { color: theme.colors.text.secondary }]}>Carregando mais usuários...</Text>
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