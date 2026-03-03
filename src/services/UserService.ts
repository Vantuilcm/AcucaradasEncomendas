/**
 * Serviço para gerenciamento de informações do usuário
 * Fornece métodos para obter e atualizar informações do usuário
 */

import { loggingService } from './LoggingService';
import { User } from '../models/User';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

// Interface para informações básicas do usuário
export interface UserInfo {
  id: string;
  email: string;
  nome: string;
  isAdmin?: boolean;
  dataCriacao?: Date;
}

// Obtém informações básicas do usuário atual (método legado - não usar)
// @deprecated Use getUserInfo() em vez disso para conformidade com a App Store
export const userInfo = (): UserInfo | null => {
  return getUserInfo();
};

// Método seguro para obter informações do usuário (compatível com App Store)
export const getUserInfo = (): UserInfo | null => {
  try {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      return null;
    }
    
    // Usar apenas APIs públicas e seguras
    return {
      id: currentUser.uid,
      email: currentUser.email || '',
      nome: currentUser.displayName || '',
      dataCriacao: new Date()
    };
  } catch (error) {
    loggingService.error('Erro ao obter informações do usuário', { error });
    return null;
  }
};

// Obtém informações detalhadas do usuário do Firestore
export const getUserDetails = async (userId: string): Promise<User | null> => {
  try {
    const userDoc = await getDoc(doc(db, 'usuarios', userId));
    
    if (!userDoc.exists()) {
      return null;
    }
    
    const userData = userDoc.data() as Omit<User, 'id'>;
    
    return {
      id: userId,
      ...userData
    } as User;
  } catch (error) {
    loggingService.error('Erro ao obter detalhes do usuário', { error, userId });
    return null;
  }
};

// Verifica se o usuário tem permissões de administrador
export const isUserAdmin = async (userId: string): Promise<boolean> => {
  try {
    const userDetails = await getUserDetails(userId);
    return userDetails?.isAdmin === true;
  } catch (error) {
    loggingService.error('Erro ao verificar permissões de administrador', { error, userId });
    return false;
  }
};