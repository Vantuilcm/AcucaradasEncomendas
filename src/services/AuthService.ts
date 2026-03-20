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
  }): Promise<User> {
    try {
      const validationService = ValidationService.getInstance();

      // Validar dados do usuário
      if (!validationService.validateEmail(userData.email)) {
        throw new Error('Email inválido');
      }

      if (!validationService.validatePhone(userData.phone)) {
        throw new Error('Telefone inválido');
      }

      if (!this.validatePassword(userData.password)) {
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

      // Enviar email de verificação
      await sendEmailVerification(firebaseUser);

      // Atualizar o perfil do usuário
      await updateProfile(firebaseUser, {
        displayName: userData.name
      });

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
        active: true
      };

      await setDoc(doc(db, 'users', firebaseUser.uid), userDoc);

      // Gerar token JWT para autenticação na API
      const token = await (firebaseUser as any).getIdToken(true);
      await SecureStorageService.storeData('authToken', token);

      secureLoggingService.info('Usuário registrado com sucesso', {
        uid: firebaseUser.uid,
        email: userData.email
      });

      return {
        id: firebaseUser.uid,
        nome: userData.name,
        email: userData.email,
        telefone: userData.phone,
        dataCriacao: new Date(),
        ultimoLogin: new Date(),
      } as User;
    } catch (error: any) {
      secureLoggingService.error('Erro ao registrar usuário', { error: error.message });
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
    try {
      // Validar email
      const validationService = ValidationService.getInstance();
      if (!validationService.validateEmail(email)) {
        throw new Error('Email inválido');
      }

      // Realizar login no Firebase Authentication
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

        // Atualizar último login no Firestore
        const userRef = doc(db, 'users', firebaseUser.uid);
        await updateDoc(userRef, {
          lastLogin: serverTimestamp()
        });

        // Buscar dados completos do usuário
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          throw new Error('Usuário não encontrado no banco de dados');
        }

        const userData = userDoc.data();
        if (!userData) {
          throw new Error('Usuário não encontrado no banco de dados');
        }

        const nome =
          typeof userData.name === 'string'
            ? userData.name
            : typeof userData.nome === 'string'
              ? userData.nome
              : '';
        const telefone = typeof userData.phone === 'string' ? userData.phone : undefined;
        const userEmail = typeof userData.email === 'string' ? userData.email : email;

        // Gerar token JWT para autenticação na API
        const token = await (firebaseUser as any).getIdToken(true);
        await SecureStorageService.storeData('authToken', token);

        secureLoggingService.info('Login realizado com sucesso', {
          uid: firebaseUser.uid,
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
      secureLoggingService.error('Erro ao fazer login', { error: error.message });
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
      secureLoggingService.error('Erro ao fazer logout', { error: error.message });
      throw error;
    }
  }

  /**
   * Envia email para recuperação de senha
   * @param email Email do usuário
   */
  public async resetPassword(email: string): Promise<void> {
    try {
      const validationService = ValidationService.getInstance();
      if (!validationService.validateEmail(email)) {
        throw new Error('Email inválido');
      }

      await sendPasswordResetEmail(auth, email);

      secureLoggingService.info('Email de recuperação de senha enviado', { email });
    } catch (error: any) {
      secureLoggingService.error('Erro ao enviar email de recuperação de senha', { error: error.message });
      throw error;
    }
  }

  /**
   * Confirma a redefinição de senha
   * @param code Código de verificação
   * @param newPassword Nova senha
   */
  public async confirmPasswordReset(code: string, newPassword: string): Promise<void> {
    try {
      if (!this.validatePassword(newPassword)) {
        throw new Error(
          'Senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
        );
      }

      await confirmPasswordReset(auth, code, newPassword);

      secureLoggingService.info('Senha redefinida com sucesso');
    } catch (error: any) {
      secureLoggingService.error('Erro ao redefinir senha', { error: error.message });
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
    try {
      const validationService = ValidationService.getInstance();
      const senhaFinal = senha || dadosUsuario.senha || '';

      if (!validationService.validateEmail(dadosUsuario.email)) {
        throw new Error('Email inválido');
      }

      if (dadosUsuario.telefone && !validationService.validatePhone(dadosUsuario.telefone)) {
        throw new Error('Telefone inválido');
      }

      if (!this.validatePassword(senhaFinal)) {
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

      await updateProfile(user, {
        displayName: dadosUsuario.nome,
      });

      await sendEmailVerification(user);

      const userData = {
        nome: dadosUsuario.nome,
        email: dadosUsuario.email,
        telefone: dadosUsuario.telefone,
        dataCriacao: serverTimestamp(),
        emailVerificado: false,
        ultimoLogin: serverTimestamp(),
        role: dadosUsuario.role || 'comprador',
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      // Mantendo compatibilidade caso outro lugar use 'usuarios'
      await setDoc(doc(db, 'usuarios', user.uid), userData);

      const usuarioSimulado = {
        id: user.uid,
        ...dadosUsuario,
        senha: bcrypt.hashSync(senhaFinal, 10),
        dataCriacao: new Date(),
      };

      this.usuarios.set(usuarioSimulado.id, usuarioSimulado);

      // Gerar token JWT para autenticação na API
      const token = await (user as any).getIdToken(true);
      await SecureStorageService.storeData('authToken', token);

      loggingService.info('Novo usuário registrado', { userId: user.uid });

      const userResult: User = {
        id: user.uid,
        nome: dadosUsuario.nome,
        email: dadosUsuario.email,
        telefone: dadosUsuario.telefone,
        role: dadosUsuario.role || 'comprador',
        dataCriacao: new Date(),
        ultimoLogin: new Date(),
      };

      return {
        user: userResult,
        token,
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
      if (error.code === 'auth/email-already-in-use') {
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

      // Verificar se o email foi verificado
      if (!user.emailVerified && !credenciais.ignorarVerificacao) {
        // Reenviar email de verificação
        await sendEmailVerification(user);
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
      const token = await (user as any).getIdToken(true);
      await SecureStorageService.storeData('authToken', token);

      loggingService.info('Usuário autenticado com sucesso', { userId: user.uid });

      const userResult: User = {
        id: user.uid,
        nome: user.displayName || usuario?.nome || '',
        email: user.email || credenciais.email,
        telefone: usuario?.telefone,
        ultimoLogin: new Date(),
      };

      return {
        token,
        expiresIn: 24 * 60 * 60,
        user: userResult,
        usuario: {
          id: userResult.id,
          nome: userResult.nome,
          email: userResult.email,
          emailVerificado: user.emailVerified,
        },
      };
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error('Erro desconhecido');
      loggingService.error('Erro ao autenticar usuário', errorInstance, { originalError: error });
      if ((error as any).code === 'auth/user-not-found') {
        throw new Error('Usuário não encontrado');
      } else if ((error as any).code === 'auth/wrong-password') {
        throw new Error('Senha incorreta');
      } else if ((error as any).code === 'auth/too-many-requests') {
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

      const nome =
        typeof userData.nome === 'string'
          ? userData.nome
          : typeof userData.name === 'string'
            ? userData.name
            : '';
      const telefone = typeof userData.telefone === 'string' ? userData.telefone : usuario?.telefone;
      const email = currentUser.email || (typeof userData.email === 'string' ? userData.email : '');

      return {
        id: decoded.id,
        nome: currentUser.displayName || nome,
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
        loggingService.info('Senha atualizada com sucesso', { userId: currentUser.uid });
        return {
          id: currentUser.uid,
          nome: currentUser.displayName || '',
          email: currentUser.email || '',
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
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
        }
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
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
        }
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

      loggingService.info('Email de verificação reenviado', { userId: currentUser.uid });

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
        userId: currentUser?.uid,
      });

      return {
        mensagem: 'Email verificado com sucesso! Agora você tem acesso completo à sua conta.',
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
