import { AuthService } from '../AuthService';
import { validationService } from '../validationService';

describe('AuthService', () => {
  let authService: AuthService;
  beforeAll(() => {
    jest.spyOn(validationService, 'validateEmail').mockImplementation((email: string) => {
      if (typeof email !== 'string') return false;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    });
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  beforeEach(() => {
    authService = new AuthService();
    jest.clearAllMocks();
  });

  describe('registrarUsuario', () => {
    it('deve registrar um usuário com sucesso', async () => {
      const dadosUsuario = {
        nome: 'Usuário Teste',
        email: 'usuario.novo@exemplo.com',
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
      const dadosUsuario = {
        nome: 'Usuário Teste',
        email: 'usuario_existente@exemplo.com',
        senha: 'Senha@123',
        telefone: '(11) 99999-9999',
      };

      await expect(authService.registrarUsuario(dadosUsuario)).rejects.toThrow(
        'Email já cadastrado'
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
      const credenciais = {
        email: 'usuario@exemplo.com',
        senha: 'SenhaIncorreta@123',
      };

      await expect(authService.autenticarUsuario(credenciais)).rejects.toThrow('Senha incorreta');
    });

    it('deve rejeitar autenticação de usuário inexistente', async () => {
      const credenciais = {
        email: 'usuario.inexistente@exemplo.com',
        senha: 'Senha@123',
      };

      await expect(authService.autenticarUsuario(credenciais)).rejects.toThrow(
        'Usuário não encontrado'
      );
    });
  });

  describe('validarToken', () => {
    it('deve validar um token válido', async () => {
      const token = 'token_valido';
      const resultado = await authService.validarToken(token);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBeDefined();
      expect(resultado.nome).toBeDefined();
      expect(resultado.email).toBeDefined();
      expect(resultado.senha).toBeUndefined(); // Senha não deve ser retornada
    });

    it('deve rejeitar token inválido', async () => {
      const token = 'token_invalido';
      await expect(authService.validarToken(token)).rejects.toThrow('Token inválido');
    });

    it('deve rejeitar token expirado', async () => {
      const token = 'token_expirado';
      await expect(authService.validarToken(token)).rejects.toThrow('Token expirado');
    });
  });

  describe('atualizarSenha', () => {
    it('deve atualizar a senha com sucesso', async () => {
      const dados = {
        idUsuario: 'usuario_123',
        senhaAtual: 'Senha@123',
        novaSenha: 'NovaSenha@123',
      };

      const resultado = await authService.atualizarSenha(dados);
      expect(resultado).toBeDefined();
      expect(resultado.id).toBe(dados.idUsuario);
      expect(resultado.senha).not.toBe(dados.novaSenha); // Senha deve estar hasheada
    });

    it('deve rejeitar atualização com senha atual incorreta', async () => {
      const dados = {
        idUsuario: 'usuario_123',
        senhaAtual: 'SenhaIncorreta@123',
        novaSenha: 'NovaSenha@123',
      };

      await expect(authService.atualizarSenha(dados)).rejects.toThrow('Senha atual incorreta');
    });

    it('deve rejeitar atualização com nova senha fraca', async () => {
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
      expect(resultado.mensagem).toBe('Email de recuperação enviado com sucesso');
    });

    it('deve rejeitar recuperação com email inválido', async () => {
      const email = 'email_invalido';
      await expect(authService.recuperarSenha(email)).rejects.toThrow('Email inválido');
    });

    it('deve rejeitar recuperação de usuário inexistente', async () => {
      const email = 'usuario_inexistente@exemplo.com';
      await expect(authService.recuperarSenha(email)).rejects.toThrow('Usuário não encontrado');
    });
  });

  describe('redefinirSenha', () => {
    it('deve redefinir a senha com sucesso', async () => {
      await authService.recuperarSenha('usuario@exemplo.com');
      const dados = {
        token: 'token_valido',
        novaSenha: 'NovaSenha@123',
      };

      const resultado = await authService.redefinirSenha(dados);
      expect(resultado).toBeDefined();
      expect(resultado.mensagem).toBe('Senha redefinida com sucesso');
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
