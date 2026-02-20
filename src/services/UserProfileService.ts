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
  private readonly usersCollection = 'users';
  private readonly ordersCollection = 'orders';
  private readonly profilePicsPath = 'profile_pictures';

  private constructor() {
    this.reviewService = ReviewService.getInstance();
  }

  /**
   * Normaliza valores de data provenientes do Firestore (Timestamp), string ISO ou Date
   */
  private normalizeDate(value: any): Date | undefined {
    try {
      if (!value) return undefined;
      if (value instanceof Date) return value;
      if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? undefined : d;
      }
      if (typeof value === 'object' && typeof value.toDate === 'function') {
        const d = value.toDate();
        return d instanceof Date ? d : undefined;
      }
      return undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Normaliza lista de endereços, aceitando alias "address" e garantindo tipos corretos
   */
  private normalizeAddresses(raw: any): Address[] | undefined {
    const src = Array.isArray(raw?.endereco)
      ? raw.endereco
      : (Array.isArray(raw?.address) ? raw.address : undefined);
    if (!src) return undefined;
    const result: Address[] = [];
    for (const item of src) {
      if (!item || typeof item !== 'object') continue;
      const obj = item as any;
      // Exigir ao menos rua, cidade e estado para considerar válido
      const rua = obj.rua ?? obj.street;
      const cidade = obj.cidade ?? obj.city;
      const estado = obj.estado ?? obj.state;
      if (!rua || !cidade || !estado) continue;
      result.push({
        cep: String(obj.cep ?? obj.zip ?? ''),
        rua: String(rua),
        numero: String(obj.numero ?? obj.number ?? ''),
        complemento: obj.complemento != null ? String(obj.complemento) : undefined,
        bairro: String(obj.bairro ?? obj.neighborhood ?? ''),
        cidade: String(cidade),
        estado: String(estado),
        principal: Boolean(obj.principal ?? false),
      });
    }
    return result.length ? result : undefined;
  }

  /**
   * Normaliza dados de usuário garantindo aliases e tipos coerentes
   */
  private normalizeUserData(raw: any, userId: string): User {
    const nome = typeof raw?.nome === 'string'
      ? raw.nome
      : (raw?.displayName ?? raw?.name ?? (typeof raw?.email === 'string' ? raw.email.split('@')[0] : 'Usuário'));
    const telefone = typeof raw?.telefone === 'string' ? raw.telefone : (typeof raw?.phone === 'string' ? raw.phone : undefined);

    const perfil = raw?.perfil ?? {};
    const preferencias = perfil?.preferencias ?? {};
    const notificacoes = perfil?.notificacoes ?? {};

    const dataCriacao = this.normalizeDate(raw?.dataCriacao);
    const ultimoLogin = this.normalizeDate(raw?.ultimoLogin);

    const enderecos = this.normalizeAddresses(raw);

    const normalized: User = {
      id: userId,
      uid: typeof raw?.uid === 'string' ? raw.uid : userId,
      displayName: typeof raw?.displayName === 'string' ? raw.displayName : undefined,
      name: typeof raw?.name === 'string' ? raw.name : undefined,
      phone: typeof raw?.phone === 'string' ? raw.phone : undefined,
      address: Array.isArray(raw?.address) ? raw.address : undefined,
      nome,
      email: String(raw?.email ?? ''),
      telefone,
      cpf: typeof raw?.cpf === 'string' ? raw.cpf : undefined,
      endereco: enderecos,
      dataCriacao,
      ultimoLogin,
      isAdmin: Boolean(raw?.isAdmin ?? false),
      role: raw?.role,
      perfil: {
        fotoPerfil: typeof perfil?.fotoPerfil === 'string' ? perfil.fotoPerfil : undefined,
        notificacoes: {
          email: Boolean(notificacoes?.email ?? false),
          push: Boolean(notificacoes?.push ?? false),
          sms: Boolean(notificacoes?.sms ?? false),
        },
        preferencias: {
          tema: preferencias?.tema ?? 'sistema',
          linguagem: typeof preferencias?.linguagem === 'string' ? preferencias.linguagem : undefined,
        },
      },
    };

    return normalized;
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

      const userData = this.normalizeUserData(userDoc.data() as any, userId);
      // Obter estatísticas do usuário
      const stats = await this.getUserStats(userId);
      return {
        ...userData,
        stats,
      };
    } catch (error) {
      loggingService.error(
        'Erro ao obter perfil do usuário',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * Alias para getFullUserProfile para compatibilidade
   */
  public async obterPerfilCompleto(userId: string): Promise<User & { stats?: UserStats }> {
    return this.getFullUserProfile(userId);
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

      // Limpar dados indefinidos para não sobrescrever com null (tipo-safe)
      const cleanProfileData: any = {};
      for (const [k, v] of Object.entries(profileData)) {
        if (v !== undefined) {
          cleanProfileData[k] = v as any;
        }
      }

      // Adicionar timestamp de atualização
      const updateData = {
        ...cleanProfileData,
        dataAtualizacao: serverTimestamp(),
      } as any;
      

      await updateDoc(userRef, updateData);

      // Obter dados atualizados
      const updatedDoc = await getDoc(userRef);
      const updatedUserData = this.normalizeUserData(updatedDoc.data() as any, userId);
      loggingService.info('Perfil de usuário atualizado com sucesso', { userId });
      return updatedUserData;
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar perfil do usuário',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * Alias para updateUserProfile para compatibilidade
   */
  public async atualizarPerfil(userId: string, profileData: ProfileUpdateData): Promise<User> {
    return this.updateUserProfile(userId, profileData);
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
      const userData: any = userDoc.data()!;
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
      await updateDoc(
        userRef,
        {
          'perfil.fotoPerfil': photoUrl,
          dataAtualizacao: serverTimestamp(),
        } as any
      );

      loggingService.info('Foto de perfil atualizada com sucesso', { userId });

      return photoUrl;
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar foto de perfil',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * Alias para updateProfilePicture para compatibilidade
   */
  public async atualizarFotoPerfil(userId: string, photoUri: string): Promise<string> {
    return this.updateProfilePicture(userId, photoUri);
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

      const userData: any = userDoc.data()!;
      let enderecos: Address[] = Array.isArray(userData?.endereco) ? (userData.endereco as Address[]) : [];

      // Type guard for enderecos
      if (!Array.isArray(enderecos)) {
        loggingService.warn('Endereços não é um array', { userId });
        enderecos = [];
      }

      // Se for marcado como principal, desmarca os outros
      if (address.principal) {
        (enderecos as Address[]).forEach((end: Address) => {
          end.principal = false;
        });
      }

      // Se não houver endereços, este será o principal
      if (enderecos.length === 0) {
        address.principal = true;
      }

      (enderecos as Address[]).push(address);

      await updateDoc(
        userRef,
        {
          endereco: enderecos,
          dataAtualizacao: serverTimestamp(),
        } as any
      );

      loggingService.info('Endereço adicionado com sucesso', { userId });

      return enderecos;
    } catch (error) {
      loggingService.error(
        'Erro ao adicionar endereço',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * Alias para addUserAddress para compatibilidade
   */
  public async adicionarEndereco(userId: string, address: Address): Promise<Address[]> {
    return this.addUserAddress(userId, address);
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

      const userData: any = userDoc.data()!;
      let enderecos: Address[] = Array.isArray(userData?.endereco) ? (userData.endereco as Address[]) : [];

      // Type guard for enderecos
      if (!Array.isArray(enderecos)) {
        loggingService.warn('Endereços não é um array', { userId });
        enderecos = [];
      }

      if (addressIndex < 0 || addressIndex >= (enderecos as Address[]).length) {
        throw new Error('Endereço não encontrado');
      }

      // Verificar se o endereço a ser removido é o principal
      const removedAddress = (enderecos as Address[])[addressIndex];
      const wasPrincipal = removedAddress.principal;

      // Remover o endereço
      (enderecos as Address[]).splice(addressIndex, 1);

      // Se o endereço removido era o principal e ainda há endereços, definir o primeiro como principal
      if (wasPrincipal && (enderecos as Address[]).length > 0) {
        (enderecos as Address[])[0].principal = true;
      }

      await updateDoc(
        userRef,
        {
          endereco: enderecos,
          dataAtualizacao: serverTimestamp(),
        } as any
      );

      loggingService.info('Endereço removido com sucesso', { userId });

      return enderecos;
    } catch (error) {
      loggingService.error(
        'Erro ao remover endereço',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * Alias para removeUserAddress para compatibilidade
   */
  public async removerEndereco(userId: string, addressIndex: number): Promise<Address[]> {
    return this.removeUserAddress(userId, addressIndex);
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

      const userData: any = userDoc.data()!;
      let enderecos: Address[] = Array.isArray(userData?.endereco) ? (userData.endereco as Address[]) : [];

      if (addressIndex < 0 || addressIndex >= enderecos.length) {
        throw new Error('Endereço não encontrado');
      }

      // Definir todos como não principal
      enderecos = enderecos.map((end, i) => ({ ...end, principal: i === addressIndex }));

      await updateDoc(
        userRef,
        {
          endereco: enderecos,
          dataAtualizacao: serverTimestamp(),
        } as any
      );

      loggingService.info('Endereço principal definido com sucesso', { userId });

      return enderecos;
    } catch (error) {
      loggingService.error(
        'Erro ao definir endereço principal',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * Alias para setAddressAsPrimary para compatibilidade
   */
  public async definirEnderecoPrincipal(userId: string, addressIndex: number): Promise<Address[]> {
    return this.setAddressAsPrimary(userId, addressIndex);
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
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const pedidosSnap = await getDocs(pedidosQuery);
      const pedidos: any[] = pedidosSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Obter avaliações do usuário
      const avaliacoes = await this.reviewService.getUserReviews(userId);

      // Calcular média das avaliações
      let somaAvaliacoes = 0;
      avaliacoes.forEach(avaliacao => {
        somaAvaliacoes += (avaliacao as any).rating ?? avaliacao.rating;
      });

      const mediaAvaliacoes = avaliacoes.length > 0 ? somaAvaliacoes / avaliacoes.length : 0;

      // Obter dados de criação da conta
      const userDoc = await getDoc(doc(db, this.usersCollection, userId));
      const userData: any = userDoc.data()!;

      const dataCriacaoRaw = userData?.dataCriacao;
      let dataCriacaoStr = new Date().toISOString();
      if (typeof dataCriacaoRaw === 'string') {
        dataCriacaoStr = dataCriacaoRaw;
      } else if (dataCriacaoRaw && typeof dataCriacaoRaw.toDate === 'function') {
        dataCriacaoStr = dataCriacaoRaw.toDate().toISOString();
      } else if (dataCriacaoRaw instanceof Date) {
        dataCriacaoStr = dataCriacaoRaw.toISOString();
      }

      let ultimoPedidoStr: string | null = null;
      if (pedidos.length > 0) {
        const ultimoRaw = pedidos[0].dataCriacao;
        if (typeof ultimoRaw === 'string') {
          ultimoPedidoStr = ultimoRaw;
        } else if (ultimoRaw && typeof ultimoRaw.toDate === 'function') {
          ultimoPedidoStr = ultimoRaw.toDate().toISOString();
        } else if (ultimoRaw instanceof Date) {
          ultimoPedidoStr = ultimoRaw.toISOString();
        }
      }

      return {
        dataCriacao: dataCriacaoStr,
        ultimoPedido: ultimoPedidoStr,
        totalPedidos: pedidos.length,
        totalAvaliacoes: avaliacoes.length,
        mediaAvaliacoes: Number(mediaAvaliacoes.toFixed(1)),
        pedidosRecentes: pedidos.slice(0, 5),
        avaliacoesRecentes: avaliacoes.slice(0, 5),
      };
    } catch (error) {
      loggingService.error(
        'Erro ao obter estatísticas do usuário',
        error instanceof Error ? error : undefined,
        { userId }
      );
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
   * Alias para getUserStats para compatibilidade
   */
  public async obterEstatisticasUsuario(userId: string): Promise<UserStats> {
    return this.getUserStats(userId);
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
      loggingService.error(
        'Erro ao verificar CPF',
        error instanceof Error ? error : undefined,
        { cpf }
      );
      return false;
    }
  }

  /**
   * Alias para isCPFInUse para compatibilidade
   */
  public async verificarCPFEmUso(cpf: string, currentUserId?: string): Promise<boolean> {
    return this.isCPFInUse(cpf, currentUserId);
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
      loggingService.error(
        'Erro ao buscar usuários',
        error instanceof Error ? error : undefined,
        { searchQuery }
      );
      return [];
    }
  }

  /**
   * Alias para searchUsers para compatibilidade
   */
  public async buscarUsuarios(searchQuery: string, maxResults: number = 10): Promise<User[]> {
    return this.searchUsers(searchQuery, maxResults);
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

      await updateDoc(
        userRef,
        {
          'perfil.notificacoes': preferences,
          dataAtualizacao: serverTimestamp(),
        } as any
      );

      loggingService.info('Preferências de notificação atualizadas', { userId });

      return true;
    } catch (error) {
      loggingService.error(
        'Erro ao atualizar preferências de notificação',
        error instanceof Error ? error : undefined,
        { userId }
      );
      return false;
    }
  }

  /**
   * Alias para updateNotificationPreferences para compatibilidade
   */
  public async atualizarNotificacoes(
    userId: string,
    preferences: { email?: boolean; push?: boolean; sms?: boolean }
  ): Promise<boolean> {
    return this.updateNotificationPreferences(userId, preferences);
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
      loggingService.error(
        'Erro ao atualizar preferências do app',
        error instanceof Error ? error : undefined,
        { userId }
      );
      return false;
    }
  }

  /**
   * Alias para updateAppPreferences para compatibilidade
   */
  public async atualizarPreferencias(
    userId: string,
    theme?: 'claro' | 'escuro' | 'sistema',
    language?: string
  ): Promise<boolean> {
    return this.updateAppPreferences(userId, theme, language);
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
        totalScore += review.rating;
      });

      const averageScore = userReviews.length > 0 ? totalScore / userReviews.length : 0;

      // Ordenar por data (mais recentes primeiro)
      const sortedReviews = [...userReviews].sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
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
      loggingService.error(
        'Erro ao integrar perfil com avaliações',
        error instanceof Error ? error : undefined,
        { userId }
      );
      throw error;
    }
  }

  /**
   * Alias para integrateProfileWithReviews para compatibilidade
   */
  public async integrarPerfilComAvaliacoes(userId: string): Promise<any> {
    return this.integrateProfileWithReviews(userId);
  }

  /**
   * Remove a foto de perfil do usuário
   * @param userId ID do usuário
   * @returns Confirmação de remoção
   */
  public async removeProfilePicture(userId: string): Promise<void> {
    try {
      // Validar ID do usuário
      if (!userId) {
        throw new Error('ID do usuário não informado');
      }

      // Referência para a imagem
      const storageRef = ref(storage, `${this.profilePicsPath}/${userId}_*.jpg`);
      // Nota: No Firebase Storage não é possível usar wildcards para deletar.
      // Seria necessário buscar a URL exata do documento do usuário.
      
      const userRef = doc(db, this.usersCollection, userId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const photoUrl = userDoc.data()?.perfil?.fotoPerfil;
        if (photoUrl) {
          const photoRef = ref(storage, photoUrl);
          await deleteObject(photoRef);
        }
      }

      // Atualizar perfil do usuário
      await updateDoc(userRef, {
        'perfil.fotoPerfil': null,
        dataAtualizacao: serverTimestamp(),
      } as any);

      loggingService.info('Foto de perfil removida', { userId });
    } catch (error) {
      // Ignorar erro de arquivo não encontrado
      if ((error as any).code !== 'storage/object-not-found') {
        loggingService.error(
          'Erro ao remover foto de perfil',
          error instanceof Error ? error : undefined,
          { userId }
        );
        throw error;
      }

      // Atualizar perfil mesmo se imagem não existir
      await updateDoc(doc(db, this.usersCollection, userId), {
        'perfil.fotoPerfil': null,
        dataAtualizacao: serverTimestamp(),
      } as any);
    }
  }

  /**
   * Alias para removeProfilePicture para compatibilidade
   */
  public async removerFotoPerfil(userId: string): Promise<void> {
    return this.removeProfilePicture(userId);
  }
}
