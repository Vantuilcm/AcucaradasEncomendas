import { ValidationService } from './validationService';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { auth, db } from '../config/firebase';
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  signOut,
  User as FirebaseUser,
  UserCredential
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
import { secureLoggingService } from './SecureLoggingService';
import { SecureStorageService } from './SecureStorageService';
import { User } from '../models/User';

export class AuthService {
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
   * Gera um token JWT para autenticação
   * @param uid ID do usuário
   * @param email Email do usuário
   * @returns Token JWT
   */
  private generateAuthToken(uid: string, email: string): string {
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret_for_development';
    return jwt.sign(
      { uid, email },
      jwtSecret,
      { expiresIn: '24h' }
    );
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
      const validationService = new ValidationService();

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
      const token = this.generateAuthToken(firebaseUser.uid, userData.email);
      await SecureStorageService.storeData('authToken', token);

      secureLoggingService.info('Usuário registrado com sucesso', {
        uid: firebaseUser.uid,
        email: userData.email
      });

      return {
        id: firebaseUser.uid,
        email: userData.email,
        name: userData.name,
        phone: userData.phone,
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date().toISOString(),
        role: 'customer',
        active: true
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
      const validationService = new ValidationService();
      if (!validationService.validateEmail(email)) {
        throw new Error('Email inválido');
      }

      try {
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

        // Gerar token JWT para autenticação na API
        const token = this.generateAuthToken(firebaseUser.uid, email);
        await SecureStorageService.storeData('authToken', token);

        secureLoggingService.info('Login realizado com sucesso', {
          uid: firebaseUser.uid,
          email: email
        });

        return {
          user: {
            id: firebaseUser.uid,
            email: userData.email,
            name: userData.name,
            phone: userData.phone,
            emailVerified: firebaseUser.emailVerified,
            role: userData.role || 'customer',
            active: userData.active !== false
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
      const validationService = new ValidationService();
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

      // Versão Firebase - criar usuário na autenticação
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        dadosUsuario.email,
        dadosUsuario.senha
      );

      const user = userCredential.user;

      // Atualizar perfil do usuário com nome
      await updateProfile(user, {
        displayName: dadosUsuario.nome,
      });

      // Enviar email de verificação
      await sendEmailVerification(user);

      // Criar documento do usuário no Firestore
      const userData = {
        nome: dadosUsuario.nome,
        email: dadosUsuario.email,
        telefone: dadosUsuario.telefone,
        dataCriacao: serverTimestamp(),
        emailVerificado: false, // Inicialmente falso até que o email seja verificado
        ultimoLogin: serverTimestamp(),
      };

      await setDoc(doc(db, 'usuarios', user.uid), userData);

      // Adicionar à versão simulada para compatibilidade
      const usuarioSimulado = {
        id: user.uid,
        ...dadosUsuario,
        senha: bcrypt.hashSync(dadosUsuario.senha, 10),
        dataCriacao: new Date(),
      };

      this.usuarios.set(usuarioSimulado.id, usuarioSimulado);

      loggingService.info('Novo usuário registrado', { userId: user.uid });

      return {
        id: user.uid,
        nome: dadosUsuario.nome,
        email: dadosUsuario.email,
        telefone: dadosUsuario.telefone,
        emailVerificado: false,
        mensagem:
          'Usuário registrado com sucesso. Por favor, verifique seu email para ativar sua conta.',
      };
    } catch (error) {
      loggingService.error('Erro ao registrar usuário', { error });
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
  }): Promise<{
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

      if (!validationService.validarEmail(credenciais.email)) {
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
      await updateDoc(doc(db, 'usuarios', user.uid), {
        ultimoLogin: serverTimestamp(),
      });

      // Versão simulada para compatibilidade
      const usuario = Array.from(this.usuarios.values()).find(u => u.email === credenciais.email);

      if (usuario) {
        const senhaCorreta = await bcrypt.compare(credenciais.senha, usuario.senha);
        if (!senhaCorreta) {
          throw new Error('Senha incorreta');
        }
      }

      // Verificar se JWT_SECRET está configurado
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
      }

      const token = jwt.sign(
        { id: user.uid, email: user.email },
        jwtSecret,
        { expiresIn: '24h' }
      );

      loggingService.info('Usuário autenticado com sucesso', { userId: user.uid });

      return {
        token,
        usuario: {
          id: user.uid,
          nome: user.displayName,
          email: user.email,
          telefone: usuario?.telefone,
          emailVerificado: user.emailVerified,
        },
      };
    } catch (error) {
      loggingService.error('Erro ao autenticar usuário', { error });
      if (error.code === 'auth/user-not-found') {
        throw new Error('Usuário não encontrado');
      } else if (error.code === 'auth/wrong-password') {
        throw new Error('Senha incorreta');
      } else if (error.code === 'auth/too-many-requests') {
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
    usuario: {
      id: string;
      email: string;
      nome: string;
      emailVerificado: boolean;
    };
    valido: boolean;
  }> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
          throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
        }
        const decoded = jwt.verify(token, jwtSecret) as any;

      // Verificar no Firebase Auth
      const currentUser = auth.currentUser;
      if (!currentUser || currentUser.uid !== decoded.id) {
        throw new Error('Usuário não autenticado');
      }

      // Obter dados adicionais do Firestore
      const userDoc = await getDoc(doc(db, 'usuarios', decoded.id));

      if (!userDoc.exists()) {
        throw new Error('Usuário não encontrado');
      }

      const userData = userDoc.data();

      // Compatibilidade com versão simulada
      const usuario = this.usuarios.get(decoded.id);

      return {
        id: decoded.id,
        nome: currentUser.displayName || userData.nome,
        email: currentUser.email,
        telefone: userData.telefone || usuario?.telefone,
        emailVerificado: currentUser.emailVerified,
      };
    } catch (error) {
      loggingService.error('Erro ao validar token', { error });
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expirado');
      }
      throw new Error('Token inválido');
    }
  }

  /**
   * Atualiza a senha do usuário após autenticação
   * @param dados Dados para atualização (idUsuario, senhaAtual, novaSenha)
   * @returns Informações do usuário após a atualização
   */
  public async atualizarSenha(dados: {
    senhaAtual: string;
    novaSenha: string;
  }): Promise<{
    mensagem: string;
    usuario: {
      id: string;
      email: string;
      nome: string;
    };
  }> {
    try {
      // Versão Firebase - reautenticar e atualizar senha
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Reautenticar o usuário
      const credential = auth.EmailAuthProvider.credential(currentUser.email, dados.senhaAtual);

      await auth.reauthenticateWithCredential(currentUser, credential);

      // Validar nova senha
      if (!this.validarSenha(dados.novaSenha)) {
        throw new Error(
          'Nova senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
        );
      }

      // Atualizar senha
      await auth.updatePassword(currentUser, dados.novaSenha);

      // Versão simulada para compatibilidade
      const usuario = this.usuarios.get(dados.idUsuario);
      if (usuario) {
        const senhaCorreta = await bcrypt.compare(dados.senhaAtual, usuario.senha);
        if (!senhaCorreta) {
          throw new Error('Senha atual incorreta');
        }

        usuario.senha = bcrypt.hashSync(dados.novaSenha, 10);
        this.usuarios.set(usuario.id, usuario);
      }

      loggingService.info('Senha atualizada com sucesso', { userId: currentUser.uid });

      return {
        id: currentUser.uid,
        nome: currentUser.displayName,
        email: currentUser.email,
        telefone: usuario?.telefone,
        emailVerificado: currentUser.emailVerified,
      };
    } catch (error) {
      loggingService.error('Erro ao atualizar senha', { error });
      if (error.code === 'auth/wrong-password') {
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

      if (!validationService.validarEmail(email)) {
        throw new Error('Email inválido');
      }

      // Versão Firebase - enviar email de recuperação
      await sendPasswordResetEmail(auth, email);

      // Versão simulada para compatibilidade
      const usuario = Array.from(this.usuarios.values()).find(u => u.email === email);
      if (usuario) {
        const token = jwt.sign(
          { id: usuario.id, email: usuario.email },
          process.env.JWT_SECRET || (() => {
          throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
        })(),
          { expiresIn: '1h' }
        );

        this.tokensRecuperacao.set(token, {
          idUsuario: usuario.id,
          dataCriacao: new Date(),
        });
      }

      loggingService.info('Email de recuperação de senha enviado', { email });

      return {
        mensagem: 'Email de recuperação enviado com sucesso. Verifique sua caixa de entrada.',
      };
    } catch (error) {
      loggingService.error('Erro ao recuperar senha', { error });
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
        if (!this.validarSenha(dados.novaSenha)) {
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
      const decoded = jwt.verify(dados.token, jwtSecret) as any;
        const tokenRecuperacao = this.tokensRecuperacao.get(dados.token);

        if (!tokenRecuperacao) {
          throw new Error('Token inválido');
        }

        const usuario = this.usuarios.get(tokenRecuperacao.idUsuario);
        if (!usuario) {
          throw new Error('Usuário não encontrado');
        }

        if (!this.validarSenha(dados.novaSenha)) {
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
      loggingService.error('Erro ao redefinir senha', { error });
      if (error instanceof jwt.TokenExpiredError || error.code === 'auth/expired-action-code') {
        throw new Error('O link de redefinição de senha expirou. Por favor, solicite um novo.');
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
        email: currentUser.email,
      };
    } catch (error) {
      loggingService.error('Erro ao verificar status do email', { error });
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
      loggingService.error('Erro ao reenviar email de verificação', { error });
      if (error.code === 'auth/too-many-requests') {
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
      await auth.applyActionCode(auth, actionCode);

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
      loggingService.error('Erro ao confirmar verificação de email', { error });
      if (error.code === 'auth/invalid-action-code') {
        throw new Error('O link de verificação é inválido ou já foi usado.');
      } else if (error.code === 'auth/expired-action-code') {
        throw new Error('O link de verificação expirou. Por favor, solicite um novo.');
      }
      throw error;
    }
  }

  private validarSenha(senha: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return regex.test(senha);
  }
}
