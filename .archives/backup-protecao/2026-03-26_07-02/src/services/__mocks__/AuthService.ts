import { ValidationService } from '../validationService';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export class AuthService {
  private static instance: AuthService;
  private usuarios: Map<string, any>;
  private tokensRecuperacao: Map<string, any>;

  private constructor() {
    this.usuarios = new Map();
    this.tokensRecuperacao = new Map();
    this.inicializarDadosTeste();
  }

  private inicializarDadosTeste() {
    // Usuário existente
    this.usuarios.set('usuario_123', {
      id: 'usuario_123',
      nome: 'Usuário Teste',
      email: 'usuario@exemplo.com',
      senha: bcrypt.hashSync('Senha@123', 10),
      telefone: '(11) 99999-9999',
      dataCriacao: new Date('2024-01-01'),
    });

    // Usuário com email já cadastrado
    this.usuarios.set('usuario_existente', {
      id: 'usuario_existente',
      nome: 'Usuário Existente',
      email: 'usuario_existente@exemplo.com',
      senha: bcrypt.hashSync('Senha@123', 10),
      telefone: '(11) 88888-8888',
      dataCriacao: new Date('2024-01-02'),
    });
  }

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  public async registrarUsuario(dadosUsuario: any): Promise<any> {
    const validationService = ValidationService.getInstance();

    if (!validationService.validateEmail(dadosUsuario.email)) {
      throw new Error('Email inválido');
    }

    if (!validationService.validatePhone(dadosUsuario.telefone)) {
      throw new Error('Telefone inválido');
    }

    if (!this.validarSenha(dadosUsuario.senha)) {
      throw new Error(
        'Senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
      );
    }

    // Verificar se o email já está cadastrado
    const usuarioExistente = Array.from(this.usuarios.values()).find(
      usuario => usuario.email === dadosUsuario.email
    );

    if (usuarioExistente) {
      throw new Error('Email já cadastrado');
    }

    const usuario = {
      id: `usuario_${Date.now()}`,
      ...dadosUsuario,
      senha: bcrypt.hashSync(dadosUsuario.senha, 10),
      dataCriacao: new Date(),
    };

    this.usuarios.set(usuario.id, usuario);
    return usuario;
  }

  public async autenticarUsuario(credenciais: any): Promise<any> {
    const validationService = ValidationService.getInstance();

    if (!validationService.validateEmail(credenciais.email)) {
      throw new Error('Email inválido');
    }

    const usuario = Array.from(this.usuarios.values()).find(u => u.email === credenciais.email);

    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const senhaCorreta = await bcrypt.compare(credenciais.senha, usuario.senha);
    if (!senhaCorreta) {
      throw new Error('Senha incorreta');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      jwtSecret,
      { expiresIn: '24h' }
    );

    return {
      token,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
      },
    };
  }

  public async validarToken(token: string): Promise<any> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
      }
      const decoded = jwt.verify(token, jwtSecret) as any;
      const usuario = this.usuarios.get(decoded.id);

      if (!usuario) {
        throw new Error('Usuário não encontrado');
      }

      return {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        telefone: usuario.telefone,
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expirado');
      }
      throw new Error('Token inválido');
    }
  }

  public async atualizarSenha(dados: any): Promise<any> {
    const usuario = this.usuarios.get(dados.idUsuario);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const senhaCorreta = await bcrypt.compare(dados.senhaAtual, usuario.senha);
    if (!senhaCorreta) {
      throw new Error('Senha atual incorreta');
    }

    if (!this.validarSenha(dados.novaSenha)) {
      throw new Error(
        'Nova senha deve conter pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula, um número e um caractere especial'
      );
    }

    usuario.senha = bcrypt.hashSync(dados.novaSenha, 10);
    this.usuarios.set(usuario.id, usuario);

    return {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      telefone: usuario.telefone,
    };
  }

  public async recuperarSenha(email: string): Promise<any> {
    const validationService = ValidationService.getInstance();

    if (!validationService.validateEmail(email)) {
      throw new Error('Email inválido');
    }

    const usuario = Array.from(this.usuarios.values()).find(u => u.email === email);
    if (!usuario) {
      throw new Error('Usuário não encontrado');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
    }

    const token = jwt.sign(
      { id: usuario.id, email: usuario.email },
      jwtSecret,
      { expiresIn: '1h' }
    );

    this.tokensRecuperacao.set(token, {
      idUsuario: usuario.id,
      dataCriacao: new Date(),
    });

    return {
      mensagem: 'Email de recuperação enviado com sucesso',
    };
  }

  public async redefinirSenha(dados: any): Promise<any> {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET não configurado nas variáveis de ambiente');
      }
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

      return {
        mensagem: 'Senha redefinida com sucesso',
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token expirado');
      }
      throw new Error('Token inválido');
    }
  }

  private validarSenha(senha: string): boolean {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
    return regex.test(senha);
  }
}
