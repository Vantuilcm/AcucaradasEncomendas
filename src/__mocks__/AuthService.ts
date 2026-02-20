export class AuthService {
  async autenticarUsuario(email: string, senha: string) {
    const okPair = (email === 'cliente@exemplo.com' && senha === 'senha123')
      || (email === 'test@example.com' && senha === 'password123');
    if (!okPair) {
      return Promise.reject(new Error('E-mail ou senha incorretos'));
    }
    const user = {
      id: 'test-user-id',
      email,
      nome: email === 'cliente@exemplo.com' ? 'Cliente Teste' : 'Usuário Teste',
      telefone: '(11) 90000-0000',
      dataCriacao: new Date(),
      ultimoLogin: new Date(),
      isAdmin: false,
      role: 'customer',
      perfil: { fotoPerfil: '', notificacoes: true, preferencias: {} },
    };
    return { user, token: 'token_valido' };
  }

  async validarToken(token: string) {
    if (token !== 'token_valido') {
      throw new Error('Token inválido');
    }
    return {
      id: 'test-user-id',
      email: 'cliente@exemplo.com',
      nome: 'Cliente Teste',
      telefone: '(11) 90000-0000',
    };
  }
}

export default AuthService;
