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
import { collection, query, where, getDocs, orderBy, limit, startAfter } from 'firebase/firestore';
import { User } from '../models/User';
import usePermissions from '../hooks/usePermissions';
import ProtectedRoute from '../components/ProtectedRoute';
import { PermissionsService, UserRole } from '../services/PermissionsService';
import { UserProfileService } from '../services/UserProfileService';

const USUARIOS_POR_PAGINA = 10;

const UserManagementScreen: React.FC = () => {
  const navigation = useNavigation();
  const { isAdmin, checkPermission } = usePermissions();
  const permissionsService = PermissionsService.getInstance();
  const profileService = UserProfileService.getInstance();

  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ultimoUsuario, setUltimoUsuario] = useState<any>(null);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const [temMais, setTemMais] = useState(true);
  const [termoBusca, setTermoBusca] = useState('');
  const [filtroPapel, setFiltroPapel] = useState<UserRole | 'todos'>('todos');

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
            startAfter(ultimoUsuario),
            limit(USUARIOS_POR_PAGINA)
          );
        }

        const snapshot = await getDocs(q);
        const listaUsuarios: User[] = [];

        snapshot.forEach(doc => {
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
      const temPermissao = await checkPermission('canManageUsers');
      if (!temPermissao && !isAdmin) {
        Alert.alert('Acesso Negado', 'Você não tem permissão para acessar esta área.');
        navigation.goBack();
      }
    };

    verificarPermissoes();
    carregarUsuarios(true);
  }, [carregarUsuarios, checkPermission, isAdmin, navigation]);

  const mudarPapelUsuario = async (userId: string, novoRole: UserRole) => {
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
    navigation.navigate('UserEditScreen' as never, { userId: usuario.id } as never);
  };

  const renderItem = ({ item }: { item: User }) => {
    const role = (item.role as UserRole) || 'cliente';
    let roleColor = '#757575'; // Default cinza para 'cliente'

    switch (role) {
      case 'admin':
        roleColor = '#D32F2F'; // Vermelho
        break;
      case 'gerente':
        roleColor = '#7B1FA2'; // Roxo
        break;
      case 'atendente':
        roleColor = '#1976D2'; // Azul
        break;
      case 'entregador':
        roleColor = '#388E3C'; // Verde
        break;
    }

    return (
      <View style={styles.userCard}>
        <View style={styles.userInfo}>
          <View style={styles.userImagePlaceholder}>
            <Text style={styles.userInitials}>
              {item.nome ? item.nome.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>

          <View style={styles.userDetails}>
            <Text style={styles.userName}>{item.nome || 'Usuário'}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
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

        <View style={styles.userActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => editarUsuario(item)}>
            <Ionicons name="create-outline" size={22} color="#1976D2" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
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
            <Ionicons name="swap-vertical" size={22} color="#7B1FA2" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => resetarPermissoes(item.id)}>
            <Ionicons name="refresh" size={22} color="#FF9800" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ProtectedRoute requiredPermission="canManageUsers">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Gerenciamento de Usuários</Text>

          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('UserEditScreen' as never, { isNew: true } as never)}
          >
            <Ionicons name="add" size={24} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#757575" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar usuários..."
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
                <Ionicons name="close-circle" size={20} color="#757575" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <TouchableOpacity
                style={[styles.filterButton, filtroPapel === 'todos' && styles.filterButtonActive]}
                onPress={() => {
                  setFiltroPapel('todos');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[styles.filterText, filtroPapel === 'todos' && styles.filterTextActive]}
                >
                  Todos
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.filterButton, filtroPapel === 'admin' && styles.filterButtonActive]}
                onPress={() => {
                  setFiltroPapel('admin');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[styles.filterText, filtroPapel === 'admin' && styles.filterTextActive]}
                >
                  Admins
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filtroPapel === 'gerente' && styles.filterButtonActive,
                ]}
                onPress={() => {
                  setFiltroPapel('gerente');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[styles.filterText, filtroPapel === 'gerente' && styles.filterTextActive]}
                >
                  Gerentes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filtroPapel === 'atendente' && styles.filterButtonActive,
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
                    filtroPapel === 'atendente' && styles.filterTextActive,
                  ]}
                >
                  Atendentes
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filtroPapel === 'entregador' && styles.filterButtonActive,
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
                    filtroPapel === 'entregador' && styles.filterTextActive,
                  ]}
                >
                  Entregadores
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,
                  filtroPapel === 'cliente' && styles.filterButtonActive,
                ]}
                onPress={() => {
                  setFiltroPapel('cliente');
                  setUltimoUsuario(null);
                  setTimeout(() => carregarUsuarios(true), 100);
                }}
              >
                <Text
                  style={[styles.filterText, filtroPapel === 'cliente' && styles.filterTextActive]}
                >
                  Clientes
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FE6B8B" />
            <Text style={styles.loadingText}>Carregando usuários...</Text>
          </View>
        ) : (
          <FlatList
            data={usuarios}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#FE6B8B']} />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="people" size={60} color="#CCCCCC" />
                <Text style={styles.emptyText}>
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
                  <ActivityIndicator size="small" color="#FE6B8B" />
                  <Text style={styles.footerText}>Carregando mais usuários...</Text>
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
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FE6B8B',
    padding: 16,
    paddingTop: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  addButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    backgroundColor: '#FFF',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
  },
  clearButton: {
    padding: 5,
  },
  filterContainer: {
    marginTop: 10,
  },
  filterButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: '#FE6B8B',
  },
  filterText: {
    color: '#757575',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#FFF',
  },
  listContainer: {
    padding: 10,
    paddingBottom: 20,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userImagePlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FE6B8B',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  userInitials: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  roleText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  footerLoading: {
    padding: 10,
    alignItems: 'center',
  },
  footerText: {
    marginTop: 5,
    fontSize: 14,
    color: '#666',
  },
});

export default UserManagementScreen;
