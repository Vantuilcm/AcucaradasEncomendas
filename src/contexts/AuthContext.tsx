import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile, sendEmailVerification } from 'firebase/auth';
// @ts-ignore - Ignorando erro de tipagem para onAuthStateChanged
import { onAuthStateChanged } from 'firebase/auth';
import { Alert } from 'react-native';
import { User } from '../models/User';
import { SecureStorageService } from '../services/SecureStorageService';

// Interface para o contexto de autenticação
interface AuthContextData {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string, role?: string) => Promise<void>;
  register: (userData: User, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUser: (userData: Partial<User>) => Promise<void>;
  validateSession: () => Promise<boolean>;
  refreshUserActivity: () => void;
  signInWithGoogle?: (role?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithFacebook?: (role?: string) => Promise<{ success: boolean; error?: string }>;
  signInWithApple?: (role?: string) => Promise<{ success: boolean; error?: string }>;
  is2FAEnabled?: boolean;
}

// Criar o contexto
const AuthContext = createContext<AuthContextData>({} as AuthContextData);

// Provedor do contexto de autenticação
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Monitorar o estado de autenticação real do Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      try {
        if (firebaseUser) {
          // Buscar dados do usuário no Firestore para obter a Role
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data() || {};
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              nome: String(userData.nome || userData.name || firebaseUser.displayName || ''),
              telefone: String(userData.telefone || userData.phone || ''),
              role: String(userData.role || 'comprador'),
            });
            
            // Atualiza último login (opcional)
            updateDoc(doc(db, 'users', firebaseUser.uid), { ultimoLogin: serverTimestamp() }).catch(() => {});
          } else {
            // Se o usuário não existe no Firestore, criamos um registro básico ou forçamos logout
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              nome: firebaseUser.displayName || '',
              role: 'comprador',
            });
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error("Erro ao sincronizar sessão:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string, role?: string) => {
    try {
      setLoading(true);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update role if provided during login
      if (role) {
        await updateDoc(doc(db, 'users', userCredential.user.uid), { role });
      }
    } catch (error: any) {
      console.error("Erro no login:", error);
      Alert.alert('Erro', 'E-mail ou senha incorretos.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: User, password: string) => {
    try {
      setLoading(true);
      // Aqui usamos o AuthService ou fazemos direto. Fazendo direto para manter limpo:
      const cred = await createUserWithEmailAndPassword(auth, userData.email, password);
      
      await updateProfile(cred.user, { displayName: userData.nome });
      // Salvando role real
      await setDoc(doc(db, 'users', cred.user.uid), {
        email: userData.email,
        nome: userData.nome,
        telefone: userData.telefone || '',
        role: userData.role || 'comprador',
        dataCriacao: serverTimestamp(),
      });
      
      sendEmailVerification(cred.user).catch(() => {});
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      Alert.alert('Erro', error.message || 'Falha ao cadastrar.');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await SecureStorageService.removeData('authToken');
      await signOut(auth);
    } catch (error) {
      console.error("Erro no logout:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const updateUser = async (userData: Partial<User>) => {
    if (user && user.id) {
      // Create a clean copy of userData to avoid type mismatch with Firestore
      const updateData: Record<string, any> = {};
      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateData[key] = value;
        }
      });
      await updateDoc(doc(db, 'users', user.id), updateData);
      setUser({ ...user, ...userData });
    }
  };

  const validateSession = async () => {
    return !!auth.currentUser;
  };

  const refreshUserActivity = () => {};

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        register,
        logout,
        resetPassword,
        updateUser,
        validateSession,
        refreshUserActivity,
        is2FAEnabled: false,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
