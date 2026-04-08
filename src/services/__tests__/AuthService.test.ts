import { a } from '../../config/firebase';
const { f } from '../config/firebase';
const { AuthService } from '../AuthService';
import { ValidationService } from '../validationService';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Unmock AuthService to test real logic
jest.unmock('../AuthService');
jest.mock('../validationService');

// Mock firebase/firestore
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(), doc: jest.fn(), getDoc: jest.fn(), setDoc: jest.fn(), updateDoc: jest.fn(), collection: jest.fn(), addDoc: jest.fn(), serverTimestamp: jest.fn(() => ({ seconds: 1234567890, nanoseconds: 0 })), }));

import { getDoc } = f;

// Mock firebase/auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(), createUserWithEmailAndPassword: jest.fn(), signInWithEmailAndPassword: jest.fn(), signOut: jest.fn(), updatePassword: jest.fn(), sendPasswordResetEmail: jest.fn(), sendEmailVerification: jest.fn(), onAuthStateChanged: jest.fn(), updateProfile: jest.fn(), reauthenticateWithCredential: jest.fn(), EmailAuthProvider: {
    credential: jest.fn(), }, }));

const mockCurrentUser = {
  uid: 'usuario_123', email: 'teste@email.com', displayName: 'Usuário Teste', emailVerified: true, };

// Mock config/firebase
jest.mock('../../config/firebase', () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser.uid ? mockCurrentUser : null;
    }
  }, db: {}
}));

import {
  createUserWithEmailAndPassword, EmailAuthProvider, reauthenticateWithCredential, sendEmailVerification, sendPasswordResetEmail, signInWithEmailAndPassword, updatePassword } = a;

describe('AuthService', () => {
  let authService: AuthService;
  let validationService: ValidationService;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret';
    authService = AuthService.getInstance();
    validationService = ValidationService.getInstance();
    jest.clearAllMocks();

    // Mock do Firestore para retornar usuário
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        nome: 'Usuário Teste',
        email: 'teste@email.com',
        telefone: '(11) 99999-9999',
      }),
    });

    // Mock do login para retornar sucesso
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: {
        uid: 'usuario_123',
        email: 'teste@email.com',
        displayName: 'Usuário Teste',
        emailVerified: true,
      },
    });

    // Mock do registro para retornar sucesso
    (createUserWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: {
        uid: 'novo_usuario_123',
        email: 'novo@email.com',
        displayName: 'Novo Usuário',
        emailVerified: false,
      },
    });

    // Resetar usuário mockado do Firebase
    mockCurrentUser.uid = 'usuario_123';
    mockCurrentUser.email = 'teste@email.com';
    mockCurrentUser.displayName = 'Usuário Teste';
    mockCurrentUser.emailVerified = true;

    // Resetar mapas internos
    (authService as any).usuarios = new Map();
    (authService as any).tokensRecuperacao = new Map();

    // Adicionar usuário de teste
    const usuarioTeste = {
      id: 'usuario_123',
      email: 'usuario@exemplo.com',
      senha: bcrypt.hashSync('Senha@123', 10),
      nome: 'Usuário Teste',
      telefone: '(11) 99999-9999'
    };
    (authService as any).usuarios.set(usuarioTeste.id, usuarioTeste);

    // Adicionar token válido
    (authService as any).tokensRecuperacao.set('token_valido', {
      idUsuario: 'usuario_123',
      dataCriacao: new Date()
    });

    // Adicionar token expirado (2 horas atrás)
    const dataExpirada = new Date();
    dataExpirada.setHours(dataExpirada.getHours() - 2);
    (authService as any).tokensRecuperacao.set('token_expirado', {
      idUsuario: 'usuario_123',
      dataCriacao: dataExpirada
    });
  });

  describe('registrarUsuario', () => {
    it('deve registrar um usuário com sucesso', async () => {
      const dadosUsuario = {
        nome: 'Usuário Teste',
        email: 'usuario@exemplo.com',
        senha: 'Senha@123',
        telefone: '(11) 99999-9999',
      };

      const resultado = await authService.registrarUsuario(dadosUsuario);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.nome).toBe(dadosUsuario.nome);
      expect(resultado.email).toBe(dadosUsuario.email);
      expect(resultado.telefone).toBe(dadosUsuario.telefone);
      expect(resultado.senha).not.toBe(dadosUsuario.senha); // Senha deve estar hasheada
    });

    it('deve rejeitar registro com email inválido', async () => {
      const dadosUsuario = {
        nome: 'Usuário Teste',
        email: 'email_invalido',
        senha: 'Senha@123',
        telefone: '(11) 99999-9999',
      };

      await expect(authService.registrarUsuario(dadosUsuario)).rejects.toThrow('Email inválido');
    });

    it('deve rejeitar registro com telefone inválido', async () => {
      const dadosUsuario = {
        nome: 'Usuário Teste',
        email: 'usuario@exemplo.com',
        senha: 'Senha@123',
        telefone: '123',
      };

      await expect(authService.registrarUsuario(dadosUsuario)).rejects.toThrow('Telefone inválido');
    });

    it('deve rejeitar registro com senha fraca', async () => {
      const dadosUsuario = {
        nome: 'Usuário Teste',
        email: 'usuario@exemplo.com',
        senha: 'senha',
        telefone: '(11) 99999-9999',
      };

      await expect(authService.registrarUsuario(dadosUsuario)).rejects.toThrow(
        'Senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
      );
    });

    it('deve rejeitar registro com email já cadastrado', async () => {
      // Mock falha no registro
      const error = new Error('Email já cadastrado');
      (error as any).code = 'auth/email-already-in-use';
      (createUserWithEmailAndPassword as jest.Mock).mockRejectedValue(error);

      const dadosUsuario = {
        nome: 'Usuário Teste',
        email: 'usuario_existente@exemplo.com',
        senha: 'Senha@123',
        telefone: '(11) 99999-9999',
      };

      await expect(authService.registrarUsuario(dadosUsuario)).rejects.toThrow(
        'Este email já está sendo usado por outra conta.'
      );
    });
  });

  describe('autenticarUsuario', () => {
    it('deve autenticar um usuário com sucesso', async () => {
      const credenciais = {
        email: 'usuario@exemplo.com',
        senha: 'Senha@123',
      };

      const resultado = await authService.autenticarUsuario(credenciais);
      expect(resultado).toBeDefined();
      expect(resultado.token).toBeDefined();
      expect(resultado.usuario).toBeDefined();
      expect(resultado.usuario.id).toBeDefined();
      expect(resultado.usuario.nome).toBeDefined();
      expect(resultado.usuario.email).toBeDefined();
      expect(resultado.usuario.senha).toBeUndefined(); // Senha não deve ser retornada
    });

    it('deve rejeitar autenticação com email inválido', async () => {
      const credenciais = {
        email: 'email_invalido',
        senha: 'Senha@123',
      };

      await expect(authService.autenticarUsuario(credenciais)).rejects.toThrow('Email inválido');
    });

    it('deve rejeitar autenticação com senha incorreta', async () => {
      // Mock falha no login
      const error = new Error('Senha incorreta');
      (error as any).code = 'auth/wrong-password';
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(error);

      const credenciais = {
        email: 'usuario@exemplo.com',
        senha: 'SenhaIncorreta@123',
      };

      await expect(authService.autenticarUsuario(credenciais)).rejects.toThrow('Senha incorreta');
    });

    it('deve rejeitar autenticação de usuário inexistente', async () => {
      // Mock falha no login
      const error = new Error('Usuário não encontrado');
      (error as any).code = 'auth/user-not-found';
      (signInWithEmailAndPassword as jest.Mock).mockRejectedValue(error);
      
      // Simular usuário não logado
      mockCurrentUser.uid = '';

      const credenciais = {
        email: 'usuario_inexistente@exemplo.com',
        senha: 'Senha@123',
      };

      await expect(authService.autenticarUsuario(credenciais)).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('validarToken', () => {
    it('deve validar um token válido', async () => {
      const token = jwt.sign({ id: 'usuario_123', email: 'usuario@exemplo.com' }, 'test-secret', { expiresIn: '1h' });
      
      const resultado = await authService.validarToken(token);
      expect(resultado).toBeDefined();
      expect(resultado.valido).toBe(true);
      expect(resultado.id).toBe('usuario_123');
    });

    it('deve rejeitar token inválido', async () => {
      const token = 'token_invalido';
      await expect(authService.validarToken(token)).rejects.toThrow('Token inválido');
    });

    it('deve rejeitar token expirado', async () => {
      const token = jwt.sign({ id: 'usuario_123' }, 'test-secret', { expiresIn: '-1h' });
      await expect(authService.validarToken(token)).rejects.toThrow('Token expirado');
    });
  });

  describe('atualizarSenha', () => {
    it('deve atualizar a senha com sucesso', async () => {
      // Setup mock
      (reauthenticateWithCredential as jest.Mock).mockResolvedValue({});
      (updatePassword as jest.Mock).mockResolvedValue({});
      (EmailAuthProvider.credential as jest.Mock).mockReturnValue({});

      const dados = {
        idUsuario: 'usuario_123',
        senhaAtual: 'Senha@123',
        novaSenha: 'NovaSenha@123',
      };

      const resultado = await authService.atualizarSenha(dados);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(dados.idUsuario);
    });

    it('deve rejeitar atualização com senha atual incorreta', async () => {
      // Mock para simular erro de senha incorreta
      const error = new Error('Senha incorreta');
      (error as any).code = 'auth/wrong-password';
      (reauthenticateWithCredential as jest.Mock).mockRejectedValue(error);
      (EmailAuthProvider.credential as jest.Mock).mockReturnValue({});

      const dados = {
        idUsuario: 'usuario_123',
        senhaAtual: 'SenhaIncorreta@123',
        novaSenha: 'NovaSenha@123',
      };

      await expect(authService.atualizarSenha(dados)).rejects.toThrow('Senha atual incorreta');
    });

    it('deve rejeitar atualização com nova senha fraca', async () => {
      // Mock sucesso no auth para testar validação de senha
      (reauthenticateWithCredential as jest.Mock).mockResolvedValue({});
      (EmailAuthProvider.credential as jest.Mock).mockReturnValue({});

      const dados = {
        idUsuario: 'usuario_123',
        senhaAtual: 'Senha@123',
        novaSenha: 'senha',
      };

      await expect(authService.atualizarSenha(dados)).rejects.toThrow(
        'Nova senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
      );
    });

    it('deve rejeitar atualização de usuário inexistente', async () => {
      // Simular usuário não logado no Firebase
      mockCurrentUser.uid = '';
      
      const dados = {
        idUsuario: 'usuario_inexistente',
        senhaAtual: 'Senha@123',
        novaSenha: 'NovaSenha@123',
      };

      await expect(authService.atualizarSenha(dados)).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('recuperarSenha', () => {
    it('deve iniciar recuperação de senha com sucesso', async () => {
      const email = 'usuario@exemplo.com';
      const resultado = await authService.recuperarSenha(email);
      expect(resultado).toBeDefined();
      expect(resultado.mensagem).toBe('Email de recuperação enviado com sucesso. Verifique sua caixa de entrada.');
    });

    it('deve rejeitar recuperação com email inválido', async () => {
      const email = 'email_invalido';
      await expect(authService.recuperarSenha(email)).rejects.toThrow('Email inválido');
    });

    it('deve retornar mensagem genérica para recuperação de usuário inexistente (segurança)', async () => {
      const email = 'usuario_inexistente@exemplo.com';
      const resultado = await authService.recuperarSenha(email);
      expect(resultado).toBeDefined();
      expect(resultado.mensagem).toBe(
        'Se houver uma conta associada a este email, enviaremos instruções para redefinir sua senha.'
      );
    });
  });

  describe('redefinirSenha', () => {
    it('deve redefinir a senha com sucesso', async () => {
      const dados = {
        token: 'token_valido',
        novaSenha: 'NovaSenha@123',
      };

      const resultado = await authService.redefinirSenha(dados);
      expect(resultado).toBeDefined();
      expect(resultado.mensagem).toBe(
        'Senha redefinida com sucesso. Você já pode fazer login com sua nova senha.'
      );
    });

    it('deve rejeitar redefinição com token inválido', async () => {
      const dados = {
        token: 'token_invalido',
        novaSenha: 'NovaSenha@123',
      };

      await expect(authService.redefinirSenha(dados)).rejects.toThrow('Token inválido');
    });

    it('deve rejeitar redefinição com token expirado', async () => {
      const dados = {
        token: 'token_expirado',
        novaSenha: 'NovaSenha@123',
      };

      await expect(authService.redefinirSenha(dados)).rejects.toThrow('Token expirado');
    });

    it('deve rejeitar redefinição com nova senha fraca', async () => {
      const dados = {
        token: 'token_valido',
        novaSenha: 'senha',
      };

      await expect(authService.redefinirSenha(dados)).rejects.toThrow(
        'Nova senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
      );
    });
  });
});
