import { ValidationService } from './validationService';
import * as bcrypt from 'bcryptjs';
import { jwtDecode } from 'jwt-decode';
import { auth, db } from '../config/firebase';
import {
  applyActionCode,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  updatePassword,
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  serverTimestamp, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { loggingService } from './LoggingService';
import { secureLoggingService } from './SecureLoggingService';
import { SecureStorageService } from './SecureStorageService';
import { User } from '../models/User';
import { UserUtils } from '../utils/UserUtils';
import { GrowthService } from './GrowthService';

export class AuthService {
  private static instance: AuthService;
  private usuarios: Map<string, any>;
  private tokensRecuperacao: Map<string, any>;

  private constructor() {
    this.usuarios = new Map();
    this.tokensRecuperacao = new Map();
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }
  /**
   * Valida a senha de acordo com os critérios de segurança
   * @param password Senha a ser validada
   * @returns true se a senha atende aos critérios, false caso contrário
   */
  private validatePassword(password: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{8,}$/;
    return regex.test(password);
  }

  /**
   * Registra um novo usuário no Firebase Authentication e Firestore
   * @param userData Dados do novo usuário
   * @returns Informações do usuário registrado
   */
  public async register(userData: {
    email: string;
    password: string;
    name: string;
    phone: string;
    address?: string;
    referralCode?: string; // Novo campo opcional
  }): Promise<User> {
    if (!userData) {
      throw new Error('Dados do usuário não fornecidos');
    }
    try {
      const validationService = ValidationService.getInstance();
      const growthService = GrowthService.getInstance();

      // Validar dados do usuário
      if (!userData.email || !validationService.validateEmail(userData.email)) {
        throw new Error('Email inválido');
      }

      if (!userData.phone || !validationService.validatePhone(userData.phone)) {
        throw new Error('Telefone inválido');
      }

      if (!userData.password || !this.validatePassword(userData.password)) {
        throw new Error(
          'Senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
        );
      }

      // Verificar se o email já está cadastrado no Firestore
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', userData.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        throw new Error('Email já cadastrado');
      }

      // Criar usuário no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );

      const firebaseUser = userCredential.user;
      if (!firebaseUser) {
        throw new Error('Erro ao criar usuário no Firebase Authentication');
      }

      // Enviar email de verificação
      try {
        await sendEmailVerification(firebaseUser);
      } catch (emailError) {
        loggingService.error('Erro ao enviar email de verificação', emailError as Error);
      }

      // Atualizar o perfil do usuário
      try {
        await updateProfile(firebaseUser, {
          displayName: userData.name
        });
      } catch (profileError) {
        loggingService.error('Erro ao atualizar perfil do usuário', profileError as Error);
      }

      // Gerar código de indicação único para o novo usuário
      const myReferralCode = growthService.generateReferralCode(userData.name);

      // Criar documento do usuário no Firestore
      const userDoc = {
        uid: firebaseUser.uid,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        address: userData.address || '',
        emailVerified: firebaseUser.emailVerified,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        role: 'customer',
        active: true,
        referralCode: myReferralCode, // Salvar código gerado
        referralCount: 0,
        totalReferralValue: 0
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);
      
      // Salvar também na coleção 'usuarios' se houver duplicidade de coleção no projeto
      // (Alguns serviços usam 'users', outros 'usuarios'. Sincronizar por segurança)
      await setDoc(doc(db, 'usuarios', firebaseUser.uid), {
        ...userDoc,
        dataCriacao: serverTimestamp()
      });

      // Se o usuário foi indicado por alguém, aplicar a indicação
      if (userData.referralCode) {
        await growthService.applyReferral(firebaseUser.uid, userData.referralCode);
      }

      // Gerar token JWT para autenticação na API
      const token = await (firebaseUser as any).getIdToken?.(true);
      if (token) {
        await SecureStorageService.storeData('authToken', token);
      }

      secureLoggingService.info('Usuário registrado com sucesso', {
        userId: UserUtils.getUserId(firebaseUser),
        email: userData.email,
        referralCode: myReferralCode
      });

      return {
        id: firebaseUser.uid,
        nome: userData.name,
        email: userData.email,
        telefone: userData.phone,
        dataCriacao: new Date(),
        ultimoLogin: new Date(),
        referralCode: myReferralCode
      } as User;
    } catch (error: any) {
      secureLoggingService.error('Erro ao registrar usuário', { error: error?.message || 'Erro desconhecido' });
      throw error;
    }
  }

  /**
   * Realiza login do usuário
   * @param email Email do usuário
   * @param password Senha do usuário
   * @returns Informações do usuário logado e token
   */
  public async login(email: string, password: string): Promise<{ user: User; token: string }> {
    if (!email || !password) {
      throw new Error('Email e senha são obrigatórios');
    }
    try {
      // Validar email
      const validationService = ValidationService.getInstance();
      if (!validationService.validateEmail(email)) {
        throw new Error('Email inválido');
      }

      // Realizar login no Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser) {
        throw new Error('Falha na autenticação');
      }

      // Atualizar último login no Firestore
      const userRef = doc(db, 'users', firebaseUser.uid);
      try {
        await updateDoc(userRef, {
          lastLogin: serverTimestamp()
        });
      } catch (updateError) {
        loggingService.error('Erro ao atualizar último login', updateError as Error);
      }

      // Buscar dados completos do usuário
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado no banco de dados');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('Dados do usuário estão vazios');
      }

      const nome = UserUtils.getUserName(userData) || '';
      const telefone = (userData as any).phone || (userData as any).telefone || undefined;
      const userEmail = UserUtils.getUserEmail(userData) || email;

      // Gerar token JWT para autenticação na API
      const token = await (firebaseUser as any).getIdToken?.(true);
      if (token) {
        await SecureStorageService.storeData('authToken', token);
      } else {
        throw new Error('Não foi possível gerar o token de acesso');
      }

      secureLoggingService.info('Login realizado com sucesso', {
        userId: UserUtils.getUserId(firebaseUser),
        email: email
      });

      return {
        user: {
          id: firebaseUser.uid,
          nome,
          email: userEmail,
          telefone,
          ultimoLogin: new Date(),
        } as User,
        token
      };
    } catch (error: any) {
      secureLoggingService.error('Erro ao fazer login', { error: error?.message || 'Erro desconhecido' });
      throw error;
    }
  }

  /**
   * Realiza logout do usuário
   */
  public async logout(): Promise<void> {
    try {
      // Remover token de autenticação do armazenamento seguro
      await SecureStorageService.removeData('authToken');

      // Realizar logout no Firebase Authentication
      await signOut(auth);

      secureLoggingService.info('Logout realizado com sucesso');
    } catch (error: any) {
      secureLoggingService.error('Erro ao fazer logout', { error: error?.message || 'Erro desconhecido' });
      throw error;
    }
  }

  /**
   * Envia email para recuperação de senha
   * @param email Email do usuário
   */
  public async resetPassword(email: string): Promise<void> {
    if (!email) {
      throw new Error('Email é obrigatório');
    }
    try {
      const validationService = ValidationService.getInstance();
      if (!validationService.validateEmail(email)) {
        throw new Error('Email inválido');
      }

      await sendPasswordResetEmail(auth, email);

      secureLoggingService.info('Email de recuperação de senha enviado', { email });
    } catch (error: any) {
      secureLoggingService.error('Erro ao enviar email de recuperação de senha', { error: error?.message || 'Erro desconhecido' });
      throw error;
    }
  }

  /**
   * Confirma a redefinição de senha
   * @param code Código de verificação
   * @param newPassword Nova senha
   */
  public async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    if (!code || !newPassword) {
      throw new Error('Código e nova senha são obrigatórios');
    }
    try {
      if (!this.validatePassword(newPassword)) {
        throw new Error(
          'Senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
        );
      }

      await confirmPasswordReset(auth, code, newPassword);

      secureLoggingService.info('Senha redefinida com sucesso');
    } catch (error: any) {
      secureLoggingService.error('Erro ao redefinir senha', { error: error?.message || 'Erro desconhecido' });
      throw error;
    }
  }

  public async registrarUsuario(
    dadosUsuario: {
      nome: string;
      email: string;
      telefone?: string;
      senha?: string;
      role?: string;
      documentNumber?: string;
      address?: string;
      storeName?: string;
      transportType?: string;
      cnh?: string | null;
      storeStatus?: string;
      courierStatus?: string;
    },
    senha?: string
  ): Promise<{
    user: User;
    token: string;
    mensagem?: string;
    id?: string;
    nome?: string;
    email?: string;
    telefone?: string;
    senha?: string;
    emailVerificado?: boolean;
  }> {
    if (!dadosUsuario) {
      throw new Error('Dados do usuário não fornecidos');
    }
    try {
      const validationService = ValidationService.getInstance();
      const senhaFinal = senha || dadosUsuario.senha || '';

      if (!dadosUsuario.email || !validationService.validateEmail(dadosUsuario.email)) {
        throw new Error('Email inválido');
      }

      if (dadosUsuario.telefone && !validationService.validatePhone(dadosUsuario.telefone)) {
        throw new Error('Telefone inválido');
      }

      if (!senhaFinal || !this.validatePassword(senhaFinal)) {
        throw new Error(
          'Senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
        );
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        dadosUsuario.email,
        senhaFinal
      );

      const user = userCredential.user;
      if (!user) {
        throw new Error('Erro ao criar usuário');
      }

      try {
        await updateProfile(user, {
          displayName: dadosUsuario.nome,
        });
      } catch (updateError) {
        loggingService.error('Erro ao atualizar perfil', updateError as Error);
      }

      try {
        await sendEmailVerification(user);
      } catch (verifyError) {
        loggingService.error('Erro ao enviar email de verificação', verifyError as Error);
      }

      const userData = {
        nome: dadosUsuario.nome || '',
        email: dadosUsuario.email,
        telefone: dadosUsuario.telefone || null,
        dataCriacao: serverTimestamp(),
        emailVerificado: false,
        ultimoLogin: serverTimestamp(),
        role: dadosUsuario.role || 'comprador',
        
        // Dados adicionais baseados no perfil
        documentNumber: dadosUsuario.documentNumber || null,
        address: dadosUsuario.address || null,
        storeName: dadosUsuario.storeName || null,
        transportType: dadosUsuario.transportType || null,
        cnh: dadosUsuario.cnh || null,
        storeStatus: dadosUsuario.storeStatus || null,
        courierStatus: dadosUsuario.courierStatus || null,
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      // Mantendo compatibilidade caso outro lugar use 'usuarios'
      try {
        await setDoc(doc(db, 'usuarios', user.uid), userData);
      } catch (compatError) {
        loggingService.error('Erro ao salvar em coleção legada', compatError as Error);
      }

      const usuarioSimulado = {
        id: user.uid,
        ...dadosUsuario,
        senha: bcrypt.hashSync(senhaFinal, 10),
        dataCriacao: new Date(),
      };

      this.usuarios.set(usuarioSimulado.id, usuarioSimulado);

      // Gerar token JWT para autenticação na API
      const token = await (user as any).getIdToken?.(true);
      if (token) {
        await SecureStorageService.storeData('authToken', token);
      }

      loggingService.info('Novo usuário registrado', { userId: UserUtils.getUserId(user) });

      const userResult: User = {
        id: user.uid,
        nome: dadosUsuario.nome || '',
        email: dadosUsuario.email,
        telefone: dadosUsuario.telefone,
        role: dadosUsuario.role || 'comprador',
        dataCriacao: new Date(),
        ultimoLogin: new Date(),
      };

      return {
        user: userResult,
        token: token || '',
        id: user.uid,
        nome: dadosUsuario.nome,
        email: dadosUsuario.email,
        telefone: dadosUsuario.telefone,
        senha: usuarioSimulado.senha,
        emailVerificado: false,
        mensagem:
          'Usuário registrado com sucesso. Por favor, verifique seu email para ativar sua conta.',
      };
    } catch (error: any) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao registrar usuário', errorInstance, { originalError: error });
      if (error?.code === 'auth/email-already-in-use') {
        throw new Error('Este email já está sendo usado por outra conta.');
      }
      throw error;
    }
  }

  /**
   * Autentica um usuário com email e senha
   * @param credenciais Credenciais do usuário (email e senha)
   * @returns Informações do usuário autenticado e token
   */
  public async autenticarUsuario(credenciais: {
    email: string;
    senha: string;
    ignorarVerificacao?: boolean;
  }): Promise<{
    user: User;
    usuario: {
      id: string;
      email: string;
      nome: string;
      emailVerificado: boolean;
    };
    token: string;
    expiresIn: number;
  }> {
    if (!credenciais || !credenciais.email || !credenciais.senha) {
      throw new Error('Email e senha são obrigatórios');
    }
    try {
      const validationService = ValidationService.getInstance();

      if (!validationService.validateEmail(credenciais.email)) {
        throw new Error('Email inválido');
      }

      // Versão Firebase - autenticar usuário
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credenciais.email,
        credenciais.senha
      );

      const user = userCredential.user;
      if (!user) {
        throw new Error('Falha na autenticação');
      }

      // Verificar se o email foi verificado
      if (!user.emailVerified && !credenciais.ignorarVerificacao) {
        // Reenviar email de verificação
        try {
          await sendEmailVerification(user);
        } catch (verifyError) {
          loggingService.error('Erro ao reenviar verificação', verifyError as Error);
        }
        throw new Error(
          'Por favor, verifique seu email antes de fazer login. Um novo email de verificação foi enviado.'
        );
      }

      // Atualizar último login no Firestore
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          ultimoLogin: serverTimestamp(),
        });
      } catch (e) {
        // Ignora se não existir
      }
      try {
        await updateDoc(doc(db, 'usuarios', user.uid), {
          ultimoLogin: serverTimestamp(),
        });
      } catch (e) {
        // Ignora se não existir
      }

      // Versão simulada para compatibilidade
      const usuario = Array.from(this.usuarios.values()).find(u => u.email === credenciais.email);

      if (usuario) {
        const senhaCorreta = await bcrypt.compare(credenciais.senha, usuario.senha);
        if (!senhaCorreta) {
          throw new Error('Senha incorreta');
        }
      }

      // Gerar token de autenticação
      const token = await (user as any).getIdToken?.(true);
      if (token) {
        await SecureStorageService.storeData('authToken', token);
      }

      loggingService.info('Usuário autenticado com sucesso', { userId: UserUtils.getUserId(user) });

      const userResult: User = {
        id: user.uid,
        nome: UserUtils.getUserName(user) || usuario?.nome || '',
        email: UserUtils.getUserEmail(user) || credenciais.email,
        telefone: usuario?.telefone,
        ultimoLogin: new Date(),
      };

      return {
        token: token || '',
        expiresIn: 24 * 60 * 60,
        user: userResult,
        usuario: {
          id: userResult.id,
          nome: userResult.nome,
          email: userResult.email,
          emailVerificado: user.emailVerified,
        },
      };
    } catch (error: any) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao autenticar usuário', errorInstance, { originalError: error });
      if (error?.code === 'auth/user-not-found') {
        throw new Error('Usuário não encontrado');
      } else if (error?.code === 'auth/wrong-password') {
        throw new Error('Senha incorreta');
      } else if (error?.code === 'auth/too-many-requests') {
        throw new Error('Muitas tentativas de login. Por favor, tente novamente mais tarde.');
      }
      throw error;
    }
  }

  /**
   * Verifica a validade de um token JWT
   * @param token Token JWT
   * @returns Informações do usuário associado ao token
   */
  public async validarToken(token: string): Promise<{
    id: string;
    email: string;
    nome: string;
    telefone?: string;
    emailVerificado: boolean;
    valido: boolean;
  }> {
    try {
      const decoded: any = jwtDecode(token);
      
      // Validar expiração
      if (decoded.exp && Date.now() >= decoded.exp * 1000) {
        throw new Error('Token expirado');
      }

      const userId = decoded.user_id || decoded.sub || decoded.uid || decoded.id;

      // Verificar no Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== userId) {
        throw new Error('Usuário não autenticado');
      }

      // Obter dados adicionais do Firestore
      const userDoc = await getDoc(doc(db, 'usuarios', userId));

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new Error('Usuário não encontrado');
      }

      // Compatibilidade com versão simulada
      const usuario = this.usuarios.get(decoded.id);

      const nome = UserUtils.getUserName(userData) || '';
      const telefone = (userData as any).telefone || (userData as any).phone || usuario?.telefone;
      const email = UserUtils.getUserEmail(currentUser) || UserUtils.getUserEmail(userData) || '';

      return {
        id: decoded.id,
        nome: UserUtils.getUserName(currentUser) || nome,
        email,
        telefone,
        emailVerificado: currentUser.emailVerified,
        valido: true,
      };
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      // errorInstance instanceof jwt.TokenExpiredError ||
      if (
        (error as any).code === 'auth/id-token-expired' ||
        (error as any).message === 'Token expirado'
      ) {
        return {
          valido: false,
          id: '',
          email: '',
          nome: '',
          emailVerificado: false,
        };
      }
      secureLoggingService.error('Erro ao validar token', { error: errorInstance, originalError: error });
      throw new Error('Token inválido');
    }
  }

  /**
   * Atualiza a senha do usuário após autenticação
   * @param dados Dados para atualização (idUsuario, senhaAtual, novaSenha)
   * @returns Informações do usuário após a atualização
   */
  public async atualizarSenha(dados: {
    idUsuario: string;
    senhaAtual: string;
    novaSenha: string;
  }): Promise<{
    id: string;
    nome: string;
    email: string;
    telefone?: string;
    emailVerificado: boolean;
  }> {
    try {
      // Versão Firebase - reautenticar e atualizar senha
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Reautenticar o usuário
        if (!currentUser.email) {
          throw new Error('Email do usuário não disponível');
        }

        const credential = EmailAuthProvider.credential(currentUser.email, dados.senhaAtual);
        await reauthenticateWithCredential(currentUser, credential);

        // Validar nova senha
        if (!this.validatePassword(dados.novaSenha)) {
          throw new Error(
            'Nova senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
          );
        }

        // Atualizar senha
        await updatePassword(currentUser, dados.novaSenha);
      } else {
        // Versão simulada para compatibilidade
        const usuario = this.usuarios.get(dados.idUsuario);
        if (usuario) {
          const senhaCorreta = await bcrypt.compare(dados.senhaAtual, usuario.senha);
          if (!senhaCorreta) {
            throw new Error('Senha atual incorreta');
          }
          
          // Validar nova senha se não foi validada via Firebase
          if (!this.validatePassword(dados.novaSenha)) {
            throw new Error(
              'Nova senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
            );
          }

          usuario.senha = bcrypt.hashSync(dados.novaSenha, 10);
          this.usuarios.set(usuario.id, usuario);
        } else {
          throw new Error('Usuário não encontrado');
        }
      }

      if (currentUser) {
        loggingService.info('Senha atualizada com sucesso', { userId: UserUtils.getUserId(currentUser) });
        return {
          id: currentUser.uid,
          nome: UserUtils.getUserName(currentUser) || '',
          email: UserUtils.getUserEmail(currentUser) || '',
          telefone: undefined,
          emailVerificado: currentUser.emailVerified,
        };
      } else {
        const usuario = this.usuarios.get(dados.idUsuario);
        loggingService.info('Senha atualizada com sucesso (simulado)', { userId: dados.idUsuario });
        return {
          id: dados.idUsuario,
          nome: usuario?.nome || '',
          email: usuario?.email || '',
          telefone: usuario?.telefone,
          emailVerificado: false,
        };
      }
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao atualizar senha', errorInstance, { originalError: error });
      if ((error as any).code === 'auth/wrong-password') {
        throw new Error('Senha atual incorreta');
      }
      throw error;
    }
  }

  /**
   * Inicia o processo de recuperação de senha
   * @param email Email do usuário
   * @returns Mensagem de confirmação
   */
  public async recuperarSenha(email: string): Promise<any> {
    try {
      const validationService = ValidationService.getInstance();

      if (!validationService.validateEmail(email)) {
        throw new Error('Email inválido');
      }

      // Versão Firebase - enviar email de recuperação
      await sendPasswordResetEmail(auth, email);

      // Versão simulada para compatibilidade
      const usuario = Array.from(this.usuarios.values()).find(u => u.email === email);
      if (usuario) {
        // Gerar token simulado (mas sem usar crypto/jsonwebtoken no client)
      const token = `simulated_token_${usuario.id}_${Date.now()}`;
      // const token = jwt.sign({ id: usuario.id, email: usuario.email }, jwtSecret, {
      //   expiresIn: '24h'
      // });

        this.tokensRecuperacao.set(token, {
          idUsuario: usuario.id,
          dataCriacao: new Date(),
        });
      }

      if (!usuario) {
        return {
          mensagem:
            'Se houver uma conta associada a este email, enviaremos instruções para redefinir sua senha.',
        };
      }

      // Se encontrou o usuário (seja no Firebase ou simulado), retorna sucesso
      return {
        mensagem: 'Email de recuperação enviado com sucesso. Verifique sua caixa de entrada.',
      };
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao recuperar senha', errorInstance, { originalError: error });
      
      if (errorInstance.message === 'Email inválido') {
        throw errorInstance;
      }

      // Não revelamos se o email existe ou não por segurança
      return {
        mensagem:
          'Se houver uma conta associada a este email, enviaremos instruções para redefinir sua senha.',
      };
    }
  }

  /**
   * Redefine a senha do usuário usando o código de recuperação
   * @param dados Dados para redefinição (actionCode, novaSenha)
   * @returns Mensagem de confirmação
   */
  public async redefinirSenha(dados: {
    actionCode?: string;
    token?: string;
    novaSenha: string;
  }): Promise<{
    mensagem: string;
  }> {
    try {
      // Versão Firebase - confirmar redefinição de senha
      if (dados.actionCode) {
        // Validar nova senha
        if (!this.validatePassword(dados.novaSenha)) {
          throw new Error(
            'Nova senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
          );
        }

        await confirmPasswordReset(auth, dados.actionCode, dados.novaSenha);
      } else {
        // Versão simulada com JWT token
        if (!dados.token) {
          throw new Error('Token inválido');
        }
        const tokenRecuperacao = this.tokensRecuperacao.get(dados.token);

        if (!tokenRecuperacao) {
          throw new Error('Token inválido');
        }

        // Verificar expiração (1 hora)
        const agora = new Date();
        const expiracao = new Date(tokenRecuperacao.dataCriacao.getTime() + 60 * 60 * 1000);
        if (agora > expiracao) {
          this.tokensRecuperacao.delete(dados.token);
          throw new Error('Token expirado'); // Mensagem específica para o teste
        }

        const usuario = this.usuarios.get(tokenRecuperacao.idUsuario);
        if (!usuario) {
          throw new Error('Usuário não encontrado');
        }

        if (!this.validatePassword(dados.novaSenha)) {
          throw new Error(
            'Nova senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
          );
        }

        usuario.senha = bcrypt.hashSync(dados.novaSenha, 10);
        this.usuarios.set(usuario.id, usuario);
        this.tokensRecuperacao.delete(dados.token);
      }

      loggingService.info('Senha redefinida com sucesso');

      return {
        mensagem: 'Senha redefinida com sucesso. Você já pode fazer login com sua nova senha.',
      };
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao redefinir senha', errorInstance, { originalError: error });
      
      // errorInstance instanceof jwt.TokenExpiredError ||
      if (
        (error as any).code === 'auth/expired-action-code'
      ) {
        throw new Error('O link de redefinição de senha expirou. Por favor, solicite um novo.');
      }

      // Se for erro de validação de senha ou token, relança o erro original
      if (
        errorInstance.message.includes('Nova senha deve conter') ||
        errorInstance.message === 'Token inválido' ||
        errorInstance.message === 'Token expirado' ||
        errorInstance.message === 'Usuário não encontrado' ||
        errorInstance.message === 'Token inválido ou expirado'
      ) {
        throw errorInstance;
      }

      throw new Error(
        'Não foi possível redefinir sua senha. O link pode ser inválido ou já ter sido usado.'
      );
    }
  }

  /**
   * Verifica se um email já foi confirmado
   * @param email Email a verificar
   * @returns Status da verificação
   */
  public async verificarStatusEmail(email: string): Promise<{
    verificado: boolean;
    email: string;
  }> {
    try {
      // Esta função só pode ser chamada internamente após login
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.email !== email) {
        throw new Error('Não autorizado a verificar este email');
      }

      return {
        verificado: currentUser.emailVerified,
        email: currentUser.email || '',
      };
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao verificar status do email', errorInstance, {
        originalError: error,
      });
      throw error;
    }
  }

  /**
   * Reenvia o email de verificação
   * @returns Mensagem de confirmação
   */
  public async reenviarEmailVerificacao(): Promise<{
    mensagem: string;
  }> {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      if (currentUser.emailVerified) {
        return { mensagem: 'Email já foi verificado.' };
      }

      await sendEmailVerification(currentUser);

      loggingService.info('Email de verificação reenviado', { userId: UserUtils.getUserId(currentUser) });

      return {
        mensagem:
          'Email de verificação reenviado com sucesso. Por favor, verifique sua caixa de entrada.',
      };
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao reenviar email de verificação', errorInstance, {
        originalError: error,
      });
      if ((error as any).code === 'auth/too-many-requests') {
        throw new Error('Muitas solicitações. Por favor, tente novamente mais tarde.');
      }
      throw error;
    }
  }

  /**
   * Confirma a verificação de email após o usuário clicar no link
   * @param actionCode Código de ação do link de verificação
   * @returns Mensagem de confirmação
   */
  public async confirmarEmailVerificacao(actionCode: string): Promise<{
    mensagem: string;
  }> {
    try {
      // Aplicar o código de verificação
      await applyActionCode(auth, actionCode);

      // Atualizar o status no Firestore
      const currentUser = auth.currentUser;
      if (currentUser) {
        await updateDoc(doc(db, 'usuarios', currentUser.uid), {
          emailVerificado: true,
        });
      }

      loggingService.info('Email verificado com sucesso', {
        userId: UserUtils.getUserId(currentUser),
      });

      return {
        mensagem: 'Email verificado com sucesso!',
      };
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao confirmar verificação de email', errorInstance, {
        originalError: error,
      });
      if ((error as any).code === 'auth/invalid-action-code') {
        throw new Error('O link de verificação é inválido ou já foi usado.');
      } else if ((error as any).code === 'auth/expired-action-code') {
        throw new Error('O link de verificação expirou. Por favor, solicite um novo.');
      }
      throw error;
    }
  }

}
