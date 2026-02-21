import { loggingService } from './LoggingService';
import { db, storage } from '../config/firebase';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  query,
  collection,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { User, Address } from '../models/User';
import { ReviewService } from './ReviewService';
import { ValidationService } from './validationService';

export interface ProfileUpdateData {
  nome?: string;
  telefone?: string;
  cpf?: string;
  endereco?: Address[];
  perfil?: {
    fotoPerfil?: string;
    notificacoes?: {
      email?: boolean;
      push?: boolean;
      sms?: boolean;
    };
    preferencias?: {
      tema?: 'claro' | 'escuro' | 'sistema';
      linguagem?: string;
    };
  };
}

export interface UserStats {
  totalPedidos: number;
  totalAvaliacoes: number;
  mediaAvaliacoes: number;
  dataCriacao: string;
  ultimoPedido: string | null;
  pedidosRecentes: any[];
  avaliacoesRecentes: any[];
}

export class UserProfileService {
  private static instance: UserProfileService;
  private readonly reviewService: ReviewService;
  private readonly usersCollection = 'usuarios';
  private readonly ordersCollection = 'pedidos';
  private readonly profilePicsPath = 'profile_pictures';

  private constructor() {
    this.reviewService = ReviewService.getInstance();
  }

  public static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService();
    }
    return UserProfileService.instance;
  }

  /**
   * Obtém o perfil completo do usuário, incluindo estatísticas e avaliações
   * @param userId ID do usuário
   * @returns Perfil completo do usuário
   */
  public async getFullUserProfile(userId: string): Promise<User & { stats?: UserStats }> {
    try {
      const userDoc = await getDoc(doc(db, this.usersCollection, userId));

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data() as User;
      userData.id = userId;

      // Obter estatísticas do usuário
      const stats = await this.getUserStats(userId);

      return {
        ...userData,
        stats,
      };
    } catch (error) {
      loggingService.error('Erro ao obter perfil do usuário', { error, userId });
      throw error;
    }
  }

  /**
   * Atualiza o perfil do usuário
   * @param userId ID do usuário
   * @param profileData Dados do perfil a serem atualizados
   * @returns Perfil atualizado do usuário
   */
  public async updateUserProfile(userId: string, profileData: ProfileUpdateData): Promise<User> {
    try {
      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      // Limpar dados indefinidos para não sobrescrever com null
      Object.keys(profileData).forEach(key => {
        if (profileData[key] === undefined) {
          delete profileData[key];
        }
      });

      // Adicionar timestamp de atualização
      const updateData = {
        ...profileData,
        dataAtualizacao: serverTimestamp(),
      };

      await updateDoc(userRef, updateData);

      // Obter dados atualizados
      const updatedDoc = await getDoc(userRef);
      const updatedUserData = updatedDoc.data() as User;
      updatedUserData.id = userId;

      loggingService.info('Perfil de usuário atualizado com sucesso', { userId });

      return updatedUserData;
    } catch (error) {
      loggingService.error('Erro ao atualizar perfil do usuário', { error, userId });
      throw error;
    }
  }

  /**
   * Atualiza a foto de perfil do usuário
   * @param userId ID do usuário
   * @param photoUri URI ou base64 da foto
   * @returns URL da foto atualizada
   */
  public async updateProfilePicture(userId: string, photoUri: string): Promise<string> {
    try {
      // Verificar se o usuário existe
      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar se já existe uma foto para excluir
      const userData = userDoc.data();
      const oldPhotoUrl = userData?.perfil?.fotoPerfil;

      if (oldPhotoUrl) {
        try {
          // Tentar excluir a foto antiga
          const oldPhotoRef = ref(storage, oldPhotoUrl);
          await deleteObject(oldPhotoRef);
        } catch (error) {
          // Se não conseguir excluir (pode não existir mais), apenas log
          loggingService.warn('Não foi possível excluir a foto antiga', { error, userId });
        }
      }

      // Upload da nova foto
      const filename = `${userId}_${Date.now()}.jpg`;
      const storageRef = ref(storage, `${this.profilePicsPath}/${filename}`);

      // Se for base64, converter para blob
      let photoBlob;
      if (photoUri.startsWith('data:image')) {
        const response = await fetch(photoUri);
        photoBlob = await response.blob();
      } else {
        // Caso seja um arquivo local do dispositivo
        const response = await fetch(photoUri);
        photoBlob = await response.blob();
      }

      // Realizar upload
      await uploadBytes(storageRef, photoBlob);

      // Obter URL pública
      const photoUrl = await getDownloadURL(storageRef);

      // Atualizar referência no perfil do usuário
      await updateDoc(userRef, {
        'perfil.fotoPerfil': photoUrl,
        dataAtualizacao: serverTimestamp(),
      });

      loggingService.info('Foto de perfil atualizada com sucesso', { userId });

      return photoUrl;
    } catch (error) {
      loggingService.error('Erro ao atualizar foto de perfil', { error, userId });
      throw error;
    }
  }

  /**
   * Adiciona um novo endereço ao usuário
   * @param userId ID do usuário
   * @param address Dados do endereço
   * @returns Lista atualizada de endereços
   */
  public async addUserAddress(userId: string, address: Address): Promise<Address[]> {
    try {
      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data();
      const enderecos = userData.endereco || [];

      // Se for marcado como principal, desmarca os outros
      if (address.principal) {
        enderecos.forEach(end => {
          end.principal = false;
        });
      }

      // Se não houver endereços, este será o principal
      if (enderecos.length === 0) {
        address.principal = true;
      }

      enderecos.push(address);

      await updateDoc(userRef, {
        endereco: enderecos,
        dataAtualizacao: serverTimestamp(),
      });

      loggingService.info('Endereço adicionado com sucesso', { userId });

      return enderecos;
    } catch (error) {
      loggingService.error('Erro ao adicionar endereço', { error, userId });
      throw error;
    }
  }

  /**
   * Remove um endereço do usuário
   * @param userId ID do usuário
   * @param addressIndex Índice do endereço a ser removido
   * @returns Lista atualizada de endereços
   */
  public async removeUserAddress(userId: string, addressIndex: number): Promise<Address[]> {
    try {
      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data();
      const enderecos = userData.endereco || [];

      if (addressIndex < 0 || addressIndex >= enderecos.length) {
        throw new Error('Endereço não encontrado');
      }

      // Verificar se o endereço a ser removido é o principal
      const removedAddress = enderecos[addressIndex];
      const wasPrincipal = removedAddress.principal;

      // Remover o endereço
      enderecos.splice(addressIndex, 1);

      // Se o endereço removido era o principal e ainda há endereços, definir o primeiro como principal
      if (wasPrincipal && enderecos.length > 0) {
        enderecos[0].principal = true;
      }

      await updateDoc(userRef, {
        endereco: enderecos,
        dataAtualizacao: serverTimestamp(),
      });

      loggingService.info('Endereço removido com sucesso', { userId });

      return enderecos;
    } catch (error) {
      loggingService.error('Erro ao remover endereço', { error, userId });
      throw error;
    }
  }

  /**
   * Define um endereço como o principal
   * @param userId ID do usuário
   * @param addressIndex Índice do endereço a ser definido como principal
   * @returns Lista atualizada de endereços
   */
  public async setAddressAsPrimary(userId: string, addressIndex: number): Promise<Address[]> {
    try {
      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data();
      const enderecos = userData.endereco || [];

      if (addressIndex < 0 || addressIndex >= enderecos.length) {
        throw new Error('Endereço não encontrado');
      }

      // Definir todos como não principal
      enderecos.forEach((end, i) => {
        end.principal = i === addressIndex;
      });

      await updateDoc(userRef, {
        endereco: enderecos,
        dataAtualizacao: serverTimestamp(),
      });

      loggingService.info('Endereço principal definido com sucesso', { userId });

      return enderecos;
    } catch (error) {
      loggingService.error('Erro ao definir endereço principal', { error, userId });
      throw error;
    }
  }

  /**
   * Obtém estatísticas do usuário, incluindo pedidos e avaliações
   * @param userId ID do usuário
   * @returns Estatísticas do usuário
   */
  public async getUserStats(userId: string): Promise<UserStats> {
    try {
      // Obter pedidos do usuário
      const pedidosQuery = query(
        collection(db, this.ordersCollection),
        where('usuarioId', '==', userId),
        orderBy('dataCriacao', 'desc')
      );

      const pedidosSnap = await getDocs(pedidosQuery);
      const pedidos = pedidosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Obter avaliações do usuário
      const avaliacoes = await this.reviewService.getUserReviews(userId);

      // Calcular média das avaliações
      let somaAvaliacoes = 0;
      avaliacoes.forEach(avaliacao => {
        somaAvaliacoes += avaliacao.nota;
      });

      const mediaAvaliacoes = avaliacoes.length > 0 ? somaAvaliacoes / avaliacoes.length : 0;

      // Obter dados de criação da conta
      const userDoc = await getDoc(doc(db, this.usersCollection, userId));
      const userData = userDoc.data();

      return {
        totalPedidos: pedidos.length,
        totalAvaliacoes: avaliacoes.length,
        mediaAvaliacoes: Number(mediaAvaliacoes.toFixed(1)),
        dataCriacao: userData?.dataCriacao?.toDate?.() || new Date().toISOString(),
        ultimoPedido: pedidos.length > 0 ? pedidos[0].dataCriacao?.toDate?.() || null : null,
        pedidosRecentes: pedidos.slice(0, 5),
        avaliacoesRecentes: avaliacoes.slice(0, 5),
      };
    } catch (error) {
      loggingService.error('Erro ao obter estatísticas do usuário', { error, userId });
      // Retornar estatísticas vazias em caso de erro
      return {
        totalPedidos: 0,
        totalAvaliacoes: 0,
        mediaAvaliacoes: 0,
        dataCriacao: new Date().toISOString(),
        ultimoPedido: null,
        pedidosRecentes: [],
        avaliacoesRecentes: [],
      };
    }
  }

  /**
   * Verifica se o CPF já está em uso
   * @param cpf CPF a ser verificado
   * @param currentUserId ID do usuário atual (para exclusão na verificação)
   * @returns Se o CPF já está em uso
   */
  public async isCPFInUse(cpf: string, currentUserId?: string): Promise<boolean> {
    try {
      if (!cpf) return false;

      // Normalizar CPF (remover pontos e traços)
      const normalizedCPF = cpf.replace(/[.-]/g, '');

      const q = query(collection(db, this.usersCollection), where('cpf', '==', normalizedCPF));

      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        return false;
      }

      // Se estiver atualizando o próprio usuário, verificar se o CPF pertence a outro usuário
      if (currentUserId) {
        return querySnapshot.docs.some(doc => doc.id !== currentUserId);
      }

      return true;
    } catch (error) {
      loggingService.error('Erro ao verificar CPF', { error, cpf });
      return false;
    }
  }

  /**
   * Busca usuários por nome ou email
   * @param query Termo de busca
   * @param maxResults Máximo de resultados
   * @returns Lista de usuários encontrados
   */
  public async searchUsers(searchQuery: string, maxResults: number = 10): Promise<User[]> {
    try {
      if (!searchQuery || searchQuery.length < 3) {
        return [];
      }

      // Normalizar a query para busca (lowercase)
      const normalizedQuery = searchQuery.toLowerCase();

      // Buscar por nome
      const nameQuery = query(
        collection(db, this.usersCollection),
        where('nomeLowercase', '>=', normalizedQuery),
        where('nomeLowercase', '<=', normalizedQuery + '\uf8ff'),
        limit(maxResults)
      );

      // Buscar por email
      const emailQuery = query(
        collection(db, this.usersCollection),
        where('email', '>=', normalizedQuery),
        where('email', '<=', normalizedQuery + '\uf8ff'),
        limit(maxResults)
      );

      // Executar as queries
      const [nameResults, emailResults] = await Promise.all([
        getDocs(nameQuery),
        getDocs(emailQuery),
      ]);

      // Combinar resultados sem duplicatas
      const results = new Map<string, User>();

      nameResults.docs.forEach(doc => {
        results.set(doc.id, { id: doc.id, ...doc.data() } as User);
      });

      emailResults.docs.forEach(doc => {
        if (!results.has(doc.id)) {
          results.set(doc.id, { id: doc.id, ...doc.data() } as User);
        }
      });

      // Converter para array e limitar resultados
      return Array.from(results.values()).slice(0, maxResults);
    } catch (error) {
      loggingService.error('Erro ao buscar usuários', { error, searchQuery });
      return [];
    }
  }

  /**
   * Atualiza preferências de notificação do usuário
   * @param userId ID do usuário
   * @param preferences Preferências de notificação
   * @returns Confirmação de sucesso
   */
  public async updateNotificationPreferences(
    userId: string,
    preferences: { email?: boolean; push?: boolean; sms?: boolean }
  ): Promise<boolean> {
    try {
      const userRef = doc(db, this.usersCollection, userId);

      await updateDoc(userRef, {
        'perfil.notificacoes': preferences,
        dataAtualizacao: serverTimestamp(),
      });

      loggingService.info('Preferências de notificação atualizadas', { userId });

      return true;
    } catch (error) {
      loggingService.error('Erro ao atualizar preferências de notificação', { error, userId });
      return false;
    }
  }

  /**
   * Atualiza o tema e idioma preferido do usuário
   * @param userId ID do usuário
   * @param theme Tema preferido
   * @param language Idioma preferido
   * @returns Confirmação de sucesso
   */
  public async updateAppPreferences(
    userId: string,
    theme?: 'claro' | 'escuro' | 'sistema',
    language?: string
  ): Promise<boolean> {
    try {
      const userRef = doc(db, this.usersCollection, userId);

      const updateData: any = {
        dataAtualizacao: serverTimestamp(),
      };

      if (theme) {
        updateData['perfil.preferencias.tema'] = theme;
      }

      if (language) {
        updateData['perfil.preferencias.linguagem'] = language;
      }

      await updateDoc(userRef, updateData);

      loggingService.info('Preferências do app atualizadas', { userId });

      return true;
    } catch (error) {
      loggingService.error('Erro ao atualizar preferências do app', { error, userId });
      return false;
    }
  }

  /**
   * Integra as informações de avaliação com o perfil de usuário
   * @param userId ID do usuário
   * @returns Perfil com avaliações integradas
   */
  public async integrateProfileWithReviews(userId: string): Promise<{
    profile: User;
    reviewStats: {
      total: number;
      average: number;
      recentReviews: any[];
    };
  }> {
    try {
      // Obter perfil básico do usuário
      const profile = await this.getFullUserProfile(userId);

      // Obter avaliações do usuário via ReviewService
      const userReviews = await this.reviewService.getUserReviews(userId);

      // Calcular estatísticas de avaliação
      let totalScore = 0;
      userReviews.forEach(review => {
        totalScore += review.nota;
      });

      const averageScore = userReviews.length > 0 ? totalScore / userReviews.length : 0;

      // Ordenar por data (mais recentes primeiro)
      const sortedReviews = [...userReviews].sort((a, b) => {
        const dateA = a.dataCriacao?.toDate?.() || new Date(a.dataCriacao);
        const dateB = b.dataCriacao?.toDate?.() || new Date(b.dataCriacao);
        return dateB.getTime() - dateA.getTime();
      });

      // Pegar apenas as 5 mais recentes
      const recentReviews = sortedReviews.slice(0, 5);

      return {
        profile,
        reviewStats: {
          total: userReviews.length,
          average: Number(averageScore.toFixed(1)),
          recentReviews,
        },
      };
    } catch (error) {
      loggingService.error('Erro ao integrar perfil com avaliações', { error, userId });
      throw error;
    }
  }

  /**
   * Obtém o perfil completo do usuário, incluindo avaliações
   * @param userId ID do usuário
   * @returns Dados completos do perfil do usuário
   */
  public async obterPerfilCompleto(userId: string): Promise<any> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Obter documento do usuário
      const userDoc = await getDoc(doc(db, 'usuarios', userId));

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data() as User;

      // Buscar avaliações do usuário
      const avaliacoesQuery = query(collection(db, 'avaliacoes'), where('usuarioId', '==', userId));

      const avaliacoesSnapshot = await getDocs(avaliacoesQuery);
      const avaliacoes = avaliacoesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Calcular média das avaliações
      const mediaAvaliacoes =
        avaliacoes.length > 0
          ? avaliacoes.reduce((acc, curr: any) => acc + curr.nota, 0) / avaliacoes.length
          : 0;

      return {
        ...userData,
        avaliacoes: {
          lista: avaliacoes,
          media: mediaAvaliacoes,
          total: avaliacoes.length,
        },
      };
    } catch (error) {
      loggingService.error('Erro ao obter perfil do usuário', { error, userId });
      throw error;
    }
  }

  /**
   * Atualiza os dados básicos do perfil do usuário
   * @param userId ID do usuário
   * @param dadosPerfil Dados do perfil a serem atualizados
   * @returns Perfil atualizado
   */
  public async atualizarPerfil(userId: string, dadosPerfil: Partial<User>): Promise<User> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      const validationService = ValidationService.getInstance();

      // Validar dados do perfil
      if (dadosPerfil.email && !validationService.validarEmail(dadosPerfil.email)) {
        throw new Error('Email inválido');
      }

      if (dadosPerfil.telefone && !validationService.validarTelefone(dadosPerfil.telefone)) {
        throw new Error('Telefone inválido');
      }

      // Remover campos que não devem ser atualizados diretamente
      const { id, dataCriacao, isAdmin, ...dadosAtualizaveis } = dadosPerfil;

      // Atualizar no Firestore
      await updateDoc(doc(db, 'usuarios', userId), {
        ...dadosAtualizaveis,
        dataAtualizacao: new Date(),
      });

      // Buscar perfil atualizado
      const userDoc = await getDoc(doc(db, 'usuarios', userId));

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado após atualização');
      }

      loggingService.info('Perfil do usuário atualizado', { userId });

      return {
        id: userId,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      loggingService.error('Erro ao atualizar perfil do usuário', { error, userId });
      throw error;
    }
  }

  /**
   * Adiciona um novo endereço ao perfil do usuário
   * @param userId ID do usuário
   * @param endereco Dados do endereço
   * @returns Perfil atualizado com novo endereço
   */
  public async adicionarEndereco(userId: string, endereco: Address): Promise<User> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Validar dados do endereço
      const validationService = ValidationService.getInstance();

      if (!validationService.validarCEP(endereco.cep)) {
        throw new Error('CEP inválido');
      }

      if (
        !endereco.rua ||
        !endereco.numero ||
        !endereco.bairro ||
        !endereco.cidade ||
        !endereco.estado
      ) {
        throw new Error('Endereço incompleto');
      }

      // Buscar perfil atual
      const userDoc = await getDoc(doc(db, 'usuarios', userId));

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data() as User;

      // Se for endereço principal, remover a marcação de principal dos demais
      if (endereco.principal && userData.endereco && userData.endereco.length > 0) {
        const enderecosAtualizados = userData.endereco.map(end => ({
          ...end,
          principal: false,
        }));

        await updateDoc(doc(db, 'usuarios', userId), {
          endereco: [...enderecosAtualizados, endereco],
          dataAtualizacao: new Date(),
        });
      } else {
        // Adicionar novo endereço
        await updateDoc(doc(db, 'usuarios', userId), {
          endereco: arrayUnion(endereco),
          dataAtualizacao: new Date(),
        });
      }

      // Buscar perfil atualizado
      const userDocAtualizado = await getDoc(doc(db, 'usuarios', userId));

      loggingService.info('Endereço adicionado ao perfil', { userId });

      return {
        id: userId,
        ...userDocAtualizado.data(),
      } as User;
    } catch (error) {
      loggingService.error('Erro ao adicionar endereço', { error, userId });
      throw error;
    }
  }

  /**
   * Remove um endereço do perfil do usuário
   * @param userId ID do usuário
   * @param endereco Endereço a ser removido
   * @returns Perfil atualizado sem o endereço
   */
  public async removerEndereco(userId: string, endereco: Address): Promise<User> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Remover endereço
      await updateDoc(doc(db, 'usuarios', userId), {
        endereco: arrayRemove(endereco),
        dataAtualizacao: new Date(),
      });

      // Buscar perfil atualizado
      const userDoc = await getDoc(doc(db, 'usuarios', userId));

      loggingService.info('Endereço removido do perfil', { userId });

      return {
        id: userId,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      loggingService.error('Erro ao remover endereço', { error, userId });
      throw error;
    }
  }

  /**
   * Atualiza a foto de perfil do usuário
   * @param userId ID do usuário
   * @param fotoUri URI da nova foto de perfil
   * @returns URL da nova foto de perfil
   */
  public async atualizarFotoPerfil(userId: string, fotoUri: string): Promise<string> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Criar referência para a nova imagem
      const storageRef = ref(storage, `perfil/${userId}/foto-perfil.jpg`);

      // Converter URI para blob
      const response = await fetch(fotoUri);
      const blob = await response.blob();

      // Fazer upload da imagem
      await uploadBytes(storageRef, blob);

      // Obter URL da imagem
      const downloadURL = await getDownloadURL(storageRef);

      // Atualizar URL no perfil do usuário
      await updateDoc(doc(db, 'usuarios', userId), {
        'perfil.fotoPerfil': downloadURL,
        dataAtualizacao: new Date(),
      });

      loggingService.info('Foto de perfil atualizada', { userId });

      return downloadURL;
    } catch (error) {
      loggingService.error('Erro ao atualizar foto de perfil', { error, userId });
      throw error;
    }
  }

  /**
   * Remove a foto de perfil do usuário
   * @param userId ID do usuário
   * @returns Confirmação de remoção
   */
  public async removerFotoPerfil(userId: string): Promise<void> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Referência para a imagem
      const storageRef = ref(storage, `perfil/${userId}/foto-perfil.jpg`);

      // Remover imagem do storage
      await deleteObject(storageRef);

      // Atualizar perfil do usuário
      await updateDoc(doc(db, 'usuarios', userId), {
        'perfil.fotoPerfil': null,
        dataAtualizacao: new Date(),
      });

      loggingService.info('Foto de perfil removida', { userId });
    } catch (error) {
      // Ignorar erro de arquivo não encontrado
      if (error.code !== 'storage/object-not-found') {
        loggingService.error('Erro ao remover foto de perfil', { error, userId });
        throw error;
      }

      // Atualizar perfil mesmo se imagem não existir
      await updateDoc(doc(db, 'usuarios', userId), {
        'perfil.fotoPerfil': null,
        dataAtualizacao: new Date(),
      });
    }
  }

  /**
   * Atualiza as preferências do usuário
   * @param userId ID do usuário
   * @param preferencias Preferências a serem atualizadas
   * @returns Perfil atualizado
   */
  public async atualizarPreferencias(userId: string, preferencias: any): Promise<User> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Atualizar preferências
      await updateDoc(doc(db, 'usuarios', userId), {
        'perfil.preferencias': preferencias,
        dataAtualizacao: new Date(),
      });

      // Buscar perfil atualizado
      const userDoc = await getDoc(doc(db, 'usuarios', userId));

      loggingService.info('Preferências do usuário atualizadas', { userId });

      return {
        id: userId,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      loggingService.error('Erro ao atualizar preferências', { error, userId });
      throw error;
    }
  }

  /**
   * Atualiza as configurações de notificação do usuário
   * @param userId ID do usuário
   * @param notificacoes Configurações de notificação
   * @returns Perfil atualizado
   */
  public async atualizarNotificacoes(userId: string, notificacoes: any): Promise<User> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Atualizar configurações de notificação
      await updateDoc(doc(db, 'usuarios', userId), {
        'perfil.notificacoes': notificacoes,
        dataAtualizacao: new Date(),
      });

      // Buscar perfil atualizado
      const userDoc = await getDoc(doc(db, 'usuarios', userId));

      loggingService.info('Configurações de notificação atualizadas', { userId });

      return {
        id: userId,
        ...userDoc.data(),
      } as User;
    } catch (error) {
      loggingService.error('Erro ao atualizar configurações de notificação', { error, userId });
      throw error;
    }
  }
}
